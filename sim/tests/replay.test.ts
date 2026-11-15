import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SolverState } from "../src/physics/EscapementSolver";
import {
  clampScrubTime,
  createReplayBuffer,
  frameAtTime,
  frameInRange,
  recordPacket,
  replayBounds,
  replayCount,
} from "../src/replay/record";
import { ReplayProvider, ReplayScrubber, type ReplayController } from "../src/replay";
import {
  SHARE_LINK_PARAM,
  VIEWER_SCHEMA_VERSION,
  parseShareLink,
  readShareLink,
  serializeShareLink,
  shareLinkHref,
  tryReadShareLink,
  type ShareLinkState,
} from "../src/replay/shareUrl";
import { openingScrubSeconds } from "../src/replay/useReplay";
import { defaultSettings, type Settings } from "../src/sim/settings";
import type { FramePacket, Readout, Sample } from "../src/sim/useSimulator";

const variedSettings: Settings = {
  ...defaultSettings,
  stiffnessMode: "prescribed-frequency",
  dampingMode: "fixed-c0-reference",
  torqueMapMode: "energy-balance-frozen-reference-k",
  inertiaMode: "custom",
  customInertia: 6.022e21,
  dmxTorque: 0.125,
  dmxCurb: 0.25,
  dmxBrake: 0.5,
  dmxIntensity: 0.333,
  toothCount: 18,
  facetCount: 2,
  thicknessM: 0.0004,
  leafWidthM: 0.008,
  materialId: "resin-petg",
  throwM: 9.5,
  persistenceMs: 12,
  chopperEnabled: false,
  chromaticOffsetDeg: [1.25, -2.5, 3],
  qFactor: 120,
  brakeQFloor: 40,
  amplitudeTargetDeg: 11,
  liftDeg: 4.25,
  blankDeg: 1.1,
  unlockDeg: 6,
  torqueScale: 1.5,
  prescribedFLow: 5,
  prescribedFHigh: 22,
  theta0Deg: -8,
  omega0: 0.125,
  unwindSeconds: 7.5,
  subdivision: 4,
  targetBpm: 96,
  leafCountVisual: 8,
  powerCutMode: "retained-source-diagnostic",
  omegaEpsilon: 1e-7,
  ringAxialMm: 6,
  viewMode: "engineering",
  hazeDisplay: 0.15,
};

function shareState(settings: Settings, simTimeSeconds: number, scrubTimeSeconds: number): ShareLinkState {
  return {
    schemaVersion: VIEWER_SCHEMA_VERSION,
    settings,
    simTimeSeconds,
    scrubTimeSeconds,
  };
}

describe("share links", () => {
  it("round-trips settings, solver time, and scrub time", () => {
    const state = shareState(variedSettings, 0.1 + 0.2, 4.5);
    expect(parseShareLink(serializeShareLink(state))).toEqual(state);
    const again = shareState(defaultSettings, 0, 0);
    expect(parseShareLink(serializeShareLink(again))).toEqual(again);
  });

  it("keeps only settings fields plus schema, solver time, and scrub time", () => {
    const state = shareState(variedSettings, 1.25, 0.5);
    const hash = serializeShareLink(state);
    expect(hash.startsWith(`#${SHARE_LINK_PARAM}=`)).toBe(true);
    const payload = JSON.parse(decodeURIComponent(hash.slice(`#${SHARE_LINK_PARAM}=`.length))) as {
      settings: Record<string, unknown>;
    };
    expect(Object.keys(payload).sort()).toEqual(
      ["schemaVersion", "scrubTimeSeconds", "settings", "simTimeSeconds"].sort(),
    );
    expect(Object.keys(payload.settings).sort()).toEqual(Object.keys(defaultSettings).sort());
    const keys = collectKeys(payload);
    expect(keys.has("fps")).toBe(false);
    expect(keys.has("torqueAtCut")).toBe(false);
    expect(keys.has("paused")).toBe(false);
    expect(keys.has("samples")).toBe(false);
    expect(payload.settings.schemaVersion).toBeUndefined();
  });

  it("reads the hash and the query, and the hash wins when both are present", () => {
    const held = shareState(variedSettings, 2, 0.75);
    const live = shareState(defaultSettings, 8, 3);
    const hash = serializeShareLink(held);
    const query = serializeShareLink(live).slice(1);
    expect(parseShareLink(`http://127.0.0.1:43117/${hash}`)).toEqual(held);
    expect(parseShareLink(`http://127.0.0.1:43117/?${query}`)).toEqual(live);
    expect(parseShareLink(`http://127.0.0.1:43117/?${query}${hash}`)).toEqual(held);
    expect(readShareLink("http://127.0.0.1:43117/")).toBeNull();
    expect(tryReadShareLink("http://127.0.0.1:43117/")).toBeNull();
    expect(tryReadShareLink(`#${SHARE_LINK_PARAM}=not-json`)).toBeNull();
    expect(tryReadShareLink(hash)).toEqual(held);
    expect(openingScrubSeconds(undefined, held)).toBe(0.75);
    expect(openingScrubSeconds(1.5, held)).toBe(1.5);
    expect(openingScrubSeconds(undefined, null)).toBeNull();
    expect(shareLinkHref(hash)).toBe(hash);
    expect(
      shareLinkHref(hash, { origin: "http://127.0.0.1:43117", pathname: "/", search: "" }),
    ).toBe(`http://127.0.0.1:43117/${hash}`);
  });

  it("rejects an unknown schema, a missing field, and a non-finite time", () => {
    const state = shareState(defaultSettings, 1, 1);
    expect(() => parseShareLink(serializeShareLink({ ...state, schemaVersion: 2 as 1 }))).toThrow(
      /Unsupported viewer schema version/,
    );
    expect(() => serializeShareLink({ ...state, scrubTimeSeconds: -1 })).toThrow(/scrubTimeSeconds/);
    expect(() => parseShareLink(`#${SHARE_LINK_PARAM}=not-json`)).toThrow(/JSON/);
    const broken = JSON.parse(decodeURIComponent(serializeShareLink(state).slice(`#${SHARE_LINK_PARAM}=`.length))) as {
      settings: Record<string, unknown>;
    };
    delete broken.settings.chopperEnabled;
    expect(() => parseShareLink(`#${SHARE_LINK_PARAM}=${encodeURIComponent(JSON.stringify(broken))}`)).toThrow(
      /chopperEnabled/,
    );
  });
});

describe("replay recording", () => {
  it("stores subscribed samples and floors the scrub to the previous sample", () => {
    const buffer = createReplayBuffer();
    const taken = sample(1, 0.2, { omega: -3, angularBlank: true, beamVisible: true });
    recordPacket(buffer, packet({ samples: [sample(0, 0.1), taken, sample(2, 0.3)] }));
    taken.theta = 9;
    expect(frameAtTime(buffer, 1.2)).toMatchObject({ t: 1, theta: 0.2, omega: -3, angularBlank: true });
    expect(frameAtTime(buffer, 0)?.t).toBe(0);
    expect(frameAtTime(buffer, 9)?.t).toBe(2);
    expect(frameInRange(buffer, 1.2)?.t).toBe(1);
    expect(frameInRange(buffer, 2.01)).toBeNull();
    expect(Object.keys(frameAtTime(buffer, 1) ?? {}).sort()).toEqual(
      [
        "angularBlank",
        "beamVisible",
        "intensity",
        "mechAngle",
        "omega",
        "opticalAngle",
        "t",
        "theta",
        "validBeats",
      ].sort(),
    );
  });

  it("keeps an empty-sample packet as one readout snapshot and ignores a repeat", () => {
    const buffer = createReplayBuffer();
    expect(recordPacket(buffer, packet({ t: 0.5, theta: 0.4, intensity: 0, angularBlank: true }))).toBe(true);
    expect(recordPacket(buffer, packet({ t: 0.5, theta: 1, intensity: 1 }))).toBe(false);
    expect(replayCount(buffer)).toBe(1);
    expect(frameAtTime(buffer, 0.5)).toMatchObject({ t: 0.5, theta: 0.4, intensity: 0, beamVisible: false });
    const visible = createReplayBuffer();
    recordPacket(visible, packet({ t: 0.5, intensity: 0.4, angularBlank: false, chopperEnabled: true }));
    expect(frameAtTime(visible, 0.5)?.beamVisible).toBe(true);
    const blanked = createReplayBuffer();
    recordPacket(blanked, packet({ t: 0.5, intensity: 0.4, angularBlank: true, chopperEnabled: true }));
    expect(frameAtTime(blanked, 0.5)?.beamVisible).toBe(false);
  });

  it("clears on reset and on a backward timestamp, and drops samples outside the window", () => {
    const buffer = createReplayBuffer();
    recordPacket(buffer, packet({ samples: [sample(1, 0.2), sample(2, 0.3)] }));
    recordPacket(buffer, packet({ reset: true, t: 0, theta: 0.15 }));
    expect(replayCount(buffer)).toBe(1);
    expect(frameAtTime(buffer, 0)).toMatchObject({ t: 0, theta: 0.15 });

    const jumped = createReplayBuffer();
    recordPacket(jumped, packet({ samples: [sample(0), sample(1), sample(2)] }));
    recordPacket(jumped, packet({ samples: [sample(0.2, 0.4)] }));
    expect(replayBounds(jumped)).toEqual({ startSeconds: 0.2, endSeconds: 0.2 });
    expect(frameAtTime(jumped, 0.2)?.theta).toBe(0.4);

    const windowed = createReplayBuffer(1, 100);
    recordPacket(windowed, packet({ samples: [sample(0), sample(0.4), sample(1.5)] }));
    expect(replayBounds(windowed)).toEqual({ startSeconds: 1.5, endSeconds: 1.5 });

    const capped = createReplayBuffer(100, 2);
    recordPacket(capped, packet({ samples: [sample(0), sample(1), sample(2)] }));
    expect(replayCount(capped)).toBe(2);
    expect(replayBounds(capped)).toEqual({ startSeconds: 1, endSeconds: 2 });
    expect(clampScrubTime(5, replayBounds(capped))).toBe(5);
    expect(clampScrubTime(0, replayBounds(capped))).toBe(1);
    expect(clampScrubTime(Number.NaN, replayBounds(capped))).toBe(1);
  });
});

describe("replay scrubber markup", () => {
  it("labels scrub time in seconds and shows the share parameter", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ReplayProvider,
        {
          subscribe: () => () => undefined,
          settings: defaultSettings,
          readout: readout(1.5),
          onScrubTime: () => undefined,
        },
        createElement(ReplayScrubber),
      ),
    );
    expect(markup).toContain("Scrub time");
    expect(markup).toContain("0.000 s");
    expect(markup).toContain("1.500 s");
    expect(markup).toContain("Solver time");
    expect(markup).toContain("Waiting for the first frame.");
    expect(markup).toContain("following live");
    expect(markup).toContain(SHARE_LINK_PARAM);
    expect(markup).toContain('aria-label="Scrub time in seconds"');
  });

  it("shows the held sample in degrees and radians per second", () => {
    const markup = renderToStaticMarkup(createElement(ReplayScrubber, { replay: heldReplay() }));
    expect(markup).toContain("0.500 s");
    expect(markup).toContain("90.000 deg");
    expect(markup).toContain("1.500 rad/s");
    expect(markup).toContain("inside");
    expect(markup).toContain(">off<");
    expect(markup).toContain("held");
    expect(markup).toContain("0.000 s to 1.000 s");
    expect(markup).not.toContain("Scrub time is ahead of the recording.");
  });
});

function heldReplay(): ReplayController {
  const state = shareState(defaultSettings, 2, 0.5);
  return {
    scrubTimeSeconds: 0.5,
    setScrubTimeSeconds: () => undefined,
    followingLive: false,
    followLive: () => undefined,
    recordedStartSeconds: 0,
    recordedEndSeconds: 1,
    recordedSamples: 2,
    frame: {
      t: 0.5,
      theta: Math.PI / 2,
      omega: 1.5,
      angularBlank: true,
      validBeats: 3,
      opticalAngle: 0,
      mechAngle: 0,
      intensity: 1,
      beamVisible: false,
    },
    simTimeSeconds: 2,
    shareState: state,
    shareHref: "#ed-ibs-view=example",
    writeShareLink: () => ({ href: "#ed-ibs-view=example", wroteAddressBar: false }),
  };
}

function readout(t: number): Readout {
  return { state: solverState(t), fps: 60 };
}

function solverState(t: number, theta = 0, omega = 0, angularBlank = false): SolverState {
  return {
    t,
    step: 0,
    theta,
    omega,
    validBeats: 0,
    rawCrossings: 0,
    peakSinceCrossing: 0,
    lastHalfPeak: 0,
    prevHalfPeak: 0,
    angularBlank,
    blankEnterTime: null,
    lastBlankDuration: null,
    blankEventCount: 0,
    lastCrossTime: null,
    prevCrossTime: null,
    lastHalfPeriod: null,
    prevHalfPeriod: null,
    beatError: null,
    mechAngle: 0,
    opticalAngle: 0,
  };
}

function sample(t: number, theta = 0, extra: Partial<Sample> = {}): Sample {
  return {
    t,
    theta,
    omega: 0,
    angularBlank: false,
    validBeats: 0,
    opticalAngle: 0,
    mechAngle: 0,
    intensity: 1,
    beamVisible: true,
    ...extra,
  };
}

function packet(partial: {
  samples?: Sample[];
  reset?: boolean;
  t?: number;
  theta?: number;
  omega?: number;
  angularBlank?: boolean;
  intensity?: number;
  chopperEnabled?: boolean;
}): FramePacket {
  return {
    samples: partial.samples ?? [],
    simDt: 0,
    reset: partial.reset ?? false,
    paused: false,
    state: solverState(partial.t ?? 0, partial.theta ?? 0, partial.omega ?? 0, partial.angularBlank ?? false),
    intensity: partial.intensity ?? 1,
    leafLengthM: 0.018,
    leafThicknessM: 0.00025,
    leafWidthM: 0.006,
    leafCount: 4,
    toothCount: 15,
    facetCount: 3,
    chromaticOffsetDeg: [0, 0, 0],
    throwM: 12,
    persistenceMs: 60,
    chopperEnabled: partial.chopperEnabled ?? true,
    liftDeg: 3.5,
    blankDeg: 2.1,
    facetTiltDeg: 15,
  };
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}
