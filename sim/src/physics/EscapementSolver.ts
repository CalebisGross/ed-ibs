import { DT_S } from "./constants";
import { mechanicalStepRad, opticalStepRad } from "./referenceModel";

/**
 * Fixed-step RK4 oscillator.
 *
 * The integrated state is a pure function of the previous state, the
 * parameters, and dt. Event flags are updated inside the same step, so
 * grouping steps into render frames does not change the result.
 *
 * Escapement torque is the prototype assumption `directional-lift-zone-drive`:
 * a constant torque in the direction of omega while |theta| is inside the
 * lift half-angle. It is not a pallet contact model. The source text that
 * asks for a zero-velocity impulse inside the lift zone is not implemented,
 * because that conjunction does not cross the center on a normal orbit.
 *
 * Event detection assumes at most one zero crossing per step. Blank enter
 * and exit are localized by linear interpolation in theta. When both step
 * endpoints lie outside the blank window but the path crosses it (a full
 * transit inside one dt), enter and exit are both registered at their
 * interpolated times so the blank is not missed at high frequency x amplitude.
 */

export interface SolverParams {
  inertia: number;
  stiffness: number;
  c0: number;
  cEddy: number;
  torqueMagnitude: number;
  liftHalfAngle: number;
  blankHalfAngle: number;
  unlockAmplitude: number;
  toothCount: number;
  omegaEpsilon: number;
}

export interface SolverState {
  t: number;
  step: number;
  theta: number;
  omega: number;
  validBeats: number;
  rawCrossings: number;
  peakSinceCrossing: number;
  lastHalfPeak: number;
  prevHalfPeak: number;
  angularBlank: boolean;
  blankEnterTime: number | null;
  lastBlankDuration: number | null;
  blankEventCount: number;
  lastCrossTime: number | null;
  prevCrossTime: number | null;
  lastHalfPeriod: number | null;
  prevHalfPeriod: number | null;
  beatError: number | null;
  mechAngle: number;
  opticalAngle: number;
}

export function isNewZeroCrossing(prev: number, next: number): boolean {
  if (prev === 0) return false;
  if (next === 0) return true;
  return prev * next < 0;
}

export function escapementTorque(theta: number, omega: number, params: SolverParams): number {
  if (!(params.torqueMagnitude > 0)) return 0;
  if (Math.abs(theta) <= params.liftHalfAngle && Math.abs(omega) > params.omegaEpsilon) {
    return params.torqueMagnitude * Math.sign(omega);
  }
  return 0;
}

export function createInitialState(
  theta: number,
  omega: number,
  blankHalfAngle: number,
): SolverState {
  const absTheta = Math.abs(theta);
  return {
    t: 0,
    step: 0,
    theta,
    omega,
    validBeats: 0,
    rawCrossings: 0,
    peakSinceCrossing: absTheta,
    lastHalfPeak: absTheta,
    prevHalfPeak: absTheta,
    angularBlank: absTheta <= blankHalfAngle,
    blankEnterTime: null,
    lastBlankDuration: null,
    blankEventCount: 0,
    lastCrossTime: null,
    prevCrossTime: null,
    lastHalfPeriod: null,
    prevHalfPeriod: null,
    beatError: null,
    mechAngle: 0,
    opticalAngle: 0,
  };
}

export function mechanicalEnergy(state: SolverState, inertia: number, stiffness: number): number {
  return 0.5 * inertia * state.omega * state.omega + 0.5 * stiffness * state.theta * state.theta;
}

function acceleration(theta: number, omega: number, params: SolverParams): number {
  const torque = escapementTorque(theta, omega, params);
  const damping = params.c0 + params.cEddy;
  return (torque - damping * omega - params.stiffness * theta) / params.inertia;
}

function crossFraction(theta0: number, theta1: number, level: number): number {
  const denom = theta0 - theta1;
  if (denom === 0) return 1;
  const frac = (theta0 - level) / denom;
  if (frac < 0) return 0;
  if (frac > 1) return 1;
  return frac;
}

export function step(state: SolverState, params: SolverParams, dt = DT_S): SolverState {
  if (!(params.inertia > 0) || !(dt > 0)) {
    throw new Error("Solver requires positive inertia and dt.");
  }
  if (!Number.isInteger(params.toothCount) || params.toothCount < 1) {
    throw new Error("Tooth count must be a positive integer.");
  }

  const theta0 = state.theta;
  const omega0 = state.omega;

  const a1 = acceleration(theta0, omega0, params);
  const t2 = theta0 + 0.5 * dt * omega0;
  const w2 = omega0 + 0.5 * dt * a1;
  const a2 = acceleration(t2, w2, params);
  const t3 = theta0 + 0.5 * dt * w2;
  const w3 = omega0 + 0.5 * dt * a2;
  const a3 = acceleration(t3, w3, params);
  const t4 = theta0 + dt * w3;
  const w4 = omega0 + dt * a3;
  const a4 = acceleration(t4, w4, params);

  const theta1 = theta0 + (dt / 6) * (omega0 + 2 * w2 + 2 * w3 + w4);
  const omega1 = omega0 + (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
  const stepIndex = state.step + 1;
  const t1 = stepIndex * dt;

  let angularBlank = Math.abs(theta1) <= params.blankHalfAngle;
  let blankEnterTime = state.blankEnterTime;
  let lastBlankDuration = state.lastBlankDuration;
  let blankEventCount = state.blankEventCount;
  const abs0 = Math.abs(theta0);
  const abs1 = Math.abs(theta1);

  if (!state.angularBlank && abs1 <= params.blankHalfAngle && abs0 > params.blankHalfAngle) {
    const level = theta0 > 0 ? params.blankHalfAngle : -params.blankHalfAngle;
    blankEnterTime = state.t + crossFraction(theta0, theta1, level) * dt;
    angularBlank = true;
  } else if (state.angularBlank && abs1 > params.blankHalfAngle && abs0 <= params.blankHalfAngle) {
    const level = theta1 > 0 ? params.blankHalfAngle : -params.blankHalfAngle;
    const exitTime = state.t + crossFraction(theta0, theta1, level) * dt;
    if (blankEnterTime !== null) {
      lastBlankDuration = exitTime - blankEnterTime;
      blankEventCount += 1;
    }
    blankEnterTime = null;
    angularBlank = false;
  } else if (
    !state.angularBlank &&
    abs0 > params.blankHalfAngle &&
    abs1 > params.blankHalfAngle &&
    theta0 * theta1 < 0
  ) {
    // Both endpoints outside, opposite signs: the linear path brackets the
    // whole blank window. Register enter and exit at the interpolated times.
    const enterLevel = theta0 > 0 ? params.blankHalfAngle : -params.blankHalfAngle;
    const exitLevel = theta1 > 0 ? params.blankHalfAngle : -params.blankHalfAngle;
    const enterTime = state.t + crossFraction(theta0, theta1, enterLevel) * dt;
    const exitTime = state.t + crossFraction(theta0, theta1, exitLevel) * dt;
    lastBlankDuration = exitTime - enterTime;
    blankEventCount += 1;
    blankEnterTime = null;
    angularBlank = false;
  }

  let validBeats = state.validBeats;
  let rawCrossings = state.rawCrossings;
  let peak = Math.max(state.peakSinceCrossing, abs0, abs1);
  let lastHalfPeak = state.lastHalfPeak;
  let prevHalfPeak = state.prevHalfPeak;
  let lastCrossTime = state.lastCrossTime;
  let prevCrossTime = state.prevCrossTime;
  let lastHalfPeriod = state.lastHalfPeriod;
  let prevHalfPeriod = state.prevHalfPeriod;
  let beatError = state.beatError;
  let mechAngle = state.mechAngle;
  let opticalAngle = state.opticalAngle;

  if (isNewZeroCrossing(theta0, theta1)) {
    rawCrossings += 1;
    const crossTime = state.t + crossFraction(theta0, theta1, 0) * dt;
    if (peak > params.unlockAmplitude) {
      validBeats += 1;
      if (lastCrossTime !== null) {
        prevHalfPeriod = lastHalfPeriod;
        lastHalfPeriod = crossTime - lastCrossTime;
        if (prevHalfPeriod !== null && lastHalfPeriod !== null) {
          beatError = lastHalfPeriod - prevHalfPeriod;
        }
      }
      prevCrossTime = lastCrossTime;
      lastCrossTime = crossTime;
      mechAngle += mechanicalStepRad(params.toothCount);
      opticalAngle += opticalStepRad(params.toothCount);
    }
    prevHalfPeak = lastHalfPeak;
    lastHalfPeak = peak;
    peak = abs1;
  }

  return {
    t: t1,
    step: stepIndex,
    theta: theta1,
    omega: omega1,
    validBeats,
    rawCrossings,
    peakSinceCrossing: peak,
    lastHalfPeak,
    prevHalfPeak,
    angularBlank,
    blankEnterTime,
    lastBlankDuration,
    blankEventCount,
    lastCrossTime,
    prevCrossTime,
    lastHalfPeriod,
    prevHalfPeriod,
    beatError,
    mechAngle,
    opticalAngle,
  };
}

export function advanceSteps(
  state: SolverState,
  params: SolverParams,
  count: number,
  dt = DT_S,
): SolverState {
  let next = state;
  for (let i = 0; i < count; i += 1) next = step(next, params, dt);
  return next;
}

/** Advance by whole steps only. A target between grid points stops on the previous step. */
export function advanceToTime(
  state: SolverState,
  params: SolverParams,
  tTarget: number,
  dt = DT_S,
): SolverState {
  const targetStep = Math.floor(tTarget / dt + 1e-12);
  if (targetStep <= state.step) return state;
  return advanceSteps(state, params, targetStep - state.step, dt);
}

export function displayedAmplitudeRad(state: SolverState): number {
  return Math.max(state.lastHalfPeak, state.prevHalfPeak, state.peakSinceCrossing);
}

export function measuredOscillationHz(state: SolverState): number | null {
  if (state.lastHalfPeriod === null || state.prevHalfPeriod === null) return null;
  const period = state.lastHalfPeriod + state.prevHalfPeriod;
  if (!(period > 0)) return null;
  return 1 / period;
}

export function measuredBeatHz(state: SolverState): number | null {
  if (state.lastHalfPeriod === null || !(state.lastHalfPeriod > 0)) return null;
  return 1 / state.lastHalfPeriod;
}
