import { DT_S, I_ANNULUS_KG_M2 } from "../physics/constants";
import { advanceToTime, createInitialState, type SolverParams } from "../physics/EscapementSolver";
import { prescribedStiffness, viscousCoefficientForQ } from "../physics/referenceModel";
import { degToRad, radToDeg } from "../physics/units";

/**
 * Documented grid. 4 Hz and 20 Hz are the frequency-band claim ends,
 * 8 Hz is the base-frequency claim, 12 deg is the startup-angle default,
 * and 18 deg is the amplitude target. 2 deg sits under the 2.1 deg blank
 * half-angle. 40 Hz, 80 Hz, and 40 deg are sanitize caps used by the
 * one-step blank test; the provenance table does not list those three.
 */
export const BLANK_HEATMAP_FREQUENCIES_HZ = [4, 8, 20, 40, 80] as const;
export const BLANK_HEATMAP_AMPLITUDES_DEG = [2, 12, 18, 40] as const;

export type BlankCellOutcome = "holds" | "miss" | "inside" | "no-crossing";

export interface BlankHeatmapCell {
  frequencyHz: number;
  amplitudeDeg: number;
  durationS: number;
  steps: number;
  rawCrossings: number;
  blankEventCount: number;
  peakStepDeg: number;
  blankFullWidthDeg: number;
  brackets: boolean;
  outcome: BlankCellOutcome;
}

export interface BlankHeatmapInput {
  frequenciesHz: readonly number[];
  amplitudesDeg: readonly number[];
  blankHalfRad: number;
  q: number;
  inertia: number;
  liftHalfRad: number;
  unlockRad: number;
  toothCount: number;
  omegaEpsilon: number;
}

export function harmonicPeakStepDeg(amplitudeDeg: number, frequencyHz: number, dtS = DT_S): number {
  return amplitudeDeg * 2 * Math.PI * frequencyHz * dtS;
}

export function blankCellOutcome(args: {
  amplitudeRad: number;
  blankHalfRad: number;
  rawCrossings: number;
  blankEventCount: number;
}): BlankCellOutcome {
  if (args.amplitudeRad <= args.blankHalfRad) return "inside";
  if (args.rawCrossings < 1) return "no-crossing";
  if (args.blankEventCount >= args.rawCrossings) return "holds";
  return "miss";
}

export function outcomeWord(outcome: BlankCellOutcome): string {
  switch (outcome) {
    case "holds":
      return "holds";
    case "miss":
      return "miss";
    case "inside":
      return "inside";
    case "no-crossing":
      return "no crossing";
    default: {
      const unexpected: never = outcome;
      return unexpected;
    }
  }
}

function cellParams(input: BlankHeatmapInput, frequencyHz: number): SolverParams {
  const stiffness = prescribedStiffness(frequencyHz, input.inertia);
  const c0 = viscousCoefficientForQ(stiffness, input.inertia, input.q);
  return {
    inertia: input.inertia,
    stiffness,
    c0: Number.isFinite(c0) ? c0 : 0,
    cEddy: 0,
    torqueMagnitude: 0,
    liftHalfAngle: input.liftHalfRad,
    blankHalfAngle: input.blankHalfRad,
    unlockAmplitude: input.unlockRad,
    toothCount: input.toothCount,
    omegaEpsilon: input.omegaEpsilon,
  };
}

/** Half a period plus two RK4 steps, so a release from rest can leave the far side of the window. */
export function heatmapDurationS(frequencyHz: number): number {
  return 0.5 / frequencyHz + 2 * DT_S;
}

export function runBlankCell(input: BlankHeatmapInput, frequencyHz: number, amplitudeDeg: number): BlankHeatmapCell {
  const amplitudeRad = degToRad(amplitudeDeg);
  const durationS = heatmapDurationS(frequencyHz);
  const params = cellParams(input, frequencyHz);
  const finalState = advanceToTime(createInitialState(amplitudeRad, 0, input.blankHalfRad), params, durationS);
  const peakStepDeg = harmonicPeakStepDeg(amplitudeDeg, frequencyHz);
  const blankFullWidthDeg = 2 * radToDeg(input.blankHalfRad);
  return {
    frequencyHz,
    amplitudeDeg,
    durationS,
    steps: finalState.step,
    rawCrossings: finalState.rawCrossings,
    blankEventCount: finalState.blankEventCount,
    peakStepDeg,
    blankFullWidthDeg,
    brackets: peakStepDeg > blankFullWidthDeg,
    outcome: blankCellOutcome({
      amplitudeRad,
      blankHalfRad: input.blankHalfRad,
      rawCrossings: finalState.rawCrossings,
      blankEventCount: finalState.blankEventCount,
    }),
  };
}

export function runBlankHeatmap(input: BlankHeatmapInput): BlankHeatmapCell[] {
  const cells: BlankHeatmapCell[] = [];
  for (const frequencyHz of input.frequenciesHz) {
    for (const amplitudeDeg of input.amplitudesDeg) {
      cells.push(runBlankCell(input, frequencyHz, amplitudeDeg));
    }
  }
  return cells;
}

export function defaultHeatmapInput(args: {
  blankHalfRad: number;
  q: number;
  inertia?: number;
  liftHalfRad: number;
  unlockRad: number;
  toothCount: number;
  omegaEpsilon: number;
}): BlankHeatmapInput {
  return {
    frequenciesHz: BLANK_HEATMAP_FREQUENCIES_HZ,
    amplitudesDeg: BLANK_HEATMAP_AMPLITUDES_DEG,
    blankHalfRad: args.blankHalfRad,
    q: args.q,
    inertia: args.inertia ?? I_ANNULUS_KG_M2,
    liftHalfRad: args.liftHalfRad,
    unlockRad: args.unlockRad,
    toothCount: args.toothCount,
    omegaEpsilon: args.omegaEpsilon,
  };
}
