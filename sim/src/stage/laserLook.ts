import { STAGE } from "./stageGeometry";

/**
 * Display radii. Not a measured beam diameter.
 * Thick enough to read from the audience camera, and still under the legacy 80 mm shaft.
 */
export const CORE_RADIUS_M = 0.022;
export const SHEATH_RADIUS_M = 0.07;
export const SPOT_RADIUS_M = 0.07;

/** Fixed display haze for the mechanical close-up, which has no haze slider. */
export const MECHANICAL_HAZE = 0.4;

export function coreOpacity(intensity: number, haze: number): number {
  if (!(intensity > 0) || !(haze > 0)) return 0;
  return Math.min(0.95, 0.62 + 0.3 * Math.min(1, intensity));
}

export function sheathOpacity(intensity: number, haze: number): number {
  if (!(intensity > 0) || !(haze > 0)) return 0;
  return Math.min(0.1, intensity * (0.03 + 0.05 * Math.min(1, haze)));
}

/** The volume needs haze. The spot on the card does not. A blank turns both off. */
export function laserVisible(intensity: number, chopperEnabled: boolean, angularBlank: boolean, haze: number): {
  beam: boolean;
  spot: boolean;
} {
  const on = intensity > 0 && !(chopperEnabled && angularBlank);
  return { beam: on && haze > 0, spot: on };
}

export function beamIsThinnerThanLegacyShaft(): boolean {
  return SHEATH_RADIUS_M < STAGE.displayShaftRadiusM && CORE_RADIUS_M < SHEATH_RADIUS_M;
}
