import * as THREE from "three";
import {
  CHASSIS_ROUND_OD_M,
  CHASSIS_ROUND_WALL_M,
  CHASSIS_SQUARE_M,
  GHOST_SLICE_M,
} from "./dimensions";
import { STAGE } from "./stageGeometry";
import { anodized6061, asGhost, ghostEdgeMaterial, targetCard } from "./materials";

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

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 70),
    new THREE.MeshStandardMaterial({ color: 0x2a2c2e, metalness: 0, roughness: 0.92 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 28);
  floor.name = "scenery-floor";
  group.add(floor);

  const tableMat = anodized6061();
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.05), tableMat);
  table.position.set(0, TABLE_TOP_Y - 0.04, 0.15);
  table.name = "scenery-table";
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
    new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
  );
  wall.position.set(0, STAGE.surroundHeightM / 2, 12.4);
  wall.name = "scenery-wall";
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

function chassisGhosts(): THREE.Group {
  const group = new THREE.Group();
  group.name = "ghost-chassis";
  group.position.set(0, STAGE.apertureHeightM, 0);
  const edge = ghostEdgeMaterial();
  const squareMat = asGhost(anodized6061());
  const square = new THREE.Mesh(new THREE.BoxGeometry(CHASSIS_SQUARE_M, CHASSIS_SQUARE_M, GHOST_SLICE_M), squareMat);
  square.name = "ghost-chassis-square";
  square.position.z = -0.03;
  square.add(new THREE.LineSegments(new THREE.EdgesGeometry(square.geometry), edge));
  const outer = CHASSIS_ROUND_OD_M / 2;
  const inner = outer - CHASSIS_ROUND_WALL_M;
  const roundMat = asGhost(anodized6061());
  const round = new THREE.Mesh(annulus(outer, inner, GHOST_SLICE_M), roundMat);
  round.name = "ghost-chassis-round";
  round.position.z = 0.03;
  round.add(new THREE.LineSegments(new THREE.EdgesGeometry(round.geometry), edge));
  group.add(square, round);
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
