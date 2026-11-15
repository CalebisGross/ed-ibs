import * as THREE from "three";
import {
  CHASSIS_ROUND_OD_M,
  CHASSIS_ROUND_WALL_M,
  CHASSIS_SQUARE_M,
  GHOST_SLICE_M,
} from "./dimensions";
import { STAGE } from "./stageGeometry";
import { anodized6061, asGhost, ghostLabel, targetCard } from "./materials";

export interface LabBench {
  group: THREE.Group;
  screen: THREE.Mesh;
  setThrow: (throwM: number) => void;
}

const TABLE_TOP_Y = 0.9;

/** Scenery plus the two open chassis profiles at the aperture. */
export function buildLabBench(): LabBench {
  const group = new THREE.Group();
  group.name = "lab-bench";

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x6a6f73,
    metalness: 0,
    roughness: 0.88,
    roughnessMap: plaster(0.08),
    map: plaster(0.04, 0x8d9398, 0x5e6468, true),
    envMapIntensity: 0.25,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 28), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 8);
  floor.name = "scenery-floor";
  floor.receiveShadow = true;
  group.add(floor);
  group.add(roomShell());

  const tableMat = anodized6061();
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.05), tableMat);
  table.position.set(0, TABLE_TOP_Y - 0.04, 0.15);
  table.name = "scenery-table";
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);
  group.add(holePlate(1.5, 1.05));

  const postMat = anodized6061();
  const postGeo = new THREE.CylinderGeometry(0.0125, 0.0125, STAGE.apertureHeightM - TABLE_TOP_Y, 12);
  const postY = (TABLE_TOP_Y + STAGE.apertureHeightM) / 2;
  for (const x of [-0.16, 0.16]) {
    for (const z of [-0.12, 0.16]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, postY, z);
      post.name = "scenery-post";
      post.castShadow = true;
      post.receiveShadow = true;
      group.add(post);
    }
  }

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(STAGE.clothWidthM, STAGE.clothHeightM),
    targetCard(),
  );
  screen.name = "target-screen";
  screen.position.set(0, STAGE.clothHeightM / 2, 12);
  group.add(screen);
  group.add(targetGrid(screen));

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(STAGE.surroundWidthM, STAGE.surroundHeightM),
    new THREE.MeshStandardMaterial({
      color: 0x8a9094,
      roughness: 0.92,
      metalness: 0,
      roughnessMap: plaster(0.06),
      side: THREE.DoubleSide,
    }),
  );
  wall.position.set(0, STAGE.surroundHeightM / 2, 12.4);
  wall.name = "scenery-wall";
  wall.receiveShadow = true;
  group.add(wall);

  group.add(chassisGhosts());

  return {
    group,
    screen,
    setThrow: (throwM: number) => {
      screen.position.z = throwM;
      const grid = screen.getObjectByName("target-grid");
      if (grid) grid.position.z = throwM - 0.02;
      wall.position.z = throwM + 0.35;
    },
  };
}

function holePlate(width: number, depth: number): THREE.Mesh {
  const mat = anodized6061();
  mat.roughnessMap = holeTexture(width, depth);
  mat.roughness = 0.72;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.004, depth - 0.04), mat);
  plate.position.set(0, TABLE_TOP_Y + 0.002, 0.15);
  plate.name = "scenery-grid";
  return plate;
}

function holeTexture(width: number, depth: number): THREE.DataTexture {
  const size = 48;
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const hole = dx * dx + dy * dy < 16;
      data[y * size + x] = hole ? 70 : 230;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const pitchM = 0.025;
  texture.repeat.set(width / pitchM, depth / pitchM);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function targetGrid(screen: THREE.Mesh): THREE.LineSegments {
  const halfW = STAGE.clothWidthM / 2;
  const halfH = STAGE.clothHeightM / 2;
  const positions: number[] = [];
  for (let x = -halfW; x <= halfW + 1e-6; x += 1) {
    positions.push(x, -halfH, 0, x, halfH, 0);
  }
  for (let y = -halfH; y <= halfH + 1e-6; y += 1) {
    positions.push(-halfW, y, 0, halfW, y, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x6e6a62, transparent: true, opacity: 0.45 }),
  );
  lines.position.copy(screen.position);
  lines.position.z -= 0.02;
  lines.name = "target-grid";
  return lines;
}

function roomShell(): THREE.Group {
  const shell = new THREE.Group();
  shell.name = "scenery-shell";
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x7e8589,
    roughness: 0.9,
    metalness: 0,
    roughnessMap: plaster(0.05),
    side: THREE.DoubleSide,
  });
  const side = new THREE.PlaneGeometry(28, 8);
  const left = new THREE.Mesh(side, wallMat);
  left.position.set(-8, 4, 8);
  left.rotation.y = Math.PI / 2;
  left.receiveShadow = true;
  const right = new THREE.Mesh(side, wallMat);
  right.position.set(8, 4, 8);
  right.rotation.y = -Math.PI / 2;
  right.receiveShadow = true;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 28),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.94, metalness: 0 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 7.2, 8);
  shell.add(left, right, ceiling);
  return shell;
}

function plaster(amount: number, light = 0xffffff, dark = 0x000000, srgb = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Surface texture needs a canvas.");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 128, 128);
  const lightHex = light.toString(16).padStart(6, "0");
  const darkHex = dark.toString(16).padStart(6, "0");
  for (let i = 0; i < 700; i += 1) {
    const x = (i * 47) % 128;
    const y = (i * 19) % 128;
    ctx.fillStyle = i % 2 === 0 ? `#${lightHex}` : `#${darkHex}`;
    ctx.globalAlpha = amount;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

function chassisGhosts(): THREE.Group {
  const group = new THREE.Group();
  group.name = "ghost-chassis";
  group.position.set(0, STAGE.apertureHeightM, 0);
  const squareMat = asGhost(anodized6061());
  const square = new THREE.Mesh(new THREE.BoxGeometry(CHASSIS_SQUARE_M, CHASSIS_SQUARE_M, GHOST_SLICE_M), squareMat);
  square.name = "ghost-chassis-square";
  square.position.z = -0.03;
  square.castShadow = false;
  const outer = CHASSIS_ROUND_OD_M / 2;
  const inner = outer - CHASSIS_ROUND_WALL_M;
  const roundMat = asGhost(anodized6061());
  const round = new THREE.Mesh(annulus(outer, inner, GHOST_SLICE_M), roundMat);
  round.name = "ghost-chassis-round";
  round.position.z = 0.03;
  round.castShadow = false;
  const tag = ghostLabel(0.018);
  tag.position.set(0, CHASSIS_SQUARE_M / 2 + 0.02, 0);
  group.add(square, round, tag);
  return group;
}

export function annulus(outer: number, inner: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}
