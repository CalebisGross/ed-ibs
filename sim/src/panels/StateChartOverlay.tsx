import { SOURCE_BLANK_DEG, SOURCE_LIFT_DEG } from "../physics/constants";
import type { SolverState } from "../physics/EscapementSolver";
import { radToDeg } from "../physics/units";
import type { PowerLatch } from "../physics/powerCut";
import { defaultSettings, type Settings } from "../sim/settings";
import {
  CHART_REGIONS,
  geometricSwingLabel,
  readEscapement,
  type EscapementReading,
  type SwingLabel,
} from "./escapementReading";
import { SolverSampleTag, TaggedNumber } from "./ProvenanceBadges";

export function StateChartOverlay(props: {
  state: SolverState;
  settings: Settings;
  power: PowerLatch;
  recent: readonly SwingLabel[];
}) {
  const reading = readEscapement(props.state, props.settings, props.power);
  const recent = new Set(props.recent);
  return (
    <section className="see-why-panel" data-testid="see-why-statechart">
      <header className="see-why-panel-head">
        <h2>Escapement chart</h2>
        <p title="Boxes crossed in the sample window keep a dim border.">The lit box is the current sample.</p>
      </header>
      {reading.unmappedReason ? <p className="see-why-empty" data-testid="see-why-state-empty">{reading.unmappedReason}</p> : null}
      <div className="see-why-regions">
        {CHART_REGIONS.map((region) => (
          <div key={region.id} className="see-why-region">
            <h3>{region.title}</h3>
            <ul>
              {region.labels.map((label) => {
                const current = currentLabel(reading, region.id) === label;
                const lit = current ? "current" : recent.has(label as SwingLabel) && region.id === "swing" ? "recent" : "off";
                return (
                  <li
                    key={label}
                    className="see-why-box"
                    data-lit={lit}
                    aria-current={current ? "true" : undefined}
                    data-testid={current ? `see-why-${region.id}-current` : undefined}
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {reading.clockLate && reading.geometricSwing ? (
        <p className="see-why-note">Geometric zone at this sample: {reading.geometricSwing}.</p>
      ) : null}
      <dl className="see-why-readouts">
        <div>
          <dt>Angle</dt>
          <dd>
            {radToDeg(props.state.theta).toFixed(2)} deg <SolverSampleTag />
          </dd>
        </div>
        <div>
          <dt>Angular velocity</dt>
          <dd>
            {props.state.omega.toFixed(3)} rad/s <SolverSampleTag />
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {props.state.t.toFixed(3)} s <SolverSampleTag />
          </dd>
        </div>
        <div>
          <dt>Blank half-angle</dt>
          <dd>
            <TaggedNumber
              id="blank-half-angle"
              text={`${props.settings.blankDeg.toFixed(2)} deg`}
              matchesTable={props.settings.blankDeg === SOURCE_BLANK_DEG}
            />
          </dd>
        </div>
        <div>
          <dt>Lift half-angle</dt>
          <dd>
            <TaggedNumber
              id="lift-half-angle"
              text={`${props.settings.liftDeg.toFixed(2)} deg`}
              matchesTable={props.settings.liftDeg === SOURCE_LIFT_DEG}
            />
          </dd>
        </div>
        <div>
          <dt>omega epsilon</dt>
          <dd>
            <TaggedNumber
              id="omega-epsilon"
              text={`${props.settings.omegaEpsilon.toExponential(0)} rad/s`}
              matchesTable={props.settings.omegaEpsilon === defaultSettings.omegaEpsilon}
            />
          </dd>
        </div>
      </dl>
      {reading.notes.length > 0 ? (
        <ul className="see-why-notes">
          {reading.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function currentLabel(reading: EscapementReading, regionId: (typeof CHART_REGIONS)[number]["id"]): string | null {
  switch (regionId) {
    case "swing":
      return reading.swing;
    case "drive":
      return reading.drive;
    case "supply":
      return reading.supply;
    case "blank":
      return reading.blank;
    default: {
      const unexpected: never = regionId;
      return unexpected;
    }
  }
}

export function recentSwingLabels(
  samples: readonly { theta: number; omega: number }[],
  liftHalfRad: number,
  blankHalfRad: number,
  omegaEpsilon: number,
): SwingLabel[] {
  const labels = new Set<SwingLabel>();
  for (const sample of samples) {
    const label = geometricSwingLabel(sample.theta, sample.omega, liftHalfRad, blankHalfRad, omegaEpsilon);
    if (label) labels.add(label);
  }
  return [...labels];
}
