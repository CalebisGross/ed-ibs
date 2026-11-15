import { radToDeg } from "../physics/units";

export function formatSeconds(tSeconds: number): string {
  if (!Number.isFinite(tSeconds)) return "n/a";
  return `${tSeconds.toFixed(3)} s`;
}

export function formatSpan(startSeconds: number, endSeconds: number, sampleCount: number): string {
  if (sampleCount <= 0) return "n/a";
  return `${formatSeconds(startSeconds)} to ${formatSeconds(endSeconds)}`;
}

export function formatDegrees(radians: number): string {
  if (!Number.isFinite(radians)) return "n/a";
  return `${radToDeg(radians).toFixed(3)} deg`;
}

export function formatRadiansPerSecond(omega: number): string {
  if (!Number.isFinite(omega)) return "n/a";
  return `${omega.toFixed(3)} rad/s`;
}

export function formatBlank(angularBlank: boolean): string {
  return angularBlank ? "inside" : "outside";
}

export function formatBeam(beamVisible: boolean): string {
  return beamVisible ? "visible" : "off";
}
