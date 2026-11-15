import { describe, expect, it } from "vitest";
import { DEFAULT_FACET_TILT_RAD } from "../src/optics/projection";
import {
  COINCIDENT_SHAFT_CSS,
  STAGE,
  STAGE_COPY,
  audienceCamera,
  clothContains,
  displayShaftOpacity,
  figureFeet,
  figureTopM,
  fixtureAperture,
  fixtureCamera,
  instantaneousCount,
  liveBeams,
  nextTrail,
  sideCamera,
  visualShafts,
  wallPoint,
} from "../src/stage/stageGeometry";
import { degToRad } from "../src/physics/units";

const base = {
  theta: 0,
  opticalAngle: 0,
  facetCount: 3,
  throwM: 12,
  chromaticOffsetRad: [0, 0, 0] as [number, number, number],
  facetTiltRad: DEFAULT_FACET_TILT_RAD,
};

describe("stage beam mapping", () => {
  it("places endpoints on the throw plane using the wall formula", () => {
    const beams = liveBeams({ ...base, beamVisible: true });
    expect(beams).toHaveLength(9);
    expect(instantaneousCount(3)).toBe(9);
    const radius = 12 * Math.tan(DEFAULT_FACET_TILT_RAD);
    const first = beams[0];
    expect(first.from).toEqual(fixtureAperture());
    expect(first.to.z).toBe(12);
    expect(first.to.x).toBeCloseTo(radius, 8);
    expect(first.to.y).toBeCloseTo(STAGE.apertureHeightM, 8);
    expect(first.to).toEqual(wallPoint(radius, 0, 12));
    expect(beams[1].to).toEqual(first.to);
    expect(beams[2].to).toEqual(first.to);
    const drawn = visualShafts(beams);
    expect(drawn).toHaveLength(3);
    expect(drawn.every((shaft) => shaft.channels === 3)).toBe(true);
    expect(drawn[0].css).toBe(COINCIDENT_SHAFT_CSS);
    expect(drawn[0].to).toEqual(first.to);
  });

  it("does not add rays when the source is off or the chopper blanks the sample", () => {
    expect(liveBeams({ ...base, beamVisible: false })).toEqual([]);
    const swung = liveBeams({
      ...base,
      theta: degToRad(10),
      opticalAngle: degToRad(24),
      beamVisible: true,
    });
    expect(swung).toHaveLength(9);
    expect(swung[0].to.z).toBe(12);
    expect(swung[0].to.y).not.toBeCloseTo(STAGE.apertureHeightM, 2);
  });

  it("keeps a negative radial coordinate instead of clamping it onto the cloth", () => {
    const beams = liveBeams({
      ...base,
      theta: degToRad(-18),
      opticalAngle: Math.PI / 2,
      throwM: 10,
      facetCount: 1,
      beamVisible: true,
    });
    expect(beams).toHaveLength(3);
    expect(beams[0].to.z).toBe(10);
    expect(beams[0].to.y).toBeLessThan(0);
    expect(beams[0].onCloth).toBe(false);
    expect(clothContains({ x: 0, y: 2.4, z: 10 }, 10)).toBe(true);
  });

  it("treats afterglow as a time window, separate from the live ray count", () => {
    const added = [0, 1, 2].map((t) => ({ t, x: t, y: 1, z: 12, channel: 0 }));
    const kept = nextTrail([], added, 2, 1, false);
    expect(kept.map((point) => point.t)).toEqual([1, 2]);
    expect(kept.length).toBeLessThan(instantaneousCount(3));
    const more = nextTrail(kept, Array.from({ length: 12 }, (_, index) => ({
      t: 2,
      x: index,
      y: 1,
      z: 12,
      channel: index % 3,
    })), 2, 1, false);
    expect(more.length).toBeGreaterThan(instantaneousCount(3));
    expect(nextTrail(more, [], 2, 1, true)).toEqual([]);
    expect(nextTrail(kept, [], 2, 1, false)).toHaveLength(2);
    expect(STAGE_COPY.trail.toLowerCase()).toContain("not more rays");
  });
});

describe("stage presentation scale", () => {
  it("uses an assumed 1.75 m figure and a level 2.4 m aperture", () => {
    expect(figureTopM()).toBeCloseTo(STAGE.figureHeightM, 8);
    expect(STAGE.figureHeightM).toBe(1.75);
    expect(fixtureAperture().y).toBe(2.4);
    expect(figureFeet(12).y).toBe(0);
    expect(figureFeet(12).z).toBeGreaterThan(0);
    expect(figureFeet(12).z).toBeLessThan(12);
    expect(figureFeet(5).z).toBeLessThan(5);
    expect(displayShaftOpacity(0, 1)).toBe(0);
    expect(displayShaftOpacity(1, 0)).toBeGreaterThan(0);
    expect(displayShaftOpacity(1, 1)).toBeGreaterThan(displayShaftOpacity(1, 0));
  });

  it("keeps the audience downstage and the side camera off the optical axis", () => {
    for (const throwM of [5, 12, 50]) {
      const audience = audienceCamera(throwM);
      const side = sideCamera(throwM);
      const fixture = fixtureCamera(throwM);
      expect(audience.position.z).toBeLessThan(0);
      expect(audience.target.z).toBeGreaterThan(0);
      expect(side.position.x).toBeLessThan(-2);
      expect(fixture.position.z).toBeLessThan(0);
      expect(Number.isFinite(audience.position.y)).toBe(true);
      expect(Number.isFinite(side.target.z)).toBe(true);
      expect(audience.fov).toBeGreaterThan(20);
      expect(fixture.fov).toBeGreaterThan(20);
    }
  });
});
