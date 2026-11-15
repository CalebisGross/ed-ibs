import type { Sample } from "../sim/useSimulator";
import { degToRad, radToDeg } from "../physics/units";
import type { PowerLatch } from "../physics/powerCut";
import { cutElapsedSeconds } from "./escapementReading";
import type { IllustrativePhaseSeries, SolverPhaseSeries } from "./phaseSeries";
import { ProvenanceBadge, SolverSampleTag } from "./ProvenanceBadges";
import { linearTicks, paddedDomain, PlotFrame, polyline } from "./plot";

export function PhasePortrait(props: {
  samples: readonly Sample[];
  current: { thetaDeg: number; omegaRadPerS: number } | null;
  power: PowerLatch;
  simTime: number;
  unwindSeconds: number;
  decay: SolverPhaseSeries | null;
  unwind: SolverPhaseSeries | null;
  illustrative: IllustrativePhaseSeries | null;
  error: string | null;
}) {
  const session = sessionPoints(props.samples);
  const current =
    props.current && Number.isFinite(props.current.thetaDeg) && Number.isFinite(props.current.omegaRadPerS)
      ? props.current
      : null;
  const plotted = session.length > 0 ? session : current ? [current] : [];
  const hasCurve = plotted.length > 0 || props.decay !== null || props.unwind !== null;
  return (
    <section className="see-why-panel" data-testid="see-why-phase">
      <header className="see-why-panel-head">
        <h2 title="Angle against angular velocity. The legend sits under the plot.">Phase portrait</h2>
      </header>
      {props.error ? <p className="see-why-empty">{props.error}</p> : null}
      {!hasCurve && !props.error ? (
        <p className="see-why-empty" data-testid="see-why-phase-empty">
          No phase samples yet.
        </p>
      ) : null}
      <div className="see-why-phase-layout">
        <div className="see-why-plot-slot">
          {hasCurve ? (
            <PhasePlot session={plotted} decay={props.decay} unwind={props.unwind} illustrative={props.illustrative} />
          ) : null}
        </div>
        <ul
          className="see-why-legend"
          data-testid="see-why-phase-legend"
          title={`${sessionTrailLabel(props.power, props.simTime, props.unwindSeconds)} Damping is c = sqrt(K I) / Q. Stride ${props.decay?.stride ?? 40} steps.`}
        >
          <li>
            <span className="see-why-swatch see-why-swatch-session" />
            Session <SolverSampleTag />
          </li>
          <li>
            <span className="see-why-swatch see-why-swatch-decay" />
            {props.decay ? (
              <>
                Decay Q {props.decay.q} <ProvenanceBadge id="q-factor" />
              </>
            ) : (
              <span data-testid="see-why-phase-tail-empty">Q 350 tail is not in solver output yet.</span>
            )}
          </li>
          <li>
            <span className="see-why-swatch see-why-swatch-unwind" />
            {props.unwind ? "Unwind" : "Power-cut unwind is not in solver output yet."}
          </li>
          <li>
            <span className="see-why-swatch see-why-swatch-illustrative" />
            {props.illustrative ? "Envelope" : "Illustrative envelope is hidden until the solver tail exists."}
          </li>
        </ul>
      </div>
    </section>
  );
}

function sessionPoints(samples: readonly Sample[]): { thetaDeg: number; omegaRadPerS: number }[] {
  return samples.map((sample) => ({ thetaDeg: radToDeg(sample.theta), omegaRadPerS: sample.omega }));
}

export function sessionTrailLabel(power: PowerLatch, simTime: number, unwindSeconds: number): string {
  if (!power.active) return "Drive is commanded.";
  const elapsed = cutElapsedSeconds(power, simTime);
  const late = elapsed >= unwindSeconds;
  switch (power.mode) {
    case "total-source-off":
      return late ? "Total source off, past the unwind interval." : "Total source off. The trail is the free decay.";
    case "retained-source-diagnostic":
      return late ? "Retained source, unwind interval finished." : "Retained source. The trail is the unwind.";
    default: {
      const unexpected: never = power.mode;
      return unexpected;
    }
  }
}

function PhasePlot(props: {
  session: readonly { thetaDeg: number; omegaRadPerS: number }[];
  decay: SolverPhaseSeries | null;
  unwind: SolverPhaseSeries | null;
  illustrative: IllustrativePhaseSeries | null;
}) {
  const series = [
    ...props.session,
    ...(props.decay?.points ?? []),
    ...(props.unwind?.points ?? []),
    ...(props.illustrative?.points ?? []),
  ];
  const xDomain = paddedDomain(series.map((point) => degToRad(point.thetaDeg)));
  const yDomain = paddedDomain(series.map((point) => point.omegaRadPerS));
  const mapLine = (
    points: readonly { thetaDeg: number; omegaRadPerS: number }[],
    xOf: (value: number) => number,
    yOf: (value: number) => number,
  ) => polyline(points.map((point) => ({ x: xOf(degToRad(point.thetaDeg)), y: yOf(point.omegaRadPerS) })));
  return (
    <PlotFrame
      width={640}
      height={280}
      xLabel="angle (rad)"
      yLabel="rad/s"
      xDomain={xDomain}
      yDomain={yDomain}
      xTicks={linearTicks(xDomain[0], xDomain[1], 5)}
      yTicks={linearTicks(yDomain[0], yDomain[1], 5)}
    >
      {(xOf, yOf) => (
        <>
          {props.illustrative && props.illustrative.points.length > 1 ? (
            <polyline points={mapLine(props.illustrative.points, xOf, yOf)} className="see-why-series-illustrative" />
          ) : null}
          {props.decay && props.decay.points.length > 1 ? (
            <polyline points={mapLine(props.decay.points, xOf, yOf)} className="see-why-series-decay" />
          ) : null}
          {props.unwind && props.unwind.points.length > 1 ? (
            <polyline points={mapLine(props.unwind.points, xOf, yOf)} className="see-why-series-unwind" />
          ) : null}
          {props.session.length > 1 ? (
            <polyline points={mapLine(props.session, xOf, yOf)} className="see-why-series-session" />
          ) : null}
          {props.session.length > 0 ? (
            <circle
              cx={xOf(degToRad(props.session[props.session.length - 1].thetaDeg))}
              cy={yOf(props.session[props.session.length - 1].omegaRadPerS)}
              r={3}
              className="see-why-series-session-now"
            />
          ) : null}
        </>
      )}
    </PlotFrame>
  );
}
