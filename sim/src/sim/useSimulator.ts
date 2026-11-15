import { useCallback, useEffect, useRef, useState } from "react";
import { DT_S } from "../physics/constants";
import { createInitialState, step, type SolverState } from "../physics/EscapementSolver";
import { idlePower, type PowerCutMode, type PowerLatch } from "../physics/powerCut";
import { degToRad } from "../physics/units";
import { solveCommand } from "./parameters";
import {
  clearStoredSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  sanitizeSettings,
  type Settings,
} from "./settings";

export interface Sample {
  t: number;
  theta: number;
  omega: number;
  angularBlank: boolean;
  validBeats: number;
  opticalAngle: number;
  mechAngle: number;
  intensity: number;
  beamVisible: boolean;
}

export interface FramePacket {
  samples: Sample[];
  simDt: number;
  reset: boolean;
  paused: boolean;
  state: SolverState;
  intensity: number;
  leafLengthM: number;
  leafThicknessM: number;
  leafWidthM: number;
  leafCount: number;
  toothCount: number;
  facetCount: number;
  chromaticOffsetDeg: [number, number, number];
  throwM: number;
  persistenceMs: number;
  chopperEnabled: boolean;
  liftDeg: number;
  blankDeg: number;
  facetTiltDeg: number;
}

export interface Readout {
  state: SolverState;
  fps: number | null;
}

function makePacket(
  state: SolverState,
  settings: Settings,
  power: PowerLatch,
  samples: Sample[],
  simDt: number,
  reset: boolean,
  paused: boolean,
): FramePacket {
  const command = solveCommand(settings, power, state.t);
  return {
    samples,
    simDt,
    reset,
    paused,
    state,
    intensity: command.intensity,
    leafLengthM: command.lengthM,
    leafThicknessM: settings.thicknessM,
    leafWidthM: settings.leafWidthM,
    leafCount: settings.leafCountVisual,
    toothCount: settings.toothCount,
    facetCount: settings.facetCount,
    chromaticOffsetDeg: settings.chromaticOffsetDeg,
    throwM: settings.throwM,
    persistenceMs: settings.persistenceMs,
    chopperEnabled: settings.chopperEnabled,
    liftDeg: settings.liftDeg,
    blankDeg: settings.blankDeg,
    facetTiltDeg: 15,
  };
}

export function useSimulator() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [paused, setPausedState] = useState(false);
  const [power, setPower] = useState<PowerLatch>(() => idlePower());
  const [readout, setReadout] = useState<Readout>(() => {
    const initial = loadSettings();
    return {
      state: createInitialState(degToRad(initial.theta0Deg), initial.omega0, degToRad(initial.blankDeg)),
      fps: null,
    };
  });

  const settingsRef = useRef(settings);
  const pausedRef = useRef(false);
  const powerRef = useRef(power);
  const stateRef = useRef(readout.state);
  const listeners = useRef(new Set<(packet: FramePacket) => void>());
  const accum = useRef(0);
  const epoch = useRef(0);
  settingsRef.current = settings;
  pausedRef.current = paused;
  powerRef.current = power;

  const emit = useCallback((packet: FramePacket) => {
    listeners.current.forEach((listener) => listener(packet));
  }, []);

  const subscribe = useCallback((listener: (packet: FramePacket) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const setSettings = useCallback((patch: Partial<Settings> | ((current: Settings) => Settings)) => {
    setSettingsState((prev) => {
      const next = sanitizeSettings(typeof patch === "function" ? patch(prev) : { ...prev, ...patch });
      settingsRef.current = next;
      saveSettings(next);
      return next;
    });
  }, []);

  const setPaused = useCallback((value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(pausedRef.current) : value;
    pausedRef.current = next;
    setPausedState(next);
  }, []);

  const resetTo = useCallback(
    (nextSettings: Settings) => {
      epoch.current += 1;
      const state = createInitialState(
        degToRad(nextSettings.theta0Deg),
        nextSettings.omega0,
        degToRad(nextSettings.blankDeg),
      );
      stateRef.current = state;
      const nextPower = idlePower(nextSettings.powerCutMode);
      powerRef.current = nextPower;
      setPower(nextPower);
      accum.current = 0;
      setReadout((prev) => ({ ...prev, state }));
      emit(makePacket(state, nextSettings, nextPower, [], 0, true, pausedRef.current));
    },
    [emit],
  );

  const reset = useCallback(() => {
    resetTo(settingsRef.current);
  }, [resetTo]);

  const restoreDefaults = useCallback(() => {
    clearStoredSettings();
    const next = sanitizeSettings(defaultSettings);
    settingsRef.current = next;
    setSettingsState(next);
    resetTo(next);
  }, [resetTo]);

  const cutPower = useCallback(() => {
    const current = settingsRef.current;
    const command = solveCommand(current, idlePower(current.powerCutMode), stateRef.current.t);
    const next: PowerLatch = {
      active: true,
      mode: current.powerCutMode,
      startTime: stateRef.current.t,
      torqueAtCut: command.torqueMagnitude,
    };
    powerRef.current = next;
    setPower(next);
  }, []);

  const restorePower = useCallback(() => {
    const next = idlePower(settingsRef.current.powerCutMode);
    powerRef.current = next;
    setPower(next);
  }, []);

  const setPowerMode = useCallback(
    (mode: PowerCutMode) => {
      setSettings({ powerCutMode: mode });
      if (powerRef.current.active) {
        const next = { ...powerRef.current, mode };
        powerRef.current = next;
        setPower(next);
      }
    },
    [setSettings],
  );

  useEffect(() => {
    let raf = 0;
    let lastWall: number | null = null;
    let lastReadout = 0;
    const fpsWindow: number[] = [];
    const loop = (now: number) => {
      const previous = lastWall;
      lastWall = now;
      const rawDt = previous === null ? 0 : (now - previous) / 1000;
      if (rawDt > 0 && rawDt < 0.25) {
        fpsWindow.push(1 / rawDt);
        if (fpsWindow.length > 40) fpsWindow.shift();
      }
      const wallDt = Math.min(0.05, Math.max(0, rawDt));
      const epochAtStart = epoch.current;
      const currentSettings = settingsRef.current;
      const samples: Sample[] = [];
      let simDt = 0;
      if (!pausedRef.current && previous !== null) {
        accum.current += wallDt;
        let steps = Math.floor(accum.current / DT_S);
        if (steps > 8000) {
          steps = 8000;
          accum.current = 0;
        } else {
          accum.current -= steps * DT_S;
        }
        for (let i = 0; i < steps; i += 1) {
          if (epoch.current !== epochAtStart) break;
          const command = solveCommand(currentSettings, powerRef.current, stateRef.current.t);
          const next = step(stateRef.current, command.params);
          stateRef.current = next;
          const beamVisible = command.intensity > 0 && !(currentSettings.chopperEnabled && next.angularBlank);
          samples.push({
            t: next.t,
            theta: next.theta,
            omega: next.omega,
            angularBlank: next.angularBlank,
            validBeats: next.validBeats,
            opticalAngle: next.opticalAngle,
            mechAngle: next.mechAngle,
            intensity: command.intensity,
            beamVisible,
          });
        }
        simDt = samples.length * DT_S;
      }
      if (epoch.current === epochAtStart) {
        emit(
          makePacket(
            stateRef.current,
            currentSettings,
            powerRef.current,
            samples,
            simDt,
            false,
            pausedRef.current,
          ),
        );
        if (now - lastReadout > 100) {
          lastReadout = now;
          const fps =
            fpsWindow.length >= 12 ? fpsWindow.reduce((sum, value) => sum + value, 0) / fpsWindow.length : null;
          setReadout({ state: stateRef.current, fps });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [emit]);

  return {
    settings,
    setSettings,
    paused,
    setPaused,
    power,
    readout,
    subscribe,
    reset,
    restoreDefaults,
    cutPower,
    restorePower,
    setPowerMode,
  };
}
