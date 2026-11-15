import * as THREE from "three";

/** Oxide layer, not a bare conductor. Black hard anodize, 6061-T6. */
export function anodized6061(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2c3136,
    metalness: 0.02,
    roughness: 0.48,
    envMapIntensity: 0.55,
  });
}

/** Clear anodize on 7075. Dielectric oxide over a light alloy. */
export function anodized7075(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb7bcc2,
    metalness: 0.04,
    roughness: 0.4,
    envMapIntensity: 0.55,
  });
}

/** Ti-6Al-4V, brushed. The source modulus is this alloy. */
export function brushedTitanium(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x8e939a,
    metalness: 1,
    roughness: 0.32,
    roughnessMap: brushMap(6, 1),
    envMapIntensity: 1.8,
  });
}

/** Ground hardened steel. */
export function hardenedSteel(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xa7adb4,
    metalness: 1,
    roughness: 0.18,
    roughnessMap: brushMap(10, 1),
    envMapIntensity: 1.7,
  });
}

/**
 * Brushed brass. No part in the current specification is assigned brass,
 * so the assemblies do not use this material.
 */
export function brushedBrass(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb08d57,
    metalness: 1,
    roughness: 0.38,
    roughnessMap: brushMap(8, 1),
    envMapIntensity: 1,
  });
}

/** Silicon nitride. Ceramic, not a metal. */
export function siliconNitride(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x6a6e68,
    metalness: 0,
    roughness: 0.38,
    envMapIntensity: 0.4,
  });
}

/** Synthetic ruby. No emission. The stone is not a light source. */
export function rubyJewel(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x6e1c32,
    metalness: 0,
    roughness: 0.06,
    emissive: 0x000000,
    emissiveIntensity: 0,
    envMapIntensity: 1,
  });
}

export const GHOST_OPACITY = 0.2;

export function asGhost(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  material.transparent = true;
  material.opacity = GHOST_OPACITY;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  return material;
}

export function ghostEdgeMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0xc5ccd4,
    transparent: true,
    opacity: 0.55,
  });
}

/** Laser core. Emissive so a later post pass can find the beam. Not a metal. */
export function laserCoreMaterial(css: string): THREE.MeshStandardMaterial {
  const color = new THREE.Color(css);
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: 0.85,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    toneMapped: true,
  });
}

/** Landing mark. Emissive, small, not a flare. */
export function laserSpotMaterial(css: string): THREE.MeshStandardMaterial {
  const color = new THREE.Color(css);
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: 0.7,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: true,
  });
}

/** Scatter volume. Not emissive. */
export function hazeMaterial(css: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(css),
    emissive: 0x000000,
    emissiveIntensity: 0,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function sceneryCloth(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x4e5966,
    metalness: 0,
    roughness: 0.86,
  });
}

export function targetCard(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb7b4ae,
    metalness: 0,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
}

/** Small "Ghost" tag. The mesh stays faint. The word says the shape is illustrative. */
export function ghostLabel(heightM: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Ghost label needs a canvas.");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(16, 18, 20, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(196, 204, 212, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = "#e6edf4";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Ghost", canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(heightM * (160 / 48), heightM, 1);
  sprite.name = "ghost-label";
  return sprite;
}

function brushMap(repeatU: number, repeatV: number): THREE.DataTexture {
  const width = 32;
  const height = 32;
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const grain = (x * 17 + y * 3) % 18;
      data[y * width + x] = 238 + grain;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatU, repeatV);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
