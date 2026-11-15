import {
  AddEquation,
  Color,
  CustomBlending,
  HalfFloatType,
  LinearFilter,
  Material,
  Mesh,
  MeshBasicMaterial,
  NoBlending,
  Object3D,
  OneFactor,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
  ZeroFactor,
} from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { POST_LIMITS } from "./limits";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const THRESHOLD_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float threshold;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float keep = smoothstep(threshold, threshold + 0.08, luma);
    gl_FragColor = vec4(color.rgb * keep, 1.0);
  }
`;

const BLUR_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 texel;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(tDiffuse, vUv) * 0.4026;
    color += texture2D(tDiffuse, vUv + texel) * 0.2442;
    color += texture2D(tDiffuse, vUv - texel) * 0.2442;
    color += texture2D(tDiffuse, vUv + texel * 2.0) * 0.0545;
    color += texture2D(tDiffuse, vUv - texel * 2.0) * 0.0545;
    gl_FragColor = color;
  }
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    vec3 color = min(texture2D(tDiffuse, vUv).rgb, vec3(1.0));
    gl_FragColor = vec4(color * strength, 0.0);
  }
`;

interface SampleUniform {
  value: WebGLRenderTarget["texture"] | null;
}

interface FloatUniform {
  value: number;
}

interface Vec2Uniform {
  value: Vector2;
}

/**
 * Additive halo for objects on one layer. Other meshes are drawn black so they
 * occlude the beam and cannot glow. There is no history buffer: a hidden beam
 * contributes black on the same frame it disappears.
 * The composite clamps the halo to 1 before scaling, so a hot beam cannot flood the frame.
 */
export class LaserBloomPass extends Pass {
  readonly strength: number;
  readonly radius: number;
  readonly threshold: number;
  readonly layer: number;

  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly isolate: WebGLRenderTarget;
  private readonly ping: WebGLRenderTarget;
  private readonly pong: WebGLRenderTarget;
  private readonly thresholdMaterial: ShaderMaterial;
  private readonly blurMaterial: ShaderMaterial;
  private readonly compositeMaterial: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly previousClear: Color;
  private readonly standIns = new Map<string, MeshBasicMaterial>();
  private readonly savedMaterials = new Map<Mesh, Material | Material[]>();
  private readonly hidden: Object3D[] = [];
  private disposed = false;

  constructor(scene: Scene, camera: PerspectiveCamera, layer: number, width: number, height: number) {
    super();
    this.needsSwap = false;
    this.enabled = true;
    this.scene = scene;
    this.camera = camera;
    this.layer = layer;
    this.strength = POST_LIMITS.bloomStrength;
    this.radius = POST_LIMITS.bloomRadiusTexels;
    this.threshold = POST_LIMITS.bloomThreshold;
    this.previousClear = new Color();

    this.isolate = makeTarget(1, 1, true);
    this.ping = makeTarget(1, 1, false);
    this.pong = makeTarget(1, 1, false);

    this.thresholdMaterial = new ShaderMaterial({
      name: "LaserBloomThreshold",
      uniforms: {
        tDiffuse: { value: null } satisfies SampleUniform,
        threshold: { value: this.threshold } satisfies FloatUniform,
      },
      vertexShader: VERTEX,
      fragmentShader: THRESHOLD_FRAGMENT,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.blurMaterial = new ShaderMaterial({
      name: "LaserBloomBlur",
      uniforms: {
        tDiffuse: { value: null } satisfies SampleUniform,
        texel: { value: new Vector2() } satisfies Vec2Uniform,
      },
      vertexShader: VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.compositeMaterial = new ShaderMaterial({
      name: "LaserBloomComposite",
      uniforms: {
        tDiffuse: { value: null } satisfies SampleUniform,
        strength: { value: this.strength } satisfies FloatUniform,
      },
      vertexShader: VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendEquationAlpha: AddEquation,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new FullScreenQuad(this.thresholdMaterial);
    this.setSize(width, height);
  }

  override setSize(width: number, height: number): void {
    const scaledWidth = Math.max(1, Math.floor(width * POST_LIMITS.effectResolutionScale));
    const scaledHeight = Math.max(1, Math.floor(height * POST_LIMITS.effectResolutionScale));
    this.isolate.setSize(scaledWidth, scaledHeight);
    this.ping.setSize(scaledWidth, scaledHeight);
    this.pong.setSize(scaledWidth, scaledHeight);
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    void writeBuffer;
    void deltaTime;
    void maskActive;
    if (this.disposed) return;

    const previousBackground = this.scene.background;
    const previousFog = this.scene.fog;
    const previousOverride = this.scene.overrideMaterial;
    const previousAutoClear = renderer.autoClear;
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.previousClear);

    try {
      this.darkenNonLasers();
      this.scene.background = null;
      this.scene.fog = null;
      this.scene.overrideMaterial = null;
      renderer.autoClear = false;
      renderer.setRenderTarget(this.isolate);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.render(this.scene, this.camera);
      this.restoreScene(previousBackground, previousFog, previousOverride);

      this.draw(renderer, this.thresholdMaterial, this.isolate.texture, this.ping);
      this.blur(renderer, this.ping, this.pong, this.radius / this.ping.width, 0);
      this.blur(renderer, this.pong, this.ping, 0, this.radius / this.pong.height);
      this.draw(renderer, this.compositeMaterial, this.ping.texture, readBuffer, false);
    } finally {
      this.restoreScene(previousBackground, previousFog, previousOverride);
      renderer.autoClear = previousAutoClear;
      renderer.setClearColor(this.previousClear, previousAlpha);
    }
  }

  override dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.restoreScene(this.scene.background, this.scene.fog, this.scene.overrideMaterial);
    for (const material of this.standIns.values()) material.dispose();
    this.standIns.clear();
    this.isolate.dispose();
    this.ping.dispose();
    this.pong.dispose();
    this.thresholdMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quad.dispose();
  }

  private draw(
    renderer: WebGLRenderer,
    material: ShaderMaterial,
    texture: WebGLRenderTarget["texture"],
    target: WebGLRenderTarget,
    clear = true,
  ): void {
    const diffuse = material.uniforms.tDiffuse as SampleUniform;
    diffuse.value = texture;
    this.quad.material = material;
    renderer.setRenderTarget(target);
    if (clear) renderer.clear(true, false, false);
    this.quad.render(renderer);
  }

  private darkenNonLasers(): void {
    this.scene.traverse((object) => {
      if (!object.visible || object.layers.isEnabled(this.layer)) return;
      if (object instanceof Mesh) {
        this.savedMaterials.set(object, object.material);
        object.material = this.standInFor(object);
        return;
      }
      if (isStrayDrawable(object)) {
        this.hidden.push(object);
        object.visible = false;
      }
    });
  }

  private standInFor(mesh: Mesh): MeshBasicMaterial {
    let standIn = this.standIns.get(mesh.uuid);
    if (!standIn) {
      standIn = new MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
      this.standIns.set(mesh.uuid, standIn);
    }
    const source = mesh.material;
    const first = Array.isArray(source) ? source[0] : source;
    if (first) {
      standIn.side = first.side;
      standIn.clippingPlanes = first.clippingPlanes;
      standIn.clipIntersection = first.clipIntersection;
    }
    return standIn;
  }

  private restoreScene(
    background: Scene["background"],
    fog: Scene["fog"],
    overrideMaterial: Scene["overrideMaterial"],
  ): void {
    for (const [mesh, material] of this.savedMaterials) mesh.material = material;
    this.savedMaterials.clear();
    for (const object of this.hidden) object.visible = true;
    this.hidden.length = 0;
    this.scene.background = background;
    this.scene.fog = fog;
    this.scene.overrideMaterial = overrideMaterial;
  }

  private blur(
    renderer: WebGLRenderer,
    from: WebGLRenderTarget,
    to: WebGLRenderTarget,
    texelX: number,
    texelY: number,
  ): void {
    const texel = this.blurMaterial.uniforms.texel as Vec2Uniform;
    texel.value.set(texelX, texelY);
    this.draw(renderer, this.blurMaterial, from.texture, to);
  }
}

function isStrayDrawable(object: Object3D): boolean {
  const drawable = object as Object3D & { isLine?: boolean; isPoints?: boolean; isSprite?: boolean };
  return drawable.isLine === true || drawable.isPoints === true || drawable.isSprite === true;
}

function makeTarget(width: number, height: number, depthBuffer: boolean): WebGLRenderTarget {
  const target = new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    depthBuffer,
    stencilBuffer: false,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
  });
  target.texture.generateMipmaps = false;
  target.texture.name = depthBuffer ? "LaserBloom.isolate" : "LaserBloom.blur";
  return target;
}
