import { Component, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ConsolePane } from "./components/ConsolePane";
import { Cyclorama } from "./components/Cyclorama";
import { MechanicalViewport } from "./components/MechanicalViewport";
import { StagePreview } from "./components/StagePreview";
import { Timegrapher } from "./components/Timegrapher";
import { SeeWhyPanels } from "./panels/SeeWhyPanels";
import { QualityToggle } from "./post/QualityToggle";
import type { QualityTier } from "./post/limits";
import { ReplayProvider, ReplayScrubber, useReplayScrub } from "./replay";
import { displayedAmplitudeRad, measuredOscillationHz } from "./physics/EscapementSolver";
import { PROVENANCE } from "./physics/constants";
import { radToDeg } from "./physics/units";
import { referenceEndpoints } from "./sim/parameters";
import { activeAnalyticHz } from "./sim/settings";
import { useSimulator } from "./sim/useSimulator";

export function App() {
  const sim = useSimulator();
  const [tier, setTier] = useState<QualityTier>("medium");
  const benchRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState({ x: 0.5, y: 0.56 });
  const [narrow, setNarrow] = useState(false);
  const ends = referenceEndpoints();
  const measured = measuredOscillationHz(sim.readout.state);
  const amplitude = radToDeg(displayedAmplitudeRad(sim.readout.state));

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        sim.setPaused((value) => !value);
      } else if (event.key === "r" || event.key === "R") {
        sim.reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sim.reset, sim.setPaused]);

  const drag = (axis: "x" | "y") => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = benchRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const move = (ev: PointerEvent) => {
      if (axis === "x") {
        const next = Math.min(0.72, Math.max(0.28, (ev.clientX - bounds.left) / bounds.width));
        setSplit((current) => ({ ...current, x: next }));
      } else {
        const next = Math.min(0.75, Math.max(0.28, (ev.clientY - bounds.top) / bounds.height));
        setSplit((current) => ({ ...current, y: next }));
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <ErrorBoundary>
      <ReplayProvider
        subscribe={sim.subscribe}
        settings={sim.settings}
        readout={sim.readout}
        onRestoreShareLink={(state) => sim.setSettings(state.settings)}
      >
      <div className="workbench">
        <header className="topbar">
          <div className="brand">
            <strong>ED-IBS prototype workbench</strong>
            <span>Reduced oscillator. Local only. Not a hardware twin.</span>
          </div>
          <div className="row">
            <button
              type="button"
              data-testid="mode-stage"
              className={sim.settings.viewMode === "stage" ? "active" : ""}
              onClick={() => sim.setSettings({ viewMode: "stage" })}
            >
              Stage
            </button>
            <button
              type="button"
              data-testid="mode-engineering"
              className={sim.settings.viewMode === "engineering" ? "active" : ""}
              onClick={() => sim.setSettings({ viewMode: "engineering" })}
            >
              Engineering
            </button>
            <button type="button" data-testid="btn-pause" className={sim.paused ? "active" : ""} onClick={() => sim.setPaused((value) => !value)}>
              {sim.paused ? "Run" : "Pause"}
            </button>
            <button type="button" data-testid="btn-reset" onClick={sim.reset}>Reset</button>
            <span data-testid="sim-state">{sim.paused ? "paused" : "running"}</span>
            <span data-testid="readout-time">t {sim.readout.state.t.toFixed(3)} s</span>
            <span data-testid="sim-step">step {sim.readout.state.step}</span>
            <span data-testid="readout-frequency">
              {sim.settings.stiffnessMode === "reference-law" ? "derived" : "prescribed"}{" "}
              {activeAnalyticHz(sim.settings).toFixed(4)} Hz
            </span>
            <span data-testid="readout-amplitude">{amplitude.toFixed(2)} deg</span>
            <span data-testid="readout-fps">{sim.readout.fps === null ? "FPS unmeasured" : `${sim.readout.fps.toFixed(0)} FPS this session`}</span>
            <QualityToggle tier={tier} onChange={setTier} />
          </div>
        </header>
        <p className="banner">
          {sim.settings.stiffnessMode === "reference-law"
            ? `Reference stiffness law is active. At the reference inertia the curb endpoints derive ${ends.lowHz.toFixed(3)} Hz and ${ends.highHz.toFixed(3)} Hz, not 4 to 20 Hz.`
            : "Prescribed-frequency assumption is active. K = I (2 pi f)^2 across the editable band. This is not the original curb law and not a validated actuator map."}{" "}
          Directional lift-zone drive replaces the conflicting zero-velocity impulse. Measured blanking is amplitude dependent. Spec SHA-256 {PROVENANCE.userSpecificationSha256.slice(0, 12)}.
        </p>
        {sim.settings.viewMode === "stage" ? (
          <div className="stage-layout">
            <StagePreview settings={sim.settings} subscribe={sim.subscribe} tier={tier} />
            <aside className="stage-rail">
              <div className="stage-controls">
                <label>
                  Throw {sim.settings.throwM.toFixed(1)} m
                  <input
                    data-testid="throw-slider"
                    type="range"
                    min={5}
                    max={50}
                    step={0.5}
                    value={sim.settings.throwM}
                    onChange={(event) => sim.setSettings({ throwM: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Persistence {sim.settings.persistenceMs.toFixed(0)} ms
                  <input
                    data-testid="persistence"
                    type="range"
                    min={1}
                    max={2000}
                    step={1}
                    value={sim.settings.persistenceMs}
                    onChange={(event) => sim.setSettings({ persistenceMs: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Haze display {sim.settings.hazeDisplay.toFixed(2)}
                  <input
                    data-testid="haze-display"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={sim.settings.hazeDisplay}
                    onChange={(event) => sim.setSettings({ hazeDisplay: Number(event.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  data-testid="btn-chopper"
                  className={sim.settings.chopperEnabled ? "active" : ""}
                  onClick={() => sim.setSettings({ chopperEnabled: !sim.settings.chopperEnabled })}
                >
                  Chopper {sim.settings.chopperEnabled ? "on" : "off"}
                </button>
              </div>
              <ConsolePane
                settings={sim.settings}
                setSettings={sim.setSettings}
                power={sim.power}
                state={sim.readout.state}
                fps={sim.readout.fps}
                cutPower={sim.cutPower}
                restorePower={sim.restorePower}
                setPowerMode={sim.setPowerMode}
                restoreDefaults={sim.restoreDefaults}
              />
            </aside>
          </div>
        ) : (
          <div
            className={narrow ? "bench narrow" : "bench"}
            ref={benchRef}
            style={
              narrow
                ? undefined
                : {
                    gridTemplateColumns: `minmax(0, ${split.x}fr) 8px minmax(0, ${1 - split.x}fr)`,
                    gridTemplateRows: `minmax(0, ${split.y}fr) 8px minmax(0, ${1 - split.y}fr)`,
                  }
            }
          >
            <MechanicalViewport subscribe={sim.subscribe} tier={tier} />
            {narrow ? null : <div className="gutter" onPointerDown={drag("x")} />}
            <Cyclorama settings={sim.settings} setSettings={sim.setSettings} subscribe={sim.subscribe} />
            {narrow ? null : <div className="gutter horizontal" style={{ gridColumn: "1 / -1" }} onPointerDown={drag("y")} />}
            <Timegrapher
              subscribe={sim.subscribe}
              amplitudeDeg={amplitude}
              analyticHz={activeAnalyticHz(sim.settings)}
              measuredHz={measured}
              beatErrorMs={sim.readout.state.beatError === null ? null : sim.readout.state.beatError * 1000}
              blankMs={sim.readout.state.lastBlankDuration === null ? null : sim.readout.state.lastBlankDuration * 1000}
              beatCount={sim.readout.state.validBeats}
            />
            {narrow ? null : <div className="gutter" onPointerDown={drag("x")} />}
            <ConsolePane
              settings={sim.settings}
              setSettings={sim.setSettings}
              power={sim.power}
              state={sim.readout.state}
              fps={sim.readout.fps}
              cutPower={sim.cutPower}
              restorePower={sim.restorePower}
              setPowerMode={sim.setPowerMode}
              restoreDefaults={sim.restoreDefaults}
            />
          </div>
        )}
        <ViewerTools sim={sim} />
      </div>
      </ReplayProvider>
    </ErrorBoundary>
  );
}

function ViewerTools({ sim }: { sim: ReturnType<typeof useSimulator> }) {
  const replay = useReplayScrub();
  return (
    <section className="viewer-tools" aria-label="Replay and see-why">
      <ReplayScrubber />
      <SeeWhyPanels
        readout={sim.readout}
        subscribe={sim.subscribe}
        settings={sim.settings}
        power={sim.power}
        paused={sim.paused}
        scrubTimeSeconds={replay.followingLive ? undefined : replay.scrubTimeSeconds}
      />
    </section>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown): { message: string } {
    return { message: error instanceof Error ? error.message : "Unknown render error" };
  }

  render(): ReactNode {
    if (this.state.message) {
      return (
        <div className="banner">
          The workbench hit a render error: {this.state.message}. Reload the page after correcting the input.
        </div>
      );
    }
    return this.props.children;
  }
}
