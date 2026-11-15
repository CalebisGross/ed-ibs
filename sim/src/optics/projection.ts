import { CHANNELS } from "../physics/constants";
import { facetSpacingRad, instantaneousRayCount } from "../physics/referenceModel";
import { degToRad } from "../physics/units";

export interface RaySample {
  facet: number;
  channel: number;
  channelName: string;
  css: string;
  azimuthRad: number;
  radialRad: number;
  x: number;
  y: number;
  signedRadius: number;
  negativeRadial: boolean;
}

export interface ProjectionInput {
  theta: number;
  opticalAngle: number;
  facetCount: number;
  throwM: number;
  chromaticOffsetRad: readonly [number, number, number];
  facetTiltRad: number;
}

/** Spec wall map, with facet spacing 360/F and optical advance already in opticalAngle. */
export function projectRays(input: ProjectionInput): RaySample[] {
  const radial = input.facetTiltRad + 2 * input.theta;
  const signedRadius = input.throwM * Math.tan(radial);
  const negativeRadial = signedRadius < 0;
  const spacing = facetSpacingRad(input.facetCount);
  const rays: RaySample[] = [];
  for (let facet = 0; facet < input.facetCount; facet += 1) {
    for (let channel = 0; channel < CHANNELS.length; channel += 1) {
      const azimuth = input.opticalAngle + spacing * facet + input.chromaticOffsetRad[channel];
      const spec = CHANNELS[channel];
      rays.push({
        facet,
        channel,
        channelName: spec.name,
        css: spec.css,
        azimuthRad: azimuth,
        radialRad: radial,
        signedRadius,
        x: signedRadius * Math.cos(azimuth),
        y: signedRadius * Math.sin(azimuth),
        negativeRadial,
      });
    }
  }
  return rays;
}

export function coincidentChannels(offsets: readonly [number, number, number]): boolean {
  return offsets[0] === offsets[1] && offsets[1] === offsets[2];
}

export function rayBudget(facetCount: number): { instantaneous: number; sourceClaim: 45 } {
  return { instantaneous: instantaneousRayCount(facetCount), sourceClaim: 45 };
}

export const DEFAULT_FACET_TILT_RAD = degToRad(15);
