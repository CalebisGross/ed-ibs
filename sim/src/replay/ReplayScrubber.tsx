import { createContext, useContext, useState, type ReactNode } from "react";
import { formatBeam, formatBlank, formatDegrees, formatRadiansPerSecond, formatSeconds, formatSpan } from "./format";
import { useReplay, type ReplayController, type UseReplayArgs } from "./useReplay";
import "./ReplayScrubber.css";

const ReplayScrubContext = createContext<ReplayController | null>(null);

export function ReplayScrubScope({ replay, children }: { replay: ReplayController; children?: ReactNode }) {
  return <ReplayScrubContext.Provider value={replay}>{children}</ReplayScrubContext.Provider>;
}

export function ReplayProvider({ children, ...args }: UseReplayArgs & { children?: ReactNode }) {
  const replay = useReplay(args);
  return <ReplayScrubScope replay={replay}>{children}</ReplayScrubScope>;
}

export function useReplayScrub(): ReplayController {
  const replay = useContext(ReplayScrubContext);
  if (replay === null) {
    throw new Error("useReplayScrub must be used inside ReplayProvider.");
  }
  return replay;
}

export function useOptionalReplayScrub(): ReplayController | null {
  return useContext(ReplayScrubContext);
}

export function ReplayScrubber({ replay }: { replay?: ReplayController }) {
  const provided = useOptionalReplayScrub();
  const value = replay ?? provided;
  if (value === null) {
    throw new Error("ReplayScrubber needs the controller from useReplay, or a ReplayProvider ancestor.");
  }
  return <ReplayScrubberView replay={value} />;
}

function ReplayScrubberView({ replay }: { replay: ReplayController }) {
  const [linkNote, setLinkNote] = useState("");
  const sliderMin = replay.recordedSamples === 0 ? 0 : replay.recordedStartSeconds;
  const sliderMax = Math.max(replay.recordedEndSeconds, replay.scrubTimeSeconds, sliderMin);
  const frame = replay.frame;
  const waiting =
    replay.recordedSamples === 0
      ? "Waiting for the first frame."
      : frame === null
        ? "Scrub time is ahead of the recording."
        : "";

  return (
    <section className="replay-scrubber" data-testid="replay-scrubber" aria-label="Replay">
      <h2 className="replay-heading">Replay</h2>
      <p className="replay-note">Scrub time selects a recorded sample. Solver time is the live readout.</p>
      <label className="replay-field" htmlFor="replay-scrub">
        <span className="replay-field-label">Scrub time</span>
        <input
          id="replay-scrub"
          data-testid="replay-scrub"
          type="range"
          min={sliderMin}
          max={sliderMax}
          step="any"
          value={replay.scrubTimeSeconds}
          aria-label="Scrub time in seconds"
          aria-valuemin={sliderMin}
          aria-valuemax={sliderMax}
          aria-valuenow={replay.scrubTimeSeconds}
          aria-valuetext={formatSeconds(replay.scrubTimeSeconds)}
          disabled={!(sliderMax > sliderMin)}
          onChange={(event) => replay.setScrubTimeSeconds(Number(event.target.value))}
        />
        <output className="replay-time" data-testid="replay-scrub-time" htmlFor="replay-scrub">
          {formatSeconds(replay.scrubTimeSeconds)}
        </output>
      </label>
      <dl className="replay-metrics">
        <div>
          <dt>Solver time</dt>
          <dd data-testid="replay-solver-time">{formatSeconds(replay.simTimeSeconds)}</dd>
        </div>
        <div>
          <dt>Recorded span</dt>
          <dd data-testid="replay-recorded-span">
            {formatSpan(replay.recordedStartSeconds, replay.recordedEndSeconds, replay.recordedSamples)}
          </dd>
        </div>
        <div>
          <dt>Samples</dt>
          <dd data-testid="replay-sample-count">{replay.recordedSamples}</dd>
        </div>
        <div>
          <dt>Playback</dt>
          <dd data-testid="replay-playback">{replay.followingLive ? "following live" : "held"}</dd>
        </div>
        <div>
          <dt>Angle</dt>
          <dd data-testid="replay-angle">{frame ? formatDegrees(frame.theta) : "n/a"}</dd>
        </div>
        <div>
          <dt>Angular velocity</dt>
          <dd data-testid="replay-omega">{frame ? formatRadiansPerSecond(frame.omega) : "n/a"}</dd>
        </div>
        <div>
          <dt>Blank window</dt>
          <dd data-testid="replay-blank">{frame ? formatBlank(frame.angularBlank) : "n/a"}</dd>
        </div>
        <div>
          <dt>Beam</dt>
          <dd data-testid="replay-beam">{frame ? formatBeam(frame.beamVisible) : "n/a"}</dd>
        </div>
      </dl>
      <p className="replay-note" data-testid="replay-waiting">
        {waiting}
      </p>
      <div className="replay-actions">
        <button type="button" data-testid="replay-follow" aria-pressed={replay.followingLive} onClick={replay.followLive}>
          Follow live
        </button>
        <button
          type="button"
          data-testid="replay-copy-link"
          onClick={() => {
            const written = replay.writeShareLink();
            setLinkNote(written.wroteAddressBar ? "Address bar updated." : "Link ready.");
          }}
        >
          Copy link
        </button>
      </div>
      <label className="replay-share">
        <span className="replay-field-label">Share link</span>
        <input
          data-testid="replay-share-link"
          type="text"
          readOnly
          spellCheck={false}
          aria-label="Share link"
          value={replay.shareHref}
        />
      </label>
      <p className="replay-status" aria-live="polite">
        {linkNote}
      </p>
    </section>
  );
}
