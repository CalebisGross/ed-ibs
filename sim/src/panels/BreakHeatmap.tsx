import { DT_S, I_ANNULUS_KG_M2, SOURCE_BLANK_DEG, SOURCE_Q } from "../physics/constants";
import {
  BLANK_HEATMAP_AMPLITUDES_DEG,
  BLANK_HEATMAP_FREQUENCIES_HZ,
  outcomeWord,
  type BlankHeatmapCell,
} from "./blankHeatmap";
import { ProvenanceBadge, TaggedNumber } from "./ProvenanceBadges";

export function BreakHeatmap(props: {
  cells: readonly BlankHeatmapCell[];
  blankHalfDeg: number;
  q: number;
  inertia: number;
}) {
  return (
    <section className="see-why-panel" data-testid="see-why-heatmap">
      <header className="see-why-panel-head">
        <h2>What breaks the blank window</h2>
        <p>Rows are frequency (Hz). Columns are amplitude (deg).</p>
      </header>
      {props.cells.length === 0 ? (
        <p className="see-why-empty" data-testid="see-why-heatmap-empty">
          The heatmap grid is empty.
        </p>
      ) : (
        <div
          className="see-why-heat"
          style={{ gridTemplateColumns: `3.4rem repeat(${BLANK_HEATMAP_AMPLITUDES_DEG.length}, minmax(0, 1fr))` }}
        >
          <div className="see-why-heat-corner" title="Rows are frequency in hertz. Columns are amplitude in degrees.">
            <span>Hz</span>
            <span>deg</span>
          </div>
          {BLANK_HEATMAP_AMPLITUDES_DEG.map((amplitude) => (
            <div key={amplitude} className="see-why-heat-col">
              {amplitude}
            </div>
          ))}
          {BLANK_HEATMAP_FREQUENCIES_HZ.map((frequency) => (
            <HeatRow key={frequency} frequency={frequency} cells={props.cells} />
          ))}
        </div>
      )}
      <details className="see-why-more">
        <summary>Cell notes</summary>
      <dl className="see-why-readouts">
        <div>
          <dt>RK4 step</dt>
          <dd>
            {DT_S} s <ProvenanceBadge id="dt" />
          </dd>
        </div>
        <div>
          <dt>Session blank half-angle</dt>
          <dd>
            <TaggedNumber
              id="blank-half-angle"
              text={`${props.blankHalfDeg.toFixed(2)} deg`}
              matchesTable={props.blankHalfDeg === SOURCE_BLANK_DEG}
            />
          </dd>
        </div>
        <div>
          <dt>Session Q</dt>
          <dd>
            <TaggedNumber id="q-factor" text={String(props.q)} matchesTable={props.q === SOURCE_Q} />
          </dd>
        </div>
        <div>
          <dt>Inertia</dt>
          <dd>
            <TaggedNumber
              id="annulus-inertia"
              text={`${props.inertia.toExponential(3)} kg m^2`}
              matchesTable={props.inertia === I_ANNULUS_KG_M2}
            />
          </dd>
        </div>
      </dl>
        <p>
          Grid 4 Hz and 20 Hz <ProvenanceBadge id="frequency-band" />, 8 Hz <ProvenanceBadge id="base-frequency" />. Amplitudes include 18 deg <ProvenanceBadge id="amplitude-target" />. Torque is 0. An outline is the harmonic estimate, not a stored sample.
        </p>
      </details>
    </section>
  );
}

function HeatRow(props: { frequency: number; cells: readonly BlankHeatmapCell[] }) {
  return (
    <>
      <div className="see-why-heat-row">{props.frequency} Hz</div>
      {BLANK_HEATMAP_AMPLITUDES_DEG.map((amplitude) => {
        const cell = props.cells.find(
          (item) => item.frequencyHz === props.frequency && item.amplitudeDeg === amplitude,
        );
        if (!cell) {
          return (
            <div key={amplitude} className="see-why-cell" data-outcome="missing">
              no cell
            </div>
          );
        }
        return (
          <div
            key={amplitude}
            className="see-why-cell"
            data-outcome={cell.outcome}
            data-brackets={cell.brackets ? "true" : "false"}
            title={cellTitle(cell)}
          >
            <strong>{outcomeWord(cell.outcome)}</strong>
            <span>
              {cell.blankEventCount}/{cell.rawCrossings}
            </span>
          </div>
        );
      })}
    </>
  );
}

function cellTitle(cell: BlankHeatmapCell): string {
  return [
    `${cell.frequencyHz} Hz`,
    `${cell.amplitudeDeg} deg`,
    outcomeWord(cell.outcome),
    `duration ${cell.durationS.toFixed(5)} s`,
    `steps ${cell.steps}`,
    `crossings ${cell.rawCrossings}`,
    `blank events ${cell.blankEventCount}`,
    `peak step estimate ${cell.peakStepDeg.toFixed(3)} deg`,
    `blank full width ${cell.blankFullWidthDeg.toFixed(3)} deg`,
  ].join(". ");
}
