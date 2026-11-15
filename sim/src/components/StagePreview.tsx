import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DEFAULT_FACET_TILT_RAD } from "../optics/projection";
import { CHANNELS } from "../physics/constants";
import { degToRad } from "../physics/units";
import type { Settings } from "../sim/settings";
import type { FramePacket } from "../sim/useSimulator";
import { ghostNotes, WHEEL_STATION_M } from "../stage/dimensions";
import { disposeObject3D } from "../stage/dispose";
import { buildLabBench } from "../stage/labBench";
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
import { sceneryCloth } from "../stage/materials";
import {
  STAGE,
  STAGE_COPY,
  figureFeet,
  figureParts,
  liveBeams,
  nextTrail,
  stageCamera,
  visualShafts,
  type StageCameraName,
  type TrailPoint,
} from "../stage/stageGeometry";
import { createQualityPipeline, markLaserBloom, type QualityTier } from "../post/createQualityPipeline";
import { addStudioKeyFill, configureRenderer, mountStudio } from "../stage/studio";
import { createLockTick } from "../stage/tick";

type StageView = StageCameraName | "orbit" | "screen" | "wheel" | "impulse";

const MAX_RAYS = 18;
const MAX_TRAIL = 14000;

export function StagePreview({
  settings,
  subscribe,
  tier,
}: {
  settings: Settings;
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
  tier: QualityTier;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<StageView>("audience");
  const hazeRef = useRef(settings.hazeDisplay);
  const tickRef = useRef(createLockTick());
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const [cameraName, setCameraName] = useState<StageView>("audience");
  const [tick, setTick] = useState(false);
  const [webgl, setWebgl] = useState("starting");
  const [status, setStatus] = useState("Waiting for the solver.");

  useEffect(() => {
    cameraRef.current = cameraName;
  }, [cameraName]);
  hazeRef.current = settings.hazeDisplay;

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
    renderer.setClearColor(0x121416, 1);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(0x121416, 0.006);
    scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(46, 1, 0.02, 400);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 80;
    controls.target.set(0, 2.3, 6);
    addStudioKeyFill(scene);
    const releaseStudio = mountStudio(renderer, scene);
    const pipeline = createQualityPipeline({ renderer, scene, camera, tier: tierRef.current });

    const lab = buildLabBench();
    scene.add(lab.group);
    const mechanism = createMechanism();
    mechanism.group.position.set(0, STAGE.apertureHeightM, 0);
    scene.add(mechanism.group);
    const laser = createLaserRig(MAX_RAYS, CHANNELS.map((channel) => channel.css));
    scene.add(laser.beams, laser.haze);
    markLaserBloom(laser.beams);

    const person = new THREE.Group();
    person.name = "scale-figure";
    const bodyMat = sceneryCloth();
    for (const part of figureParts()) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.w, part.h, part.d), bodyMat);
      mesh.position.set(part.x, part.y, part.z);
      person.add(mesh);
    }
    scene.add(person);

    const trailPositions = new Float32Array(MAX_TRAIL * 3);
    const trailColors = new Float32Array(MAX_TRAIL * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Points(
      trailGeo,
      new THREE.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(trail);
    let trailPoints: TrailPoint[] = [];
    const channelRgb = CHANNELS.map((channel) => hexRgb(channel.css));

    const latest = { packet: null as FramePacket | null };
    let motion: MotionSample[] = [];
    let displayT = 0;
    let appliedKey = "";
    let pushStart = 0;
    let orbitAngle = 0.2;
    let lastNow = performance.now();
    let lastStatus = 0;
    const tickPlayer = tickRef.current;
    const wheelTarget = new THREE.Vector3(WHEEL_STATION_M.x, STAGE.apertureHeightM, WHEEL_STATION_M.z);
    const wheelClose = new THREE.Vector3(wheelTarget.x - 0.02, wheelTarget.y + 0.015, wheelTarget.z - 0.055);

    const unsubscribe = subscribe((packet) => {
      if (packet.reset) {
        motion = [];
        trailPoints = [];
      }
      motion = pushMotion(
        motion,
        packet.samples.map((sample) => ({
          t: sample.t,
          theta: sample.theta,
          omega: sample.omega,
          mechAngle: sample.mechAngle,
          opticalAngle: sample.opticalAngle,
          angularBlank: sample.angularBlank,
          validBeats: sample.validBeats,
        })),
        2,
      );
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
      const view = cameraRef.current;
      const packet = latest.packet;
      if (packet) {
        const poseKey = `${view}:${packet.throwM.toFixed(2)}`;
        const animated = view === "orbit" || view === "wheel" || view === "impulse";
        controls.enabled = !animated;
        if (view === "orbit") {
          orbitAngle += frameDt * ORBIT_RAD_PER_S * 0.55;
          camera.position.set(Math.sin(orbitAngle) * 3.8, 2.15, Math.cos(orbitAngle) * 3.8);
          controls.target.set(0, STAGE.apertureHeightM, 1.2);
          camera.lookAt(controls.target);
          appliedKey = poseKey;
        } else if (view === "wheel" || view === "impulse") {
          if (poseKey !== appliedKey) pushStart = now;
          const from = stageCamera("fixture", packet.throwM);
          const u = view === "impulse" ? 1 : smoothstep((now - pushStart) / (PUSH_IN_S * 1000));
          camera.position.set(
            mixNumber(from.position.x, wheelClose.x, u),
            mixNumber(from.position.y, wheelClose.y, u),
            mixNumber(from.position.z, wheelClose.z, u),
          );
          camera.fov = mixNumber(from.fov, 28, u);
          camera.updateProjectionMatrix();
          controls.target.set(
            mixNumber(from.target.x, wheelTarget.x, u),
            mixNumber(from.target.y, wheelTarget.y, u),
            mixNumber(from.target.z, wheelTarget.z, u),
          );
          camera.lookAt(controls.target);
          appliedKey = poseKey;
        } else if (poseKey !== appliedKey) {
          const pose = framed(view, packet.throwM);
          camera.position.set(pose.position.x, pose.position.y, pose.position.z);
          camera.fov = pose.fov;
          camera.updateProjectionMatrix();
          controls.target.set(pose.target.x, pose.target.y, pose.target.z);
          appliedKey = poseKey;
        }
        lab.setThrow(packet.throwM);
        const feet = figureFeet(packet.throwM);
        person.position.set(feet.x, feet.y, feet.z);
        const haze = hazeRef.current;
        fog.density = 0.003 + 0.01 * haze;
        const fallback = poseFromPacket(packet);
        const end = motion[motion.length - 1] ?? fallback;
        displayT = advanceDisplayTime({
          displayT,
          latestT: end.t,
          latestAbsTheta: Math.abs(end.theta),
          liftRad: degToRad(packet.liftDeg),
          frameDt,
          slow: view === "impulse",
        });
        const pose = poseAt(motion, displayT) ?? fallback;
        mechanism.update(packet, pose);
        const liveOn = packet.intensity > 0 && !(packet.chopperEnabled && packet.state.angularBlank);
        const drawnOn = packet.intensity > 0 && !(packet.chopperEnabled && pose.angularBlank);
        const projection = {
          facetCount: packet.facetCount,
          throwM: packet.throwM,
          chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
          facetTiltRad: DEFAULT_FACET_TILT_RAD,
        };
        const liveCount = liveBeams({
          ...projection,
          theta: packet.state.theta,
          opticalAngle: packet.state.opticalAngle,
          beamVisible: liveOn,
        }).length;
        const beams = liveBeams({
          ...projection,
          theta: pose.theta,
          opticalAngle: pose.opticalAngle,
          beamVisible: drawnOn,
        });
        const drawn = visualShafts(beams).map((shaft) => ({
          ...shaft,
          to: { ...shaft.to, z: shaft.to.z - 0.03 },
        }));
        updateLaser(laser, drawn, packet.intensity, haze, packet.chopperEnabled, pose.angularBlank);
        trailPoints = paintTrail(trail, trailGeo, trailPositions, trailColors, trailPoints, packet, channelRgb, haze);

        if (now - lastStatus > 120) {
          lastStatus = now;
          const source = packet.intensity <= 0 ? "source off" : `source ${Math.round(packet.intensity * 100)}%`;
          const gate = packet.chopperEnabled && packet.state.angularBlank ? "chopper blanked" : "gate open";
          const hold = packet.paused ? "paused" : "running";
          setStatus(`${liveCount} live rays, ${source}, ${gate}, ${hold}, throw ${packet.throwM.toFixed(1)} m`);
        }
      }
      if (controls.enabled) controls.update();
      pipeline.setTier(tierRef.current);
      pipeline.setMacroDof(view === "wheel" || view === "impulse");
      const focus = camera.position.distanceTo(controls.target);
      pipeline.setFocusDistance(focus > 0 ? focus : null);
      pipeline.render(frameDt);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      pipeline.dispose();
      releaseStudio();
      disposeObject3D(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [subscribe]);

  const coincident =
    settings.chromaticOffsetDeg[0] === settings.chromaticOffsetDeg[1] &&
    settings.chromaticOffsetDeg[1] === settings.chromaticOffsetDeg[2];

  return (
    <section className="pane stage-pane" data-testid="pane-stage">
      <header className="pane-head">
        <h2>Stage preview</h2>
        <div className="toolbar">
          <ViewButton name="audience" current={cameraName} setView={setCameraName} label="Audience" testId="cam-audience" />
          <ViewButton name="side" current={cameraName} setView={setCameraName} label="Side" testId="cam-side" />
          <ViewButton name="fixture" current={cameraName} setView={setCameraName} label="Fixture" testId="cam-fixture" />
          <ViewButton name="orbit" current={cameraName} setView={setCameraName} label="Orbit" testId="stage-orbit" />
          <ViewButton name="screen" current={cameraName} setView={setCameraName} label="Screen" testId="stage-screen" />
          <ViewButton name="wheel" current={cameraName} setView={setCameraName} label="Push in" testId="stage-wheel" />
          <ViewButton name="impulse" current={cameraName} setView={setCameraName} label="Impulse" testId="stage-impulse" />
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
        <div className="stage-host" ref={hostRef} data-testid="stage-canvas-host" />
        <p className={webgl === "ready" ? "sr" : "legend"} data-testid="webgl-status">
          {webgl === "ready" ? "WebGL viewport ready" : webgl}
        </p>
        <div className="stage-readout">
          <p data-testid="stage-status">{status}</p>
          <p>
            {coincident ? "Equal color offsets share one path. " : "Color offsets are illustrative, not dispersion. "}
            {STAGE_COPY.trail}
          </p>
          <p>{STAGE_COPY.disclosure} {STAGE_COPY.scenery} {STAGE_COPY.axis}</p>
          <p>{ghostNotes().map((part) => part.label).join(" ")} Beam width and the spot are display sizes, not a measured diameter. A blank hides the beam and the spot on that step. Tick is off until enabled.</p>
        </div>
      </div>
    </section>
  );
}

function ViewButton({
  name,
  current,
  setView,
  label,
  testId,
}: {
  name: StageView;
  current: StageView;
  setView: (name: StageView) => void;
  label: string;
  testId: string;
}) {
  return (
    <button type="button" data-testid={testId} className={current === name ? "active" : ""} onClick={() => setView(name)}>
      {label}
    </button>
  );
}

function framed(view: StageView, throwM: number): { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov: number } {
  switch (view) {
    case "audience":
    case "side":
    case "fixture":
      return stageCamera(view, throwM);
    case "screen":
      return {
        position: { x: 1.35, y: STAGE.apertureHeightM + 0.55, z: Math.max(0.4, throwM - 2.4) },
        target: { x: 0, y: STAGE.apertureHeightM, z: throwM },
        fov: 36,
      };
    case "orbit":
    case "wheel":
    case "impulse":
      return stageCamera("fixture", throwM);
    default: {
      const forgotten: never = view;
      return forgotten;
    }
  }
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

function paintTrail(
  trail: THREE.Points,
  trailGeo: THREE.BufferGeometry,
  trailPositions: Float32Array,
  trailColors: Float32Array,
  previous: TrailPoint[],
  packet: FramePacket,
  channelRgb: [number, number, number][],
  haze: number,
): TrailPoint[] {
  const added: TrailPoint[] = [];
  const stride = 4;
  for (let index = 0; index < packet.samples.length; index += stride) {
    const sample = packet.samples[index];
    if (!sample.beamVisible) continue;
    const marks = liveBeams({
      theta: sample.theta,
      opticalAngle: sample.opticalAngle,
      facetCount: packet.facetCount,
      throwM: packet.throwM,
      chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
      facetTiltRad: DEFAULT_FACET_TILT_RAD,
      beamVisible: true,
    });
    for (const beam of marks) added.push({ t: sample.t, x: beam.to.x, y: beam.to.y, z: beam.to.z, channel: beam.channel });
  }
  let points = nextTrail(previous, added, packet.state.t, packet.persistenceMs / 1000, packet.reset);
  if (points.length > MAX_TRAIL) points = points.slice(points.length - MAX_TRAIL);
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    trailPositions[index * 3] = point.x;
    trailPositions[index * 3 + 1] = point.y;
    trailPositions[index * 3 + 2] = point.z;
    const rgb = channelRgb[point.channel] ?? channelRgb[0];
    trailColors[index * 3] = rgb[0];
    trailColors[index * 3 + 1] = rgb[1];
    trailColors[index * 3 + 2] = rgb[2];
  }
  (trailGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  (trailGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  trailGeo.setDrawRange(0, points.length);
  (trail.material as THREE.PointsMaterial).opacity = 0.25 + 0.35 * haze;
  return points;
}

function hexRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
