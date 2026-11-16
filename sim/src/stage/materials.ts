import * as THREE from "three";

/** 6061-T6, type III hard anodize. Dark satin so the bench is not a flat gray. */
export function anodized6061(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x243038,
    metalness: 0.42,
    roughness: 0.5,
    envMapIntensity: 0.9,
  });
}

/** 7075 satin anodize. Warm aluminum, distinct from polished steel. */
export function anodized7075(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xc6b08a,
    metalness: 0.78,
    roughness: 0.4,
    envMapIntensity: 1.15,
  });
}

/** Ti-6Al-4V. Warm gray, still reflective. The source modulus is this alloy. */
export function brushedTitanium(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x8a7568,
    metalness: 1,
    roughness: 0.36,
    roughnessMap: brushMap(6, 1),
    envMapIntensity: 1.6,
  });
}

/** Polished hardened steel. No brush map, so the studio reflection stays readable. */
export function hardenedSteel(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xd2d8e0,
    metalness: 1,
    roughness: 0.1,
    envMapIntensity: 2.1,
  });
}

/**
 * Brushed brass. The locked specification does not assign brass to a drawn part.
 * A Gemini prototype note lists C36000 as an alternate for the escape wheel beside
 * silicon nitride. The wheel in this view stays silicon nitride, so nothing calls this.
 */
export function brushedBrass(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb08d57,
    metalness: 1,
    roughness: 0.34,
    roughnessMap: brushMap(8, 1),
    envMapIntensity: 1.3,
  });
}

/** Silicon nitride. Ceramic, not a metal. Warm stone so it does not match the steels. */
export function siliconNitride(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x9a9470,
    metalness: 0.08,
    roughness: 0.34,
    envMapIntensity: 0.55,
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
    emissiveIntensity: 4,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    toneMapped: false,
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
    opacity: 0.16,
    depthWrite: false,
    toneMapped: false,
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
    color: 0x3a4044,
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
