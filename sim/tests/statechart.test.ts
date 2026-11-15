import { describe, expect, it } from "vitest";
import { I_ANNULUS_KG_M2, K_BASE_N_M_PER_RAD, SOURCE_Q } from "../src/physics/constants";
import {
  advanceToTime,
  createInitialState,
  displayedAmplitudeRad,
  escapementTorque,
  step,
  type SolverParams,
  type SolverState,
} from "../src/physics/EscapementSolver";
import {
  engagePowerCut,
  idlePower,
  linearDecayRatio,
  retargetPowerMode,
} from "../src/physics/powerCut";
import {
  energyBalanceTorque,
  harmonicBlankDuration,
  referenceBaselineDamping,
  referenceFrequencyHz,
} from "../src/physics/referenceModel";
import { degToRad } from "../src/physics/units";
import { solveCommand } from "../src/sim/parameters";
import { defaultSettings, sanitizeSettings } from "../src/sim/settings";
import {
  beamSampleVisible,
  clampWallDt,
  consumeFixedSteps,
  freshRun,
  simulationShouldStep,
} from "../src/sim/useSimulator";

/**
 * Replays of the shortest TLC counterexamples in docs/statecharts/.
 * Each action is one segment of the real solver or the real power latch.
 * The rules stay as written. These tests show the code breaking them.
 */

const BLANK = degToRad(2.1);
const LIFT = degToRad(3.5);
const RELEASE = degToRad(18);

function drivenParams(): SolverParams {
  return {
    inertia: I_ANNULUS_KG_M2,
    stiffness: K_BASE_N_M_PER_RAD,
    c0: referenceBaselineDamping(SOURCE_Q),
    cEddy: 0,
    torqueMagnitude: energyBalanceTorque({
      stiffness: K_BASE_N_M_PER_RAD,
      q: SOURCE_Q,
      liftHalfRad: LIFT,
      amplitudeRad: RELEASE,
    }),
    liftHalfAngle: LIFT,
    blankHalfAngle: BLANK,
    unlockAmplitude: LIFT,
    toothCount: 15,
    omegaEpsilon: 1e-6,
  };
}

function freeParams(): SolverParams {
  return { ...drivenParams(), torqueMagnitude: 0, c0: 0 };
}

function stepUntil(
  state: SolverState,
  params: SolverParams,
  done: (state: SolverState) => boolean,
): SolverState {
  let next = state;
  for (let i = 0; i < 20_000; i += 1) {
    next = step(next, params);
    if (done(next)) return next;
  }
  throw new Error("the action did not occur in the solver");
}

function notParked(state: SolverState, start: number): void {
  const ratio = displayedAmplitudeRad(state) / Math.abs(start);
  const expected = linearDecayRatio(referenceFrequencyHz(0.018), SOURCE_Q, 15);
  expect(expected).toBeCloseTo(0.340513857, 6);
  expect(ratio).toBeGreaterThan(0.3);
  expect(ratio).toBeLessThan(0.4);
  expect(ratio).toBeCloseTo(expected, 2);
  expect(Math.abs(state.theta)).toBeGreaterThan(degToRad(1));
}

describe("escapement chart", () => {
  it("CutWaitsOutTheUnwind: the source goes dark at the cut, before the unwind", () => {
    const settings = sanitizeSettings({ ...defaultSettings, theta0Deg: 18 });
    const released = freshRun(settings);
    const live = solveCommand(settings, idlePower(settings.powerCutMode), released.state.t);
    expect(live.torqueMagnitude).toBeGreaterThan(0);
    expect(live.intensity).toBeGreaterThan(0);
    expect(Math.abs(released.state.theta)).toBeGreaterThan(degToRad(settings.liftDeg));

    const cut = engagePowerCut({
      mode: settings.powerCutMode,
      simTime: released.state.t,
      torqueAtCut: live.torqueMagnitude,
    });
    const killed = solveCommand(settings, cut, released.state.t);
    expect(settings.powerCutMode).toBe("total-source-off");
    expect(settings.unwindSeconds).toBe(15);
    expect(killed.torqueMagnitude).toBe(0);
    expect(killed.intensity).toBe(0);
    expect(released.state.theta).toBeCloseTo(RELEASE, 12);
    expect(released.state.t).toBe(0);
  });

  it("DeadCenterByUnwind: fifteen seconds later the balance is still swinging", () => {
    const settings = sanitizeSettings({ ...defaultSettings, theta0Deg: 18 });
    const released = freshRun(settings);
    const live = solveCommand(settings, idlePower(settings.powerCutMode), released.state.t);
    const cut = engagePowerCut({
      mode: settings.powerCutMode,
      simTime: released.state.t,
      torqueAtCut: live.torqueMagnitude,
    });
    const killed = solveCommand(settings, cut, released.state.t);
    expect(killed.torqueMagnitude).toBe(0);

    const decayed = advanceToTime(released.state, killed.params, 15);
    expect(decayed.t).toBeCloseTo(15, 6);
    notParked(decayed, released.state.theta);
    expect(Math.abs(decayed.theta - released.state.theta)).toBeGreaterThan(degToRad(1));
  });

  it("ImpulseOnlyAtZeroInsideLift: torque comes on inside the lift while omega is not zero", () => {
    const params = drivenParams();
    let state = createInitialState(RELEASE, 0, BLANK);
    expect(Math.abs(state.omega)).toBeLessThanOrEqual(params.omegaEpsilon);
    expect(escapementTorque(state.theta, state.omega, params)).toBe(0);

    state = stepUntil(
      state,
      params,
      (sample) => Math.abs(sample.omega) > params.omegaEpsilon && Math.abs(sample.theta) > params.liftHalfAngle,
    );
    expect(escapementTorque(state.theta, state.omega, params)).toBe(0);
    expect(state.theta).toBeGreaterThan(params.liftHalfAngle);
    expect(state.omega).toBeLessThan(0);

    const coasting = state;
    state = stepUntil(state, params, (sample) => Math.abs(sample.theta) <= params.liftHalfAngle);
    expect(Math.abs(coasting.theta)).toBeGreaterThan(params.liftHalfAngle);
    expect(Math.abs(state.theta)).toBeGreaterThan(params.blankHalfAngle);
    expect(Math.abs(state.omega)).toBeGreaterThan(params.omegaEpsilon);
    expect(escapementTorque(state.theta, state.omega, params)).not.toBe(0);
  });

  it("BlankDurationIsTwoPointTwoMs: the measured blank on that orbit is not 2.2 ms", () => {
    const params = drivenParams();
    let state = createInitialState(RELEASE, 0, BLANK);
    state = stepUntil(
      state,
      params,
      (sample) => Math.abs(sample.omega) > params.omegaEpsilon && Math.abs(sample.theta) > params.liftHalfAngle,
    );
    state = stepUntil(state, params, (sample) => Math.abs(sample.theta) <= params.liftHalfAngle);
    state = stepUntil(state, params, (sample) => sample.angularBlank);
    expect(Math.abs(state.theta)).toBeLessThanOrEqual(params.blankHalfAngle);
    expect(escapementTorque(state.theta, state.omega, params)).not.toBe(0);
    expect(state.blankEventCount).toBe(0);

    const beforeBeat = state.validBeats;
    state = stepUntil(state, params, (sample) => sample.validBeats === beforeBeat + 1);
    expect(state.angularBlank).toBe(true);
    expect(Math.abs(state.omega)).toBeGreaterThan(params.omegaEpsilon);
    expect(escapementTorque(state.theta, state.omega, params)).not.toBe(0);

    state = stepUntil(state, params, (sample) => !sample.angularBlank && sample.blankEventCount >= 1);
    expect(state.blankEventCount).toBe(1);
    expect(state.lastBlankDuration).not.toBeNull();
    expect(Math.abs((state.lastBlankDuration ?? 0) - 0.0022)).toBeGreaterThan(0.001);

    const undriven = advanceToTime(createInitialState(RELEASE, 0, BLANK), freeParams(), 0.5);
    const harmonic = harmonicBlankDuration(RELEASE, BLANK, referenceFrequencyHz(0.018));
    expect(harmonic).toBeCloseTo(0.00465183, 6);
    expect(undriven.lastBlankDuration).toBeCloseTo(harmonic ?? 0, 6);
    expect(Math.abs((undriven.lastBlankDuration ?? 0) - 0.0022)).toBeGreaterThan(0.001);
  });
});

describe("simulator-run chart", () => {
  it("CutWaitsOutTheUnwind: torque and the beam drop at the cut, at the start angle", () => {
    const settings = sanitizeSettings(defaultSettings);
    const released = freshRun(settings);
    const live = solveCommand(settings, released.power, released.state.t);
    const cut = engagePowerCut({
      mode: settings.powerCutMode,
      simTime: released.state.t,
      torqueAtCut: live.torqueMagnitude,
    });
    const killed = solveCommand(settings, cut, released.state.t);
    expect(killed.torqueMagnitude).toBe(0);
    expect(killed.intensity).toBe(0);
    expect(released.state.theta).toBeCloseTo(degToRad(settings.theta0Deg), 12);
    expect(released.state.t).toBe(0);
    expect(settings.unwindSeconds).toBe(15);
  });

  it("DeadCenterByUnwind: the running solver leaves the start angle and does not stop", () => {
    const settings = sanitizeSettings(defaultSettings);
    const released = freshRun(settings);
    const live = solveCommand(settings, released.power, released.state.t);
    const cut = engagePowerCut({
      mode: settings.powerCutMode,
      simTime: released.state.t,
      torqueAtCut: live.torqueMagnitude,
    });
    const killed = solveCommand(settings, cut, released.state.t);
    expect(simulationShouldStep(false, true)).toBe(true);

    const decayed = advanceToTime(released.state, killed.params, 15);
    expect(decayed.t).toBeCloseTo(15, 6);
    notParked(decayed, released.state.theta);
    expect(Math.abs(decayed.theta - released.state.theta)).toBeGreaterThan(degToRad(1));
  });
});

type Pose =
  | "release"
  | "free-in"
  | "lift-in"
  | "blank-in"
  | "blank-out"
  | "lift-out"
  | "free-out";

function pose(state: SolverState, params: SolverParams): Pose {
  const abs = Math.abs(state.theta);
  if (abs > params.liftHalfAngle) {
    if (Math.abs(state.omega) <= params.omegaEpsilon) return "release";
    return state.theta * state.omega < 0 ? "free-in" : "free-out";
  }
  if (abs > params.blankHalfAngle) {
    return state.theta * state.omega < 0 ? "lift-in" : "lift-out";
  }
  return state.theta * state.omega < 0 ? "blank-in" : "blank-out";
}

function collapse(poses: Pose[]): Pose[] {
  const out: Pose[] = [];
  for (const item of poses) {
    if (out[out.length - 1] !== item) out.push(item);
  }
  return out;
}

describe("solver order, outside the chart", () => {
  it("walks the driven release in chart order and refuses the missing transitions", () => {
    const params = drivenParams();
    let state = createInitialState(RELEASE, 0, BLANK);
    const poses: Pose[] = [pose(state, params)];
    let turned = false;
    for (let i = 0; i < 20_000 && !turned; i += 1) {
      const previous = state;
      state = step(state, params);
      const torque = escapementTorque(state.theta, state.omega, params);
      if (torque !== 0) {
        expect(Math.abs(state.theta)).toBeLessThanOrEqual(params.liftHalfAngle);
        expect(Math.abs(state.omega)).toBeGreaterThan(params.omegaEpsilon);
      }
      expect(state.validBeats - previous.validBeats).toBeLessThanOrEqual(1);
      if (state.validBeats !== previous.validBeats) {
        expect(state.angularBlank).toBe(true);
      }
      poses.push(pose(state, params));
      const flat = collapse(poses);
      turned = flat.includes("free-out") && flat[flat.length - 1] === "free-in";
    }
    expect(collapse(poses)).toEqual([
      "release",
      "free-in",
      "lift-in",
      "blank-in",
      "blank-out",
      "lift-out",
      "free-out",
      "free-in",
    ]);
    expect(state.validBeats).toBe(1);
    expect(Math.abs(state.theta)).toBeGreaterThan(params.liftHalfAngle);
    expect(escapementTorque(state.theta, state.omega, params)).toBe(0);
  });

  it("does not count a beat on an undriven orbit inside the unlock angle", () => {
    const params = freeParams();
    const state = advanceToTime(createInitialState(degToRad(2), 0, BLANK), params, 0.5);
    expect(state.rawCrossings).toBeGreaterThan(0);
    expect(state.validBeats).toBe(0);
    expect(state.angularBlank).toBe(true);
  });

  it("does not start from rest at the center, even with drive commanded", () => {
    const params = drivenParams();
    expect(escapementTorque(0, 0, params)).toBe(0);
    const state = advanceToTime(createInitialState(0, 0, BLANK), params, 1);
    expect(state.theta).toBe(0);
    expect(state.omega).toBe(0);
    expect(state.validBeats).toBe(0);
  });

  it("does not count the first blank exit when the run starts inside the window", () => {
    const params = freeParams();
    let state = createInitialState(0, 5, BLANK);
    expect(state.angularBlank).toBe(true);
    expect(state.blankEnterTime).toBeNull();
    let exits = 0;
    for (let i = 0; i < 20_000 && exits < 2; i += 1) {
      const previous = state;
      state = step(state, params);
      if (previous.angularBlank && !state.angularBlank) {
        exits += 1;
        expect(state.blankEventCount).toBe(exits - 1);
      }
    }
    expect(exits).toBe(2);
    expect(state.blankEventCount).toBe(1);
  });
});

describe("run flags, without a browser", () => {
  it("lets the curb retune stiffness and leaves thickness, material, and the brake out of K", () => {
    const settings = sanitizeSettings(defaultSettings);
    const idle = idlePower();
    const base = solveCommand(settings, idle, 0);
    const shorter = solveCommand({ ...settings, dmxCurb: 1 }, idle, 0);
    expect(shorter.stiffness).not.toBeCloseTo(base.stiffness, 8);
    expect(shorter.lengthM).toBeLessThan(base.lengthM);

    const thicker = solveCommand({ ...settings, thicknessM: 0.0016 }, idle, 0);
    const otherMaterial = solveCommand({ ...settings, materialId: "ss-17-4" }, idle, 0);
    expect(thicker.stiffness).toBe(base.stiffness);
    expect(otherMaterial.stiffness).toBe(base.stiffness);
    expect(thicker.params.inertia).toBe(base.params.inertia);

    const braked = solveCommand({ ...settings, dmxBrake: 1 }, idle, 0);
    expect(braked.stiffness).toBe(base.stiffness);
    expect(braked.cEddy).toBeGreaterThan(base.cEddy);
  });

  it("gates the drawn beam with the chopper and does not change the solver parameters", () => {
    const settings = sanitizeSettings(defaultSettings);
    const on = solveCommand(settings, idlePower(), 0);
    const off = solveCommand({ ...settings, chopperEnabled: false }, idlePower(), 0);
    expect(off.params).toEqual(on.params);
    expect(beamSampleVisible(on.intensity, true, true)).toBe(false);
    expect(beamSampleVisible(on.intensity, false, true)).toBe(true);
    expect(beamSampleVisible(0, false, false)).toBe(false);
  });

  it("steps only while running, after the first frame, and caps a long frame", () => {
    expect(simulationShouldStep(true, true)).toBe(false);
    expect(simulationShouldStep(false, false)).toBe(false);
    expect(simulationShouldStep(false, true)).toBe(true);
    expect(clampWallDt(-1)).toBe(0);
    expect(clampWallDt(1)).toBe(0.05);
    expect(consumeFixedSteps(0, 0.001)).toEqual({ steps: 4, accum: 0 });
    expect(consumeFixedSteps(2, 0.1).steps).toBe(8000);
    expect(consumeFixedSteps(2, 0.1).accum).toBe(0);
  });

  it("resets the angle and the latch, and a latched mode change keeps the captured torque", () => {
    const settings = sanitizeSettings({ ...defaultSettings, theta0Deg: 12, powerCutMode: "retained-source-diagnostic" });
    const started = freshRun(settings);
    expect(started.power.active).toBe(false);
    expect(started.state.theta).toBeCloseTo(degToRad(12), 12);

    const live = solveCommand(settings, started.power, started.state.t);
    const cut = engagePowerCut({
      mode: "retained-source-diagnostic",
      simTime: 0,
      torqueAtCut: live.torqueMagnitude,
    });
    const held = solveCommand(settings, cut, 0);
    expect(held.torqueMagnitude).toBeCloseTo(live.torqueMagnitude, 12);
    expect(held.intensity).toBe(live.intensity);

    const retargeted = retargetPowerMode(cut, "total-source-off");
    expect(retargeted.torqueAtCut).toBe(cut.torqueAtCut);
    expect(retargeted.startTime).toBe(0);
    expect(solveCommand(settings, retargeted, 0).torqueMagnitude).toBe(0);
    expect(retargetPowerMode(started.power, "total-source-off")).toBe(started.power);

    const again = freshRun(settings);
    expect(again.state.step).toBe(0);
    expect(again.power.active).toBe(false);
  });

  it("keeps the same solver state when a parameter changes", () => {
    const settings = sanitizeSettings(defaultSettings);
    const command = solveCommand(settings, idlePower(), 0);
    const started = createInitialState(degToRad(settings.theta0Deg), settings.omega0, command.params.blankHalfAngle);
    const moved = step(started, command.params);
    const retuned = solveCommand({ ...settings, dmxCurb: 1 }, idlePower(), moved.t);
    const continued = step(moved, retuned.params);
    expect(continued.step).toBe(2);
    expect(continued.t).toBeGreaterThan(moved.t);
  });
});
