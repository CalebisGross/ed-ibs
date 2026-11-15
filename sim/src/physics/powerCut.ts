/**
 * Power-cut policies.
 *
 * total-source-off: commanded torque becomes zero immediately and the
 * optical source intensity is zero. This is the mains-off reading.
 * The balance keeps moving and decays only through damping. Q near 350
 * does not stop the motion at 15 s.
 *
 * retained-source-diagnostic: torque follows an explicit linear ramp from
 * the torque captured at the cut, over unwindSeconds. Source intensity
 * stays at the fader so the decay can be seen. The ramp is not a
 * mainspring torque law. Rest radius remains D*tan(15 deg), not a pinspot.
 */

export type PowerCutMode = "total-source-off" | "retained-source-diagnostic";

export interface PowerLatch {
  active: boolean;
  mode: PowerCutMode;
  startTime: number | null;
  torqueAtCut: number;
}

export function idlePower(mode: PowerCutMode = "total-source-off"): PowerLatch {
  return { active: false, mode, startTime: null, torqueAtCut: 0 };
}

/** The latch `cutPower` stores. Read-only; it does not integrate. */
export function engagePowerCut(args: {
  mode: PowerCutMode;
  simTime: number;
  torqueAtCut: number;
}): PowerLatch {
  return {
    active: true,
    mode: args.mode,
    startTime: args.simTime,
    torqueAtCut: args.torqueAtCut,
  };
}

/** `setPowerMode` while a cut is latched. An idle latch is returned unchanged. */
export function retargetPowerMode(power: PowerLatch, mode: PowerCutMode): PowerLatch {
  if (!power.active) return power;
  return { ...power, mode };
}

export function linearUnwindFraction(elapsedS: number, unwindSeconds: number): number {
  if (!(unwindSeconds > 0)) return 0;
  if (elapsedS <= 0) return 1;
  if (elapsedS >= unwindSeconds) return 0;
  return 1 - elapsedS / unwindSeconds;
}

export function torqueUnderPowerPolicy(args: {
  commandedTorque: number;
  power: PowerLatch;
  simTime: number;
  unwindSeconds: number;
}): number {
  if (!args.power.active) return args.commandedTorque;
  if (args.power.mode === "total-source-off") return 0;
  const start = args.power.startTime ?? args.simTime;
  const fraction = linearUnwindFraction(args.simTime - start, args.unwindSeconds);
  return args.power.torqueAtCut * fraction;
}

export function sourceIntensityUnderPowerPolicy(fader: number, power: PowerLatch): number {
  if (power.active && power.mode === "total-source-off") return 0;
  return fader;
}

/** Free-decay amplitude ratio for a linear oscillator at constant Q. */
export function linearDecayRatio(frequencyHz: number, q: number, elapsedS: number): number {
  if (!(frequencyHz > 0) || !(q > 0)) return Number.NaN;
  const omega0 = 2 * Math.PI * frequencyHz;
  return Math.exp((-omega0 * elapsedS) / (2 * q));
}
