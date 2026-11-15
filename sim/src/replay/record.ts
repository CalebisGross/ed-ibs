import { beamSampleVisible, type FramePacket, type Sample } from "../sim/useSimulator";

/** Retained recording length. Older samples drop once the window is full. */
export const DEFAULT_REPLAY_WINDOW_SECONDS = 20;

/** Hard cap so a long session cannot grow the buffer without bound. */
export const DEFAULT_REPLAY_MAX_FRAMES = 80_000;

export interface ReplayBuffer {
  frames: Sample[];
  start: number;
  windowSeconds: number;
  maxFrames: number;
}

export interface ReplayBounds {
  startSeconds: number;
  endSeconds: number;
}

/**
 * Records samples copied from subscribed frame packets.
 * Does not step the solver. A reset packet, or a sample whose time moves
 * backward, starts a new recording.
 */
export function createReplayBuffer(
  windowSeconds = DEFAULT_REPLAY_WINDOW_SECONDS,
  maxFrames = DEFAULT_REPLAY_MAX_FRAMES,
): ReplayBuffer {
  return {
    frames: [],
    start: 0,
    windowSeconds: windowSeconds > 0 ? windowSeconds : DEFAULT_REPLAY_WINDOW_SECONDS,
    maxFrames: maxFrames >= 1 ? Math.floor(maxFrames) : DEFAULT_REPLAY_MAX_FRAMES,
  };
}

export function replayCount(buffer: ReplayBuffer): number {
  return Math.max(0, buffer.frames.length - buffer.start);
}

export function replayBounds(buffer: ReplayBuffer): ReplayBounds {
  if (replayCount(buffer) === 0) return { startSeconds: 0, endSeconds: 0 };
  return {
    startSeconds: buffer.frames[buffer.start].t,
    endSeconds: buffer.frames[buffer.frames.length - 1].t,
  };
}

/** Greatest retained sample at or before t, clamped to the retained ends. */
export function frameAtTime(buffer: ReplayBuffer, tSeconds: number): Sample | null {
  const start = buffer.start;
  const end = buffer.frames.length;
  if (end <= start) return null;
  const frames = buffer.frames;
  if (!Number.isFinite(tSeconds) || tSeconds <= frames[start].t) return frames[start];
  if (tSeconds >= frames[end - 1].t) return frames[end - 1];
  let lo = start;
  let hi = end - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= tSeconds) lo = mid;
    else hi = mid;
  }
  return frames[lo];
}

/**
 * Sample at or before t when t is inside the retained span, including the ends.
 * A scrub time the recording has not reached yet returns null.
 */
export function frameInRange(buffer: ReplayBuffer, tSeconds: number): Sample | null {
  if (!Number.isFinite(tSeconds) || replayCount(buffer) === 0) return null;
  const bounds = replayBounds(buffer);
  if (tSeconds < bounds.startSeconds || tSeconds > bounds.endSeconds) return null;
  return frameAtTime(buffer, tSeconds);
}

/**
 * Keeps a scrub at or after the first retained sample.
 * A time past the end is left in place so a share link can name a sample
 * the recording has not reached yet.
 */
export function clampScrubTime(tSeconds: number, bounds: ReplayBounds): number {
  if (!Number.isFinite(tSeconds)) return bounds.startSeconds;
  if (tSeconds < 0) return bounds.startSeconds;
  if (tSeconds < bounds.startSeconds) return bounds.startSeconds;
  return tSeconds;
}

/** Returns true when the retained samples changed. */
export function recordPacket(buffer: ReplayBuffer, packet: FramePacket): boolean {
  let changed = false;
  if (packet.reset) {
    if (replayCount(buffer) > 0) changed = true;
    buffer.frames = [];
    buffer.start = 0;
  }
  const incoming = packet.samples.length > 0 ? packet.samples : [sampleFromPacket(packet)];
  for (const sample of incoming) {
    if (appendSample(buffer, sample)) changed = true;
  }
  if (trimBuffer(buffer)) changed = true;
  return changed;
}

function appendSample(buffer: ReplayBuffer, sample: Sample): boolean {
  if (!Number.isFinite(sample.t)) return false;
  const last = lastSample(buffer);
  if (last && sample.t < last.t) {
    buffer.frames = [copySample(sample)];
    buffer.start = 0;
    return true;
  }
  if (last && sample.t === last.t) return false;
  buffer.frames.push(copySample(sample));
  return true;
}

function trimBuffer(buffer: ReplayBuffer): boolean {
  if (replayCount(buffer) === 0) return false;
  const beforeStart = buffer.start;
  const beforeLength = buffer.frames.length;
  const endTime = buffer.frames[buffer.frames.length - 1].t;
  const cutoff = endTime - buffer.windowSeconds;
  while (buffer.start < buffer.frames.length - 1 && buffer.frames[buffer.start].t < cutoff) {
    buffer.start += 1;
  }
  const overflow = replayCount(buffer) - buffer.maxFrames;
  if (overflow > 0) buffer.start += overflow;
  if (buffer.start > buffer.frames.length) buffer.start = buffer.frames.length;
  if (buffer.start > 4096 && buffer.start * 2 > buffer.frames.length) {
    buffer.frames = buffer.frames.slice(buffer.start);
    buffer.start = 0;
  }
  return buffer.start !== beforeStart || buffer.frames.length !== beforeLength;
}

function lastSample(buffer: ReplayBuffer): Sample | undefined {
  if (replayCount(buffer) === 0) return undefined;
  return buffer.frames[buffer.frames.length - 1];
}

function sampleFromPacket(packet: FramePacket): Sample {
  const state = packet.state;
  return {
    t: state.t,
    theta: state.theta,
    omega: state.omega,
    angularBlank: state.angularBlank,
    validBeats: state.validBeats,
    opticalAngle: state.opticalAngle,
    mechAngle: state.mechAngle,
    intensity: packet.intensity,
    beamVisible: beamSampleVisible(packet.intensity, packet.chopperEnabled, state.angularBlank),
  };
}

function copySample(sample: Sample): Sample {
  return {
    t: sample.t,
    theta: sample.theta,
    omega: sample.omega,
    angularBlank: sample.angularBlank,
    validBeats: sample.validBeats,
    opticalAngle: sample.opticalAngle,
    mechAngle: sample.mechAngle,
    intensity: sample.intensity,
    beamVisible: sample.beamVisible,
  };
}
