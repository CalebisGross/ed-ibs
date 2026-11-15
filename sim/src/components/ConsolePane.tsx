import { useRef } from "react";
import { buildDxf, buildOpenScad } from "../cad/exportGeometry";
import { DRIVE_MODEL_ID, MATERIALS, SOURCE_CLAIMS } from "../physics/constants";
import { displayedAmplitudeRad, measuredOscillationHz } from "../physics/EscapementSolver";
import type { SolverState } from "../physics/EscapementSolver";
import type { PowerCutMode, PowerLatch } from "../physics/powerCut";
import { bpmFromTapIntervals } from "../physics/tempo";
import { radToDeg } from "../physics/units";
import { assumptionLines, buildStatus, cadFromSettings } from "../sim/parameters";
import {
  activeAnalyticHz,
  curbLengthM,
  settingsWithTempoApplied,
  tempoAssessmentFor,
  type Settings,
} from "../sim/settings";

export function ConsolePane({
  settings,
  setSettings,
  power,
  state,
  fps,
  cutPower,
  restorePower,
  setPowerMode,
  restoreDefaults,
}: {
  settings: Settings;
  setSettings: (patch: Partial<Settings> | ((current: Settings) => Settings)) => void;
  power: PowerLatch;
  state: SolverState;
  fps: number | null;
  cutPower: () => void;
  restorePower: () => void;
  setPowerMode: (mode: PowerCutMode) => void;
  restoreDefaults: () => void;
}) {
  const taps = useRef<number[]>([]);
  const status = buildStatus(state, settings, power, fps);
  const tempo = tempoAssessmentFor(settings);
  const lengthMm = curbLengthM(settings.dmxCurb) * 1000;
  const amplitude = radToDeg(displayedAmplitudeRad(state));
  const measured = measuredOscillationHz(state);

  const exportFiles = () => {
    const cad = cadFromSettings(settings);
    download("ed-ibs-illustrative.scad", buildOpenScad(cad), "text/plain");
    download("ed-ibs-illustrative.dxf", buildDxf(cad), "application/dxf");
  };

  return (
    <section className="pane" data-testid="pane-console">
      <header className="pane-head">
        <h2>Pane 4 · DMX, status, export</h2>
        <p className="note">Virtual faders. No DMX hardware is driven.</p>
      </header>
      <div className="console">
        <div className="row">
          <button
            type="button"
            className={settings.stiffnessMode === "reference-law" ? "active" : ""}
            onClick={() => setSettings({ stiffnessMode: "reference-law" })}
          >
            Reference K law
          </button>
          <button
            type="button"
            className={settings.stiffnessMode === "prescribed-frequency" ? "active" : ""}
            onClick={() => setSettings({ stiffnessMode: "prescribed-frequency" })}
          >
            Prescribed frequency
          </button>
          <span className="note">Drive {DRIVE_MODEL_ID}</span>
        </div>
        <div className="fader-grid">
          <Fader
            testId="fader-torque"
            channel="CH 1"
            label="Remontoire torque"
            value={settings.dmxTorque}
            detail="Scales the energy-balance torque. It does not by itself prove +/- 18 deg."
            onChange={(value) => setSettings({ dmxTorque: value })}
          />
          <Fader
            testId="fader-curb"
            channel="CH 2"
            label="Curb length"
            value={settings.dmxCurb}
            detail={
              settings.stiffnessMode === "reference-law"
                ? `Active length ${lengthMm.toFixed(2)} mm. Original law, about 8.00 to 11.64 Hz here.`
                : `Mapped to ${settings.prescribedFLow.toFixed(2)}-${settings.prescribedFHigh.toFixed(2)} Hz by assumption. Length marker ${lengthMm.toFixed(2)} mm.`
            }
            onChange={(value) => setSettings({ dmxCurb: value })}
          />
          <Fader
            testId="fader-brake"
            channel="CH 3"
            label="Eddy brake"
            value={settings.dmxBrake}
            detail={`Viscous add-on toward Q floor ${settings.brakeQFloor.toFixed(0)}. Not a magnet map.`}
            onChange={(value) => setSettings({ dmxBrake: value })}
          />
          <Fader
            testId="fader-intensity"
            channel="CH 4"
            label="Source intensity"
            value={settings.dmxIntensity}
            detail="Scales drawn rays. A total source cut forces this output to zero."
            onChange={(value) => setSettings({ dmxIntensity: value })}
          />
        </div>
        <div className="block">
          <div className="row">
            <button type="button" data-testid="btn-power-cut" onClick={cutPower}>
              Power cut
            </button>
            <button type="button" onClick={restorePower} disabled={!power.active}>
              Restore power
            </button>
            <select value={settings.powerCutMode} onChange={(event) => setPowerMode(event.target.value as PowerCutMode)}>
              <option value="total-source-off">Total source off</option>
              <option value="retained-source-diagnostic">Retained source, linear unwind</option>
            </select>
            <span className="note">{power.active ? `Latched: ${power.mode}` : "Power latched off"}</span>
          </div>
          <p className="note">
            Total source off drops torque and intensity immediately. Retained source keeps the fader intensity and ramps torque linearly over {settings.unwindSeconds.toFixed(1)} s from the captured value. Q near 350 does not stop at 15 s, and the 15 deg facet bias does not land on center.
          </p>
        </div>
        <div className="status-grid">
          {status.map((item) => (
            <article key={item.id} className="status-item" data-testid={`status-${item.id}`}>
              <span className={`kind ${item.kind}`}>{item.kind}</span>
              <b>{item.label}</b>
              <div>{item.value}</div>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className="conflict">
          <p>
            Conflict: source section 2A wants an impulse when velocity crosses zero inside +/- 3.5 deg. On a normal orbit that zero is at the turning point, outside the zone. Pane 3 instead puts the kick at peak velocity. This build uses {DRIVE_MODEL_ID} and says so.
          </p>
          <p>
            Live check: amplitude {amplitude.toFixed(2)} deg, analytic {activeAnalyticHz(settings).toFixed(3)} Hz, measured {measured === null ? "n/a" : `${measured.toFixed(3)} Hz`}. Target band {SOURCE_CLAIMS.frequencyBandHz[0]} to {SOURCE_CLAIMS.frequencyBandHz[1]} Hz stays a target.
          </p>
        </div>
        <div className="tweak-grid">
          <label className="tweak">
            Teeth Z {settings.toothCount}
            <input type="range" min={12} max={24} step={1} value={settings.toothCount} onChange={(event) => setSettings({ toothCount: Number(event.target.value) })} />
            <small>Step { (180 / settings.toothCount).toFixed(2) } deg mechanical, { (360 / settings.toothCount).toFixed(2) } deg optical. Inertia unchanged.</small>
          </label>
          <label className="tweak">
            Thickness {(settings.thicknessM * 1000).toFixed(2)} mm
            <input data-testid="thickness" type="range" min={0.25} max={1.6} step={0.01} value={settings.thicknessM * 1000} onChange={(event) => setSettings({ thicknessM: Number(event.target.value) / 1000 })} />
            <small>Stress estimate and export only. K is not coupled to thickness.</small>
          </label>
          <label className="tweak">
            Material
            <select value={settings.materialId} onChange={(event) => setSettings({ materialId: event.target.value as Settings["materialId"] })}>
              {MATERIALS.map((material) => (
                <option key={material.id} value={material.id}>{material.name}</option>
              ))}
            </select>
            <small>{MATERIALS.find((material) => material.id === settings.materialId)?.note}</small>
          </label>
          <label className="tweak">
            Facets {settings.facetCount}
            <input type="range" min={1} max={6} step={1} value={settings.facetCount} onChange={(event) => setSettings({ facetCount: Number(event.target.value) })} />
            <small>{settings.facetCount * 3} instantaneous rays. Not {SOURCE_CLAIMS.simultaneousBeams} beams. Visual and optical index only.</small>
          </label>
          <label className="tweak">
            Drawn leaves {settings.leafCountVisual}
            <input type="range" min={4} max={16} step={1} value={settings.leafCountVisual} onChange={(event) => setSettings({ leafCountVisual: Number(event.target.value) })} />
            <small>Illustrative count. Not a dynamic multi-leaf model and not the rejected QEXT-200 specimen.</small>
          </label>
          <label className="tweak">
            Subdivision s {settings.subdivision}
            <input type="number" min={1} max={128} step={1} value={settings.subdivision} onChange={(event) => setSettings({ subdivision: Number(event.target.value) })} />
            <small>Mechanical beats per musical beat. BPM = 120 f / s.</small>
          </label>
        </div>
        <div className="block">
          <div className="row">
            <label>
              Target BPM
              <input
                data-testid="target-bpm"
                type="number"
                min={1}
                max={400}
                step={0.1}
                value={settings.targetBpm}
                onChange={(event) => setSettings({ targetBpm: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const now = performance.now();
                const previous = taps.current[taps.current.length - 1];
                if (previous !== undefined && now - previous > 2000) taps.current = [];
                taps.current.push(now);
                if (taps.current.length > 8) taps.current.shift();
                const intervals: number[] = [];
                for (let i = 1; i < taps.current.length; i += 1) intervals.push(taps.current[i] - taps.current[i - 1]);
                const bpm = bpmFromTapIntervals(intervals);
                if (bpm !== null) setSettings({ targetBpm: Math.min(400, Math.max(1, bpm)) });
              }}
            >
              Tap
            </button>
            <button
              type="button"
              data-testid="apply-tempo"
              disabled={!tempo.reachable}
              onClick={() => {
                const applied = settingsWithTempoApplied(settings);
                if (applied.settings) setSettings(applied.settings);
              }}
            >
              Apply curb if reachable
            </button>
          </div>
          <p className="note" data-testid="tempo-note">{tempo.note}</p>
        </div>
        <div className="row">
          <button type="button" onClick={exportFiles}>Export illustrative SCAD and DXF</button>
          <button type="button" onClick={restoreDefaults}>Restore defaults</button>
        </div>
        <details>
          <summary>Prototype parameters and assumptions</summary>
          <div className="tweak-grid">
            <NumberField label="Q" value={settings.qFactor} step={1} onChange={(value) => setSettings({ qFactor: value })} />
            <NumberField label="Brake Q floor" value={settings.brakeQFloor} step={1} onChange={(value) => setSettings({ brakeQFloor: value })} />
            <NumberField label="Lift half-angle deg" value={settings.liftDeg} step={0.1} onChange={(value) => setSettings({ liftDeg: value })} />
            <NumberField label="Blank half-angle deg" value={settings.blankDeg} step={0.1} onChange={(value) => setSettings({ blankDeg: value })} />
            <NumberField label="Unlock peak deg" value={settings.unlockDeg} step={0.1} onChange={(value) => setSettings({ unlockDeg: value })} />
            <NumberField label="Torque scale" value={settings.torqueScale} step={0.05} onChange={(value) => setSettings({ torqueScale: value })} />
            <NumberField label="Amplitude target deg" value={settings.amplitudeTargetDeg} step={0.5} onChange={(value) => setSettings({ amplitudeTargetDeg: value })} />
            <NumberField label="Unwind seconds" value={settings.unwindSeconds} step={0.5} onChange={(value) => setSettings({ unwindSeconds: value })} />
            <NumberField label="Initial theta deg" value={settings.theta0Deg} step={0.5} onChange={(value) => setSettings({ theta0Deg: value })} />
            <NumberField label="Initial omega rad/s" value={settings.omega0} step={0.1} onChange={(value) => setSettings({ omega0: value })} />
            <NumberField label="Prescribed low Hz" value={settings.prescribedFLow} step={0.1} onChange={(value) => setSettings({ prescribedFLow: value })} />
            <NumberField label="Prescribed high Hz" value={settings.prescribedFHigh} step={0.1} onChange={(value) => setSettings({ prescribedFHigh: value })} />
            <NumberField label="Leaf width mm" value={settings.leafWidthM * 1000} step={0.1} onChange={(value) => setSettings({ leafWidthM: value / 1000 })} />
            <NumberField label="Ring axial mm" value={settings.ringAxialMm} step={0.1} onChange={(value) => setSettings({ ringAxialMm: value })} />
            <NumberField label="Omega epsilon" value={settings.omegaEpsilon} step={0.000001} onChange={(value) => setSettings({ omegaEpsilon: value })} />
            <NumberField
              label="Cyan offset deg"
              value={settings.chromaticOffsetDeg[0]}
              step={0.1}
              onChange={(value) => setSettings((current) => ({ ...current, chromaticOffsetDeg: [value, current.chromaticOffsetDeg[1], current.chromaticOffsetDeg[2]] }))}
            />
            <NumberField
              label="Magenta offset deg"
              value={settings.chromaticOffsetDeg[1]}
              step={0.1}
              onChange={(value) => setSettings((current) => ({ ...current, chromaticOffsetDeg: [current.chromaticOffsetDeg[0], value, current.chromaticOffsetDeg[2]] }))}
            />
            <NumberField
              label="Gold offset deg"
              value={settings.chromaticOffsetDeg[2]}
              step={0.1}
              onChange={(value) => setSettings((current) => ({ ...current, chromaticOffsetDeg: [current.chromaticOffsetDeg[0], current.chromaticOffsetDeg[1], value] }))}
            />
            <label className="tweak">
              Damping
              <select value={settings.dampingMode} onChange={(event) => setSettings({ dampingMode: event.target.value as Settings["dampingMode"] })}>
                <option value="hold-q">Hold Q as K changes</option>
                <option value="fixed-c0-reference">Freeze c0 at reference K and I</option>
              </select>
            </label>
            <label className="tweak">
              Torque map
              <select value={settings.torqueMapMode} onChange={(event) => setSettings({ torqueMapMode: event.target.value as Settings["torqueMapMode"] })}>
                <option value="energy-balance-current-k">Recompute from current K</option>
                <option value="energy-balance-frozen-reference-k">Freeze map at reference K</option>
              </select>
            </label>
            <label className="tweak">
              Inertia
              <select value={settings.inertiaMode} onChange={(event) => setSettings({ inertiaMode: event.target.value as Settings["inertiaMode"] })}>
                <option value="reference-annulus">Reference annulus</option>
                <option value="custom">Custom value</option>
              </select>
            </label>
            <NumberField label="Custom I" value={settings.customInertia} step={0.000001} onChange={(value) => setSettings({ customInertia: value, inertiaMode: "custom" })} />
          </div>
          {assumptionLines().map((line) => (
            <p key={line} className="note">{line}</p>
          ))}
          <p className="note">Initial angle and rate are applied by Reset. Rest at zero angle and zero rate is a stall. No hidden startup impulse is added.</p>
        </details>
      </div>
    </section>
  );
}

function Fader({
  testId,
  channel,
  label,
  value,
  detail,
  onChange,
}: {
  testId: string;
  channel: string;
  label: string;
  value: number;
  detail: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="fader">
      <span className="note">{channel}</span>
      <b>{label}</b>
      <input
        data-testid={testId}
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(value * 1000)}
        onChange={(event) => onChange(Number(event.target.value) / 1000)}
      />
      <span>{(value * 100).toFixed(1)}%</span>
      <small>{detail}</small>
    </label>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="tweak">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
