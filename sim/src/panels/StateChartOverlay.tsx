import type { SolverState } from "../physics/EscapementSolver";
import type { PowerLatch } from "../physics/powerCut";
import type { Settings } from "../sim/settings";
import {
  CHART_REGIONS,
  geometricSwingLabel,
  readEscapement,
  type EscapementReading,
  type SwingLabel,
} from "./escapementReading";
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
        <h2 title="The lit box is the current sample. Boxes crossed in the sample window keep a dim border.">Escapement chart</h2>
      </header>
      {reading.unmappedReason ? <p className="see-why-empty" data-testid="see-why-state-empty">{reading.unmappedReason}</p> : null}
      <div className="see-why-regions">
        {CHART_REGIONS.filter((region) => region.id !== "blank").map((region) => (
          <div key={region.id} className="see-why-region">
            <h3>{region.title}</h3>
            <ul>
              {(region.id === "supply" ? region.labels.slice(0, 3) : region.labels).map((label) => {
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
      <details className="see-why-more">
        <summary>Later supply, blank, and notes</summary>
        <ul>
          {[
            ...(CHART_REGIONS.find((region) => region.id === "supply")?.labels.slice(3) ?? []),
            ...(CHART_REGIONS.find((region) => region.id === "blank")?.labels ?? []),
          ].map((label) => {
            const current = currentLabel(reading, "blank") === label || currentLabel(reading, "supply") === label;
            const lit = current ? "current" : "off";
            return (
              <li key={label} className="see-why-box" data-lit={lit} aria-current={current ? "true" : undefined}>
                {label}
              </li>
            );
          })}
        </ul>
        {reading.clockLate && reading.geometricSwing ? (
          <p className="see-why-note">Geometric zone at this sample: {reading.geometricSwing}.</p>
        ) : null}
        {reading.notes.length > 0 ? (
          <ul className="see-why-notes">
            {reading.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </details>
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
