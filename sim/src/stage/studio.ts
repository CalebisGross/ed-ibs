import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import studioUrl from "./assets/studio-neutral.hdr?url";

/**
 * studio-neutral.hdr is a synthesized 256 by 128 lat-long committed with this view.
 * Neutral key, dimmer fill, dim floor bounce. It is not a photographed room.
 * RoomEnvironment is the fallback if that file fails to parse.
 * Tone mapping, bloom, SSAO, depth of field, and grain are left unset for the post pass.
 */

export function addStudioKeyFill(scene: THREE.Scene, shadowSpanM = 0, target = new THREE.Vector3(0, 0, 0)): void {
  const hemi = new THREE.HemisphereLight(0xf4f4f2, 0x8d8d88, 0.42);
  hemi.name = "studio-hemi";
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.name = "studio-key";
  key.position.set(-2.2, 6.4, -3.6);
  const fill = new THREE.DirectionalLight(0xffffff, 0.48);
  fill.name = "studio-fill";
  fill.position.set(3.4, 2.8, -2.2);
  if (shadowSpanM > 0) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.004;
    const cam = key.shadow.camera;
    cam.near = 0.05;
    cam.far = 40;
    cam.left = -shadowSpanM;
    cam.right = shadowSpanM;
    cam.top = shadowSpanM;
    cam.bottom = -shadowSpanM;
    key.target.position.copy(target);
    scene.add(key.target);
  }
  scene.add(hemi, key, fill);
}

export function mountStudio(renderer: THREE.WebGLRenderer, scene: THREE.Scene): () => void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  let env: THREE.Texture | null = null;
  let cancelled = false;

  const apply = (texture: THREE.Texture) => {
    if (cancelled) {
      texture.dispose();
      return;
    }
    env = texture;
    scene.environment = texture;
    scene.environmentIntensity = 1.05;
  };

  new RGBELoader().load(
    studioUrl,
    (tex) => {
      const target = pmrem.fromEquirectangular(tex);
      tex.dispose();
      apply(target.texture);
    },
    undefined,
    () => {
      if (cancelled) return;
      const room = new RoomEnvironment();
      const target = pmrem.fromScene(room, 0.04);
      room.dispose();
      apply(target.texture);
    },
  );

  return () => {
    cancelled = true;
    if (scene.environment === env) scene.environment = null;
    env?.dispose();
    pmrem.dispose();
  };
}

export function addMacroBackdrop(scene: THREE.Scene): void {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a4044, roughness: 0.72, metalness: 0.12, envMapIntensity: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  floor.receiveShadow = true;
  floor.name = "macro-floor";
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x4a5156, roughness: 0.84, metalness: 0.04, envMapIntensity: 0.4 }),
  );
  wall.position.set(0, 0.14, -0.18);
  wall.receiveShadow = true;
  wall.name = "macro-wall";
  scene.add(floor, wall);
}

export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
}
