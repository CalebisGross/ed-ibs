import type { Sample } from "../sim/useSimulator";
import { radToDeg } from "../physics/units";

export interface TimelineMark {
  t: number;
  thetaDeg: number;
  angularBlank: boolean;
  bracketsWindow: boolean;
}

/**
 * One mark per solver sample. A step brackets the window when both
 * endpoints sit outside the blank half-angle and the signs differ.
 * That is the same endpoint test EscapementSolver uses for a one-step transit.
 */
export function timelineMarks(
  samples: readonly Sample[],
  blankHalfRad: number,
  predecessorThetaRad: number | null,
): TimelineMark[] {
  const marks: TimelineMark[] = [];
  let previous = predecessorThetaRad;
  for (const sample of samples) {
    const bracketsWindow =
      previous !== null &&
      Math.abs(previous) > blankHalfRad &&
      Math.abs(sample.theta) > blankHalfRad &&
      previous * sample.theta < 0;
    marks.push({
      t: sample.t,
      thetaDeg: radToDeg(sample.theta),
      angularBlank: sample.angularBlank,
      bracketsWindow,
    });
    previous = sample.theta;
  }
  return marks;
}

export function countBrackets(marks: readonly TimelineMark[]): number {
  return marks.reduce((count, mark) => count + (mark.bracketsWindow ? 1 : 0), 0);
}
