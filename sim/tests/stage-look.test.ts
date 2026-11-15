import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { R_INNER_M, R_OUTER_M } from "../src/physics/constants";
import { defaultSettings } from "../src/sim/settings";
import {
  BORE_M,
  CHASSIS_ROUND_OD_M,
  CHASSIS_ROUND_WALL_M,
  CHASSIS_SQUARE_M,
  PART_NOTES,
  RING_AXIAL_M,
  RING_INNER_M,
  RING_OUTER_M,
  STEEL_RING_ID_M,
  STEEL_RING_OD_M,
  STEEL_RING_THICK_M,
  WHEEL_OD_M,
  WHEEL_STATION_M,
  ghostNotes,
} from "../src/stage/dimensions";
import {
  CORE_RADIUS_M,
  SHEATH_RADIUS_M,
  SPOT_RADIUS_M,
  beamIsThinnerThanLegacyShaft,
  coreOpacity,
  laserVisible,
  sheathOpacity,
} from "../src/stage/laserLook";
import {
  anodized6061,
  anodized7075,
  brushedBrass,
  brushedTitanium,
  hardenedSteel,
  hazeMaterial,
  laserCoreMaterial,
  rubyJewel,
} from "../src/stage/materials";
import { HAZE_GROUP, LASER_BEAM, LASER_SPOT } from "../src/stage/laserRig";
import { IMPULSE_DISPLAY_RATE, ORBIT_RAD_PER_S, advanceDisplayTime, poseAt, type MotionSample } from "../src/stage/motion";
import { tickOnBeat } from "../src/stage/tick";

describe("documented stage sizes", () => {
  it("keeps the balance radii and the open envelopes", () => {
    expect(RING_INNER_M).toBe(R_INNER_M);
    expect(RING_OUTER_M).toBe(R_OUTER_M);
    expect(BORE_M).toBe(0.056);
    expect(RING_AXIAL_M).toBe(defaultSettings.ringAxialMm / 1000);
    expect(WHEEL_OD_M).toBe(0.0148);
    expect(STEEL_RING_OD_M).toBe(0.08);
    expect(STEEL_RING_ID_M).toBe(0.062);
    expect(STEEL_RING_THICK_M).toBe(0.003);
    expect(CHASSIS_SQUARE_M).toBe(0.15);
    expect(CHASSIS_ROUND_OD_M).toBe(0.12);
    expect(CHASSIS_ROUND_WALL_M).toBe(0.01);
    expect(Math.abs(WHEEL_STATION_M.x)).toBeGreaterThan(RING_OUTER_M);
  });

  it("ghosts parts whose shape is not closed", () => {
    const ghosts = ghostNotes().map((part) => part.id);
    expect(ghosts).toEqual(["escape-wheel", "pallet", "prism", "steel-ring", "carrier", "chassis"]);
    expect(PART_NOTES.find((part) => part.id === "balance-ring")?.ghost).toBe(false);
    expect(ghostNotes().every((part) => part.label.toLowerCase().includes("ghost"))).toBe(true);
  });
});

describe("surface response", () => {
  it("uses dielectric anodize, metallic titanium and steel, and a non-emissive ruby", () => {
    expect(anodized6061().metalness).toBeLessThan(0.1);
    expect(anodized7075().metalness).toBeLessThan(0.1);
    expect(anodized6061().roughness).toBeGreaterThan(0.4);
    expect(brushedTitanium().metalness).toBe(1);
    expect(hardenedSteel().metalness).toBe(1);
    expect(hardenedSteel().roughness).toBeLessThan(0.3);
    expect(brushedBrass().metalness).toBe(1);
    expect(rubyJewel().metalness).toBe(0);
    expect(rubyJewel().emissiveIntensity).toBe(0);
    expect(hazeMaterial("#cccccc").emissiveIntensity).toBe(0);
    expect(laserCoreMaterial("#cccccc").emissiveIntensity).toBeGreaterThan(0);
  });
});

describe("laser display", () => {
  it("hides the volume without haze and hides everything on a blank", () => {
    expect(beamIsThinnerThanLegacyShaft()).toBe(true);
    expect(CORE_RADIUS_M).toBeLessThan(SHEATH_RADIUS_M);
    expect(SPOT_RADIUS_M).toBeLessThan(0.08);
    expect(coreOpacity(1, 0)).toBe(0);
    expect(sheathOpacity(1, 0)).toBe(0);
    expect(coreOpacity(1, 0.7)).toBeGreaterThan(sheathOpacity(1, 0.7));
    expect(laserVisible(1, false, false, 0)).toEqual({ beam: false, spot: true });
    expect(laserVisible(1, true, true, 0.7)).toEqual({ beam: false, spot: false });
    expect(laserVisible(0, false, false, 1)).toEqual({ beam: false, spot: false });
    expect(laserVisible(0.8, true, false, 0.5).beam).toBe(true);
    expect(LASER_BEAM).toBe("laser-beam");
    expect(LASER_SPOT).toBe("laser-spot");
    expect(HAZE_GROUP).toBe("haze");
  });
});

describe("display motion and tick", () => {
  it("slows only inside the lift zone and does not move the solver clock", () => {
    expect(IMPULSE_DISPLAY_RATE).toBeLessThan(1);
    expect(ORBIT_RAD_PER_S).toBeLessThan(0.5);
    const slow = advanceDisplayTime({
      displayT: 1,
      latestT: 1.2,
      latestAbsTheta: 0.02,
      liftRad: 0.06,
      frameDt: 0.016,
      slow: true,
    });
    expect(slow).toBeCloseTo(1 + 0.016 * IMPULSE_DISPLAY_RATE, 8);
    expect(slow).toBeLessThan(1.2);
    const caught = advanceDisplayTime({
      displayT: 1,
      latestT: 1.2,
      latestAbsTheta: 0.4,
      liftRad: 0.06,
      frameDt: 0.016,
      slow: true,
    });
    expect(caught).toBe(1.2);
    const sample = (t: number, theta: number): MotionSample => ({
      t,
      theta,
      omega: 1,
      mechAngle: 0,
      opticalAngle: 0,
      angularBlank: t < 0.15,
      validBeats: 1,
    });
    const pose = poseAt([sample(0.1, 0.01), sample(0.2, 0.03)], 0.15);
    expect(pose?.theta).toBeCloseTo(0.02, 8);
    expect(pose?.angularBlank).toBe(true);
  });

  it("ticks only when enabled and the beat count advances", () => {
    expect(tickOnBeat(3, 4, false)).toBe(false);
    expect(tickOnBeat(3, 4, true)).toBe(true);
    expect(tickOnBeat(4, 4, true)).toBe(false);
    expect(tickOnBeat(5, 2, true)).toBe(false);
  });
});

describe("studio lat-long", () => {
  it("parses the committed neutral studio HDR", () => {
    const path = resolve(dirname(fileURLToPath(import.meta.url)), "../src/stage/assets/studio-neutral.hdr");
    const file = readFileSync(path);
    const text = file.subarray(0, 180).toString("ascii");
    expect(text.startsWith("#?RADIANCE")).toBe(true);
    expect(text).toContain("Not a photograph");
    const copy = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const parsed = new RGBELoader().parse(copy) as { width: number; height: number };
    expect(parsed.width).toBe(256);
    expect(parsed.height).toBe(128);
  });
});
