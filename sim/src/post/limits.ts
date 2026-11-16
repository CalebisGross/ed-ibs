export const QUALITY_TIERS = ["low", "medium", "high"] as const;

export type QualityTier = (typeof QUALITY_TIERS)[number];

/** Objects on this layer are the only ones the bloom pass draws. Layer 0 stays the beauty pass. */
export const LASER_BLOOM_LAYER = 1;

/**
 * Fixed post settings. Grain, bloom, SSAO, and depth of field stay small.
 * SSAO's min/max distances are not meters; the pass converts `ssaoMinGapM` into the shader's normalized depth delta.
 */
export const POST_LIMITS = {
  grainIntensity: 0.012,
  bloomStrength: 0.18,
  bloomRadiusTexels: 1,
  bloomThreshold: 0.12,
  effectResolutionScale: 0.5,
  ssaoKernelSize: 8,
  ssaoRadiusFraction: 0.035,
  ssaoMinGapM: 0.001,
  ssaoMaxGapFactor: 3,
  ssaoRadiusMinM: 0.001,
  ssaoRadiusMaxM: 0.5,
  dofAperture: 0.00035,
  dofMaxBlur: 0.00016,
} as const;

export interface QualityEffects {
  aces: boolean;
  ssao: boolean;
  depthOfField: boolean;
  grain: boolean;
  bloom: boolean;
}

export function isQualityTier(value: string): value is QualityTier {
  return value === "low" || value === "medium" || value === "high";
}

export function assertQualityTier(value: string): QualityTier {
  if (isQualityTier(value)) return value;
  throw new Error(`Unknown quality tier: ${value}`);
}

export function qualityEffectsFor(tier: QualityTier, macroDof: boolean): QualityEffects {
  switch (tier) {
    case "low":
      return { aces: true, ssao: false, depthOfField: false, grain: false, bloom: false };
    case "medium":
      return { aces: true, ssao: false, depthOfField: false, grain: false, bloom: true };
    case "high":
      return { aces: true, ssao: true, depthOfField: macroDof, grain: true, bloom: true };
    default: {
      const exhaustive: never = tier;
      throw new Error(`Unhandled quality tier: ${String(exhaustive)}`);
    }
  }
}

/** Low skips the shadow map and the haze volume. SSAO and depth of field are already off for that tier. */
export function heavyDisplayFor(tier: QualityTier): { shadows: boolean; haze: boolean } {
  switch (tier) {
    case "low":
      return { shadows: false, haze: false };
    case "medium":
    case "high":
      return { shadows: true, haze: true };
    default: {
      const exhaustive: never = tier;
      throw new Error(`Unhandled quality tier: ${String(exhaustive)}`);
    }
  }
}

export function assertBloomLayer(layer: number): void {
  if (!Number.isInteger(layer) || layer < 1 || layer > 31) {
    throw new Error("Laser bloom layer must be an integer from 1 to 31.");
  }
}
