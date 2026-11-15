import {
  I_ANNULUS_KG_M2,
  K_BASE_N_M_PER_RAD,
  L0_M,
  L_MIN_M,
  SOURCE_Q,
} from "./constants";

/** Original curb law: K = 0.1104 * (0.018 / L). L is in meters. */
export function referenceStiffness(lengthM: number): number {
  if (!(lengthM > 0)) return Number.NaN;
  return K_BASE_N_M_PER_RAD * (L0_M / lengthM);
}

export function naturalFrequencyHz(stiffness: number, inertia: number): number {
  if (!(stiffness > 0) || !(inertia > 0)) return Number.NaN;
  return Math.sqrt(stiffness / inertia) / (2 * Math.PI);
}

export function referenceFrequencyHz(lengthM: number, inertia = I_ANNULUS_KG_M2): number {
  return naturalFrequencyHz(referenceStiffness(lengthM), inertia);
}

/** Length implied by the original K law at a requested frequency. Not clamped. */
export function lengthForFrequency(frequencyHz: number, inertia = I_ANNULUS_KG_M2): number {
  if (!(frequencyHz > 0) || !(inertia > 0)) return Number.NaN;
  const stiffness = inertia * (2 * Math.PI * frequencyHz) ** 2;
  return (K_BASE_N_M_PER_RAD * L0_M) / stiffness;
}

export function frequencyBandForReferenceLaw(inertia = I_ANNULUS_KG_M2): { minHz: number; maxHz: number } {
  const slow = referenceFrequencyHz(L0_M, inertia);
  const fast = referenceFrequencyHz(L_MIN_M, inertia);
  return { minHz: Math.min(slow, fast), maxHz: Math.max(slow, fast) };
}

/** c = sqrt(K I) / Q. Holds Q constant when K or I changes. */
export function viscousCoefficientForQ(stiffness: number, inertia: number, q: number): number {
  if (!(stiffness > 0) || !(inertia > 0) || !(q > 0)) return Number.NaN;
  return Math.sqrt(stiffness * inertia) / q;
}

export function referenceBaselineDamping(q = SOURCE_Q): number {
  return viscousCoefficientForQ(K_BASE_N_M_PER_RAD, I_ANNULUS_KG_M2, q);
}

/**
 * Linear energy-balance torque for a directional lift-zone drive.
 * Work per cycle is taken as 4 * tau * liftHalf, set equal to pi * K * A^2 / Q.
 * This is a prototype mapping, not a remontoire measurement.
 */
export function energyBalanceTorque(args: {
  stiffness: number;
  q: number;
  liftHalfRad: number;
  amplitudeRad: number;
}): number {
  const { stiffness, q, liftHalfRad, amplitudeRad } = args;
  if (!(stiffness > 0) || !(q > 0) || !(liftHalfRad > 0) || !(amplitudeRad > 0)) return Number.NaN;
  return (Math.PI * stiffness * amplitudeRad * amplitudeRad) / (4 * q * liftHalfRad);
}

/**
 * Simplified bending estimate from the source: sigma = E t theta / (2 L).
 * Not a crossed-flexure or 3D stress result.
 */
export function bendingStressPa(
  youngPa: number,
  thicknessM: number,
  amplitudeRad: number,
  lengthM: number,
): number {
  if (!(lengthM > 0)) return Number.NaN;
  return (youngPa * thicknessM * Math.abs(amplitudeRad)) / (2 * lengthM);
}

export function prescribedStiffness(frequencyHz: number, inertia: number): number {
  if (!(frequencyHz > 0) || !(inertia > 0)) return Number.NaN;
  return inertia * (2 * Math.PI * frequencyHz) ** 2;
}

/** Ideal harmonic time spent with |theta| <= blankHalf, one center transit. */
export function harmonicBlankDuration(
  amplitudeRad: number,
  blankHalfRad: number,
  frequencyHz: number,
): number | null {
  if (!(amplitudeRad > blankHalfRad) || !(frequencyHz > 0) || !(blankHalfRad > 0)) return null;
  const omega = 2 * Math.PI * frequencyHz;
  return (2 * Math.asin(blankHalfRad / amplitudeRad)) / omega;
}

export function mechanicalStepRad(toothCount: number): number {
  return Math.PI / toothCount;
}

export function opticalStepRad(toothCount: number): number {
  return (2 * Math.PI) / toothCount;
}

export function facetSpacingRad(facetCount: number): number {
  return (2 * Math.PI) / facetCount;
}

export function instantaneousRayCount(facetCount: number): number {
  return facetCount * 3;
}
