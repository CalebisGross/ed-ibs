import * as THREE from "three";
import type { FramePacket } from "../sim/useSimulator";
import {
  BORE_M,
  CARRIER_WALL_M,
  GHOST_SLICE_M,
  JEWEL_RADIUS_M,
  PRISM_MARKER_M,
  RING_AXIAL_M,
  RING_INNER_M,
  RING_OUTER_M,
  STEEL_RING_ID_M,
  STEEL_RING_OD_M,
  STEEL_RING_THICK_M,
  WHEEL_OD_M,
  WHEEL_STATION_M,
} from "./dimensions";
import type { MotionSample } from "./motion";
import {
  anodized7075,
  asGhost,
  brushedTitanium,
  ghostLabel,
  hardenedSteel,
  rubyJewel,
  siliconNitride,
} from "./materials";
import { annulus } from "./labBench";

const LEAF_SEGMENTS = 12;
const MAX_LEAVES = 16;

export interface Mechanism {
  group: THREE.Group;
  update: (packet: FramePacket, pose: MotionSample) => void;
  setSection: (on: boolean) => void;
}

export function createMechanism(): Mechanism {
  const group = new THREE.Group();
  group.name = "mechanism";
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const clipped: THREE.Material[] = [];
  const track = <T extends THREE.Material>(material: T): T => {
    clipped.push(material);
    return material;
  };
  const ringMat = track(brushedTitanium());
  const ring = new THREE.Mesh(annulus(RING_OUTER_M, RING_INNER_M, RING_AXIAL_M), ringMat);
  ring.name = "balance-ring";
  group.add(ring);

  const borePts: THREE.Vector3[] = [];
  const boreR = BORE_M / 2;
  for (let i = 0; i <= 96; i += 1) {
    const ang = (i / 96) * Math.PI * 2;
    borePts.push(new THREE.Vector3(Math.cos(ang) * boreR, Math.sin(ang) * boreR, RING_AXIAL_M * 0.5 + 0.0004));
  }
  const bore = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(borePts),
    track(new THREE.LineBasicMaterial({ color: 0x9aa3ab, transparent: true, opacity: 0.35 })),
  );
  bore.name = "bore-line";
  group.add(bore);

  const steel = new THREE.Mesh(
    annulus(STEEL_RING_OD_M / 2, STEEL_RING_ID_M / 2, STEEL_RING_THICK_M),
    track(asGhost(hardenedSteel())),
  );
  steel.name = "ghost-steel-ring";
  steel.position.z = -0.008;
  steel.castShadow = false;
  const steelTag = ghostLabel(0.0026);
  steelTag.position.set(0.02, -0.028, 0.01);
  steel.add(steelTag);
  group.add(steel);

  const carrier = new THREE.Mesh(
    annulus(BORE_M / 2 + CARRIER_WALL_M, BORE_M / 2, GHOST_SLICE_M),
    track(asGhost(anodized7075())),
  );
  carrier.name = "ghost-carrier";
  carrier.position.z = 0.01;
  carrier.castShadow = false;
  group.add(carrier);

  const prismShape = new THREE.Shape();
  prismShape.moveTo(-0.006, -0.004);
  prismShape.lineTo(0.006, -0.004);
  prismShape.lineTo(0.003, 0.004);
  prismShape.lineTo(-0.003, 0.004);
  const prism = new THREE.Mesh(
    new THREE.ExtrudeGeometry(prismShape, { depth: PRISM_MARKER_M, bevelEnabled: false }),
    track(asGhost(new THREE.MeshStandardMaterial({ color: 0xc5d0d4, metalness: 0, roughness: 0.08 }))),
  );
  prism.geometry.translate(0, 0, -PRISM_MARKER_M / 2);
  prism.name = "ghost-prism";
  group.add(prism);

  const wheelMat = track(asGhost(siliconNitride()));
  const wheel = new THREE.Group();
  wheel.name = "ghost-wheel";
  wheel.position.set(WHEEL_STATION_M.x, WHEEL_STATION_M.y, WHEEL_STATION_M.z);
  const wheelTag = ghostLabel(0.0015);
  wheelTag.position.set(0.008, -0.0035, 0.006);
  wheel.add(wheelTag);
  group.add(wheel);
  let wheelCount = -1;

  const palletMat = track(asGhost(brushedTitanium()));
  const jewelMat = track(asGhost(rubyJewel()));
  const pallet = new THREE.Group();
  pallet.name = "ghost-pallet";
  pallet.position.set(WHEEL_STATION_M.x - 0.014, 0, WHEEL_STATION_M.z);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0024, 0.0014), palletMat);
  arm.position.x = 0.004;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0014, 0.0012), palletMat);
  upper.position.set(0.009, 0.0024, 0);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0014, 0.0012), palletMat);
  lower.position.set(0.009, -0.0024, 0);
  const jewelA = new THREE.Mesh(new THREE.SphereGeometry(JEWEL_RADIUS_M, 16, 12), jewelMat);
  jewelA.name = "ghost-jewel";
  jewelA.position.set(0.012, 0.0024, 0);
  const jewelB = jewelA.clone();
  jewelB.position.set(0.012, -0.0024, 0);
  pallet.add(arm, upper, lower, jewelA, jewelB);
  group.add(pallet);

  const leafGeo = new THREE.BufferGeometry();
  const leafPositions = new Float32Array(MAX_LEAVES * (LEAF_SEGMENTS + 1) * 2 * 3);
  leafGeo.setAttribute("position", new THREE.BufferAttribute(leafPositions, 3));
  const leafIndex: number[] = [];
  for (let leaf = 0; leaf < MAX_LEAVES; leaf += 1) {
    const base = leaf * (LEAF_SEGMENTS + 1) * 2;
    for (let seg = 0; seg < LEAF_SEGMENTS; seg += 1) {
      const a = base + seg * 2;
      leafIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  leafGeo.setIndex(leafIndex);
  const leaves = new THREE.Mesh(leafGeo, track(brushedTitanium()));
  leaves.name = "leaves";
  group.add(leaves);

  const setSection = (on: boolean) => {
    const planes = on ? [clipPlane] : [];
    for (const material of clipped) material.clippingPlanes = planes;
  };

  const update = (packet: FramePacket, pose: MotionSample) => {
    ring.rotation.z = pose.theta;
    prism.rotation.z = pose.mechAngle;
    if (packet.toothCount !== wheelCount) {
      rebuildWheel(wheel, packet.toothCount, wheelMat);
      wheelCount = packet.toothCount;
    }
    wheel.rotation.z = pose.mechAngle;
    pallet.rotation.z = pose.validBeats % 2 === 0 ? 0.28 : -0.28;
    writeLeaves(leafPositions, packet, pose.theta);
    const attr = leafGeo.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    leafGeo.computeVertexNormals();
  };

  return { group, update, setSection };
}

function rebuildWheel(group: THREE.Group, toothCount: number, material: THREE.Material): void {
  for (const child of [...group.children]) {
    if (child.name === "ghost-label") continue;
    group.remove(child);
    disposeMesh(child);
  }
  const radius = WHEEL_OD_M / 2;
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.0012, 24), material);
  disk.rotation.x = Math.PI / 2;
  disk.name = "ghost-wheel-disk";
  disk.castShadow = false;
  group.add(disk);
  for (let i = 0; i < toothCount; i += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0007, 0.001), material);
    const ang = (i / toothCount) * Math.PI * 2;
    const radial = radius - 0.0007;
    tooth.position.set(Math.cos(ang) * radial, Math.sin(ang) * radial, 0);
    tooth.rotation.z = ang;
    tooth.name = "ghost-wheel-tooth";
    group.add(tooth);
  }
}

function disposeMesh(object: THREE.Object3D): void {
  const mesh = object as THREE.Mesh;
  mesh.geometry?.dispose();
  for (const child of object.children) disposeMesh(child);
}

function writeLeaves(positions: Float32Array, packet: FramePacket, theta: number): void {
  const width = Math.max(0.001, packet.leafWidthM);
  for (let leaf = 0; leaf < MAX_LEAVES; leaf += 1) {
    const base = leaf * (LEAF_SEGMENTS + 1) * 2;
    for (let seg = 0; seg <= LEAF_SEGMENTS; seg += 1) {
      if (leaf >= packet.leafCount) {
        writeVertex(positions, base + seg * 2, 0, 0, -2);
        writeVertex(positions, base + seg * 2 + 1, 0, 0, -2);
        continue;
      }
      const s = seg / LEAF_SEGMENTS;
      const alpha = (leaf / packet.leafCount) * Math.PI * 2;
      const tipAngle = alpha + theta;
      const radius = RING_OUTER_M + packet.leafLengthM * s;
      const bow = Math.sin(Math.PI * s) * -theta * 0.35;
      const ang = tipAngle + (alpha - tipAngle) * s + bow;
      const px = -Math.sin(ang) * width * 0.5;
      const py = Math.cos(ang) * width * 0.5;
      const x = Math.cos(ang) * radius;
      const y = Math.sin(ang) * radius;
      const z = packet.leafThicknessM / 2;
      writeVertex(positions, base + seg * 2, x - px, y - py, -z);
      writeVertex(positions, base + seg * 2 + 1, x + px, y + py, z);
    }
  }
}

function writeVertex(positions: Float32Array, index: number, x: number, y: number, z: number): void {
  positions[index * 3] = x;
  positions[index * 3 + 1] = y;
  positions[index * 3 + 2] = z;
}
