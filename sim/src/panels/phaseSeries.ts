import {
  DT_S,
  I_ANNULUS_KG_M2,
  K_BASE_N_M_PER_RAD,
  L0_M,
  SOURCE_AMPLITUDE_TARGET_DEG,
  SOURCE_BLANK_DEG,
  SOURCE_CLAIMS,
  SOURCE_LIFT_DEG,
  SOURCE_Q,
  SOURCE_TOOTH_COUNT,
} from "../physics/constants";
import {
  createInitialState,
  displayedAmplitudeRad,
  step,
  type SolverParams,
  type SolverState,
} from "../physics/EscapementSolver";
import { engagePowerCut, linearDecayRatio, torqueUnderPowerPolicy } from "../physics/powerCut";
import {
  energyBalanceTorque,
  referenceFrequencyHz,
  viscousCoefficientForQ,
} from "../physics/referenceModel";
import { degToRad, radToDeg } from "../physics/units";
import { defaultSettings } from "../sim/settings";

export const PHASE_TAIL_STRIDE = 40;

export interface PhasePoint {
  thetaDeg: number;
  omegaRadPerS: number;
}

export interface SolverPhaseSeries {
  kind: "solver";
  id: "q350-tail" | "retained-unwind";
  points: PhasePoint[];
  finalAmplitudeDeg: number;
  durationS: number;
  stride: number;
  q: number;
  amplitudeDeg: number;
  frequencyHz: number;
  torqueAtStart: number;
}

export interface IllustrativePhaseSeries {
  kind: "illustrative";
  id: "linear-envelope";
  points: PhasePoint[];
  durationS: number;
  q: number;
  amplitudeDeg: number;
  frequencyHz: number;
  envelopeRatio: number;
}

function pointOf(state: SolverState): PhasePoint {
  return { thetaDeg: radToDeg(state.theta), omegaRadPerS: state.omega };
}

function referenceParams(torqueMagnitude: number): SolverParams {
  const c0 = viscousCoefficientForQ(K_BASE_N_M_PER_RAD, I_ANNULUS_KG_M2, SOURCE_Q);
  return {
    inertia: I_ANNULUS_KG_M2,
    stiffness: K_BASE_N_M_PER_RAD,
    c0: Number.isFinite(c0) ? c0 : 0,
    cEddy: 0,
    torqueMagnitude,
    liftHalfAngle: degToRad(SOURCE_LIFT_DEG),
    blankHalfAngle: degToRad(SOURCE_BLANK_DEG),
    unlockAmplitude: degToRad(defaultSettings.unlockDeg),
    toothCount: SOURCE_TOOTH_COUNT,
    omegaEpsilon: defaultSettings.omegaEpsilon,
  };
}

function integrate(args: {
  durationS: number;
  stride: number;
  paramsAt: (state: SolverState) => SolverParams;
}): { points: PhasePoint[]; final: SolverState } {
  const amplitudeRad = degToRad(SOURCE_AMPLITUDE_TARGET_DEG);
  let state = createInitialState(amplitudeRad, 0, degToRad(SOURCE_BLANK_DEG));
  const points: PhasePoint[] = [pointOf(state)];
  const maxSteps = Math.ceil(args.durationS / DT_S) + 2;
  let steps = 0;
  while (state.t < args.durationS - 1e-15 && steps < maxSteps) {
    state = step(state, args.paramsAt(state));
    steps += 1;
    if (steps % args.stride === 0) points.push(pointOf(state));
  }
  const last = pointOf(state);
  const tail = points[points.length - 1];
  if (!tail || tail.thetaDeg !== last.thetaDeg || tail.omegaRadPerS !== last.omegaRadPerS) {
    points.push(last);
  }
  return { points, final: state };
}

/** Free decay at reference K, Q 350, 18 deg, torque 0, for the unwind interval. */
export function runReferenceDecay(stride = PHASE_TAIL_STRIDE): SolverPhaseSeries {
  const durationS = SOURCE_CLAIMS.unwindSeconds;
  const run = integrate({
    durationS,
    stride,
    paramsAt: () => referenceParams(0),
  });
  return {
    kind: "solver",
    id: "q350-tail",
    points: run.points,
    finalAmplitudeDeg: radToDeg(displayedAmplitudeRad(run.final)),
    durationS,
    stride,
    q: SOURCE_Q,
    amplitudeDeg: SOURCE_AMPLITUDE_TARGET_DEG,
    frequencyHz: referenceFrequencyHz(L0_M),
    torqueAtStart: 0,
  };
}

/** Retained-source unwind at the same release, with the energy-balance torque captured at the cut. */
export function runReferenceUnwind(stride = PHASE_TAIL_STRIDE): SolverPhaseSeries {
  const durationS = SOURCE_CLAIMS.unwindSeconds;
  const tau = energyBalanceTorque({
    stiffness: K_BASE_N_M_PER_RAD,
    q: SOURCE_Q,
    liftHalfRad: degToRad(SOURCE_LIFT_DEG),
    amplitudeRad: degToRad(SOURCE_AMPLITUDE_TARGET_DEG),
  });
  const torqueAtCut = Number.isFinite(tau) ? tau : 0;
  const latch = engagePowerCut({
    mode: "retained-source-diagnostic",
    simTime: 0,
    torqueAtCut,
  });
  const run = integrate({
    durationS,
    stride,
    paramsAt: (state) => {
      const torque = torqueUnderPowerPolicy({
        commandedTorque: torqueAtCut,
        power: latch,
        simTime: state.t,
        unwindSeconds: durationS,
      });
      return referenceParams(Math.max(0, torque));
    },
  });
  return {
    kind: "solver",
    id: "retained-unwind",
    points: run.points,
    finalAmplitudeDeg: radToDeg(displayedAmplitudeRad(run.final)),
    durationS,
    stride,
    q: SOURCE_Q,
    amplitudeDeg: SOURCE_AMPLITUDE_TARGET_DEG,
    frequencyHz: referenceFrequencyHz(L0_M),
    torqueAtStart: torqueAtCut,
  };
}

/**
 * Linear underdamped release from rest. The envelope factor is linearDecayRatio.
 * The curve is the closed form, not RK4 output.
 */
export function illustrativeRestRelease(sampleCount = 360): IllustrativePhaseSeries {
  const frequencyHz = referenceFrequencyHz(L0_M);
  const q = SOURCE_Q;
  const amplitudeRad = degToRad(SOURCE_AMPLITUDE_TARGET_DEG);
  const durationS = SOURCE_CLAIMS.unwindSeconds;
  const omega0 = 2 * Math.PI * frequencyHz;
  const alpha = omega0 / (2 * q);
  const omegaD = Math.sqrt(Math.max(0, omega0 * omega0 - alpha * alpha));
  const points: PhasePoint[] = [];
  const count = Math.max(2, sampleCount);
  for (let i = 0; i <= count; i += 1) {
    const t = (durationS * i) / count;
    const decay = linearDecayRatio(frequencyHz, q, t);
    const s = Math.sin(omegaD * t);
    const c = Math.cos(omegaD * t);
    const beta = omegaD === 0 ? 0 : alpha / omegaD;
    const theta = amplitudeRad * decay * (c + beta * s);
    const omega = omegaD === 0 ? 0 : (-amplitudeRad * decay * s * omega0 * omega0) / omegaD;
    points.push({ thetaDeg: radToDeg(theta), omegaRadPerS: omega });
  }
  return {
    kind: "illustrative",
    id: "linear-envelope",
    points,
    durationS,
    q,
    amplitudeDeg: SOURCE_AMPLITUDE_TARGET_DEG,
    frequencyHz,
    envelopeRatio: linearDecayRatio(frequencyHz, q, durationS),
  };
}
