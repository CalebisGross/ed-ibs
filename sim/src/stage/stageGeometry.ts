import { projectRays, type ProjectionInput } from "../optics/projection";
import { instantaneousRayCount } from "../physics/referenceModel";

/**
 * Presentation frame for the audience preview.
 * Optical wall coordinates stay in meters. They are not rescaled to fit the cloth.
 * Room sizes, mount height, haze, and shaft radius are display assumptions.
 */

export const STAGE = {
  figureHeightM: 1.75,
  apertureHeightM: 2.4,
  clothWidthM: 16,
  clothHeightM: 9,
  surroundWidthM: 30,
  surroundHeightM: 16,
  displayShaftRadiusM: 0.08,
  displaySpotRadiusM: 0.14,
} as const;

export const STAGE_COPY = {
  disclosure:
    "Brightness, haze, and shaft thickness are illustrative. They are not a photometric calibration and not a laser-safety result.",
  trail: "Afterglow is accumulated visible samples over the persistence time. It is not more rays.",
  scenery:
    "Floor, cloth, stand, room, and the 1.75 m figure are presentation scale. They are not an approved enclosure or a measured room.",
  axis:
    "The optical axis is drawn level at 2.4 m. Wall Y is added to that height. Large angles can leave the cloth or cross the floor.",
} as const;

export interface StageVec {
  x: number;
  y: number;
  z: number;
}

export interface LiveBeam {
  facet: number;
  channel: number;
  css: string;
  from: StageVec;
  to: StageVec;
  onCloth: boolean;
}

export interface TrailPoint extends StageVec {
  t: number;
  channel: number;
}

export interface CameraPose {
  position: StageVec;
  target: StageVec;
  fov: number;
}

export interface VisualShaft {
  from: StageVec;
  to: StageVec;
  css: string;
  channels: number;
}

/** One drawn shaft per distinct endpoint. Coincident channels stay on that path. */
export function visualShafts(beams: readonly LiveBeam[]): VisualShaft[] {
  const groups = new Map<string, LiveBeam[]>();
  for (const beam of beams) {
    const key = `${beam.to.x.toFixed(4)}:${beam.to.y.toFixed(4)}:${beam.to.z.toFixed(4)}`;
    const list = groups.get(key);
    if (list) list.push(beam);
    else groups.set(key, [beam]);
  }
  const shafts: VisualShaft[] = [];
  for (const group of groups.values()) {
    shafts.push({
      from: group[0].from,
      to: group[0].to,
      css: group.length === 1 ? group[0].css : mixCss(group.map((beam) => beam.css)),
      channels: group.length,
    });
  }
  return shafts;
}

function mixCss(colors: readonly string[]): string {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const color of colors) {
    const value = Number.parseInt(color.slice(1), 16);
    red += (value >> 16) & 255;
    green += (value >> 8) & 255;
    blue += value & 255;
  }
  const count = Math.max(1, colors.length);
  const channel = (value: number) => Math.round(value / count).toString(16).padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

export type StageCameraName = "audience" | "side" | "fixture";

export function fixtureAperture(): StageVec {
  return { x: 0, y: STAGE.apertureHeightM, z: 0 };
}

/** Backdrop plane is z = throw. The endpoint is the model wall point, not a clipped one. */
export function wallPoint(wallX: number, wallY: number, throwM: number): StageVec {
  return {
    x: wallX,
    y: STAGE.apertureHeightM + wallY,
    z: throwM,
  };
}

export function clothContains(point: StageVec, throwM: number): boolean {
  if (Math.abs(point.z - throwM) > 1e-6) return false;
  const half = STAGE.clothWidthM / 2;
  return point.x >= -half && point.x <= half && point.y >= 0 && point.y <= STAGE.clothHeightM;
}

export function liveBeams(input: ProjectionInput & { beamVisible: boolean }): LiveBeam[] {
  if (!input.beamVisible || !(input.throwM > 0)) return [];
  const from = fixtureAperture();
  return projectRays(input).map((ray) => {
    const to = wallPoint(ray.x, ray.y, input.throwM);
    return {
      facet: ray.facet,
      channel: ray.channel,
      css: ray.css,
      from,
      to,
      onCloth: clothContains(to, input.throwM),
    };
  });
}

export function instantaneousCount(facetCount: number): number {
  return instantaneousRayCount(facetCount);
}

export function displayShaftOpacity(intensity: number, haze: number): number {
  const gain = Math.min(1, Math.max(0, intensity));
  const fog = Math.min(1, Math.max(0, haze));
  return gain * (0.22 + 0.5 * fog);
}

export function nextTrail(
  previous: readonly TrailPoint[],
  added: readonly TrailPoint[],
  now: number,
  persistenceS: number,
  reset: boolean,
): TrailPoint[] {
  if (reset || !(persistenceS > 0)) return [];
  const kept: TrailPoint[] = [];
  for (const point of previous) {
    if (now - point.t <= persistenceS) kept.push(point);
  }
  for (const point of added) {
    if (now - point.t <= persistenceS) kept.push(point);
  }
  return kept;
}

export function figureFeet(throwM: number): StageVec {
  const z = Math.min(3.4, Math.max(1.6, throwM * 0.42));
  return { x: 2.55, y: 0, z };
}

export interface FigurePart {
  name: string;
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
}

/** Box centers. The top of the head is STAGE.figureHeightM. */
export function figureParts(): readonly FigurePart[] {
  return [
    { name: "leg-l", w: 0.16, h: 0.84, d: 0.16, x: -0.1, y: 0.42, z: 0 },
    { name: "leg-r", w: 0.16, h: 0.84, d: 0.16, x: 0.1, y: 0.42, z: 0 },
    { name: "torso", w: 0.4, h: 0.52, d: 0.2, x: 0, y: 1.14, z: 0 },
    { name: "arm-l", w: 0.1, h: 0.48, d: 0.1, x: -0.28, y: 1.16, z: 0 },
    { name: "arm-r", w: 0.1, h: 0.48, d: 0.1, x: 0.28, y: 1.16, z: 0 },
    { name: "head", w: 0.22, h: 0.22, d: 0.22, x: 0, y: 1.64, z: 0 },
  ];
}

export function figureTopM(): number {
  return figureParts().reduce((top, part) => Math.max(top, part.y + part.h / 2), 0);
}

export function audienceCamera(throwM: number): CameraPose {
  return {
    position: { x: -1.5, y: 1.7, z: -8.2 },
    target: { x: 0.3, y: 2.7, z: Math.min(throwM * 0.8, throwM) },
    fov: 50,
  };
}

export function sideCamera(throwM: number): CameraPose {
  return {
    position: { x: -12, y: 5.1, z: -1.2 },
    target: { x: 0.8, y: 1.8, z: Math.min(Math.max(throwM * 0.42, 3), 10) },
    fov: 42,
  };
}

export function fixtureCamera(throwM: number): CameraPose {
  return {
    position: { x: 2.2, y: 3.35, z: -2.1 },
    target: { x: 0, y: STAGE.apertureHeightM, z: Math.min(throwM, 8) },
    fov: 40,
  };
}

export function stageCamera(name: StageCameraName, throwM: number): CameraPose {
  if (name === "side") return sideCamera(throwM);
  if (name === "fixture") return fixtureCamera(throwM);
  return audienceCamera(throwM);
}
