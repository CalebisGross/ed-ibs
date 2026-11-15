import * as THREE from "three";
import { hazeMaterial, laserCoreMaterial, laserSpotMaterial } from "./materials";
import { CORE_RADIUS_M, SHEATH_RADIUS_M, SPOT_RADIUS_M, coreOpacity, sheathOpacity, laserVisible } from "./laserLook";
import type { VisualShaft } from "./stageGeometry";

export const LASER_GROUP = "laser";
export const LASER_BEAM = "laser-beam";
export const LASER_SPOT = "laser-spot";
export const HAZE_GROUP = "haze";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const direction = new THREE.Vector3();

export interface LaserRig {
  beams: THREE.Group;
  haze: THREE.Group;
  cores: THREE.Mesh[];
  sheaths: THREE.Mesh[];
  spots: THREE.Mesh[];
}

export function createLaserRig(
  count: number,
  swatch: readonly string[],
  radii: { core: number; sheath: number; spot: number } = {
    core: CORE_RADIUS_M,
    sheath: SHEATH_RADIUS_M,
    spot: SPOT_RADIUS_M,
  },
): LaserRig {
  const beams = new THREE.Group();
  beams.name = LASER_GROUP;
  const haze = new THREE.Group();
  haze.name = HAZE_GROUP;
  haze.userData.role = "haze";
  const cores: THREE.Mesh[] = [];
  const sheaths: THREE.Mesh[] = [];
  const spots: THREE.Mesh[] = [];
  const coreGeo = new THREE.CylinderGeometry(radii.core, radii.core, 1, 8, 1, true);
  const sheathGeo = new THREE.CylinderGeometry(radii.sheath, radii.sheath, 1, 8, 1, true);
  const spotGeo = new THREE.SphereGeometry(radii.spot, 14, 10);
  for (let index = 0; index < count; index += 1) {
    const css = swatch[index % swatch.length] ?? "#d7d7d7";
    const coreMat = laserCoreMaterial(css);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.name = LASER_BEAM;
    core.userData.role = "laser";
    core.frustumCulled = false;
    core.visible = false;
    const sheathMat = hazeMaterial(css);
    const sheath = new THREE.Mesh(sheathGeo, sheathMat);
    sheath.name = HAZE_GROUP;
    sheath.userData.role = "haze";
    sheath.frustumCulled = false;
    sheath.visible = false;
    const spotMat = laserSpotMaterial(css);
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.name = LASER_SPOT;
    spot.userData.role = "laser";
    spot.frustumCulled = false;
    spot.visible = false;
    cores.push(core);
    sheaths.push(sheath);
    spots.push(spot);
    beams.add(core, spot);
    haze.add(sheath);
  }
  return { beams, haze, cores, sheaths, spots };
}

export function updateLaser(
  rig: LaserRig,
  shafts: readonly VisualShaft[],
  intensity: number,
  hazeAmount: number,
  chopperEnabled: boolean,
  angularBlank: boolean,
): void {
  const visible = laserVisible(intensity, chopperEnabled, angularBlank, hazeAmount);
  const coreOp = coreOpacity(intensity, hazeAmount);
  const sheathOp = sheathOpacity(intensity, hazeAmount);
  for (let index = 0; index < rig.cores.length; index += 1) {
    const shaft = shafts[index];
    const core = rig.cores[index];
    const sheath = rig.sheaths[index];
    const spot = rig.spots[index];
    if (!shaft || !visible.spot) {
      core.visible = false;
      sheath.visible = false;
      spot.visible = false;
      continue;
    }
    paint(core, shaft.css, coreOp);
    paint(sheath, shaft.css, sheathOp);
    paint(spot, shaft.css, 0.92);
    const aimed = aimUnitCylinder(core, shaft.from, shaft.to);
    aimUnitCylinder(sheath, shaft.from, shaft.to);
    core.visible = visible.beam && aimed;
    sheath.visible = visible.beam && aimed;
    spot.visible = true;
    spot.position.set(shaft.to.x, shaft.to.y, shaft.to.z);
  }
}

function paint(mesh: THREE.Mesh, css: string, opacity: number): void {
  const material = mesh.material as THREE.MeshStandardMaterial;
  if (material.emissiveIntensity > 0) material.emissive.set(css);
  else material.color.set(css);
  material.opacity = opacity;
}

function aimUnitCylinder(mesh: THREE.Mesh, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): boolean {
  direction.set(to.x - from.x, to.y - from.y, to.z - from.z);
  const length = direction.length();
  if (!(length > 1e-4)) return false;
  direction.multiplyScalar(1 / length);
  mesh.position.set(from.x + direction.x * length * 0.5, from.y + direction.y * length * 0.5, from.z + direction.z * length * 0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction);
  mesh.scale.set(1, length, 1);
  return true;
}
