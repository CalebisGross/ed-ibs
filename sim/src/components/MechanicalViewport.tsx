import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DEFAULT_FACET_TILT_RAD, projectRays } from "../optics/projection";
import { CHANNELS } from "../physics/constants";
import { degToRad } from "../physics/units";
import { PART_NOTES, WHEEL_STATION_M } from "../stage/dimensions";
import { disposeObject3D } from "../stage/dispose";
import { MECHANICAL_HAZE } from "../stage/laserLook";
import { createLaserRig, updateLaser } from "../stage/laserRig";
import { createMechanism } from "../stage/mechanism";
import {
  ORBIT_RAD_PER_S,
  PUSH_IN_S,
  advanceDisplayTime,
  mixNumber,
  poseAt,
  pushMotion,
  smoothstep,
  type MotionSample,
} from "../stage/motion";
import { createQualityPipeline, markLaserBloom, type QualityTier } from "../post/createQualityPipeline";
import { addMacroBackdrop, addStudioKeyFill, applyTierSceneCost, configureRenderer, mountStudio } from "../stage/studio";
import { createLockTick } from "../stage/tick";
import type { FramePacket } from "../sim/useSimulator";
import { visualShafts, type LiveBeam, type VisualShaft } from "../stage/stageGeometry";

type PresetName = "coaxial" | "isometric" | "macro" | "stage" | "orbit" | "push" | "impulse";

const CONTACT = { x: WHEEL_STATION_M.x - 0.002, y: 0.0024, z: WHEEL_STATION_M.z };

const STILL: Record<Exclude<PresetName, "orbit" | "push" | "impulse">, { position: [number, number, number]; target: [number, number, number]; fov: number }> = {
  coaxial: { position: [0, 0.002, 0.09], target: [0, 0, 0], fov: 26 },
  isometric: { position: [0.055, 0.048, 0.055], target: [0, 0, 0], fov: 24 },
  macro: {
    position: [CONTACT.x + 0.007, CONTACT.y + 0.0015, CONTACT.z + 0.024],
    target: [CONTACT.x - 0.001, CONTACT.y - 0.001, CONTACT.z],
    fov: 24,
  },
  stage: { position: [0.07, 0.055, 0.07], target: [0, 0, 0], fov: 26 },
};

const PUSH_FROM = { position: [0.1, 0.07, 0.14] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
const PUSH_TO = {
  position: [CONTACT.x + 0.012, CONTACT.y + 0.014, CONTACT.z + 0.048] as [number, number, number],
  target: [CONTACT.x, CONTACT.y, CONTACT.z] as [number, number, number],
};

export function MechanicalViewport({
  subscribe,
  tier,
}: {
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
  tier: QualityTier;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<PresetName>("coaxial");
  const sectionRef = useRef(false);
  const tickRef = useRef(createLockTick());
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const [preset, setPreset] = useState<PresetName>("coaxial");
  const [section, setSection] = useState(false);
  const [tick, setTick] = useState(false);
  const [webgl, setWebgl] = useState("starting");

  useEffect(() => {
    presetRef.current = preset;
  }, [preset]);
  useEffect(() => {
    sectionRef.current = section;
  }, [section]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (error) {
      setWebgl(error instanceof Error ? error.message : "WebGL failed");
      return;
    }
    if (!renderer.getContext()) {
      renderer.dispose();
      setWebgl("WebGL context unavailable");
      return;
    }
    setWebgl("ready");
    configureRenderer(renderer);
    renderer.setClearColor(0x4a5156, 1);
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(0x4a5156, 0.55);
    scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(26, 1, 0.001, 4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    addStudioKeyFill(scene, 0.32);
    addMacroBackdrop(scene);
    const releaseStudio = mountStudio(renderer, scene);
    const pipeline = createQualityPipeline({ renderer, scene, camera, tier: tierRef.current });
    const mechanism = createMechanism();
    mechanism.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const ghost = mesh.name.startsWith("ghost") || Boolean((mesh.material as THREE.Material).transparent);
      mesh.castShadow = !ghost;
      mesh.receiveShadow = !ghost;
    });
    scene.add(mechanism.group);
    const laser = createLaserRig(18, CHANNELS.map((channel) => channel.css), {
      core: 0.0001,
      sheath: 0.00036,
      spot: 0,
    });
    scene.add(laser.beams, laser.haze);
    markLaserBloom(laser.beams);

    const latest = { packet: null as FramePacket | null };
    let motion: MotionSample[] = [];
    let displayT = 0;
    let appliedPreset: PresetName | null = null;
    let appliedSection = false;
    let pushStart = 0;
    let orbitAngle = 0.4;
    let lastNow = performance.now();
    const tickPlayer = tickRef.current;

    const unsubscribe = subscribe((packet) => {
      if (packet.reset) motion = [];
      const added: MotionSample[] = packet.samples.map((sample) => ({
        t: sample.t,
        theta: sample.theta,
        omega: sample.omega,
        mechAngle: sample.mechAngle,
        opticalAngle: sample.opticalAngle,
        angularBlank: sample.angularBlank,
        validBeats: sample.validBeats,
      }));
      motion = pushMotion(motion, added, 2);
      tickPlayer.hear(packet.state.validBeats);
      latest.packet = packet;
    });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      pipeline.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let raf = 0;
    const draw = () => {
      const now = performance.now();
      const frameDt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      const wanted = presetRef.current;
      if (wanted !== appliedPreset) {
        appliedPreset = wanted;
        pushStart = now;
        if (wanted !== "orbit" && wanted !== "push" && wanted !== "impulse") {
          const pose = STILL[wanted];
          camera.fov = pose.fov;
          camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
          controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
          camera.lookAt(controls.target);
          camera.updateProjectionMatrix();
        }
      }
      controls.enabled = wanted !== "orbit" && wanted !== "push";
      if (wanted === "orbit") {
        orbitAngle += frameDt * ORBIT_RAD_PER_S;
        camera.fov = 26;
        camera.position.set(Math.cos(orbitAngle) * 0.1, 0.028, Math.sin(orbitAngle) * 0.1);
        controls.target.set(0, 0, 0);
        camera.lookAt(controls.target);
        camera.updateProjectionMatrix();
      } else if (wanted === "push" || wanted === "impulse") {
        camera.fov = wanted === "impulse" ? 22 : 26;
        camera.updateProjectionMatrix();
        const u = wanted === "impulse" ? 1 : smoothstep((now - pushStart) / (PUSH_IN_S * 1000));
        camera.position.set(
          mixNumber(PUSH_FROM.position[0], PUSH_TO.position[0], u),
          mixNumber(PUSH_FROM.position[1], PUSH_TO.position[1], u),
          mixNumber(PUSH_FROM.position[2], PUSH_TO.position[2], u),
        );
        controls.target.set(
          mixNumber(PUSH_FROM.target[0], PUSH_TO.target[0], u),
          mixNumber(PUSH_FROM.target[1], PUSH_TO.target[1], u),
          mixNumber(PUSH_FROM.target[2], PUSH_TO.target[2], u),
        );
        camera.lookAt(controls.target);
      } else {
        controls.update();
      }
      if (sectionRef.current !== appliedSection) {
        appliedSection = sectionRef.current;
        mechanism.setSection(appliedSection);
      }
      const packet = latest.packet;
      if (packet) {
        const fallback = poseFromPacket(packet);
        const end = motion[motion.length - 1] ?? fallback;
        displayT = advanceDisplayTime({
          displayT,
          latestT: end.t,
          latestAbsTheta: Math.abs(end.theta),
          liftRad: degToRad(packet.liftDeg),
          frameDt,
          slow: wanted === "impulse",
        });
        const pose = poseAt(motion, displayT) ?? fallback;
        mechanism.update(packet, pose);
        updateLaser(
          laser,
          shortShafts(packet, pose),
          packet.intensity,
          MECHANICAL_HAZE,
          packet.chopperEnabled,
          pose.angularBlank,
        );
      }
      pipeline.setTier(tierRef.current);
      applyTierSceneCost(renderer, scene, tierRef.current, laser.haze, fog, 0.55);
      const macro = wanted === "macro";
      pipeline.setMacroDof(macro);
      const focusPoint = macro ? CONTACT : controls.target;
      const focus = camera.position.distanceTo(focusPoint);
      pipeline.setFocusDistance(focus > 0 ? focus : null);
      pipeline.render(frameDt);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onLost = (event: Event) => {
      event.preventDefault();
      setWebgl("WebGL context lost");
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      controls.dispose();
      pipeline.dispose();
      releaseStudio();
      disposeObject3D(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [subscribe]);

  const ghosts = PART_NOTES.filter((part) => part.ghost).map((part) => part.label);

  return (
    <section className="pane" data-testid="pane-mechanical">
      <header className="pane-head">
        <h2>Pane 1 · Mechanical</h2>
        <div className="toolbar">
          <PresetButton name="coaxial" current={preset} setPreset={setPreset} label="Coaxial bore" />
          <PresetButton
            name="isometric"
            current={preset}
            setPreset={(name) => {
              setPreset(name);
              setSection(true);
            }}
            label="Isometric cutaway"
          />
          <PresetButton name="macro" current={preset} setPreset={setPreset} label="Escapement macro" />
          <PresetButton name="stage" current={preset} setPreset={setPreset} label="Stage rig" />
          <PresetButton name="orbit" current={preset} setPreset={setPreset} label="Orbit" testId="mech-orbit" />
          <PresetButton name="push" current={preset} setPreset={setPreset} label="Push in" testId="mech-push" />
          <PresetButton name="impulse" current={preset} setPreset={setPreset} label="Impulse" testId="mech-impulse" />
          <button type="button" className={section ? "active" : ""} onClick={() => setSection((value) => !value)}>
            Section {section ? "on" : "off"}
          </button>
          <button
            type="button"
            data-testid="tick-toggle"
            className={tick ? "active" : ""}
            onClick={() => {
              const next = !tick;
              setTick(next);
              tickRef.current.setEnabled(next);
            }}
          >
            Tick {tick ? "on" : "off"}
          </button>
        </div>
      </header>
      <div className="pane-body">
        <div className="viewport-host" ref={hostRef} />
        <p className={webgl === "ready" ? "sr" : "legend"} data-testid="webgl-status">
          {webgl === "ready" ? "WebGL viewport ready" : webgl}
        </p>
        <details className="legend mech-notes">
          <summary title={`Solid Ti-6Al-4V ring, 28 to 36 mm. Ghost tags mark illustrative parts. ${ghosts.join(" ")}`}>Part notes</summary>
          <p>
            Axial thickness and leaf width are illustrative. {ghosts.join(" ")} No drawn part is brass. Beams are direction markers. Tick marks a valid beat, not a contact.
          </p>
        </details>
      </div>
    </section>
  );
}

function PresetButton({
  name,
  current,
  setPreset,
  label,
  testId,
}: {
  name: PresetName;
  current: PresetName;
  setPreset: (name: PresetName) => void;
  label: string;
  testId?: string;
}) {
  return (
    <button type="button" data-testid={testId} className={current === name ? "active" : ""} onClick={() => setPreset(name)}>
      {label}
    </button>
  );
}

function poseFromPacket(packet: FramePacket): MotionSample {
  return {
    t: packet.state.t,
    theta: packet.state.theta,
    omega: packet.state.omega,
    mechAngle: packet.state.mechAngle,
    opticalAngle: packet.state.opticalAngle,
    angularBlank: packet.state.angularBlank,
    validBeats: packet.state.validBeats,
  };
}

function shortShafts(packet: FramePacket, pose: MotionSample): VisualShaft[] {
  const rays = projectRays({
    theta: pose.theta,
    opticalAngle: pose.opticalAngle,
    facetCount: packet.facetCount,
    throwM: packet.throwM,
    chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
    facetTiltRad: DEFAULT_FACET_TILT_RAD,
  });
  const beams: LiveBeam[] = rays.map((ray) => {
    const length = Math.hypot(ray.x, ray.y, packet.throwM);
    const scale = length > 1e-6 ? 0.045 / length : 0;
    return {
      facet: ray.facet,
      channel: ray.channel,
      css: ray.css,
      from: { x: 0, y: 0, z: 0 },
      to: { x: ray.x * scale, y: ray.y * scale, z: packet.throwM * scale },
      onCloth: true,
    };
  });
  return visualShafts(beams);
}
