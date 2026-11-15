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

export function addStudioKeyFill(scene: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight(0xf4f4f2, 0x8d8d88, 0.38);
  hemi.name = "studio-hemi";
  const key = new THREE.DirectionalLight(0xffffff, 1.75);
  key.name = "studio-key";
  key.position.set(-2.4, 7.2, -4.4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.name = "studio-fill";
  fill.position.set(4.2, 3.2, -2.6);
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

export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
}
