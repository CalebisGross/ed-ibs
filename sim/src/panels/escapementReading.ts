import { escapementTorque, type SolverState } from "../physics/EscapementSolver";
import type { PowerLatch } from "../physics/powerCut";
import { solveCommand } from "../sim/parameters";
import type { Settings } from "../sim/settings";

/**
 * Predicates over one solver sample, using the labels in
 * docs/statecharts/escapement.view.ts. The chart is not a stored enum.
 */

export const SWING_LABELS = [
  "Released outside the lift zone",
  "Free swing, toward the center",
  "Lift zone, toward the center",
  "Still swinging after fifteen seconds",
  "Blank window, toward the center",
  "Blank window, toward the end of the swing",
  "Lift zone, toward the end of the swing",
  "Free swing, toward the end of the swing",
] as const;

export type SwingLabel = (typeof SWING_LABELS)[number];

export const DRIVE_LABELS = ["No drive torque", "Drive torque while moving"] as const;
export type DriveLabel = (typeof DRIVE_LABELS)[number];

export const SUPPLY_LABELS = [
  "Drive commanded",
  "Source off, torque already gone",
  "Unwinding, source still lit",
  "Fifteen seconds with the source off",
  "Unwind finished, source still lit",
] as const;
export type SupplyLabel = (typeof SUPPLY_LABELS)[number];

export const BLANK_LABELS = ["No blank measured yet", "Measured blank, not 2.2 ms"] as const;
export type BlankLabel = (typeof BLANK_LABELS)[number];

export const CHART_REGIONS = [
  { id: "swing", title: "Swing", labels: SWING_LABELS },
  { id: "drive", title: "Drive", labels: DRIVE_LABELS },
  { id: "supply", title: "Supply", labels: SUPPLY_LABELS },
  { id: "blank", title: "Blank", labels: BLANK_LABELS },
] as const;

export interface EscapementReading {
  swing: SwingLabel | null;
  drive: DriveLabel;
  supply: SupplyLabel;
  blank: BlankLabel;
  torqueOn: boolean;
  clockLate: boolean;
  geometricSwing: SwingLabel | null;
  unmappedReason: string | null;
  notes: string[];
}

export function cutElapsedSeconds(power: PowerLatch, simTime: number): number {
  if (!power.active || power.startTime === null) return 0;
  return simTime - power.startTime;
}

export function supplyLabel(power: PowerLatch, elapsedS: number, unwindSeconds: number): SupplyLabel {
  if (!power.active) return "Drive commanded";
  const late = elapsedS >= unwindSeconds;
  switch (power.mode) {
    case "total-source-off":
      return late ? "Fifteen seconds with the source off" : "Source off, torque already gone";
    case "retained-source-diagnostic":
      return late ? "Unwind finished, source still lit" : "Unwinding, source still lit";
    default: {
      const unexpected: never = power.mode;
      return unexpected;
    }
  }
}

export function blankLabel(state: SolverState): BlankLabel {
  if (state.blankEventCount > 0 || state.lastBlankDuration !== null) return "Measured blank, not 2.2 ms";
  return "No blank measured yet";
}

/** Geometric swing box for one sample. Null when the chart has no still-inside box. */
export function geometricSwingLabel(
  theta: number,
  omega: number,
  liftHalfRad: number,
  blankHalfRad: number,
  omegaEpsilon: number,
): SwingLabel | null {
  if (!Number.isFinite(theta) || !Number.isFinite(omega)) return null;
  const absTheta = Math.abs(theta);
  const still = Math.abs(omega) <= omegaEpsilon;
  if (still && absTheta <= liftHalfRad) return null;
  if (still && absTheta > liftHalfRad) return "Free swing, toward the center";
  let zone: "blank" | "lift" | "free";
  if (absTheta <= blankHalfRad) zone = "blank";
  else if (absTheta <= liftHalfRad) zone = "lift";
  else zone = "free";
  const towardCenter = theta !== 0 && theta * omega < 0;
  switch (zone) {
    case "blank":
      return towardCenter ? "Blank window, toward the center" : "Blank window, toward the end of the swing";
    case "lift":
      return towardCenter ? "Lift zone, toward the center" : "Lift zone, toward the end of the swing";
    case "free":
      return towardCenter ? "Free swing, toward the center" : "Free swing, toward the end of the swing";
    default: {
      const unexpected: never = zone;
      return unexpected;
    }
  }
}

function atRest(theta: number, omega: number, omegaEpsilon: number): boolean {
  return Math.abs(theta) <= omegaEpsilon && Math.abs(omega) <= omegaEpsilon;
}

export function readEscapement(state: SolverState, settings: Settings, power: PowerLatch): EscapementReading {
  const command = solveCommand(settings, power, state.t);
  const elapsed = cutElapsedSeconds(power, state.t);
  const clockLate = power.active && elapsed >= settings.unwindSeconds;
  const torque = escapementTorque(state.theta, state.omega, command.params);
  const torqueOn = torque !== 0;
  const drive: DriveLabel = torqueOn ? "Drive torque while moving" : "No drive torque";
  const supply = supplyLabel(power, elapsed, settings.unwindSeconds);
  const blank = blankLabel(state);
  const epsilon = command.params.omegaEpsilon;
  const release =
    Math.abs(state.omega) <= epsilon &&
    Math.abs(state.theta) > command.params.liftHalfAngle &&
    state.rawCrossings === 0;
  const geometric = release
    ? "Released outside the lift zone"
    : geometricSwingLabel(
        state.theta,
        state.omega,
        command.params.liftHalfAngle,
        command.params.blankHalfAngle,
        epsilon,
      );

  let swing: SwingLabel | null = geometric;
  let unmappedReason: string | null = null;
  if (!Number.isFinite(state.theta) || !Number.isFinite(state.omega)) {
    swing = null;
    unmappedReason = "The solver sample has a non-finite angle or angular velocity.";
  } else if (clockLate && atRest(state.theta, state.omega, epsilon)) {
    swing = null;
    unmappedReason =
      "The unwind interval has passed and this sample is at rest. The chart's post-horizon swing box is for a balance that is still moving.";
  } else if (clockLate) {
    swing = "Still swinging after fifteen seconds";
  } else if (swing === null) {
    unmappedReason =
      "This sample is still inside the lift zone. The escapement chart leaves out rest at zero and has no still box inside the lift or blank window.";
  }

  const notes: string[] = [];
  if (drive === "Drive torque while moving") {
    notes.push(
      "ImpulseOnlyAtZeroInsideLift. Torque is on through the lift zone while angular velocity is outside the epsilon.",
    );
  }
  if (
    torqueOn &&
    (swing === "Lift zone, toward the center" ||
      swing === "Blank window, toward the center" ||
      swing === "Blank window, toward the end of the swing")
  ) {
    notes.push(
      "ImpulseOnlyAtZeroInsideLift can match this swing box while torque is on. The same words also cover a coast with the source off.",
    );
  }
  if (blank === "Measured blank, not 2.2 ms") {
    notes.push("BlankDurationIsTwoPointTwoMs. A completed blank keeps this chart label.");
  }
  if (
    blank === "Measured blank, not 2.2 ms" &&
    (swing === "Lift zone, toward the end of the swing" || swing === "Free swing, toward the end of the swing")
  ) {
    notes.push("The long blank measurement stays marked after the window closes.");
  }
  if (supply === "Source off, torque already gone") {
    notes.push("CutWaitsOutTheUnwind. total-source-off zeros torque and source intensity at the cut.");
  }
  if (supply === "Fifteen seconds with the source off" || supply === "Unwind finished, source still lit") {
    notes.push("DeadCenterByUnwind. The unwind interval has passed. The chart does not park this sample at dead center.");
  }
  if (swing === "Still swinging after fifteen seconds") {
    notes.push("DeadCenterByUnwind. The chart's post-horizon swing box. Q near 350 leaves the balance moving.");
  }

  return {
    swing,
    drive,
    supply,
    blank,
    torqueOn,
    clockLate,
    geometricSwing: geometric,
    unmappedReason,
    notes,
  };
}
