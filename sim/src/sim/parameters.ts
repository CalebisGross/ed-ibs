import type { IllustrativeCad } from "../cad/exportGeometry";
import { ILLUSTRATIVE_WHEEL_PITCH_MM } from "../cad/exportGeometry";
import {
  BORE_DIAMETER_M,
  CHANNELS,
  DRIVE_MODEL_ID,
  DT_S,
  GRAVITY_SHIFT_TARGET_M,
  I_ANNULUS_KG_M2,
  K_BASE_N_M_PER_RAD,
  L0_M,
  L_MIN_M,
  MATERIALS,
  R_INNER_M,
  R_OUTER_M,
  SOURCE_CLAIMS,
  SOURCE_ENDURANCE_MPA,
  SOURCE_FACET_TILT_DEG,
  SOURCE_Q,
} from "../physics/constants";
import type { SolverParams, SolverState } from "../physics/EscapementSolver";
import { displayedAmplitudeRad, measuredOscillationHz } from "../physics/EscapementSolver";
import {
  bendingStressPa,
  energyBalanceTorque,
  instantaneousRayCount,
  referenceBaselineDamping,
  referenceFrequencyHz,
  viscousCoefficientForQ,
} from "../physics/referenceModel";
import {
  linearDecayRatio,
  sourceIntensityUnderPowerPolicy,
  torqueUnderPowerPolicy,
  type PowerLatch,
} from "../physics/powerCut";
import { musicalBpmForFrequency } from "../physics/tempo";
import { degToRad, radToDeg } from "../physics/units";
import {
  activeAnalyticHz,
  activeInertia,
  activeStiffness,
  curbLengthM,
  tempoAssessmentFor,
  type Settings,
} from "./settings";

export interface StatusItem {
  id: string;
  label: string;
  value: string;
  kind: "target" | "derived" | "assumption" | "measured" | "warning" | "conflict" | "source-claim";
  detail: string;
}

export interface SolvedCommand {
  params: SolverParams;
  torqueMagnitude: number;
  tauFullScale: number;
  c0: number;
  cEddy: number;
  stiffness: number;
  inertia: number;
  analyticHz: number;
  referenceHz: number;
  lengthM: number;
  intensity: number;
  qEffective: number | null;
}

export function solveCommand(settings: Settings, power: PowerLatch, simTime: number): SolvedCommand {
  const inertia = activeInertia(settings);
  const stiffness = activeStiffness(settings);
  const lengthM = curbLengthM(settings.dmxCurb);
  const analyticHz = activeAnalyticHz(settings);
  const referenceHz = referenceFrequencyHz(lengthM, inertia);
  const c0 =
    settings.dampingMode === "fixed-c0-reference"
      ? referenceBaselineDamping(settings.qFactor)
      : viscousCoefficientForQ(stiffness, inertia, settings.qFactor);
  const cFloor = viscousCoefficientForQ(stiffness, inertia, settings.brakeQFloor);
  const cEddyMax = Math.max(0, (Number.isFinite(cFloor) ? cFloor : 0) - (Number.isFinite(c0) ? c0 : 0));
  const cEddy = settings.dmxBrake * cEddyMax;
  const kMap =
    settings.torqueMapMode === "energy-balance-frozen-reference-k" ? K_BASE_N_M_PER_RAD : stiffness;
  const tauFull = energyBalanceTorque({
    stiffness: kMap,
    q: settings.qFactor,
    liftHalfRad: degToRad(settings.liftDeg),
    amplitudeRad: degToRad(settings.amplitudeTargetDeg),
  });
  const tauFullScale = (Number.isFinite(tauFull) ? tauFull : 0) * settings.torqueScale;
  const commanded = settings.dmxTorque * tauFullScale;
  const torqueMagnitude = torqueUnderPowerPolicy({
    commandedTorque: commanded,
    power,
    simTime,
    unwindSeconds: settings.unwindSeconds,
  });
  const cTotal = (Number.isFinite(c0) ? c0 : 0) + cEddy;
  const qEffective =
    cTotal > 0 && stiffness > 0 && inertia > 0 ? Math.sqrt(stiffness * inertia) / cTotal : null;
  return {
    params: {
      inertia,
      stiffness,
      c0: Number.isFinite(c0) ? c0 : 0,
      cEddy,
      torqueMagnitude: Math.max(0, torqueMagnitude),
      liftHalfAngle: degToRad(settings.liftDeg),
      blankHalfAngle: degToRad(settings.blankDeg),
      unlockAmplitude: degToRad(settings.unlockDeg),
      toothCount: settings.toothCount,
      omegaEpsilon: settings.omegaEpsilon,
    },
    torqueMagnitude: Math.max(0, torqueMagnitude),
    tauFullScale,
    c0: Number.isFinite(c0) ? c0 : 0,
    cEddy,
    stiffness,
    inertia,
    analyticHz,
    referenceHz,
    lengthM,
    intensity: sourceIntensityUnderPowerPolicy(settings.dmxIntensity, power),
    qEffective,
  };
}

export function buildStatus(
  state: SolverState,
  settings: Settings,
  power: PowerLatch,
  fps: number | null,
): StatusItem[] {
  const command = solveCommand(settings, power, state.t);
  const amplitude = displayedAmplitudeRad(state);
  const measuredHz = measuredOscillationHz(state);
  const material = MATERIALS.find((item) => item.id === settings.materialId) ?? MATERIALS[0];
  const stressPa = bendingStressPa(material.youngPa, settings.thicknessM, amplitude, command.lengthM);
  const stressMpa = stressPa / 1e6;
  const tempo = tempoAssessmentFor(settings);
  const musicalFromAnalytic = musicalBpmForFrequency(command.analyticHz, settings.subdivision);
  const musicalFromMeasured =
    measuredHz === null ? null : musicalBpmForFrequency(measuredHz, settings.subdivision);
  const stepsPerCycle = command.analyticHz > 0 ? 1 / (command.analyticHz * DT_S) : Number.NaN;
  const decay15 = linearDecayRatio(command.referenceHz > 0 ? command.analyticHz : 0, settings.qFactor, 15);
  const restRadius = settings.throwM * Math.tan(degToRad(SOURCE_FACET_TILT_DEG));
  const rays = instantaneousRayCount(settings.facetCount);
  const items: StatusItem[] = [
    {
      id: "frequency-target",
      label: "Frequency target",
      value: `${SOURCE_CLAIMS.frequencyBandHz[0]} to ${SOURCE_CLAIMS.frequencyBandHz[1]} Hz`,
      kind: "target",
      detail: "Design target. The original curb law does not cover this band at the reference inertia.",
    },
    {
      id: "active-frequency",
      label: settings.stiffnessMode === "reference-law" ? "Analytic frequency" : "Prescribed frequency",
      value: fmtHz(command.analyticHz),
      kind: settings.stiffnessMode === "reference-law" ? "derived" : "assumption",
      detail:
        settings.stiffnessMode === "reference-law"
          ? "sqrt(K/I)/(2 pi) from the original K law and the active inertia."
          : "K is set to I*(2*pi*f)^2 so this linear oscillator matches the curb-mapped frequency. Not an actuator calibration.",
    },
    {
      id: "reference-frequency",
      label: "Original-law frequency",
      value: fmtHz(command.referenceHz),
      kind: "derived",
      detail: `K = 0.1104 * (0.018 / L) at L = ${(command.lengthM * 1000).toFixed(3)} mm and the active inertia. Endpoints at the reference inertia are about 8.001 Hz and 11.644 Hz.`,
    },
    {
      id: "measured-frequency",
      label: "Measured oscillation",
      value: measuredHz === null ? "waiting for two half-periods" : fmtHz(measuredHz),
      kind: "measured",
      detail: "Inverse of the sum of the last two valid half-periods. Distinct from beats/s, musical BPM, and vph.",
    },
    {
      id: "inertia",
      label: "Inertia",
      value: `${command.inertia.toExponential(6)} kg m^2`,
      kind: settings.inertiaMode === "reference-annulus" ? "derived" : "assumption",
      detail:
        settings.inertiaMode === "reference-annulus"
          ? `Reference annulus 0.042*(0.036^2+0.028^2)/2 = ${I_ANNULUS_KG_M2.toExponential(6)}. Arithmetic only, not an assembly measurement.`
          : "Custom inertia is an explicit prototype parameter. It is not a measured redesigned rotor.",
    },
    {
      id: "stiffness",
      label: "Stiffness K",
      value: `${command.stiffness.toExponential(6)} N m/rad`,
      kind: settings.stiffnessMode === "reference-law" ? "derived" : "assumption",
      detail: "Thickness, modulus, and leaf count do not change this number. That coupling is unspecified.",
    },
    {
      id: "amplitude",
      label: "Amplitude",
      value: `${radToDeg(amplitude).toFixed(3)} deg`,
      kind: "measured",
      detail: "Source sweep target is +/- 18 deg. The energy-balance torque map is an assumption, so the measured angle can differ.",
    },
    {
      id: "torque",
      label: "Drive torque now",
      value: `${command.torqueMagnitude.toExponential(4)} N m`,
      kind: "assumption",
      detail: `Model ${DRIVE_MODEL_ID}. Full-scale map targets ${settings.amplitudeTargetDeg.toFixed(2)} deg at the selected K and Q. Scale ${settings.torqueScale.toFixed(3)}. Not a contact torque.`,
    },
    {
      id: "q",
      label: "Q effective",
      value: command.qEffective === null ? "n/a" : command.qEffective.toFixed(2),
      kind: settings.dampingMode === "hold-q" ? "assumption" : "derived",
      detail:
        settings.dampingMode === "hold-q"
          ? `Baseline c0 holds Q = ${settings.qFactor.toFixed(1)} as K changes. Source baseline is about ${SOURCE_Q}. Eddy brake adds viscous coefficient toward Q floor ${settings.brakeQFloor.toFixed(1)}. Not a magnet map.`
          : "c0 is frozen at the reference K and reference I for this Q. Effective Q then changes when K or the brake changes.",
    },
    {
      id: "stress",
      label: "Bending estimate",
      value: Number.isFinite(stressMpa) ? `${stressMpa.toFixed(2)} MPa` : "n/a",
      kind: stressMpa > SOURCE_ENDURANCE_MPA ? "warning" : "derived",
      detail: `sigma = E t |theta| / (2 L) with E from ${material.name}. User flag at ${SOURCE_ENDURANCE_MPA} MPa is not an endurance certificate. ${material.note}`,
    },
    {
      id: "blanking",
      label: "Latest blank window",
      value:
        state.lastBlankDuration === null
          ? "none completed"
          : `${(state.lastBlankDuration * 1000).toFixed(3)} ms`,
      kind: "measured",
      detail: `Angular window +/- ${settings.blankDeg.toFixed(2)} deg. Duration depends on amplitude and frequency. Source claims of ${SOURCE_CLAIMS.blankDurationMs} ms and ${SOURCE_CLAIMS.unlockDisplayMs} ms are not used as the measurement.`,
    },
    {
      id: "lift-angles",
      label: "Lift angles",
      value: `balance +/- ${settings.liftDeg.toFixed(2)} deg`,
      kind: "conflict",
      detail: `Source timegrapher lift is ${SOURCE_CLAIMS.timegrapherLiftDeg} deg. It is not converted to the ${settings.liftDeg * 2} deg balance zone. Unlock threshold is ${settings.unlockDeg.toFixed(2)} deg peak.`,
    },
    {
      id: "beats",
      label: "Valid beats",
      value: `${state.validBeats}`,
      kind: "measured",
      detail: `Raw zero crossings ${state.rawCrossings}. A beat requires the half-cycle peak to exceed the unlock threshold. One count per crossing. Z = ${settings.toothCount}: mechanical step ${(180 / settings.toothCount).toFixed(3)} deg, optical step ${(360 / settings.toothCount).toFixed(3)} deg.`,
    },
    {
      id: "beat-error",
      label: "Beat error",
      value: state.beatError === null ? "n/a" : `${(state.beatError * 1000).toFixed(3)} ms`,
      kind: "measured",
      detail: "Latest valid half-period minus the previous one. This is not the source 2.1 ms unlock display.",
    },
    {
      id: "vph",
      label: "Rate",
      value: rateText(command.analyticHz, measuredHz),
      kind: "derived",
      detail: "oscillations/s, beats/s (two per oscillation when symmetric), and vibrations/hour are shown separately from musical BPM.",
    },
    {
      id: "tempo",
      label: "Musical tempo",
      value: tempo.reachable
        ? `${settings.targetBpm.toFixed(2)} BPM reachable`
        : `${settings.targetBpm.toFixed(2)} BPM unreachable`,
      kind: tempo.reachable ? "derived" : "warning",
      detail: `${tempo.note} Subdivision s = ${settings.subdivision}. Analytic musical BPM at this s is ${musicalFromAnalytic === null ? "n/a" : musicalFromAnalytic.toFixed(2)}. Measured musical BPM is ${musicalFromMeasured === null ? "n/a" : musicalFromMeasured.toFixed(2)}.`,
    },
    {
      id: "rays",
      label: "Instantaneous rays",
      value: `${rays}`,
      kind: "derived",
      detail: `${settings.facetCount} facets times 3 channels. Source 45-beam wording is not an instantaneous beam count. Accumulated spokes can overlap. Chromatic offsets are ${settings.chromaticOffsetDeg.map((d) => d.toFixed(2)).join(", ")} deg.`,
    },
    {
      id: "channels",
      label: "Channels",
      value: CHANNELS.map((channel) => `${channel.name} ${channel.wavelengths}`).join(" | "),
      kind: "source-claim",
      detail: "Magenta is one channel containing two stated wavelengths, not two solved rays.",
    },
    {
      id: "bore",
      label: "Bore and gravity",
      value: `${(BORE_DIAMETER_M * 1000).toFixed(1)} mm bore, ${(GRAVITY_SHIFT_TARGET_M * 1000).toFixed(2)} mm shift target`,
      kind: "target",
      detail: "Any orientation and the radial-shift limit are targets. This 1-DOF oscillator does not compute gravity shift, tilt, or bore clearance.",
    },
    {
      id: "rest-spot",
      label: "Rest wall radius",
      value: `${restRadius.toFixed(3)} m`,
      kind: "derived",
      detail: `phi = ${SOURCE_FACET_TILT_DEG} deg + 2 theta. At theta = 0 the spot is not at the wall center. A 15 s decay does not create a dead-center pinspot.`,
    },
    {
      id: "power",
      label: "Power policy",
      value: power.active ? power.mode : "running",
      kind: "assumption",
      detail: powerDetail(settings, power, decay15),
    },
    {
      id: "fps",
      label: "Frame rate",
      value: fps === null ? "unmeasured" : `${fps.toFixed(1)} FPS`,
      kind: fps === null ? "target" : "measured",
      detail: `Target ${SOURCE_CLAIMS.fpsBand[0]} to ${SOURCE_CLAIMS.fpsBand[1]} FPS is not a claim until this session reports a number. Solver step is fixed at ${DT_S * 1000} ms.`,
    },
    {
      id: "timestep",
      label: "RK4 step",
      value: `${state.step} steps, t = ${state.t.toFixed(5)} s`,
      kind: "measured",
      detail: `dt = ${DT_S} s. Render frames only request whole steps. About ${Number.isFinite(stepsPerCycle) ? stepsPerCycle.toFixed(1) : "n/a"} steps per analytic cycle.`,
    },
  ];

  if (stepsPerCycle < 40) {
    items.push({
      id: "under-resolved",
      label: "Step resolution",
      value: "coarse relative to frequency",
      kind: "warning",
      detail: "Fewer than 40 steps per cycle. Event detection assumes one zero crossing per step.",
    });
  }
  if (Math.abs(state.theta) < degToRad(0.2) && Math.abs(state.omega) < 1e-3 && command.torqueMagnitude === 0) {
    items.push({
      id: "stall",
      label: "Startup",
      value: "stalled near rest",
      kind: "warning",
      detail: "No startup impulse is added. Set an initial angle above the unlock threshold and reset, or the motion can remain at rest.",
    });
  }
  if (stressMpa > SOURCE_ENDURANCE_MPA) {
    items.push({
      id: "fatigue-flag",
      label: "User fatigue flag",
      value: `above ${SOURCE_ENDURANCE_MPA} MPa`,
      kind: "warning",
      detail: "This flag is the source threshold only. It is not a life rating for the selected material or geometry.",
    });
  }
  return items;
}

export function cadFromSettings(settings: Settings): IllustrativeCad {
  const lengthMm = curbLengthM(settings.dmxCurb) * 1000;
  return {
    boreDiameterMm: BORE_DIAMETER_M * 1000,
    ringInnerMm: R_INNER_M * 1000,
    ringOuterMm: R_OUTER_M * 1000,
    ringAxialMm: settings.ringAxialMm,
    leafLengthMm: lengthMm,
    leafThicknessMm: settings.thicknessM * 1000,
    leafWidthMm: settings.leafWidthM * 1000,
    leafCount: settings.leafCountVisual,
    toothCount: settings.toothCount,
    facetCount: settings.facetCount,
    wheelPitchMm: ILLUSTRATIVE_WHEEL_PITCH_MM,
  };
}

export function assumptionLines(): string[] {
  return [
    "directional-lift-zone-drive applies torque along omega inside the lift half-angle, on both swings. It is not the source zero-velocity conjunction and not a contact model.",
    "Torque magnitude defaults to the linear energy-balance estimate for the editable amplitude target. The scale factor is explicit. Nothing here is a calibrated remontoire.",
    "Hold-Q damping and the eddy floor are viscous-coefficient assumptions. The brake is not a Lorentz yoke model. A cut leaves the last brake coefficient in place.",
    "Prescribed-frequency mode maps curb travel onto an editable band, default 4 to 20 Hz, by setting K = I (2 pi f)^2. The original law remains visible and is not modified.",
    "Blanking follows the angle window. Its duration is measured. 2.1 ms and 2.2 ms stay source claims.",
    "44 deg timegrapher lift is displayed as a source claim and is not equated with the balance lift zone.",
    "Tooth count generalizes steps to 180/Z and 360/Z. Facet spacing is 360/F. Three facets and three channels are 9 instantaneous rays.",
    "Chromatic offsets default to 0. Nonzero values are illustrative user settings, not dispersion.",
    "Total source off zeros torque and source intensity. Retained-source mode uses a linear torque ramp over the editable unwind time. Neither produces a dead-center pinspot.",
    "Q near 350 leaves a large fraction of amplitude at 15 s. The app does not pretend the motion has stopped.",
    "Material and thickness change only the stress estimate and the illustrative export. They do not change K.",
    "The 3D leaves, pallet flip, prism wedge, and wheel are simplified graphics. Gravity shift, bore clearance, and the rejected QEXT-200 specimen are not simulated.",
    "Musical BPM uses beats per musical beat as an explicit subdivision. Unreachable tempos are reported and are not clamped onto the curb.",
    "The stage preview places the same rays in a presentation room. Cloth, stand, haze, shaft width, and the 1.75 m figure are not hardware measurements or a safety rating.",
  ];
}

function powerDetail(settings: Settings, power: PowerLatch, decay15: number): string {
  const remain = Number.isFinite(decay15) ? `${(decay15 * 100).toFixed(1)}%` : "n/a";
  if (!power.active) {
    return `Idle. A total source cut will zero torque and intensity. A retained-source cut ramps torque linearly over ${settings.unwindSeconds.toFixed(1)} s. Undriven linear decay at this frequency and Q still has about ${remain} of amplitude after 15 s.`;
  }
  if (power.mode === "total-source-off") {
    return `Total source off: torque command is 0 and intensity is 0. Mechanical decay continues. About ${remain} of a free linear amplitude would remain after 15 s at the current analytic frequency and Q. Not a pinspot.`;
  }
  return `Retained-source diagnostic: intensity follows the fader, torque ramps linearly from the captured value over ${settings.unwindSeconds.toFixed(1)} s. The ramp is not a spring law. The wall spot does not end at center.`;
}

function rateText(analyticHz: number, measuredHz: number | null): string {
  const f = measuredHz ?? analyticHz;
  if (!(f > 0)) return "n/a";
  const prefix = measuredHz === null ? "analytic" : "measured";
  const beats = 2 * f;
  return `${prefix} ${f.toFixed(3)} osc/s, ${beats.toFixed(3)} beats/s, ${(beats * 3600).toFixed(1)} vph`;
}

function fmtHz(hz: number): string {
  if (!Number.isFinite(hz)) return "n/a";
  return `${hz.toFixed(4)} Hz`;
}

export function referenceEndpoints(): { lowHz: number; highHz: number } {
  return {
    lowHz: referenceFrequencyHz(L0_M),
    highHz: referenceFrequencyHz(L_MIN_M),
  };
}
