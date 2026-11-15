import { describe, expect, it } from "vitest";
import {
  DT_S,
  K_BASE_N_M_PER_RAD,
  L0_M,
  L_MIN_M,
  MASS_KG,
  R_INNER_M,
  R_OUTER_M,
  SOURCE_AMPLITUDE_TARGET_DEG,
  SOURCE_BLANK_DEG,
  SOURCE_CLAIMS,
  SOURCE_ENDURANCE_MPA,
  SOURCE_FACET_TILT_DEG,
  SOURCE_LIFT_DEG,
  SOURCE_Q,
  SOURCE_TOOTH_COUNT,
  SOURCE_YOUNG_TI_PA,
} from "../src/physics/constants";
import { defaultSettings } from "../src/sim/settings";

/**
 * Locks the key figures listed in docs/analysis/number-provenance.md.
 * Values only. No solver behavior change.
 */
describe("number provenance lock", () => {
  it("keeps the sourced physics constants", () => {
    expect(DT_S).toBe(0.00025);
    expect(MASS_KG).toBe(0.042);
    expect(R_OUTER_M).toBe(0.036);
    expect(R_INNER_M).toBe(0.028);
    expect(K_BASE_N_M_PER_RAD).toBe(0.1104);
    expect(L0_M).toBe(0.018);
    expect(L_MIN_M).toBe(0.0085);
    expect(SOURCE_Q).toBe(350);
    expect(SOURCE_LIFT_DEG).toBe(3.5);
    expect(SOURCE_BLANK_DEG).toBe(2.1);
    expect(SOURCE_FACET_TILT_DEG).toBe(15);
    expect(SOURCE_AMPLITUDE_TARGET_DEG).toBe(18);
    expect(SOURCE_ENDURANCE_MPA).toBe(510);
    expect(SOURCE_YOUNG_TI_PA).toBe(114e9);
    expect(SOURCE_TOOTH_COUNT).toBe(15);
  });

  it("keeps the source claims the UI labels", () => {
    expect(SOURCE_CLAIMS.frequencyBandHz).toEqual([4, 20]);
    expect(SOURCE_CLAIMS.baseFrequencyHz).toBe(8);
    expect(SOURCE_CLAIMS.beatsPerSecond).toBe(16);
    expect(SOURCE_CLAIMS.blankDurationMs).toBe(2.2);
    expect(SOURCE_CLAIMS.unlockDisplayMs).toBe(2.1);
    expect(SOURCE_CLAIMS.timegrapherLiftDeg).toBe(44);
    expect(SOURCE_CLAIMS.simultaneousBeams).toBe(45);
    expect(SOURCE_CLAIMS.unwindSeconds).toBe(15);
    expect(SOURCE_CLAIMS.deadCenterPinspot).toBe(true);
    expect(SOURCE_CLAIMS.fpsBand).toEqual([60, 120]);
  });

  it("keeps the matching UI defaults for those figures", () => {
    expect(defaultSettings.qFactor).toBe(SOURCE_Q);
    expect(defaultSettings.liftDeg).toBe(SOURCE_LIFT_DEG);
    expect(defaultSettings.blankDeg).toBe(SOURCE_BLANK_DEG);
    expect(defaultSettings.amplitudeTargetDeg).toBe(SOURCE_AMPLITUDE_TARGET_DEG);
    expect(defaultSettings.unwindSeconds).toBe(SOURCE_CLAIMS.unwindSeconds);
    expect(defaultSettings.toothCount).toBe(SOURCE_TOOTH_COUNT);
    expect(defaultSettings.prescribedFLow).toBe(SOURCE_CLAIMS.frequencyBandHz[0]);
    expect(defaultSettings.prescribedFHigh).toBe(SOURCE_CLAIMS.frequencyBandHz[1]);
  });
});
