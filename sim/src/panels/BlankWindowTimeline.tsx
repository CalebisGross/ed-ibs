import { DT_S, SOURCE_BLANK_DEG, SOURCE_CLAIMS } from "../physics/constants";
import { displayedAmplitudeRad, type SolverState } from "../physics/EscapementSolver";
import { harmonicBlankDuration } from "../physics/referenceModel";
import { degToRad } from "../physics/units";
import { activeAnalyticHz, type Settings } from "../sim/settings";
import type { TimelineMark } from "./blankTimeline";
import { countBrackets } from "./blankTimeline";
import { ProvenanceBadge, SolverSampleTag, TaggedNumber } from "./ProvenanceBadges";
import { linearTicks, paddedDomain, PlotFrame, polyline } from "./plot";

export function BlankWindowTimeline(props: {
  marks: readonly TimelineMark[];
  blankDeg: number;
  state: SolverState;
  settings: Settings;
  cursorSeconds?: number;
}) {
  const harmonic = harmonicBlankMs(props.state, props.settings);
  return (
    <section className="see-why-panel" data-testid="see-why-blank-timeline">
      <header className="see-why-panel-head">
        <h2>Blank window</h2>
        <p>Balance angle against time. The line joins RK4 samples. The band is the blank half-angle.</p>
      </header>
      {props.marks.length === 0 ? (
        <p className="see-why-empty" data-testid="see-why-timeline-empty">
          No RK4 steps yet. The timeline fills from solver samples.
        </p>
      ) : (
        <TimelinePlot marks={props.marks} blankDeg={props.blankDeg} cursorSeconds={props.cursorSeconds} />
      )}
      <dl className="see-why-readouts">
        <div>
          <dt>RK4 step</dt>
          <dd>
            {DT_S} s <ProvenanceBadge id="dt" />
          </dd>
        </div>
        <div>
          <dt>Blank half-angle</dt>
          <dd>
            <TaggedNumber
              id="blank-half-angle"
              text={`${props.blankDeg.toFixed(2)} deg`}
              matchesTable={props.blankDeg === SOURCE_BLANK_DEG}
            />
          </dd>
        </div>
        <div>
          <dt>Blank duration claim</dt>
          <dd>
            {SOURCE_CLAIMS.blankDurationMs.toFixed(1)} ms <ProvenanceBadge id="blank-duration-claim" />
          </dd>
        </div>
        <div>
          <dt>Harmonic blank</dt>
          <dd>
            {harmonic === null ? "undefined at this amplitude" : `${harmonic.toFixed(3)} ms`}{" "}
            <ProvenanceBadge id="harmonic-blank-duration" />
          </dd>
        </div>
        <div>
          <dt>Solver blank duration</dt>
          <dd>
            {props.state.lastBlankDuration === null
              ? "no completed blank"
              : `${(props.state.lastBlankDuration * 1000).toFixed(3)} ms`}{" "}
            <SolverSampleTag />
          </dd>
        </div>
        <div>
          <dt>Blank events</dt>
          <dd>
            {props.state.blankEventCount} <SolverSampleTag />
          </dd>
        </div>
        <div>
          <dt>Steps that bracket the window</dt>
          <dd>
            {countBrackets(props.marks)} in view <SolverSampleTag />
          </dd>
        </div>
      </dl>
      <details className="see-why-more">
        <summary>Mark notes</summary>
        <p>
          A square mark brackets the blank half-angle. The harmonic blank uses 2 asin(blank/A) / omega and is undefined inside that half-angle.
        </p>
      </details>
    </section>
  );
}

function harmonicBlankMs(state: SolverState, settings: Settings): number | null {
  const seconds = harmonicBlankDuration(
    displayedAmplitudeRad(state),
    degToRad(settings.blankDeg),
    activeAnalyticHz(settings),
  );
  return seconds === null ? null : seconds * 1000;
}

function TimelinePlot(props: { marks: readonly TimelineMark[]; blankDeg: number; cursorSeconds?: number }) {
  const times = props.marks.map((mark) => mark.t);
  const angles = props.marks.map((mark) => mark.thetaDeg);
  const xDomain = paddedDomain(times, times);
  const yDomain = paddedDomain(angles, [props.blankDeg, -props.blankDeg, 0]);
  const width = 640;
  const height = 240;
  return (
    <PlotFrame
      width={width}
      height={height}
      xLabel="time (s)"
      yLabel="angle (deg)"
      xDomain={xDomain}
      yDomain={yDomain}
      xTicks={linearTicks(xDomain[0], xDomain[1], 5)}
      yTicks={linearTicks(yDomain[0], yDomain[1], 5)}
    >
      {(xOf, yOf) => (
        <>
          <rect
            x={Math.min(xOf(xDomain[0]), xOf(xDomain[1]))}
            y={Math.min(yOf(props.blankDeg), yOf(-props.blankDeg))}
            width={Math.abs(xOf(xDomain[1]) - xOf(xDomain[0]))}
            height={Math.abs(yOf(props.blankDeg) - yOf(-props.blankDeg))}
            className="see-why-window"
          />
          <line
            x1={xOf(xDomain[0])}
            x2={xOf(xDomain[1])}
            y1={yOf(props.blankDeg)}
            y2={yOf(props.blankDeg)}
            className="see-why-window-edge"
          />
          <line
            x1={xOf(xDomain[0])}
            x2={xOf(xDomain[1])}
            y1={yOf(-props.blankDeg)}
            y2={yOf(-props.blankDeg)}
            className="see-why-window-edge"
          />
          {props.cursorSeconds !== undefined && Number.isFinite(props.cursorSeconds) ? (
            <line
              x1={xOf(props.cursorSeconds)}
              x2={xOf(props.cursorSeconds)}
              y1={yOf(yDomain[0])}
              y2={yOf(yDomain[1])}
              className="see-why-scrub"
            />
          ) : null}
          <polyline
            points={polyline(props.marks.map((mark) => ({ x: xOf(mark.t), y: yOf(mark.thetaDeg) })))}
            className="see-why-timeline"
          />
          {props.marks.map((mark, index) =>
            mark.bracketsWindow ? (
              <rect
                key={`${mark.t}-${index}`}
                x={xOf(mark.t) - 2.5}
                y={yOf(mark.thetaDeg) - 2.5}
                width={5}
                height={5}
                className="see-why-mark see-why-mark-bracket"
              />
            ) : null,
          )}
        </>
      )}
    </PlotFrame>
  );
}
