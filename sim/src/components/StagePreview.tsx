import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DEFAULT_FACET_TILT_RAD } from "../optics/projection";
import { CHANNELS } from "../physics/constants";
import { degToRad } from "../physics/units";
import type { Settings } from "../sim/settings";
import type { FramePacket } from "../sim/useSimulator";
import { WHEEL_STATION_M } from "../stage/dimensions";
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
import {
  STAGE,
  figureFeet,
  liveBeams,
  nextTrail,
  stageCamera,
  visualShafts,
  type StageCameraName,
  type TrailPoint,
} from "../stage/stageGeometry";
import { createQualityPipeline, markLaserBloom, type QualityTier } from "../post/createQualityPipeline";
import { addStudioKeyFill, applyTierSceneCost, configureRenderer, mountStudio } from "../stage/studio";
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
    renderer.setClearColor(0x4e5559, 1);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(0x4e5559, 0.012);
    scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 40;
    controls.target.set(0, 1.8, 4);
    addStudioKeyFill(scene, 2.6, new THREE.Vector3(0, 1.4, 2));
    const releaseStudio = mountStudio(renderer, scene);
    const pipeline = createQualityPipeline({ renderer, scene, camera, tier: tierRef.current });

    const lab = buildLabBench();
    scene.add(lab.group);
    const mechanism = createMechanism();
    mechanism.group.position.set(0, STAGE.apertureHeightM, 0);
    mechanism.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const ghost = mesh.name.startsWith("ghost") || Boolean((mesh.material as THREE.Material).transparent);
      mesh.castShadow = !ghost;
      mesh.receiveShadow = !ghost;
    });
    scene.add(mechanism.group);
    const laser = createLaserRig(MAX_RAYS, CHANNELS.map((channel) => channel.css));
    scene.add(laser.beams, laser.haze);
    markLaserBloom(laser.beams);

    const person = new THREE.Group();
    person.name = "scale-figure";
    const silhouette = new THREE.Shape();
    silhouette.moveTo(-0.1, 0);
    silhouette.lineTo(-0.1, 0.86);
    silhouette.lineTo(-0.2, 0.9);
    silhouette.lineTo(-0.2, 1.32);
    silhouette.lineTo(-0.11, 1.46);
    silhouette.lineTo(-0.1, 1.56);
    silhouette.bezierCurveTo(-0.12, STAGE.figureHeightM, 0.12, STAGE.figureHeightM, 0.1, 1.56);
    silhouette.lineTo(0.11, 1.46);
    silhouette.lineTo(0.2, 1.32);
    silhouette.lineTo(0.2, 0.9);
    silhouette.lineTo(0.1, 0.86);
    silhouette.lineTo(0.1, 0);
    silhouette.closePath();
    const figureMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(silhouette, { depth: 0.02, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: 0x1a1e22, metalness: 0, roughness: 0.94 }),
    );
    figureMesh.position.z = -0.01;
    figureMesh.castShadow = true;
    figureMesh.receiveShadow = true;
    person.add(figureMesh);
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
        size: 0.004,
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
    const tickPlayer = tickRef.current;
    const wheelTarget = new THREE.Vector3(WHEEL_STATION_M.x - 0.002, STAGE.apertureHeightM + 0.0024, WHEEL_STATION_M.z);
    const wheelClose = new THREE.Vector3(wheelTarget.x + 0.018, wheelTarget.y + 0.016, wheelTarget.z - 0.05);

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
          camera.fov = 38;
          camera.position.set(Math.sin(orbitAngle) * 2.15, 1.85, Math.cos(orbitAngle) * 2.15);
          controls.target.set(0, 1.7, 0.6);
          camera.lookAt(controls.target);
          camera.updateProjectionMatrix();
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
          camera.fov = mixNumber(from.fov, 24, u);
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
        const drawnOn = packet.intensity > 0 && !(packet.chopperEnabled && pose.angularBlank);
        const projection = {
          facetCount: packet.facetCount,
          throwM: packet.throwM,
          chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
          facetTiltRad: DEFAULT_FACET_TILT_RAD,
        };
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
        const close = view === "wheel" || view === "impulse";
        updateLaser(laser, drawn, packet.intensity, haze, packet.chopperEnabled, pose.angularBlank, close ? 0.02 : 1);
        trailPoints = paintTrail(trail, trailGeo, trailPositions, trailColors, trailPoints, packet, channelRgb, haze);
      }
      if (controls.enabled) controls.update();
      applyTierSceneCost(renderer, scene, tierRef.current, laser.haze, fog, 0.003 + 0.01 * hazeRef.current);
      pipeline.setTier(tierRef.current);
      pipeline.setMacroDof(false);
      pipeline.setFocusDistance(null);
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

  return (
    <section className="pane stage-pane" data-testid="pane-stage">
      <div className="pane-body">
        <div className="stage-host" ref={hostRef} data-testid="stage-canvas-host" />
        <div className="stage-presets" data-testid="stage-presets">
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
        <p className={webgl === "ready" ? "sr" : "legend stage-webgl"} data-testid="webgl-status">
          {webgl === "ready" ? "WebGL viewport ready" : webgl}
        </p>
      </div>
    </section>
  );
}

export function StageStatusLine({ subscribe }: { subscribe: (listener: (packet: FramePacket) => void) => () => void }) {
  const [status, setStatus] = useState("Waiting for the solver.");
  useEffect(() => {
    let last = 0;
    return subscribe((packet) => {
      const now = performance.now();
      if (now - last < 150) return;
      last = now;
      setStatus(formatStageStatus(packet));
    });
  }, [subscribe]);
  return <p data-testid="stage-status">{status}</p>;
}

function formatStageStatus(packet: FramePacket): string {
  const liveOn = packet.intensity > 0 && !(packet.chopperEnabled && packet.state.angularBlank);
  const liveCount = liveBeams({
    facetCount: packet.facetCount,
    throwM: packet.throwM,
    chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
    facetTiltRad: DEFAULT_FACET_TILT_RAD,
    theta: packet.state.theta,
    opticalAngle: packet.state.opticalAngle,
    beamVisible: liveOn,
  }).length;
  const source = packet.intensity <= 0 ? "source off" : `source ${Math.round(packet.intensity * 100)}%`;
  const gate = packet.chopperEnabled && packet.state.angularBlank ? "chopper blanked" : "gate open";
  const hold = packet.paused ? "paused" : "running";
  return `${liveCount} live rays, ${source}, ${gate}, ${hold}, throw ${packet.throwM.toFixed(1)} m`;
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
        position: { x: 0, y: STAGE.apertureHeightM, z: throwM - 20 },
        target: { x: 0, y: STAGE.apertureHeightM, z: throwM },
        fov: 38,
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
