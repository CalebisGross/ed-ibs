import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Color,
  DoubleSide,
  Fog,
  Line,
  LineBasicMaterial,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  Object3D,
  PerspectiveCamera,
  Plane,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { LaserBloomPass } from "../src/post/LaserBloomPass";
import {
  LASER_BLOOM_LAYER,
  POST_LIMITS,
  QUALITY_TIERS,
  createQualityPipeline,
  isQualityTier,
  markLaserBloom,
  qualityEffectsFor,
  type QualityTier,
} from "../src/post/createQualityPipeline";

describe("quality tiers", () => {
  it("lists low, medium, and high", () => {
    expect(QUALITY_TIERS).toEqual(["low", "medium", "high"]);
    expect(isQualityTier("medium")).toBe(true);
    expect(isQualityTier("ultra")).toBe(false);
  });

  it("keeps heavy effects off the lower tiers and limits depth of field to macro on high", () => {
    expect(qualityEffectsFor("low", true)).toEqual({
      aces: true,
      ssao: false,
      depthOfField: false,
      grain: false,
      bloom: false,
    });
    expect(qualityEffectsFor("medium", true)).toEqual({
      aces: true,
      ssao: false,
      depthOfField: false,
      grain: false,
      bloom: true,
    });
    expect(qualityEffectsFor("high", false)).toEqual({
      aces: true,
      ssao: true,
      depthOfField: false,
      grain: true,
      bloom: true,
    });
    expect(qualityEffectsFor("high", true).depthOfField).toBe(true);
  });

  it("keeps grain, bloom, and depth of field small", () => {
    expect(POST_LIMITS.grainIntensity).toBeGreaterThan(0);
    expect(POST_LIMITS.grainIntensity).toBeLessThanOrEqual(0.02);
    expect(POST_LIMITS.bloomStrength).toBeGreaterThan(0);
    expect(POST_LIMITS.bloomStrength).toBeLessThanOrEqual(0.25);
    expect(POST_LIMITS.bloomRadiusTexels).toBeGreaterThan(0);
    expect(POST_LIMITS.bloomRadiusTexels).toBeLessThanOrEqual(2);
    expect(POST_LIMITS.bloomThreshold).toBeGreaterThan(0);
    expect(POST_LIMITS.bloomThreshold).toBeLessThan(0.5);
    expect(POST_LIMITS.dofAperture).toBeGreaterThan(0);
    expect(POST_LIMITS.dofAperture).toBeLessThanOrEqual(0.03);
    expect(POST_LIMITS.dofMaxBlur).toBeGreaterThan(0);
    expect(POST_LIMITS.dofMaxBlur).toBeLessThanOrEqual(0.01);
    expect(POST_LIMITS.ssaoKernelSize).toBeGreaterThan(0);
    expect(POST_LIMITS.ssaoKernelSize).toBeLessThanOrEqual(16);
    expect(POST_LIMITS.effectResolutionScale).toBeLessThanOrEqual(0.5);
  });
});

describe("createQualityPipeline", () => {
  const pipelines: Array<ReturnType<typeof createQualityPipeline>> = [];

  afterEach(() => {
    for (const pipeline of pipelines) pipeline.dispose();
    pipelines.length = 0;
    vi.restoreAllMocks();
  });

  it("defaults to medium with ACES, laser bloom, and no heavy passes", () => {
    const renderer = mockRenderer();
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = LinearSRGBColorSpace;
    const pipeline = track(pipelines, renderer, new Scene(), new PerspectiveCamera(38, 1, 0.005, 20));
    expect(pipeline.tier).toBe("medium");
    expect(pipeline.macroDof).toBe(false);
    expect(pipeline.lastFrameMs).toBe(0);
    expect(pipeline.effects).toEqual(qualityEffectsFor("medium", false));
    expect(pipeline.tuning.bloomStrength).toBe(POST_LIMITS.bloomStrength);
    expect(pipeline.tuning.bloomRadiusTexels).toBe(POST_LIMITS.bloomRadiusTexels);
    expect(pipeline.tuning.bloomThreshold).toBe(POST_LIMITS.bloomThreshold);
    expect(pipeline.tuning.grainIntensity).toBe(0);
    expect(pipeline.tuning.dofAperture).toBe(0);
    expect(pipeline.tuning.ssaoKernelSize).toBe(0);
    expect(renderer.toneMapping).toBe(ACESFilmicToneMapping);
    expect(renderer.toneMappingExposure).toBe(1.3);
    expect(renderer.outputColorSpace).toBe(LinearSRGBColorSpace);
  });

  it("follows the tier policy, including macro depth of field remembered across toggles", () => {
    const pipeline = track(pipelines, mockRenderer(), new Scene(), new PerspectiveCamera(38, 1, 0.005, 20));
    const cases: Array<[QualityTier, boolean]> = [
      ["low", true],
      ["medium", true],
      ["high", false],
      ["high", true],
      ["medium", true],
      ["low", false],
      ["high", true],
    ];
    for (const [tier, macroDof] of cases) {
      pipeline.setTier(tier);
      pipeline.setMacroDof(macroDof);
      expect(pipeline.tier).toBe(tier);
      expect(pipeline.macroDof).toBe(macroDof);
      expect(pipeline.effects).toEqual(qualityEffectsFor(tier, macroDof));
    }
    expect(pipeline.tuning.grainIntensity).toBe(POST_LIMITS.grainIntensity);
    expect(pipeline.tuning.dofAperture).toBe(POST_LIMITS.dofAperture);
    expect(pipeline.tuning.dofMaxBlur).toBe(POST_LIMITS.dofMaxBlur);
    expect(pipeline.tuning.ssaoKernelSize).toBe(POST_LIMITS.ssaoKernelSize);
  });

  it("scales SSAO and focus with the camera, and accepts an explicit focus distance", () => {
    const camera = new PerspectiveCamera(38, 1, 0.005, 20);
    camera.position.set(0, 0, 0.24);
    camera.near = 0.005;
    camera.far = 20;
    camera.updateProjectionMatrix();
    const pipeline = track(pipelines, mockRenderer(), new Scene(), camera, { tier: "high", macroDof: true });
    expect(pipeline.tuning.focusMeters).toBeCloseTo(0.24);
    expect(pipeline.tuning.dofFocus).toBeCloseTo(0.24);
    expect(pipeline.tuning.ssaoKernelRadius).toBeCloseTo(0.24 * POST_LIMITS.ssaoRadiusFraction);
    pipeline.setFocusDistance(0.061);
    expect(pipeline.tuning.focusMeters).toBeCloseTo(0.061);
    expect(pipeline.tuning.dofFocus).toBeCloseTo(0.061);
    pipeline.setFocusDistance(null);
    expect(pipeline.tuning.focusMeters).toBeCloseTo(0.24);
    expect(() => pipeline.setFocusDistance(0)).toThrow(/positive finite/);
    expect(() => pipeline.setFocusDistance(Number.NaN)).toThrow(/positive finite/);
  });

  it("measures render time from timestamps on the direct low path", () => {
    const renderer = mockRenderer();
    const pipeline = track(pipelines, renderer, new Scene(), new PerspectiveCamera(38, 1, 0.005, 20), { tier: "low" });
    const stamps = [100, 103.5];
    let index = 0;
    vi.spyOn(performance, "now").mockImplementation(() => stamps[Math.min(index++, stamps.length - 1)] ?? 103.5);
    pipeline.render(9);
    expect(renderer.renders).toBe(1);
    expect(renderer.renderTargets).toBe(0);
    expect(pipeline.lastFrameMs).toBeCloseTo(3.5);
    expect(pipeline.lastFrameMs).not.toBe(9);
    expect(pipeline.effects.bloom).toBe(false);
    expect(pipeline.effects.aces).toBe(true);
  });

  it("rejects an unknown tier, a bad size, layer 0, and use after dispose", () => {
    const renderer = mockRenderer();
    const previous = renderer.toneMapping;
    expect(() =>
      createQualityPipeline({
        renderer,
        scene: new Scene(),
        camera: new PerspectiveCamera(38, 1, 0.005, 20),
        tier: "ultra" as QualityTier,
      }),
    ).toThrow(/Unknown quality tier/);
    expect(renderer.toneMapping).toBe(previous);

    const pipeline = track(pipelines, renderer, new Scene(), new PerspectiveCamera(38, 1, 0.005, 20), { tier: "low" });
    expect(() => pipeline.setSize(0, 10)).toThrow(/CSS pixels/);
    expect(() => pipeline.setTier("nope" as QualityTier)).toThrow(/Unknown quality tier/);
    expect(() =>
      createQualityPipeline({
        renderer,
        scene: new Scene(),
        camera: new PerspectiveCamera(38, 1, 0.005, 20),
        bloomLayer: 0,
      }),
    ).toThrow(
      /1 to 31/,
    );
    pipeline.dispose();
    pipeline.dispose();
    expect(renderer.toneMapping).toBe(previous);
    expect(() => pipeline.render(0.016)).toThrow(/disposed/);
    expect(() => pipeline.setTier("high")).toThrow(/disposed/);
  });

  it("does not name excluded lens effects", () => {
    const dir = fileURLToPath(new URL("../src/post/", import.meta.url));
    const source = readdirSync(dir)
      .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".css"))
      .map((name) => readFileSync(join(dir, name), "utf8"))
      .join("\n");
    for (const banned of [
      "AfterimagePass",
      "UnrealBloomPass",
      "GlitchPass",
      "HalftonePass",
      "DotScreenPass",
      "Lensflare",
      "vignette",
      "chromatic",
    ]) {
      expect(source).not.toContain(banned);
    }
  });
});

describe("laser bloom", () => {
  it("blacks out unmarked meshes, hides stray lines, and restores the scene", () => {
    const scene = new Scene();
    const background = new Color(0x112233);
    const fog = new Fog(0x112233, 1, 8);
    scene.background = background;
    scene.fog = fog;
    const camera = new PerspectiveCamera(40, 1, 0.01, 30);
    camera.position.set(0.2, 0.1, 0.4);
    const housingMaterial = new MeshBasicMaterial({ color: 0xff0000, side: DoubleSide });
    const clip = new Plane(new Vector3(0, -1, 0), 0);
    housingMaterial.clippingPlanes = [clip];
    const housing = new Mesh(new BufferGeometry(), housingMaterial);
    const beamMaterial = new MeshBasicMaterial({ color: 0x00ffff });
    const beam = new Mesh(new BufferGeometry(), beamMaterial);
    const stray = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xffffff }));
    const laserLine = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xe15caa }));
    markLaserBloom(beam);
    markLaserBloom(laserLine);
    scene.add(housing, beam, stray, laserLine);

    let sawScene = false;
    const renderer = {
      autoClear: true,
      getClearAlpha: () => 1,
      getClearColor: (target: Color) => target.setHex(0x112233),
      setClearColor: () => undefined,
      setClearAlpha: () => undefined,
      setRenderTarget: () => undefined,
      clear: () => undefined,
      render: (rendered: Scene, renderedCamera: PerspectiveCamera) => {
        if (rendered !== scene) return;
        sawScene = true;
        expect(rendered.background).toBeNull();
        expect(rendered.fog).toBeNull();
        expect(renderedCamera).toBe(camera);
        const standIn = housing.material as MeshBasicMaterial;
        expect(standIn).not.toBe(housingMaterial);
        expect(standIn.color.getHex()).toBe(0x000000);
        expect(standIn.clippingPlanes).toBe(housingMaterial.clippingPlanes);
        expect(standIn.side).toBe(housingMaterial.side);
        expect(beam.material).toBe(beamMaterial);
        expect(stray.visible).toBe(false);
        expect(laserLine.visible).toBe(true);
      },
    };
    const pass = new LaserBloomPass(scene, camera, LASER_BLOOM_LAYER, 64, 48);
    expect(pass.needsSwap).toBe(false);
    expect(pass.strength).toBe(POST_LIMITS.bloomStrength);
    expect(pass.threshold).toBe(POST_LIMITS.bloomThreshold);
    pass.render(renderer as unknown as WebGLRenderer, targetStub(), targetStub(), 0.016, false);

    expect(sawScene).toBe(true);
    expect(housing.material).toBe(housingMaterial);
    expect(beam.material).toBe(beamMaterial);
    expect(stray.visible).toBe(true);
    expect(laserLine.visible).toBe(true);
    expect(scene.background).toBe(background);
    expect(scene.fog).toBe(fog);
    expect(renderer.autoClear).toBe(true);
    expect(beam.layers.isEnabled(0)).toBe(true);
    expect(beam.layers.isEnabled(LASER_BLOOM_LAYER)).toBe(true);
    pass.dispose();
    pass.dispose();
  });

  it("rejects the default layer so the whole frame cannot bloom", () => {
    const object = new Object3D();
    expect(() => markLaserBloom(object, 0)).toThrow(/1 to 31/);
    expect(object.layers.mask).toBe(1);
    markLaserBloom(object, 4);
    expect(object.layers.isEnabled(0)).toBe(true);
    expect(object.layers.isEnabled(4)).toBe(true);
  });
});

function track(
  pipelines: Array<ReturnType<typeof createQualityPipeline>>,
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  options: { tier?: QualityTier; macroDof?: boolean; bloomLayer?: number } = {},
) {
  const pipeline = createQualityPipeline({ renderer, scene, camera, ...options });
  pipelines.push(pipeline);
  return pipeline;
}

function targetStub() {
  return { texture: null } as unknown as WebGLRenderTarget;
}

interface MockRenderer extends WebGLRenderer {
  renders: number;
  renderTargets: number;
}

function mockRenderer(): MockRenderer {
  const size = new Vector2(64, 48);
  const state = {
    toneMapping: NoToneMapping,
    toneMappingExposure: 1,
    outputColorSpace: SRGBColorSpace,
    renders: 0,
    renderTargets: 0,
    autoClear: true,
  };
  const renderer = {
    getPixelRatio: () => 1,
    getSize: (target: Vector2) => target.copy(size),
    setSize: () => undefined,
    get toneMapping() {
      return state.toneMapping;
    },
    set toneMapping(value) {
      state.toneMapping = value;
    },
    get toneMappingExposure() {
      return state.toneMappingExposure;
    },
    set toneMappingExposure(value) {
      state.toneMappingExposure = value;
    },
    get outputColorSpace() {
      return state.outputColorSpace;
    },
    set outputColorSpace(value) {
      state.outputColorSpace = value;
    },
    get renders() {
      return state.renders;
    },
    get renderTargets() {
      return state.renderTargets;
    },
    get autoClear() {
      return state.autoClear;
    },
    set autoClear(value: boolean) {
      state.autoClear = value;
    },
    render: () => {
      state.renders += 1;
    },
    getRenderTarget: () => null,
    setRenderTarget: () => {
      state.renderTargets += 1;
    },
    getClearColor: (target: Color) => target.setHex(0x000000),
    getClearAlpha: () => 1,
    setClearColor: () => undefined,
    setClearAlpha: () => undefined,
    clear: () => undefined,
    getContext: () => {
      throw new Error("low and factory tests do not have a WebGL context");
    },
  };
  return renderer as unknown as MockRenderer;
}
