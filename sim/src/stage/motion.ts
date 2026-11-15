export const IMPULSE_DISPLAY_RATE = 0.2;
export const ORBIT_RAD_PER_S = 0.22;
export const PUSH_IN_S = 3.2;

export interface MotionSample {
  t: number;
  theta: number;
  omega: number;
  mechAngle: number;
  opticalAngle: number;
  angularBlank: boolean;
  validBeats: number;
}

/** Display clock. The solver keeps its own time. Inside the lift zone the picture falls behind. */
export function advanceDisplayTime(args: {
  displayT: number;
  latestT: number;
  latestAbsTheta: number;
  liftRad: number;
  frameDt: number;
  slow: boolean;
}): number {
  if (!args.slow || !(args.latestAbsTheta <= args.liftRad)) return args.latestT;
  const step = Math.min(0.05, Math.max(0, args.frameDt)) * IMPULSE_DISPLAY_RATE;
  return Math.min(args.latestT, args.displayT + step);
}

export function poseAt(samples: readonly MotionSample[], t: number): MotionSample | null {
  if (samples.length === 0) return null;
  const first = samples[0];
  if (t <= first.t) return first;
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b.t - a.t;
  const u = span > 0 ? (t - a.t) / span : 0;
  return {
    t,
    theta: a.theta + (b.theta - a.theta) * u,
    omega: a.omega + (b.omega - a.omega) * u,
    mechAngle: a.mechAngle + (b.mechAngle - a.mechAngle) * u,
    opticalAngle: a.opticalAngle + (b.opticalAngle - a.opticalAngle) * u,
    angularBlank: a.angularBlank,
    validBeats: a.validBeats,
  };
}

export function pushMotion(samples: readonly MotionSample[], added: readonly MotionSample[], keepS: number): MotionSample[] {
  if (added.length === 0) return samples.slice();
  const next = samples.concat(added);
  const latest = next[next.length - 1].t;
  const floor = latest - keepS;
  let drop = 0;
  while (drop < next.length && next[drop].t < floor) drop += 1;
  return drop === 0 ? next : next.slice(drop);
}

export function smoothstep(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
}

export function mixNumber(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}
