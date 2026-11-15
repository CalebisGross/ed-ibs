import { useEffect, useMemo, useRef, useState } from "react";
import { DT_S } from "../physics/constants";
import { degToRad, radToDeg } from "../physics/units";
import { solveCommand } from "../sim/parameters";
import { activeInertia, type Settings } from "../sim/settings";
import type { FramePacket, Readout } from "../sim/useSimulator";
import type { PowerLatch } from "../physics/powerCut";
import { timelineMarks, type TimelineMark } from "./blankTimeline";
import { defaultHeatmapInput, runBlankHeatmap } from "./blankHeatmap";
import { BlankWindowTimeline } from "./BlankWindowTimeline";
import { BreakHeatmap } from "./BreakHeatmap";
import { recentSwingLabels, StateChartOverlay } from "./StateChartOverlay";
import { PhasePortrait } from "./PhasePortrait";
import { illustrativeRestRelease, runReferenceDecay, runReferenceUnwind, type IllustrativePhaseSeries, type SolverPhaseSeries } from "./phaseSeries";
import { DISPLAYED_PROVENANCE_IDS } from "./provenance";
import { ProvenanceList } from "./ProvenanceBadges";
import "./SeeWhyPanels.css";

const SAMPLE_CAP = 2000;

/**
 * Read-only panels. Pass these fields from useSimulator().
 * The component does not call the setters and does not write the session state.
 */
export interface SeeWhyPanelsProps {
  readout: Readout;
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
  settings: Settings;
  power: PowerLatch;
  paused: boolean;
  /** Recorded sample time, seconds. Omit it while replay is following the live head. */
  scrubTimeSeconds?: number;
}

interface LiveView {
  marks: TimelineMark[];
  samples: FramePacket["samples"];
  state: Readout["state"] | null;
  blankDeg: number | null;
}

export function SeeWhyPanels(props: SeeWhyPanelsProps) {
  const live = useLiveView(props.subscribe);
  const state = live.state ?? props.readout.state;
  const blankDeg = live.blankDeg ?? props.settings.blankDeg;
  const command = solveCommand(props.settings, props.power, state.t);
  const recent = recentSwingLabels(live.samples, command.params.liftHalfAngle, command.params.blankHalfAngle, command.params.omegaEpsilon);
  const heatmap = useMemo(
    () =>
      runBlankHeatmap(
        defaultHeatmapInput({
          blankHalfRad: degToRad(props.settings.blankDeg),
          q: props.settings.qFactor,
          inertia: activeInertia(props.settings),
          liftHalfRad: degToRad(props.settings.liftDeg),
          unlockRad: degToRad(props.settings.unlockDeg),
          toothCount: props.settings.toothCount,
          omegaEpsilon: props.settings.omegaEpsilon,
        }),
      ),
    [
      props.settings.blankDeg,
      props.settings.qFactor,
      props.settings.inertiaMode,
      props.settings.customInertia,
      props.settings.liftDeg,
      props.settings.unlockDeg,
      props.settings.toothCount,
      props.settings.omegaEpsilon,
    ],
  );
  const tails = useHeadlessTails();
  const scrubbed = sampleAtOrBefore(live.samples, props.scrubTimeSeconds);
  const phaseCurrent = scrubbed
    ? { thetaDeg: radToDeg(scrubbed.theta), omegaRadPerS: scrubbed.omega }
    : { thetaDeg: radToDeg(state.theta), omegaRadPerS: state.omega };
  const phaseTime = scrubbed ? scrubbed.t : state.t;
  const scrubLabel =
    props.scrubTimeSeconds !== undefined && Number.isFinite(props.scrubTimeSeconds)
      ? ` Scrub ${props.scrubTimeSeconds.toFixed(3)} s uses the recorded sample at or before that time.`
      : "";
  return (
    <div
      className="see-why"
      data-testid="see-why-panels"
      data-paused={props.paused ? "true" : "false"}
      data-scrub-seconds={props.scrubTimeSeconds ?? ""}
    >
      <p className="see-why-banner">
        {props.paused ? "Paused." : "Running."} Panels read solver output. Headless runs call step on separate states.
        Sample window {((SAMPLE_CAP * DT_S).toFixed(2))} s.{scrubLabel}
      </p>
      <StateChartOverlay state={state} settings={props.settings} power={props.power} recent={recent} />
      <BlankWindowTimeline
        marks={live.marks}
        blankDeg={blankDeg}
        state={state}
        settings={props.settings}
        cursorSeconds={props.scrubTimeSeconds}
      />
      <ProvenanceList ids={DISPLAYED_PROVENANCE_IDS} />
      <PhasePortrait
        samples={live.samples}
        current={phaseCurrent}
        power={props.power}
        simTime={phaseTime}
        unwindSeconds={props.settings.unwindSeconds}
        decay={tails.decay}
        unwind={tails.unwind}
        illustrative={tails.illustrative}
        error={tails.error}
      />
      <BreakHeatmap
        cells={heatmap}
        blankHalfDeg={props.settings.blankDeg}
        q={props.settings.qFactor}
        inertia={activeInertia(props.settings)}
      />
    </div>
  );
}

function sampleAtOrBefore(samples: FramePacket["samples"], t: number | undefined): FramePacket["samples"][number] | null {
  if (t === undefined || !Number.isFinite(t)) return null;
  let found: FramePacket["samples"][number] | null = null;
  for (const sample of samples) {
    if (sample.t <= t) found = sample;
    else break;
  }
  return found;
}

function useLiveView(subscribe: SeeWhyPanelsProps["subscribe"]): LiveView {
  const [view, setView] = useState<LiveView>({ marks: [], samples: [], state: null, blankDeg: null });
  const samplesRef = useRef<FramePacket["samples"]>([]);
  const marksRef = useRef<TimelineMark[]>([]);
  useEffect(() => {
    let frame = 0;
    let pending: FramePacket | null = null;
    const unsubscribe = subscribe((packet) => {
      pending = packet;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = pending;
        if (!next) return;
        if (next.reset) {
          samplesRef.current = [];
          marksRef.current = [];
          setView({ marks: [], samples: [], state: next.state, blankDeg: next.blankDeg });
          return;
        }
        if (next.samples.length === 0) return;
        const predecessor = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1].theta : null;
        const added = timelineMarks(next.samples, degToRad(next.blankDeg), predecessor);
        samplesRef.current = samplesRef.current.concat(next.samples).slice(-SAMPLE_CAP);
        marksRef.current = marksRef.current.concat(added).slice(-SAMPLE_CAP);
        setView({
          marks: marksRef.current,
          samples: samplesRef.current,
          state: next.state,
          blankDeg: next.blankDeg,
        });
      });
    });
    return () => {
      unsubscribe();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [subscribe]);
  return view;
}

interface HeadlessTails {
  decay: SolverPhaseSeries | null;
  unwind: SolverPhaseSeries | null;
  illustrative: IllustrativePhaseSeries | null;
  error: string | null;
}

function useHeadlessTails(): HeadlessTails {
  const [tails, setTails] = useState<HeadlessTails>({
    decay: null,
    unwind: null,
    illustrative: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const decay = runReferenceDecay();
        const unwind = runReferenceUnwind();
        const illustrative = illustrativeRestRelease();
        if (!cancelled) setTails({ decay, unwind, illustrative, error: null });
      } catch (error) {
        if (!cancelled) {
          setTails({
            decay: null,
            unwind: null,
            illustrative: null,
            error: error instanceof Error ? error.message : "Headless solver run failed.",
          });
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, []);
  return tails;
}
