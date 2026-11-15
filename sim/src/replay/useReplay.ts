import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FramePacket, Readout, Sample } from "../sim/useSimulator";
import type { Settings } from "../sim/settings";
import {
  clampScrubTime,
  createReplayBuffer,
  frameInRange,
  recordPacket,
  replayBounds,
  replayCount,
  type ReplayBuffer,
} from "./record";
import {
  serializeShareLink,
  shareLinkHref,
  tryReadShareLink,
  VIEWER_SCHEMA_VERSION,
  type ShareLinkPage,
  type ShareLinkState,
} from "./shareUrl";

export type FrameSubscribe = (listener: (packet: FramePacket) => void) => () => void;

export interface UseReplayArgs {
  subscribe: FrameSubscribe;
  settings: Settings;
  readout: Readout;
  /** Fired with the scrub time in seconds whenever that time changes. */
  onScrubTime?: (tSeconds: number) => void;
  /**
   * Called once when the page URL already holds a share link.
   * Apply settings from that state. simTimeSeconds stays the saved solver timestamp.
   */
  onRestoreShareLink?: (state: ShareLinkState) => void;
  /**
   * When set, playback starts held at this time instead of following the live head.
   * Overrides a scrub time found in the page URL.
   */
  initialScrubTimeSeconds?: number;
  windowSeconds?: number;
  maxFrames?: number;
}

export interface ShareLinkWrite {
  href: string;
  wroteAddressBar: boolean;
}

export interface ReplayController {
  scrubTimeSeconds: number;
  setScrubTimeSeconds: (tSeconds: number) => void;
  followingLive: boolean;
  followLive: () => void;
  recordedStartSeconds: number;
  recordedEndSeconds: number;
  recordedSamples: number;
  /** Retained sample at the scrub time, or null when that time is not recorded yet. */
  frame: Sample | null;
  /** Live solver timestamp, seconds. */
  simTimeSeconds: number;
  shareState: ShareLinkState;
  /** Hash, or the current page URL plus that hash when a window is available. */
  shareHref: string;
  writeShareLink: () => ShareLinkWrite;
}

export function useReplay(args: UseReplayArgs): ReplayController {
  const bufferRef = useRef<ReplayBuffer | null>(null);
  if (bufferRef.current === null) {
    bufferRef.current = createReplayBuffer(args.windowSeconds, args.maxFrames);
  }

  const linkedAtStart = useState(() => readOpeningShareLink())[0];
  const heldAtStart = useState(() => openingScrubSeconds(args.initialScrubTimeSeconds, linkedAtStart))[0];
  const [scrubTimeSeconds, setScrubTime] = useState(heldAtStart ?? 0);
  const [followingLive, setFollowingLive] = useState(heldAtStart === null);
  const [epoch, setEpoch] = useState(0);
  const scrubRef = useRef(heldAtStart ?? 0);
  const followingRef = useRef(heldAtStart === null);
  const restoredRef = useRef(false);
  const windowSecondsRef = useRef(args.windowSeconds);
  const maxFramesRef = useRef(args.maxFrames);
  const onScrubTimeRef = useRef(args.onScrubTime);
  const onRestoreRef = useRef(args.onRestoreShareLink);
  windowSecondsRef.current = args.windowSeconds;
  maxFramesRef.current = args.maxFrames;
  onScrubTimeRef.current = args.onScrubTime;
  onRestoreRef.current = args.onRestoreShareLink;

  const applyBufferLimits = useCallback((buffer: ReplayBuffer) => {
    const windowSeconds = windowSecondsRef.current;
    const maxFrames = maxFramesRef.current;
    if (windowSeconds !== undefined && windowSeconds > 0) buffer.windowSeconds = windowSeconds;
    if (maxFrames !== undefined && maxFrames >= 1) buffer.maxFrames = Math.floor(maxFrames);
  }, []);

  useEffect(() => {
    const unsubscribe = args.subscribe((packet) => {
      const buffer = bufferRef.current;
      if (buffer === null) return;
      applyBufferLimits(buffer);
      if (!recordPacket(buffer, packet)) return;
      const bounds = replayBounds(buffer);
      scrubRef.current = followingRef.current
        ? bounds.endSeconds
        : clampScrubTime(scrubRef.current, bounds);
      setScrubTime(scrubRef.current);
      setEpoch((value) => value + 1);
    });
    return unsubscribe;
  }, [applyBufferLimits, args.subscribe]);

  useEffect(() => {
    onScrubTimeRef.current?.(scrubTimeSeconds);
  }, [scrubTimeSeconds]);

  useEffect(() => {
    if (restoredRef.current || linkedAtStart === null) return;
    restoredRef.current = true;
    onRestoreRef.current?.(linkedAtStart);
  }, [linkedAtStart]);

  const setScrubTimeSeconds = useCallback((tSeconds: number) => {
    if (!Number.isFinite(tSeconds) || tSeconds < 0) return;
    const buffer = bufferRef.current;
    if (buffer === null) return;
    followingRef.current = false;
    scrubRef.current = clampScrubTime(tSeconds, replayBounds(buffer));
    setFollowingLive(false);
    setScrubTime(scrubRef.current);
  }, []);

  const followLive = useCallback(() => {
    const buffer = bufferRef.current;
    if (buffer === null) return;
    followingRef.current = true;
    scrubRef.current = replayBounds(buffer).endSeconds;
    setFollowingLive(true);
    setScrubTime(scrubRef.current);
  }, []);

  const snapshot = useMemo(() => {
    const buffer = bufferRef.current ?? createReplayBuffer();
    return {
      bounds: replayBounds(buffer),
      recordedSamples: replayCount(buffer),
      frame: frameInRange(buffer, scrubTimeSeconds),
    };
  }, [epoch, scrubTimeSeconds]);

  const simTimeSeconds =
    Number.isFinite(args.readout.state.t) && args.readout.state.t >= 0 ? args.readout.state.t : 0;

  const shareState = useMemo<ShareLinkState>(
    () => ({
      schemaVersion: VIEWER_SCHEMA_VERSION,
      settings: args.settings,
      simTimeSeconds,
      scrubTimeSeconds,
    }),
    [args.settings, scrubTimeSeconds, simTimeSeconds],
  );

  const shareHash = useMemo(() => serializeShareLink(shareState), [shareState]);
  const shareHref = useMemo(() => shareLinkHref(shareHash, currentPage()), [shareHash]);

  const writeShareLink = useCallback((): ShareLinkWrite => {
    const page = currentPage();
    const href = shareLinkHref(shareHash, page);
    if (typeof window === "undefined" || page === undefined) {
      return { href, wroteAddressBar: false };
    }
    try {
      window.history.replaceState(window.history.state, "", href);
    } catch {
      return { href, wroteAddressBar: false };
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        void navigator.clipboard.writeText(href).catch(() => undefined);
      } catch {
        // The address bar already holds the link when clipboard access is missing.
      }
    }
    return { href, wroteAddressBar: true };
  }, [shareHash]);

  return useMemo<ReplayController>(
    () => ({
      scrubTimeSeconds,
      setScrubTimeSeconds,
      followingLive,
      followLive,
      recordedStartSeconds: snapshot.bounds.startSeconds,
      recordedEndSeconds: snapshot.bounds.endSeconds,
      recordedSamples: snapshot.recordedSamples,
      frame: snapshot.frame,
      simTimeSeconds,
      shareState,
      shareHref,
      writeShareLink,
    }),
    [
      followLive,
      followingLive,
      scrubTimeSeconds,
      setScrubTimeSeconds,
      shareHref,
      shareState,
      simTimeSeconds,
      snapshot,
      writeShareLink,
    ],
  );
}

function currentPage(): ShareLinkPage | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

function nonNegativeOrNull(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value) || value < 0) return null;
  return value;
}

export function openingScrubSeconds(
  initialScrubTimeSeconds: number | undefined,
  linked: ShareLinkState | null,
): number | null {
  if (initialScrubTimeSeconds !== undefined) return nonNegativeOrNull(initialScrubTimeSeconds);
  if (linked === null) return null;
  return linked.scrubTimeSeconds;
}

function readOpeningShareLink(): ShareLinkState | null {
  if (typeof window === "undefined") return null;
  return tryReadShareLink(window.location.href);
}
