import {
  ACESFilmicToneMapping,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Scene,
  ToneMapping,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { LaserBloomPass } from "./LaserBloomPass";
import {
  LASER_BLOOM_LAYER,
  POST_LIMITS,
  type QualityEffects,
  type QualityTier,
  assertBloomLayer,
  assertQualityTier,
  qualityEffectsFor,
} from "./limits";

export {
  LASER_BLOOM_LAYER,
  POST_LIMITS,
  QUALITY_TIERS,
  assertQualityTier,
  isQualityTier,
  qualityEffectsFor,
} from "./limits";
export type { QualityEffects, QualityTier } from "./limits";

export interface QualityPipelineOptions {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  tier?: QualityTier;
  /** Depth of field is used only when this is true and the tier is high. */
  macroDof?: boolean;
  /** Must be 1–31. Defaults to {@link LASER_BLOOM_LAYER}. */
  bloomLayer?: number;
}

export interface QualityTuning {
  focusMeters: number;
  grainIntensity: number;
  bloomStrength: number;
  bloomRadiusTexels: number;
  bloomThreshold: number;
  dofAperture: number;
  dofMaxBlur: number;
  dofFocus: number;
  ssaoKernelSize: number;
  ssaoKernelRadius: number;
}

export interface QualityPipeline {
  render(deltaSeconds: number): void;
  setTier(tier: QualityTier): void;
  setMacroDof(enabled: boolean): void;
  /** Positive meters, or null to focus at the camera's distance from the origin. */
  setFocusDistance(meters: number | null): void;
  /** CSS pixels, the same width and height passed to `renderer.setSize`. */
  setSize(cssWidth: number, cssHeight: number): void;
  dispose(): void;
  readonly tier: QualityTier;
  readonly macroDof: boolean;
  readonly lastFrameMs: number;
  readonly effects: QualityEffects;
  readonly tuning: QualityTuning;
}

interface FloatUniform {
  value: number;
}

interface MatrixUniform {
  value: Matrix4;
}

/**
 * Filmic post stack. Call `render` instead of `renderer.render`, and `setSize` from the
 * same resize path as the renderer. Mark laser objects with `markLaserBloom` (again after
 * adding children). Unmarked meshes are drawn black into the bloom buffer so they occlude
 * the beam and do not glow. Set `macroDof` only while a macro camera preset is active.
 * One pipeline per renderer. `lastFrameMs` is the CPU time around the last `render` call.
 */
export function createQualityPipeline(options: QualityPipelineOptions): QualityPipeline {
  const renderer = options.renderer;
  const scene = options.scene;
  const camera = options.camera;
  if (!renderer || !scene || !camera) {
    throw new Error("createQualityPipeline requires a renderer, scene, and camera.");
  }

  const bloomLayer = options.bloomLayer === undefined ? LASER_BLOOM_LAYER : options.bloomLayer;
  assertBloomLayer(bloomLayer);

  const previousToneMapping: ToneMapping = renderer.toneMapping;
  const previousExposure = renderer.toneMappingExposure;
  let tier: QualityTier = options.tier === undefined ? "medium" : assertQualityTier(options.tier);
  let macroDof = options.macroDof === true;
  let focusOverride: number | null = null;
  let disposed = false;
  let lastFrameMs = 0;

  const initialSize = readCssSize(renderer);
  let cssWidth = initialSize.width;
  let cssHeight = initialSize.height;

  let composer: EffectComposer | null = null;
  let bloom: LaserBloomPass | null = null;
  let output: OutputPass | null = null;
  let ssaoWrap: HalfResolutionSsaoPass | null = null;
  let bokeh: BokehPass | null = null;
  let film: FilmPass | null = null;

  apply();

  function render(deltaSeconds: number): void {
    assertLive();
    const start = performance.now();
    try {
      if (tier === "low") {
        renderer.render(scene, camera);
        return;
      }
      if (!composer) throw new Error("Quality pipeline is missing its composer.");
      syncAdaptive();
      const delta = Number.isFinite(deltaSeconds) && deltaSeconds >= 0 ? deltaSeconds : 0;
      composer.render(delta);
    } finally {
      lastFrameMs = performance.now() - start;
    }
  }

  function setTier(next: QualityTier): void {
    assertLive();
    tier = assertQualityTier(next);
    apply();
  }

  function setMacroDof(enabled: boolean): void {
    assertLive();
    macroDof = enabled === true;
    apply();
  }

  function setFocusDistance(meters: number | null): void {
    assertLive();
    if (meters === null) {
      focusOverride = null;
    } else if (!Number.isFinite(meters) || meters <= 0) {
      throw new Error("Focus distance must be a positive finite number of meters.");
    } else {
      focusOverride = meters;
    }
    syncAdaptive();
  }

  function setSize(nextWidth: number, nextHeight: number): void {
    assertLive();
    if (!(nextWidth > 0) || !(nextHeight > 0) || !Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
      throw new Error("Viewport size must be a positive finite number of CSS pixels.");
    }
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    resizeComposer();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    releaseComposer();
    renderer.toneMapping = previousToneMapping;
    renderer.toneMappingExposure = previousExposure;
  }

  function apply(): void {
    renderer.toneMapping = ACESFilmicToneMapping;
    const next = qualityEffectsFor(tier, macroDof);
    if (tier === "low") {
      releaseComposer();
      return;
    }
    ensureComposer();
    if (next.ssao || next.grain) ensureSsaoAndFilm();
    if (next.depthOfField) ensureBokeh();
    if (bloom) bloom.enabled = next.bloom;
    if (ssaoWrap) ssaoWrap.enabled = next.ssao;
    if (bokeh) bokeh.enabled = next.depthOfField;
    if (film) film.enabled = next.grain;
    syncAdaptive();
  }

  function releaseComposer(): void {
    bloom?.dispose();
    ssaoWrap?.dispose();
    bokeh?.dispose();
    film?.dispose();
    output?.dispose();
    composer?.dispose();
    composer = null;
    bloom = null;
    output = null;
    ssaoWrap = null;
    bokeh = null;
    film = null;
  }

  function ensureComposer(): void {
    if (composer) return;
    const nextComposer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new LaserBloomPass(scene, camera, bloomLayer, drawingWidth(), drawingHeight());
    const outputPass = new OutputPass();
    nextComposer.addPass(renderPass);
    nextComposer.addPass(bloomPass);
    nextComposer.addPass(outputPass);
    composer = nextComposer;
    bloom = bloomPass;
    output = outputPass;
    resizeComposer();
  }

  function ensureSsaoAndFilm(): void {
    if (!composer || !output) return;
    if (!ssaoWrap) {
      const scale = POST_LIMITS.effectResolutionScale;
      const inner = new SSAOPass(
        scene,
        camera,
        Math.max(1, Math.floor(drawingWidth() * scale)),
        Math.max(1, Math.floor(drawingHeight() * scale)),
        POST_LIMITS.ssaoKernelSize,
      );
      ssaoWrap = new HalfResolutionSsaoPass(inner);
      composer.insertPass(ssaoWrap, 1);
    }
    if (!film) {
      film = new FilmPass(POST_LIMITS.grainIntensity, false);
      composer.insertPass(film, composer.passes.indexOf(output));
    }
  }

  function ensureBokeh(): void {
    if (!composer || !output || bokeh) return;
    bokeh = new BokehPass(scene, camera, {
      focus: focusMeters(),
      aspect: camera.aspect,
      aperture: POST_LIMITS.dofAperture,
      maxblur: POST_LIMITS.dofMaxBlur,
    });
    const filmIndex = film ? composer.passes.indexOf(film) : -1;
    const at = filmIndex >= 0 ? filmIndex : composer.passes.indexOf(output);
    composer.insertPass(bokeh, at);
  }

  function resizeComposer(): void {
    if (!composer) return;
    composer.setPixelRatio(pixelRatioOf(renderer));
    composer.setSize(cssWidth, cssHeight);
  }

  function syncAdaptive(): void {
    const focus = focusMeters();
    if (bokeh) {
      const uniforms = bokeh.uniforms as {
        focus: FloatUniform;
        aspect: FloatUniform;
        aperture: FloatUniform;
        maxblur: FloatUniform;
      };
      uniforms.focus.value = focus;
      uniforms.aspect.value = camera.aspect;
      uniforms.aperture.value = POST_LIMITS.dofAperture;
      uniforms.maxblur.value = POST_LIMITS.dofMaxBlur;
    }
    const inner = ssaoWrap?.inner;
    if (inner) {
      const radius = clamp(
        focus * POST_LIMITS.ssaoRadiusFraction,
        POST_LIMITS.ssaoRadiusMinM,
        POST_LIMITS.ssaoRadiusMaxM,
      );
      inner.kernelRadius = radius;
      const viewSpan = Math.max(1e-4, camera.far - camera.near);
      inner.minDistance = POST_LIMITS.ssaoMinGapM / viewSpan;
      inner.maxDistance = Math.max(inner.minDistance * 4, (radius * POST_LIMITS.ssaoMaxGapFactor) / viewSpan);
      const uniforms = inner.ssaoMaterial.uniforms as {
        cameraNear: FloatUniform;
        cameraFar: FloatUniform;
        cameraProjectionMatrix: MatrixUniform;
        cameraInverseProjectionMatrix: MatrixUniform;
      };
      uniforms.cameraNear.value = camera.near;
      uniforms.cameraFar.value = camera.far;
      uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
      uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
    }
  }

  function focusMeters(): number {
    if (focusOverride !== null) return focusOverride;
    return Math.max(camera.near * 2, camera.position.length());
  }

  function drawingWidth(): number {
    return Math.max(1, Math.floor(cssWidth * pixelRatioOf(renderer)));
  }

  function drawingHeight(): number {
    return Math.max(1, Math.floor(cssHeight * pixelRatioOf(renderer)));
  }

  function liveEffects(): QualityEffects {
    return {
      aces: renderer.toneMapping === ACESFilmicToneMapping,
      ssao: ssaoWrap?.enabled === true,
      depthOfField: bokeh?.enabled === true,
      grain: film?.enabled === true,
      bloom: bloom?.enabled === true,
    };
  }

  function liveTuning(): QualityTuning {
    return {
      focusMeters: focusMeters(),
      grainIntensity: film ? uniformNumber(film.uniforms, "intensity") : 0,
      bloomStrength: bloom?.strength ?? 0,
      bloomRadiusTexels: bloom?.radius ?? 0,
      bloomThreshold: bloom?.threshold ?? 0,
      dofAperture: bokeh ? uniformNumber(bokeh.uniforms, "aperture") : 0,
      dofMaxBlur: bokeh ? uniformNumber(bokeh.uniforms, "maxblur") : 0,
      dofFocus: bokeh ? uniformNumber(bokeh.uniforms, "focus") : 0,
      ssaoKernelSize: ssaoWrap?.inner.kernel.length ?? 0,
      ssaoKernelRadius: ssaoWrap?.inner.kernelRadius ?? 0,
    };
  }

  function assertLive(): void {
    if (disposed) throw new Error("Quality pipeline has been disposed.");
  }

  return {
    render,
    setTier,
    setMacroDof,
    setFocusDistance,
    setSize,
    dispose,
    get tier() {
      return tier;
    },
    get macroDof() {
      return macroDof;
    },
    get lastFrameMs() {
      return lastFrameMs;
    },
    get effects() {
      return liveEffects();
    },
    get tuning() {
      return liveTuning();
    },
  };
}

export function markLaserBloom(object: Object3D, layer = LASER_BLOOM_LAYER): void {
  assertBloomLayer(layer);
  object.traverse((child) => {
    child.layers.enable(layer);
  });
}

class HalfResolutionSsaoPass extends Pass {
  readonly inner: SSAOPass;

  constructor(inner: SSAOPass) {
    super();
    this.inner = inner;
    this.needsSwap = false;
    this.enabled = true;
  }

  override setSize(width: number, height: number): void {
    const scale = POST_LIMITS.effectResolutionScale;
    this.inner.setSize(Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale)));
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    this.inner.renderToScreen = this.renderToScreen;
    this.inner.enabled = this.enabled;
    this.inner.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }

  override dispose(): void {
    this.inner.noiseTexture.dispose();
    this.inner.ssaoMaterial.dispose();
    this.inner.dispose();
  }
}

function pixelRatioOf(renderer: WebGLRenderer): number {
  const ratio = renderer.getPixelRatio();
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function readCssSize(renderer: WebGLRenderer): { width: number; height: number } {
  const size = renderer.getSize(new Vector2());
  const width = size.width > 0 ? size.width : 1;
  const height = size.height > 0 ? size.height : 1;
  return { width, height };
}

function uniformNumber(uniforms: object, key: string): number {
  const entry = (uniforms as Record<string, { value?: unknown } | undefined>)[key];
  const value = entry?.value;
  return typeof value === "number" ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
