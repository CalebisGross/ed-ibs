/** One click when the solver's valid-beat count advances. Off until the user enables it. */
export function tickOnBeat(previous: number, next: number, enabled: boolean): boolean {
  return enabled && next > previous;
}

export interface LockTick {
  setEnabled: (enabled: boolean) => void;
  enabled: () => boolean;
  hear: (beats: number) => void;
}

export function createLockTick(): LockTick {
  let ctx: AudioContext | null = null;
  let last = -1;
  let on = false;

  const play = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1320;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.028, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  };

  return {
    enabled: () => on,
    setEnabled: (enabled: boolean) => {
      on = enabled;
      if (!enabled) return;
      if (!ctx) ctx = new AudioContext();
      void ctx.resume();
    },
    hear: (beats: number) => {
      const previous = last < 0 ? beats : last;
      const sound = tickOnBeat(previous, beats, on);
      last = beats;
      if (sound) play();
    },
  };
}
