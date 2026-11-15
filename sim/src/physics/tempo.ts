import { I_ANNULUS_KG_M2, K_BASE_N_M_PER_RAD, L0_M, L_MIN_M } from "./constants";
import { lengthForFrequency } from "./referenceModel";

export interface TempoAssessment {
  requestedBpm: number;
  subdivision: number;
  requiredHz: number | null;
  fMin: number;
  fMax: number;
  reachable: boolean;
  gapHz: number | null;
  nearestHz: number | null;
  lengthM: number | null;
  lengthInsideReferenceTravel: boolean;
  musicalBeatHz: number | null;
  note: string;
}

export function requiredOscillationHz(bpm: number, subdivision: number): number | null {
  if (!(bpm > 0) || !Number.isInteger(subdivision) || subdivision < 1) return null;
  return (bpm * subdivision) / 120;
}

export function musicalBpmForFrequency(frequencyHz: number, subdivision: number): number | null {
  if (!(frequencyHz > 0) || !Number.isInteger(subdivision) || subdivision < 1) return null;
  return (120 * frequencyHz) / subdivision;
}

export function bpmFromTapIntervals(intervalsMs: number[]): number | null {
  const usable = intervalsMs.filter((ms) => ms > 0 && ms < 4000);
  if (usable.length === 0) return null;
  const mean = usable.reduce((sum, ms) => sum + ms, 0) / usable.length;
  return 60000 / mean;
}

/**
 * Reachability under an explicit frequency interval.
 * Does not clamp the request onto the interval.
 * lengthM is the original-law length at the active inertia. It is reported
 * even when it falls outside 8.5 to 18 mm.
 */
export function assessTempo(args: {
  bpm: number;
  subdivision: number;
  fMin: number;
  fMax: number;
  inertia?: number;
}): TempoAssessment {
  const inertia = args.inertia ?? I_ANNULUS_KG_M2;
  const fMin = Math.min(args.fMin, args.fMax);
  const fMax = Math.max(args.fMin, args.fMax);
  const required = requiredOscillationHz(args.bpm, args.subdivision);
  if (required === null || !(fMax > 0)) {
    return {
      requestedBpm: args.bpm,
      subdivision: args.subdivision,
      requiredHz: required,
      fMin,
      fMax,
      reachable: false,
      gapHz: null,
      nearestHz: null,
      lengthM: null,
      lengthInsideReferenceTravel: false,
      musicalBeatHz: args.bpm > 0 ? args.bpm / 60 : null,
      note: "Tempo needs a positive BPM and an integer subdivision of at least 1.",
    };
  }

  const lengthM = lengthForFrequency(required, inertia);
  const lengthInside =
    Number.isFinite(lengthM) && lengthM <= L0_M + 1e-12 && lengthM >= L_MIN_M - 1e-12;
  const reachable = required >= fMin - 1e-9 && required <= fMax + 1e-9;
  let gapHz = 0;
  let nearestHz = required;
  if (!reachable) {
    nearestHz = required < fMin ? fMin : fMax;
    gapHz = required - nearestHz;
  }

  const kNote =
    inertia === I_ANNULUS_KG_M2
      ? "Length uses K = 0.1104 * (0.018 / L) and the reference annulus inertia."
      : "Length uses the original K law with the active inertia, not a new stiffness formula.";

  const note = reachable
    ? `Reachable in the active band ${fMin.toFixed(4)} to ${fMax.toFixed(4)} Hz. ${kNote}`
    : `Unreachable. Required ${required.toFixed(4)} Hz is outside ${fMin.toFixed(4)} to ${fMax.toFixed(4)} Hz by ${Math.abs(gapHz).toFixed(4)} Hz. No curb position was clamped to an endpoint. ${kNote}`;

  return {
    requestedBpm: args.bpm,
    subdivision: args.subdivision,
    requiredHz: required,
    fMin,
    fMax,
    reachable,
    gapHz,
    nearestHz,
    lengthM: Number.isFinite(lengthM) ? lengthM : null,
    lengthInsideReferenceTravel: lengthInside,
    musicalBeatHz: args.bpm / 60,
    note,
  };
}

export function curbFractionForLength(lengthM: number): number | null {
  if (!Number.isFinite(lengthM)) return null;
  const span = L0_M - L_MIN_M;
  return (L0_M - lengthM) / span;
}

export function referenceLawK(lengthM: number): number {
  return K_BASE_N_M_PER_RAD * (L0_M / lengthM);
}
