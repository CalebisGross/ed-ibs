import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I_ANNULUS_KG_M2, SOURCE_BLANK_DEG, SOURCE_Q } from "../src/physics/constants";
import {
  createInitialState,
  step,
  type SolverParams,
  type SolverState,
} from "../src/physics/EscapementSolver";
import { engagePowerCut, idlePower } from "../src/physics/powerCut";
import { degToRad } from "../src/physics/units";
import { solveCommand } from "../src/sim/parameters";
import { defaultSettings } from "../src/sim/settings";
import type { Sample } from "../src/sim/useSimulator";
import {
  BLANK_HEATMAP_AMPLITUDES_DEG,
  BLANK_HEATMAP_FREQUENCIES_HZ,
  defaultHeatmapInput,
  harmonicPeakStepDeg,
  runBlankCell,
  runBlankHeatmap,
} from "../src/panels/blankHeatmap";
import { timelineMarks } from "../src/panels/blankTimeline";
import { readEscapement } from "../src/panels/escapementReading";
import { illustrativeRestRelease, runReferenceDecay, runReferenceUnwind } from "../src/panels/phaseSeries";
import { SeeWhyPanels } from "../src/panels/SeeWhyPanels";
import { sessionTrailLabel } from "../src/panels/PhasePortrait";
import {
  DISPLAYED_PROVENANCE_IDS,
  PROVENANCE_ROWS,
  isProvenanceStatus,
  provenanceById,
  provenanceHover,
} from "../src/panels/provenance";

const ALLOWED_DECISIONS = new Set(["D-02", "D-04", "D-33", "D-34", "D-35", "D-36", "D-37"]);
const ALLOWED_PAGES = new Set(["blueprints PDF p2", "Blueprints PDF p1"]);

function sampleFrom(state: SolverState): Sample {
  return {
    t: state.t,
    theta: state.theta,
    omega: state.omega,
    angularBlank: state.angularBlank,
    validBeats: state.validBeats,
    opticalAngle: state.opticalAngle,
    mechAngle: state.mechAngle,
    intensity: 0,
    beamVisible: false,
  };
}

describe("provenance badges", () => {
  it("keeps every row on the four table statuses and only documented hover targets", () => {
    expect(PROVENANCE_ROWS.length).toBeGreaterThan(40);
    for (const row of PROVENANCE_ROWS) {
      expect(isProvenanceStatus(row.status)).toBe(true);
      if (row.decisionId) expect(ALLOWED_DECISIONS.has(row.decisionId)).toBe(true);
      if (row.pdfPage) expect(ALLOWED_PAGES.has(row.pdfPage)).toBe(true);
      const hover = provenanceHover(row);
      if (!row.decisionId && !row.pdfPage) expect(hover).toBeNull();
      if (row.decisionId) expect(hover).toContain(row.decisionId);
      if (row.pdfPage) expect(hover).toContain(row.pdfPage);
    }
  });

  it("resolves the figures the panels display and does not invent a missing row", () => {
    for (const id of DISPLAYED_PROVENANCE_IDS) {
      expect(provenanceById(id)).not.toBeNull();
    }
    expect(provenanceById("not-a-table-row")).toBeNull();
    expect(provenanceHover(provenanceById("tooth-count")!)).toBe("blueprints PDF p2");
    expect(provenanceHover(provenanceById("q-factor")!)).toBe("D-34");
    expect(provenanceHover(provenanceById("frequency-band")!)).toBe("Blueprints PDF p1");
    expect(provenanceById("young-17-4")!.status).toBe("unsourced");
    expect(provenanceHover(provenanceById("young-17-4")!)).toBeNull();
    expect(provenanceById("blank-half-angle")!.status).toBe("conflicting");
    expect(provenanceById("annulus-inertia")!.status).toBe("derived");
    expect(provenanceById("dt")!.status).toBe("sourced");
  });
});

describe("escapement chart reading", () => {
  it("lights the release box from the initial solver state", () => {
    const state = createInitialState(degToRad(defaultSettings.theta0Deg), 0, degToRad(defaultSettings.blankDeg));
    const reading = readEscapement(state, defaultSettings, idlePower());
    expect(reading.swing).toBe("Released outside the lift zone");
    expect(reading.drive).toBe("No drive torque");
    expect(reading.supply).toBe("Drive commanded");
    expect(reading.blank).toBe("No blank measured yet");
    expect(reading.unmappedReason).toBeNull();
  });

  it("follows a real step into the blank window", () => {
    const power = idlePower();
    let state = createInitialState(degToRad(12), 0, degToRad(2.1));
    const params = solveCommand(defaultSettings, power, 0).params;
    let sawFree = false;
    let sawBlank = false;
    for (let i = 0; i < 2000 && !sawBlank; i += 1) {
      state = step(state, params);
      const reading = readEscapement(state, defaultSettings, power);
      if (reading.swing === "Free swing, toward the center") sawFree = true;
      if (reading.swing === "Blank window, toward the center") sawBlank = true;
    }
    expect(sawFree).toBe(true);
    expect(sawBlank).toBe(true);
    expect(state.blankEventCount).toBe(0);
  });

  it("lights the post-horizon boxes from the power latch and sim time", () => {
    const state = {
      ...createInitialState(degToRad(10), 1, degToRad(2.1)),
      t: 16,
    };
    const off = engagePowerCut({ mode: "total-source-off", simTime: 0, torqueAtCut: 0.001 });
    const late = readEscapement(state, defaultSettings, off);
    expect(late.clockLate).toBe(true);
    expect(late.swing).toBe("Still swinging after fifteen seconds");
    expect(late.supply).toBe("Fifteen seconds with the source off");
    expect(late.drive).toBe("No drive torque");
    expect(late.geometricSwing).toBe("Free swing, toward the end of the swing");

    const earlyState = { ...state, t: 1 };
    const retained = engagePowerCut({ mode: "retained-source-diagnostic", simTime: 0, torqueAtCut: 0.001 });
    const inside = {
      ...createInitialState(degToRad(2), 2, degToRad(2.1)),
      t: 1,
    };
    const unwind = readEscapement(inside, defaultSettings, retained);
    expect(unwind.supply).toBe("Unwinding, source still lit");
    expect(unwind.drive).toBe("Drive torque while moving");
    expect(readEscapement(earlyState, defaultSettings, off).supply).toBe("Source off, torque already gone");
  });

  it("leaves rest at zero unmapped", () => {
    const state = createInitialState(0, 0, degToRad(2.1));
    const reading = readEscapement(state, defaultSettings, idlePower());
    expect(reading.swing).toBeNull();
    expect(reading.unmappedReason).toContain("still inside the lift zone");
  });
});

describe("blank timeline", () => {
  it("marks a one-step transit from solver endpoints", () => {
    const frequencyHz = 80;
    const amplitudeDeg = 40;
    const omega = 2 * Math.PI * frequencyHz;
    const amp = degToRad(amplitudeDeg);
    const blank = degToRad(SOURCE_BLANK_DEG);
    const params: SolverParams = {
      inertia: I_ANNULUS_KG_M2,
      stiffness: I_ANNULUS_KG_M2 * omega * omega,
      c0: 0,
      cEddy: 0,
      torqueMagnitude: 0,
      liftHalfAngle: degToRad(3.5),
      blankHalfAngle: blank,
      unlockAmplitude: degToRad(3.5),
      toothCount: 15,
      omegaEpsilon: 1e-6,
    };
    const theta0 = degToRad(2.5);
    const omega0 = -omega * Math.sqrt(Math.max(0, amp * amp - theta0 * theta0));
    const before = createInitialState(theta0, omega0, blank);
    const after = step(before, params);
    const marks = timelineMarks([sampleFrom(before), sampleFrom(after)], blank, null);
    expect(after.blankEventCount).toBe(1);
    expect(marks[0].bracketsWindow).toBe(false);
    expect(marks[1].bracketsWindow).toBe(true);
    expect(marks[1].angularBlank).toBe(false);
    expect(marks[1].thetaDeg).toBeCloseTo((after.theta * 180) / Math.PI, 6);
  });

  it("returns no marks when the solver has not sampled", () => {
    expect(timelineMarks([], degToRad(2.1), null)).toEqual([]);
  });
});

describe("blank heatmap", () => {
  const input = defaultHeatmapInput({
    blankHalfRad: degToRad(SOURCE_BLANK_DEG),
    q: SOURCE_Q,
    liftHalfRad: degToRad(3.5),
    unlockRad: degToRad(3.5),
    toothCount: 15,
    omegaEpsilon: 1e-6,
  });

  it("uses the documented grid", () => {
    expect(BLANK_HEATMAP_FREQUENCIES_HZ).toEqual([4, 8, 20, 40, 80]);
    expect(BLANK_HEATMAP_AMPLITUDES_DEG).toEqual([2, 12, 18, 40]);
    expect(harmonicPeakStepDeg(40, 80)).toBeGreaterThan(4.2);
    expect(harmonicPeakStepDeg(18, 8)).toBeLessThan(4.2);
  });

  it("holds on the danger-zone cell and stays inside under the blank half-angle", () => {
    const danger = runBlankCell(input, 80, 40);
    expect(danger.outcome).toBe("holds");
    expect(danger.brackets).toBe(true);
    expect(danger.blankEventCount).toBe(danger.rawCrossings);
    expect(danger.rawCrossings).toBeGreaterThan(0);

    const inside = runBlankCell(input, 8, 2);
    expect(inside.outcome).toBe("inside");

    const ordinary = runBlankCell(input, 8, 18);
    expect(ordinary.outcome).toBe("holds");
    expect(ordinary.brackets).toBe(false);
  });

  it("finds no missed blank on the documented grid", () => {
    const cells = runBlankHeatmap(input);
    expect(cells).toHaveLength(20);
    expect(cells.some((cell) => cell.outcome === "miss")).toBe(false);
    expect(cells.filter((cell) => cell.amplitudeDeg === 2).every((cell) => cell.outcome === "inside")).toBe(true);
  });
});

describe("phase series", () => {
  it("labels the closed form illustrative and starts it from rest", () => {
    const series = illustrativeRestRelease(8);
    expect(series.kind).toBe("illustrative");
    expect(series.points[0].thetaDeg).toBeCloseTo(18, 6);
    expect(series.points[0].omegaRadPerS).toBeCloseTo(0, 6);
    expect(series.envelopeRatio).toBeGreaterThan(0.3);
    expect(series.envelopeRatio).toBeLessThan(0.4);
  });

  it("produces the Q 350 tail and the retained unwind from the solver", () => {
    const decay = runReferenceDecay();
    const unwind = runReferenceUnwind();
    expect(decay.kind).toBe("solver");
    expect(unwind.kind).toBe("solver");
    expect(decay.q).toBe(350);
    expect(decay.torqueAtStart).toBe(0);
    expect(unwind.torqueAtStart).toBeGreaterThan(0);
    expect(decay.points.length).toBeGreaterThan(100);
    expect(decay.finalAmplitudeDeg / decay.amplitudeDeg).toBeGreaterThan(0.3);
    expect(decay.finalAmplitudeDeg / decay.amplitudeDeg).toBeLessThan(0.4);
    expect(decay.finalAmplitudeDeg).not.toBe(unwind.finalAmplitudeDeg);
    expect(sessionTrailLabel(idlePower(), 0, 15)).toBe("Drive is commanded.");
    expect(sessionTrailLabel(engagePowerCut({ mode: "total-source-off", simTime: 0, torqueAtCut: 1 }), 1, 15)).toContain(
      "free decay",
    );
  });
});

describe("SeeWhyPanels", () => {
  it("renders the five panels from the simulator read surface", () => {
    const html = renderToStaticMarkup(
      createElement(SeeWhyPanels, {
        readout: {
          state: createInitialState(degToRad(12), 0, degToRad(2.1)),
          fps: null,
        },
        subscribe: () => () => {},
        settings: defaultSettings,
        power: idlePower(),
        paused: false,
      }),
    );
    expect(html).toContain("see-why-panels");
    expect(html).toContain("Released outside the lift zone");
    expect(html).toContain("No RK4 steps yet");
    expect(html).toContain("Q 350 tail is not in solver output yet");
    expect(html).toContain("frequency (Hz)");
    expect(html).toContain("amplitude (deg)");
    expect(html).toContain("angle (rad)");
    expect(html).toContain("rad/s");
    const phase = html.slice(html.indexOf('data-testid="see-why-phase"'));
    const plotEnd = phase.indexOf("</svg>");
    const legendAt = phase.indexOf("see-why-phase-legend");
    expect(plotEnd).toBeGreaterThan(-1);
    expect(legendAt).toBeGreaterThan(plotEnd);
    expect(html).toContain("data-outcome=\"holds\"");
    expect(html).toContain("data-outcome=\"inside\"");
    expect(html).toContain("data-brackets=\"true\"");
    expect(html).toContain(">sourced<");
    expect(html).toContain(">conflicting<");
    expect(html).not.toContain("data-outcome=\"miss\"");
  });
});
