import { describe, expect, it } from "vitest";
import { I_ANNULUS_KG_M2, K_BASE_N_M_PER_RAD, SOURCE_Q } from "../src/physics/constants";
import {
  advanceSteps,
  advanceToTime,
  createInitialState,
  displayedAmplitudeRad,
  escapementTorque,
  isNewZeroCrossing,
  mechanicalEnergy,
  step,
  type SolverParams,
  type SolverState,
} from "../src/physics/EscapementSolver";
import {
  energyBalanceTorque,
  harmonicBlankDuration,
  referenceBaselineDamping,
  referenceFrequencyHz,
} from "../src/physics/referenceModel";
import { degToRad } from "../src/physics/units";

function freeParams(extra: Partial<SolverParams> = {}): SolverParams {
  return {
    inertia: I_ANNULUS_KG_M2,
    stiffness: K_BASE_N_M_PER_RAD,
    c0: 0,
    cEddy: 0,
    torqueMagnitude: 0,
    liftHalfAngle: degToRad(3.5),
    blankHalfAngle: degToRad(2.1),
    unlockAmplitude: degToRad(3.5),
    toothCount: 15,
    omegaEpsilon: 1e-6,
    ...extra,
  };
}

function signature(state: SolverState): Record<string, number | null> {
  return {
    t: state.t,
    step: state.step,
    theta: state.theta,
    omega: state.omega,
    validBeats: state.validBeats,
    rawCrossings: state.rawCrossings,
    mechAngle: state.mechAngle,
    opticalAngle: state.opticalAngle,
    lastBlankDuration: state.lastBlankDuration,
    blankEventCount: state.blankEventCount,
    beatError: state.beatError,
    lastHalfPeak: state.lastHalfPeak,
  };
}

describe("zero crossing predicate", () => {
  it("counts one crossing when the sample changes sign or lands on zero", () => {
    expect(isNewZeroCrossing(0.2, -0.1)).toBe(true);
    expect(isNewZeroCrossing(-0.2, 0.1)).toBe(true);
    expect(isNewZeroCrossing(0.2, 0)).toBe(true);
    expect(isNewZeroCrossing(0, -0.1)).toBe(false);
    expect(isNewZeroCrossing(0.2, 0.1)).toBe(false);
    expect(isNewZeroCrossing(0, 0)).toBe(false);
  });
});

describe("RK4 free oscillator", () => {
  const amp = degToRad(18);
  const params = freeParams();
  const omega0 = Math.sqrt(params.stiffness / params.inertia);

  it("matches the analytic undamped orbit at the production step", () => {
    const state = advanceToTime(createInitialState(amp, 0, params.blankHalfAngle), params, 1);
    const theta = amp * Math.cos(omega0 * state.t);
    const omega = -amp * omega0 * Math.sin(omega0 * state.t);
    expect(state.step).toBe(4000);
    expect(Math.abs(state.theta - theta)).toBeLessThan(1e-8);
    expect(Math.abs(state.omega - omega)).toBeLessThan(1e-6);
  });

  it("conserves undamped energy", () => {
    const initial = createInitialState(amp, 0, params.blankHalfAngle);
    const e0 = mechanicalEnergy(initial, params.inertia, params.stiffness);
    const state = advanceSteps(initial, params, 8000);
    const e1 = mechanicalEnergy(state, params.inertia, params.stiffness);
    expect(Math.abs(e1 - e0) / e0).toBeLessThan(1e-8);
  });

  it("converges at fourth order against the analytic solution", () => {
    // t = 0.37 s avoids the near-integer cycle at 0.5 s, where the leading error term shrinks.
    const tEnd = 0.37;
    const analytic = amp * Math.cos(omega0 * tEnd);
    const errors = [1 / 400, 1 / 800, 1 / 1600].map((dt) => {
      const state = advanceToTime(createInitialState(amp, 0, params.blankHalfAngle), params, tEnd, dt);
      expect(state.t).toBeCloseTo(tEnd, 12);
      return Math.abs(state.theta - analytic);
    });
    const ratio1 = errors[0] / errors[1];
    const ratio2 = errors[1] / errors[2];
    expect(ratio1).toBeGreaterThan(13);
    expect(ratio1).toBeLessThan(19);
    expect(ratio2).toBeGreaterThan(13);
    expect(ratio2).toBeLessThan(19);
  });

  it("is identical under different step partitions", () => {
    const initial = createInitialState(amp, 0, params.blankHalfAngle);
    const single = advanceSteps(initial, params, 2000);
    let batched = initial;
    for (let n = 0; n < 31; n += 1) batched = advanceSteps(batched, params, 64);
    batched = advanceSteps(batched, params, 2000 - 31 * 64);
    let clocked = initial;
    clocked = advanceToTime(clocked, params, 0.2);
    clocked = advanceToTime(clocked, params, 0.2001);
    clocked = advanceToTime(clocked, params, 0.5);
    expect(signature(single)).toEqual(signature(batched));
    expect(signature(single)).toEqual(signature(clocked));
    expect(advanceToTime(initial, params, 0.0003).step).toBe(1);
    expect(advanceToTime(single, params, 0.4).step).toBe(single.step);
  });
});

describe("events", () => {
  const params = freeParams();
  const blank = params.blankHalfAngle;

  it("counts one valid beat per zero crossing above the unlock threshold", () => {
    const state = advanceToTime(createInitialState(degToRad(18), 0, blank), params, 0.5);
    expect(state.rawCrossings).toBe(8);
    expect(state.validBeats).toBe(8);
    expect(state.blankEventCount).toBe(8);
    expect(state.mechAngle).toBeCloseTo(8 * Math.PI / 15, 12);
    expect(state.opticalAngle).toBeCloseTo(8 * (2 * Math.PI) / 15, 12);
    expect(state.beatError).not.toBeNull();
    expect(Math.abs(state.beatError ?? 1)).toBeLessThan(1e-6);
  });

  it("does not count beats when the peak stays inside the unlock angle", () => {
    const state = advanceToTime(createInitialState(degToRad(2), 0, blank), params, 0.5);
    expect(state.rawCrossings).toBe(8);
    expect(state.validBeats).toBe(0);
    expect(state.mechAngle).toBe(0);
  });

  it("measures an amplitude-dependent blank window, not 2.2 ms", () => {
    const f = referenceFrequencyHz(0.018);
    const state = advanceToTime(createInitialState(degToRad(18), 0, blank), params, 0.5);
    const expected = harmonicBlankDuration(degToRad(18), blank, f);
    expect(expected).toBeCloseTo(0.00465183, 6);
    expect(state.lastBlankDuration).toBeCloseTo(expected ?? 0, 6);
    expect(Math.abs((state.lastBlankDuration ?? 0) - 0.0022)).toBeGreaterThan(0.001);

    const smaller = advanceToTime(createInitialState(degToRad(10), 0, blank), params, 0.5);
    const expectedSmall = harmonicBlankDuration(degToRad(10), blank, f);
    expect(smaller.lastBlankDuration).toBeCloseTo(expectedSmall ?? 0, 6);
    expect(smaller.lastBlankDuration).not.toBe(state.lastBlankDuration);
  });

  it("generalizes the mechanical and optical steps with tooth count", () => {
    const z12 = freeParams({ toothCount: 12 });
    const state = advanceToTime(createInitialState(degToRad(18), 0, blank), z12, 0.5);
    expect(state.validBeats).toBe(8);
    expect(state.mechAngle).toBeCloseTo(8 * Math.PI / 12, 12);
    expect(state.opticalAngle).toBeCloseTo(8 * (2 * Math.PI) / 12, 12);
  });

  it("registers a blank when one fixed step jumps across the whole window at max editable f x A", () => {
    // Sanitize caps allow 80 Hz prescribed and 40 deg amplitude. Peak |Delta theta|
    // is about 5.03 deg per 0.25 ms step, wider than the 4.2 deg blank at +/- 2.1 deg.
    const amplitudeDeg = 40;
    const frequencyHz = 80;
    const omega = 2 * Math.PI * frequencyHz;
    const amp = degToRad(amplitudeDeg);
    const params = freeParams({
      stiffness: I_ANNULUS_KG_M2 * omega * omega,
    });
    const peakDeltaDeg = (amp * omega * 0.00025) * (180 / Math.PI);
    expect(peakDeltaDeg).toBeGreaterThan(4.2);

    const theta0 = degToRad(2.5);
    const omega0 = -omega * Math.sqrt(Math.max(0, amp * amp - theta0 * theta0));
    const before = createInitialState(theta0, omega0, blank);
    expect(before.angularBlank).toBe(false);
    const after = step(before, params);
    expect(Math.abs(after.theta)).toBeGreaterThan(blank);
    expect(after.theta * theta0).toBeLessThan(0);
    expect(after.rawCrossings).toBe(1);
    expect(after.blankEventCount).toBe(1);
    expect(after.blankEnterTime).toBeNull();
    expect(after.angularBlank).toBe(false);
    expect(after.lastBlankDuration).not.toBeNull();
    const expected = harmonicBlankDuration(amp, blank, frequencyHz);
    expect(after.lastBlankDuration).toBeCloseTo(expected ?? 0, 4);

    const run = advanceToTime(createInitialState(amp, 0, blank), params, 0.125);
    expect(run.rawCrossings).toBe(20);
    expect(run.blankEventCount).toBe(20);
    expect(run.lastBlankDuration).toBeCloseTo(expected ?? 0, 4);

    const single = advanceSteps(createInitialState(amp, 0, blank), params, 400);
    let batched = createInitialState(amp, 0, blank);
    for (let i = 0; i < 25; i += 1) batched = advanceSteps(batched, params, 16);
    expect(signature(single)).toEqual(signature(batched));
  });
});

describe("damping, drive, and torque gate", () => {
  it("tracks linear viscous decay and does not stop at 15 s for Q 350", () => {
    const params = freeParams({ c0: referenceBaselineDamping(SOURCE_Q) });
    const amp = degToRad(18);
    const state = advanceToTime(createInitialState(amp, 0, params.blankHalfAngle), params, 15);
    const ratio = displayedAmplitudeRad(state) / amp;
    const f = referenceFrequencyHz(0.018);
    const expected = Math.exp((-2 * Math.PI * f * 15) / (2 * SOURCE_Q));
    expect(expected).toBeCloseTo(0.340513857, 6);
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.4);
    expect(ratio).toBeCloseTo(expected, 2);
  });

  it("keeps one beat per crossing with the directional drive engaged", () => {
    const lift = degToRad(3.5);
    const torque = energyBalanceTorque({
      stiffness: K_BASE_N_M_PER_RAD,
      q: SOURCE_Q,
      liftHalfRad: lift,
      amplitudeRad: degToRad(18),
    });
    const params = freeParams({
      c0: referenceBaselineDamping(SOURCE_Q),
      torqueMagnitude: torque,
    });
    const state = advanceToTime(createInitialState(degToRad(12), 0, params.blankHalfAngle), params, 1);
    expect(state.validBeats).toBe(state.rawCrossings);
    expect(state.validBeats).toBeGreaterThan(10);
    expect(escapementTorque(0, 1, params)).toBeCloseTo(torque, 12);
    expect(escapementTorque(degToRad(18), 0, params)).toBe(0);
    expect(escapementTorque(degToRad(10), 2, params)).toBe(0);
  });

  it("stays deterministic when the drive discontinuity is active", () => {
    const lift = degToRad(3.5);
    const params = freeParams({
      c0: referenceBaselineDamping(SOURCE_Q),
      torqueMagnitude: energyBalanceTorque({
        stiffness: K_BASE_N_M_PER_RAD,
        q: SOURCE_Q,
        liftHalfRad: lift,
        amplitudeRad: degToRad(18),
      }),
    });
    const initial = createInitialState(degToRad(12), 0, params.blankHalfAngle);
    const single = advanceSteps(initial, params, 1600);
    let batched = initial;
    for (let i = 0; i < 25; i += 1) batched = advanceSteps(batched, params, 64);
    expect(signature(single)).toEqual(signature(batched));
    expect(step(initial, params).step).toBe(1);
  });
});
