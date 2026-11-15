import { describe, expect, it } from "vitest";
import { buildDxf, buildOpenScad } from "../src/cad/exportGeometry";
import {
  I_ANNULUS_KG_M2,
  K_BASE_N_M_PER_RAD,
  L0_M,
  L_MIN_M,
  MASS_KG,
  R_INNER_M,
  R_OUTER_M,
  SOURCE_ENDURANCE_MPA,
} from "../src/physics/constants";
import { createInitialState } from "../src/physics/EscapementSolver";
import { idlePower, linearUnwindFraction, sourceIntensityUnderPowerPolicy, torqueUnderPowerPolicy } from "../src/physics/powerCut";
import {
  bendingStressPa,
  lengthForFrequency,
  referenceBaselineDamping,
  referenceFrequencyHz,
} from "../src/physics/referenceModel";
import { assessTempo, bpmFromTapIntervals, musicalBpmForFrequency } from "../src/physics/tempo";
import { coincidentChannels, projectRays, rayBudget } from "../src/optics/projection";
import { buildStatus, cadFromSettings, solveCommand } from "../src/sim/parameters";
import {
  activeAnalyticHz,
  activeStiffness,
  defaultSettings,
  sanitizeSettings,
  settingsWithTempoApplied,
} from "../src/sim/settings";
import { degToRad } from "../src/physics/units";

describe("reference inertia and stiffness law", () => {
  it("keeps the annulus arithmetic and the original frequency endpoints", () => {
    expect(I_ANNULUS_KG_M2).toBe((MASS_KG * (R_OUTER_M ** 2 + R_INNER_M ** 2)) / 2);
    expect(I_ANNULUS_KG_M2).toBeCloseTo(4.368e-5, 12);
    expect(referenceFrequencyHz(L0_M)).toBeCloseTo(8.001351575, 8);
    expect(referenceFrequencyHz(L_MIN_M)).toBeCloseTo(11.643676832, 8);
    expect(lengthForFrequency(4) * 1000).toBeCloseTo(72.02433, 3);
    expect(lengthForFrequency(20) * 1000).toBeCloseTo(2.880973, 3);
    expect(lengthForFrequency(4)).toBeGreaterThan(L0_M);
    expect(lengthForFrequency(20)).toBeLessThan(L_MIN_M);
    expect(referenceBaselineDamping(350)).toBeCloseTo(6.2741920368e-6, 12);
  });

  it("does not let thickness or material retune K", () => {
    const base = activeStiffness(defaultSettings);
    const changed = activeStiffness(
      sanitizeSettings({ ...defaultSettings, thicknessM: 0.0016, materialId: "ss-17-4" }),
    );
    expect(base).toBeCloseTo(K_BASE_N_M_PER_RAD, 12);
    expect(changed).toBe(base);
  });

  it("labels prescribed frequency as an assumption and still reports the original law", () => {
    const prescribed = sanitizeSettings({ ...defaultSettings, stiffnessMode: "prescribed-frequency", dmxCurb: 1 });
    expect(activeAnalyticHz(prescribed)).toBeCloseTo(20, 8);
    expect(referenceFrequencyHz(L_MIN_M)).toBeCloseTo(11.643676832, 8);
    const state = createInitialState(degToRad(12), 0, degToRad(2.1));
    const status = buildStatus(state, prescribed, idlePower(), null);
    expect(status.find((item) => item.id === "active-frequency")?.kind).toBe("assumption");
    expect(status.find((item) => item.id === "reference-frequency")?.value).toContain("11.6437");
    expect(status.find((item) => item.id === "frequency-target")?.kind).toBe("target");
    expect(status.find((item) => item.id === "fps")?.value).toBe("unmeasured");
  });
});

describe("tempo reachability", () => {
  const band = { fMin: referenceFrequencyHz(L0_M), fMax: referenceFrequencyHz(L_MIN_M) };

  it("reports reachable and unreachable musical tempos without clamping", () => {
    const unreachable = assessTempo({ bpm: 60, subdivision: 16, ...band });
    expect(unreachable.requiredHz).toBeCloseTo(8, 8);
    expect(unreachable.reachable).toBe(false);
    expect(unreachable.lengthM === null ? 0 : unreachable.lengthM).toBeGreaterThan(L0_M);

    const reachable = assessTempo({ bpm: 150, subdivision: 8, ...band });
    expect(reachable.requiredHz).toBeCloseTo(10, 8);
    expect(reachable.reachable).toBe(true);
    expect(reachable.lengthInsideReferenceTravel).toBe(true);

    const direct = assessTempo({ bpm: 240, subdivision: 1, ...band });
    expect(direct.reachable).toBe(false);
    expect(musicalBpmForFrequency(band.fMin, 16)).toBeGreaterThan(60);
  });

  it("applies a reachable curb and refuses an unreachable one", () => {
    const applied = settingsWithTempoApplied(defaultSettings, 150);
    expect(applied.settings).not.toBeNull();
    expect(activeAnalyticHz(applied.settings ?? defaultSettings)).toBeCloseTo(10, 4);

    const refused = settingsWithTempoApplied(defaultSettings, 60);
    expect(refused.settings).toBeNull();
    expect(refused.assessment.reachable).toBe(false);

    const prescribed = sanitizeSettings({ ...defaultSettings, stiffnessMode: "prescribed-frequency" });
    const high = settingsWithTempoApplied(prescribed, 240);
    expect(high.assessment.requiredHz).toBeCloseTo(16, 8);
    expect(high.settings?.dmxCurb).toBeCloseTo(0.75, 8);

    const below = settingsWithTempoApplied({ ...prescribed, subdivision: 1 }, 60);
    expect(below.assessment.requiredHz).toBeCloseTo(0.5, 8);
    expect(below.settings).toBeNull();
    expect(bpmFromTapIntervals([500, 500])).toBeCloseTo(120, 8);
  });
});

describe("power cut, optics, and stress", () => {
  it("separates total source off from the diagnostic ramp", () => {
    expect(linearUnwindFraction(0, 15)).toBe(1);
    expect(linearUnwindFraction(7.5, 15)).toBeCloseTo(0.5, 8);
    expect(linearUnwindFraction(15, 15)).toBe(0);
    expect(linearUnwindFraction(20, 15)).toBe(0);
    const cut = { active: true, mode: "total-source-off" as const, startTime: 0, torqueAtCut: 0.01 };
    expect(torqueUnderPowerPolicy({ commandedTorque: 0.02, power: cut, simTime: 3, unwindSeconds: 15 })).toBe(0);
    expect(sourceIntensityUnderPowerPolicy(0.8, cut)).toBe(0);
    const diagnostic = { active: true, mode: "retained-source-diagnostic" as const, startTime: 1, torqueAtCut: 0.02 };
    expect(
      torqueUnderPowerPolicy({ commandedTorque: 0.05, power: diagnostic, simTime: 8.5, unwindSeconds: 15 }),
    ).toBeCloseTo(0.01, 8);
    expect(sourceIntensityUnderPowerPolicy(0.8, diagnostic)).toBe(0.8);
  });

  it("projects 9 coincident rays and a non-centered rest spot", () => {
    expect(rayBudget(3).instantaneous).toBe(9);
    expect(rayBudget(3).sourceClaim).toBe(45);
    const rays = projectRays({
      theta: 0,
      opticalAngle: 0,
      facetCount: 3,
      throwM: 5,
      chromaticOffsetRad: [0, 0, 0],
      facetTiltRad: degToRad(15),
    });
    expect(rays).toHaveLength(9);
    expect(coincidentChannels([0, 0, 0])).toBe(true);
    const rest = 5 * Math.tan(degToRad(15));
    expect(rays[0].signedRadius).toBeCloseTo(rest, 8);
    expect(rest).toBeGreaterThan(1.3);
    expect(rays[0].x).toBeCloseTo(rays[1].x, 12);
    const flipped = projectRays({
      theta: degToRad(-18),
      opticalAngle: 0,
      facetCount: 1,
      throwM: 10,
      chromaticOffsetRad: [0, 0.1, -0.1],
      facetTiltRad: degToRad(15),
    });
    expect(flipped[0].negativeRadial).toBe(true);
    expect(flipped[0].azimuthRad).not.toBe(flipped[1].azimuthRad);
  });

  it("flags the user stress threshold without treating it as a certificate", () => {
    const mild = bendingStressPa(114e9, 0.00025, degToRad(18), 0.018) / 1e6;
    const severe = bendingStressPa(114e9, 0.0016, degToRad(18), 0.0085) / 1e6;
    expect(mild).toBeCloseTo(248.709, 2);
    expect(severe).toBeCloseTo(3370.744, 2);
    const state = createInitialState(degToRad(18), 0, degToRad(2.1));
    const hot = buildStatus(
      state,
      sanitizeSettings({ ...defaultSettings, thicknessM: 0.0016, dmxCurb: 1 }),
      idlePower(),
      null,
    );
    const stress = hot.find((item) => item.id === "stress");
    expect(stress?.kind).toBe("warning");
    expect(stress?.detail).toContain("not an endurance certificate");
    expect(severe).toBeGreaterThan(SOURCE_ENDURANCE_MPA);
  });
});

describe("illustrative CAD", () => {
  it("writes a non-approved OpenSCAD file and a DXF whose sizes follow the parameters", () => {
    const settings = sanitizeSettings({
      ...defaultSettings,
      thicknessM: 0.00125,
      toothCount: 18,
      facetCount: 4,
      leafCountVisual: 6,
      dmxCurb: 0,
      ringAxialMm: 5,
    });
    const cad = cadFromSettings(settings);
    const scad = buildOpenScad(cad);
    const dxf = buildDxf(cad);
    expect(scad).toContain("NOT MANUFACTURING APPROVED");
    expect(scad).toContain("leaf_thickness = 1.25");
    expect(scad).toContain("tooth_count = 18");
    expect(scad).toContain("facet_count = 4");
    expect(scad).toContain("bore_diameter = 56");
    expect(scad).toContain("leaf_count = 6");
    expect(dxf.endsWith("EOF\n")).toBe(true);
    expect(dxf).toContain("NOT MANUFACTURING APPROVED");
    const entities = parseEntities(dxf);
    const bore = entities.find((entity) => entity.type === "CIRCLE" && entity.layer === "BORE");
    const ring = entities.find((entity) => entity.type === "CIRCLE" && entity.layer === "RING");
    expect(bore?.nums["40"]).toBeCloseTo(28, 6);
    expect(ring?.nums["40"]).toBeCloseTo(36, 6);
    const leaf = entities.find((entity) => entity.type === "LINE" && entity.layer === "LEAF");
    expect(leaf).toBeTruthy();
    const leafSpan = Math.abs((leaf?.nums["11"] ?? 0) - (leaf?.nums["10"] ?? 0));
    expect(leafSpan).toBeCloseTo(18, 6);
    expect(entities.filter((entity) => entity.layer === "TOOTH_TICK")).toHaveLength(18);
    const stock = entities.find((entity) => entity.layer === "STOCK_SECTION");
    expect(Math.abs((stock?.nums["11"] ?? 0) - (stock?.nums["10"] ?? 0))).toBeCloseTo(1.25, 6);

    const short = cadFromSettings(sanitizeSettings({ ...settings, dmxCurb: 1 }));
    const shortLeaf = parseEntities(buildDxf(short)).find((entity) => entity.layer === "LEAF");
    expect(Math.abs((shortLeaf?.nums["11"] ?? 0) - (shortLeaf?.nums["10"] ?? 0))).toBeCloseTo(8.5, 6);
  });
});

describe("command builder", () => {
  it("zeros torque and intensity on a total source cut", () => {
    const running = solveCommand(defaultSettings, idlePower(), 0);
    expect(running.torqueMagnitude).toBeGreaterThan(0);
    expect(running.intensity).toBeCloseTo(defaultSettings.dmxIntensity, 8);
    const cut = solveCommand(
      defaultSettings,
      { active: true, mode: "total-source-off", startTime: 0, torqueAtCut: running.torqueMagnitude },
      1,
    );
    expect(cut.torqueMagnitude).toBe(0);
    expect(cut.intensity).toBe(0);
    expect(cut.params.stiffness).toBeCloseTo(K_BASE_N_M_PER_RAD, 12);
  });
});

interface Entity {
  type: string;
  layer: string;
  nums: Record<string, number>;
}

function parseEntities(dxf: string): Entity[] {
  const rows = dxf.trimEnd().split("\n");
  const entities: Entity[] = [];
  let inEntities = false;
  let current: Entity | null = null;
  for (let i = 0; i < rows.length - 1; i += 2) {
    const code = rows[i];
    const value = rows[i + 1];
    if (code === "2" && value === "ENTITIES") {
      inEntities = true;
      continue;
    }
    if (!inEntities) continue;
    if (code === "0" && value === "ENDSEC") break;
    if (code === "0") {
      current = { type: value, layer: "", nums: {} };
      entities.push(current);
      continue;
    }
    if (!current) continue;
    if (code === "8") current.layer = value;
    else if (value.trim() !== "" && Number.isFinite(Number(value))) current.nums[code] = Number(value);
  }
  return entities;
}
