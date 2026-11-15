import type { MaterialId } from "../physics/constants";
import { I_ANNULUS_KG_M2, L0_M, L_MIN_M } from "../physics/constants";
import type { PowerCutMode } from "../physics/powerCut";
import {
  frequencyBandForReferenceLaw,
  naturalFrequencyHz,
  prescribedStiffness,
  referenceStiffness,
} from "../physics/referenceModel";
import { assessTempo, curbFractionForLength, type TempoAssessment } from "../physics/tempo";
import { clamp, lerp } from "../physics/units";

export type StiffnessMode = "reference-law" | "prescribed-frequency";
export type DampingMode = "hold-q" | "fixed-c0-reference";
export type TorqueMapMode = "energy-balance-current-k" | "energy-balance-frozen-reference-k";
export type InertiaMode = "reference-annulus" | "custom";
export type ViewMode = "stage" | "engineering";

export interface Settings {
  stiffnessMode: StiffnessMode;
  dampingMode: DampingMode;
  torqueMapMode: TorqueMapMode;
  inertiaMode: InertiaMode;
  customInertia: number;
  dmxTorque: number;
  dmxCurb: number;
  dmxBrake: number;
  dmxIntensity: number;
  toothCount: number;
  facetCount: number;
  thicknessM: number;
  leafWidthM: number;
  materialId: MaterialId;
  throwM: number;
  persistenceMs: number;
  chopperEnabled: boolean;
  chromaticOffsetDeg: [number, number, number];
  qFactor: number;
  brakeQFloor: number;
  amplitudeTargetDeg: number;
  liftDeg: number;
  blankDeg: number;
  unlockDeg: number;
  torqueScale: number;
  prescribedFLow: number;
  prescribedFHigh: number;
  theta0Deg: number;
  omega0: number;
  unwindSeconds: number;
  subdivision: number;
  targetBpm: number;
  leafCountVisual: number;
  powerCutMode: PowerCutMode;
  omegaEpsilon: number;
  ringAxialMm: number;
  viewMode: ViewMode;
  hazeDisplay: number;
}

export const SETTINGS_STORAGE_KEY = "ed-ibs-prototype-settings-v1";

export const defaultSettings: Settings = {
  stiffnessMode: "reference-law",
  dampingMode: "hold-q",
  torqueMapMode: "energy-balance-current-k",
  inertiaMode: "reference-annulus",
  customInertia: I_ANNULUS_KG_M2,
  dmxTorque: 0.75,
  dmxCurb: 0,
  dmxBrake: 0,
  dmxIntensity: 0.85,
  toothCount: 15,
  facetCount: 3,
  thicknessM: 0.00025,
  leafWidthM: 0.006,
  materialId: "ti-6al-4v",
  throwM: 12,
  persistenceMs: 60,
  chopperEnabled: true,
  chromaticOffsetDeg: [0, 0, 0],
  qFactor: 350,
  brakeQFloor: 20,
  amplitudeTargetDeg: 18,
  liftDeg: 3.5,
  blankDeg: 2.1,
  unlockDeg: 3.5,
  torqueScale: 1,
  prescribedFLow: 4,
  prescribedFHigh: 20,
  theta0Deg: 12,
  omega0: 0,
  unwindSeconds: 15,
  subdivision: 8,
  targetBpm: 120,
  leafCountVisual: 4,
  powerCutMode: "total-source-off",
  omegaEpsilon: 1e-6,
  ringAxialMm: 4,
  viewMode: "stage",
  hazeDisplay: 0.7,
};

export function sanitizeSettings(input: Partial<Settings> | null | undefined): Settings {
  const d = defaultSettings;
  const src = input ?? {};
  const chromatic = Array.isArray(src.chromaticOffsetDeg) ? src.chromaticOffsetDeg : d.chromaticOffsetDeg;
  return {
    stiffnessMode: src.stiffnessMode === "prescribed-frequency" ? "prescribed-frequency" : "reference-law",
    dampingMode: src.dampingMode === "fixed-c0-reference" ? "fixed-c0-reference" : "hold-q",
    torqueMapMode:
      src.torqueMapMode === "energy-balance-frozen-reference-k"
        ? "energy-balance-frozen-reference-k"
        : "energy-balance-current-k",
    inertiaMode: src.inertiaMode === "custom" ? "custom" : "reference-annulus",
    customInertia: positive(src.customInertia, d.customInertia),
    dmxTorque: clamp(num(src.dmxTorque, d.dmxTorque), 0, 1),
    dmxCurb: clamp(num(src.dmxCurb, d.dmxCurb), 0, 1),
    dmxBrake: clamp(num(src.dmxBrake, d.dmxBrake), 0, 1),
    dmxIntensity: clamp(num(src.dmxIntensity, d.dmxIntensity), 0, 1),
    toothCount: clamp(Math.round(num(src.toothCount, d.toothCount)), 12, 24),
    facetCount: clamp(Math.round(num(src.facetCount, d.facetCount)), 1, 6),
    thicknessM: clamp(num(src.thicknessM, d.thicknessM), 0.00025, 0.0016),
    leafWidthM: clamp(num(src.leafWidthM, d.leafWidthM), 0.0005, 0.02),
    materialId:
      src.materialId === "ss-17-4" || src.materialId === "resin-petg" || src.materialId === "ti-6al-4v"
        ? src.materialId
        : d.materialId,
    throwM: clamp(num(src.throwM, d.throwM), 5, 50),
    persistenceMs: clamp(num(src.persistenceMs, d.persistenceMs), 1, 2000),
    chopperEnabled: typeof src.chopperEnabled === "boolean" ? src.chopperEnabled : d.chopperEnabled,
    chromaticOffsetDeg: [
      clamp(num(chromatic[0], 0), -30, 30),
      clamp(num(chromatic[1], 0), -30, 30),
      clamp(num(chromatic[2], 0), -30, 30),
    ],
    qFactor: clamp(num(src.qFactor, d.qFactor), 5, 5000),
    brakeQFloor: clamp(num(src.brakeQFloor, d.brakeQFloor), 2, 5000),
    amplitudeTargetDeg: clamp(num(src.amplitudeTargetDeg, d.amplitudeTargetDeg), 1, 40),
    liftDeg: clamp(num(src.liftDeg, d.liftDeg), 0.2, 20),
    blankDeg: clamp(num(src.blankDeg, d.blankDeg), 0.05, 20),
    unlockDeg: clamp(num(src.unlockDeg, d.unlockDeg), 0.2, 40),
    torqueScale: clamp(num(src.torqueScale, d.torqueScale), 0, 5),
    prescribedFLow: clamp(num(src.prescribedFLow, d.prescribedFLow), 0.2, 80),
    prescribedFHigh: clamp(num(src.prescribedFHigh, d.prescribedFHigh), 0.2, 80),
    theta0Deg: clamp(num(src.theta0Deg, d.theta0Deg), -40, 40),
    omega0: clamp(num(src.omega0, d.omega0), -400, 400),
    unwindSeconds: clamp(num(src.unwindSeconds, d.unwindSeconds), 0.5, 120),
    subdivision: clamp(Math.round(num(src.subdivision, d.subdivision)), 1, 128),
    targetBpm: clamp(num(src.targetBpm, d.targetBpm), 1, 400),
    leafCountVisual: clamp(Math.round(num(src.leafCountVisual, d.leafCountVisual)), 4, 16),
    powerCutMode: src.powerCutMode === "retained-source-diagnostic" ? "retained-source-diagnostic" : "total-source-off",
    omegaEpsilon: clamp(num(src.omegaEpsilon, d.omegaEpsilon), 1e-9, 1),
    ringAxialMm: clamp(num(src.ringAxialMm, d.ringAxialMm), 0.5, 30),
    viewMode: src.viewMode === "engineering" ? "engineering" : "stage",
    hazeDisplay: clamp(num(src.hazeDisplay, d.hazeDisplay), 0, 1),
  };
}

export function loadSettings(): Settings {
  if (typeof localStorage === "undefined") return { ...defaultSettings, chromaticOffsetDeg: [0, 0, 0] };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return sanitizeSettings(defaultSettings);
    return sanitizeSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return sanitizeSettings(defaultSettings);
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable. The session still runs.
  }
}

export function clearStoredSettings(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function activeInertia(settings: Settings): number {
  return settings.inertiaMode === "custom" ? settings.customInertia : I_ANNULUS_KG_M2;
}

export function activeFrequencyBand(settings: Settings): { minHz: number; maxHz: number } {
  if (settings.stiffnessMode === "reference-law") {
    return frequencyBandForReferenceLaw(activeInertia(settings));
  }
  return {
    minHz: Math.min(settings.prescribedFLow, settings.prescribedFHigh),
    maxHz: Math.max(settings.prescribedFLow, settings.prescribedFHigh),
  };
}

export function prescribedFrequencyHz(settings: Settings): number {
  return lerp(settings.prescribedFLow, settings.prescribedFHigh, clamp(settings.dmxCurb, 0, 1));
}

export function activeStiffness(settings: Settings): number {
  if (settings.stiffnessMode === "reference-law") {
    return referenceStiffness(curbLengthM(settings.dmxCurb));
  }
  return prescribedStiffness(prescribedFrequencyHz(settings), activeInertia(settings));
}

export function activeAnalyticHz(settings: Settings): number {
  return naturalFrequencyHz(activeStiffness(settings), activeInertia(settings));
}

export function tempoAssessmentFor(settings: Settings, bpm = settings.targetBpm): TempoAssessment {
  const band = activeFrequencyBand(settings);
  return assessTempo({
    bpm,
    subdivision: settings.subdivision,
    fMin: band.minHz,
    fMax: band.maxHz,
    inertia: activeInertia(settings),
  });
}

/** Returns updated settings only when the request sits inside the active band. */
export function settingsWithTempoApplied(settings: Settings, bpm = settings.targetBpm): {
  settings: Settings | null;
  assessment: TempoAssessment;
} {
  const assessment = tempoAssessmentFor(settings, bpm);
  if (!assessment.reachable || assessment.requiredHz === null) {
    return { settings: null, assessment };
  }
  if (settings.stiffnessMode === "reference-law") {
    if (assessment.lengthM === null || !assessment.lengthInsideReferenceTravel) {
      return { settings: null, assessment };
    }
    const fraction = curbFractionForLength(assessment.lengthM);
    if (fraction === null || fraction < -1e-6 || fraction > 1 + 1e-6) {
      return { settings: null, assessment };
    }
    return {
      settings: { ...settings, targetBpm: bpm, dmxCurb: clamp(fraction, 0, 1) },
      assessment,
    };
  }
  const span = settings.prescribedFHigh - settings.prescribedFLow;
  if (!(Math.abs(span) > 0)) return { settings: null, assessment };
  const fraction = (assessment.requiredHz - settings.prescribedFLow) / span;
  if (fraction < -1e-6 || fraction > 1 + 1e-6) return { settings: null, assessment };
  return {
    settings: { ...settings, targetBpm: bpm, dmxCurb: clamp(fraction, 0, 1) },
    assessment,
  };
}

export function curbLengthM(dmxCurb: number): number {
  return L0_M + (L_MIN_M - L0_M) * clamp(dmxCurb, 0, 1);
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

function positive(value: unknown, fallback: number): number {
  const n = num(value, fallback);
  return n > 0 ? n : fallback;
}
