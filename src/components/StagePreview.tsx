import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DEFAULT_FACET_TILT_RAD } from "../optics/projection";
import { CHANNELS } from "../physics/constants";
import { degToRad } from "../physics/units";
import type { Settings } from "../sim/settings";
import type { FramePacket } from "../sim/useSimulator";
import {
  STAGE,
  STAGE_COPY,
  displayShaftOpacity,
  figureFeet,
  figureParts,
  liveBeams,
  nextTrail,
  stageCamera,
  visualShafts,
  type StageCameraName,
  type TrailPoint,
} from "../stage/stageGeometry";

const MAX_RAYS = 18;
const MAX_TRAIL = 14000;

export function StagePreview({
  settings,
  subscribe,
}: {
  settings: Settings;
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<StageCameraName>("audience");
  const hazeRef = useRef(settings.hazeDisplay);
  const [cameraName, setCameraName] = useState<StageCameraName>("audience");
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x07080c, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(0x090b10, 0.02);
    scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 400);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 80;
    controls.target.set(0, 2.3, 6);

    scene.add(new THREE.AmbientLight(0x9eb0c8, 0.35));
    const fill = new THREE.DirectionalLight(0xfff1dc, 0.55);
    fill.position.set(-4, 8, -6);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x87a0c0, 0.25);
    rim.position.set(6, 4, 10);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 78),
      new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.9, metalness: 0.04 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 24);
    scene.add(floor);
    const grid = new THREE.GridHelper(60, 60, 0x3a342c, 0x2a261f);
    grid.position.set(0, 0.004, 18);
    scene.add(grid);

    const surroundMat = new THREE.MeshStandardMaterial({ color: 0x171d27, roughness: 1, side: THREE.DoubleSide });
    const surround = new THREE.Mesh(new THREE.PlaneGeometry(STAGE.surroundWidthM, STAGE.surroundHeightM), surroundMat);
    surround.position.set(0, STAGE.surroundHeightM / 2, 12);
    scene.add(surround);
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x6d7d90, roughness: 0.82, metalness: 0, emissive: 0x1a2430 });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(STAGE.clothWidthM, STAGE.clothHeightM), clothMat);
    cloth.position.set(0, STAGE.clothHeightM / 2, 12);
    scene.add(cloth);
    const cove = new THREE.Mesh(
      new THREE.BoxGeometry(STAGE.clothWidthM, 0.18, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x8d97a3, roughness: 0.7 }),
    );
    cove.position.set(0, 0.09, 12);
    scene.add(cove);
    const wash = new THREE.SpotLight(0xe7eef8, 280, 40, 0.95, 0.35, 1);
    wash.position.set(-1.2, 5.6, -5);
    const washTarget = new THREE.Object3D();
    washTarget.position.set(0, 3.6, 12);
    scene.add(washTarget);
    wash.target = washTarget;
    scene.add(wash);

    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.8 });
    const proscenium = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.55, 6.2, 0.45);
    const leftLeg = new THREE.Mesh(legGeo, trimMat);
    leftLeg.position.set(-4.3, 3.1, -2.4);
    const rightLeg = new THREE.Mesh(legGeo, trimMat);
    rightLeg.position.set(4.3, 3.1, -2.4);
    const header = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, 0.45), trimMat);
    header.position.set(0, 6.05, -2.4);
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.1, 0.1), trimMat);
    pipe.position.set(0, 5.15, 0);
    proscenium.add(leftLeg, rightLeg, header, pipe);
    scene.add(proscenium);

    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, STAGE.apertureHeightM, 12),
      new THREE.MeshStandardMaterial({ color: 0x4a525c, metalness: 0.45, roughness: 0.4 }),
    );
    stand.position.set(0, STAGE.apertureHeightM / 2, -0.28);
    scene.add(stand);
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x2c343d, metalness: 0.55, roughness: 0.38 });
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.62, 20), housingMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(0, STAGE.apertureHeightM, -0.34);
    scene.add(housing);
    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x5c6772, metalness: 0.5, roughness: 0.35 });
    const yokeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.08), yokeMat);
    yokeL.position.set(-0.24, STAGE.apertureHeightM, -0.2);
    const yokeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.08), yokeMat);
    yokeR.position.set(0.24, STAGE.apertureHeightM, -0.2);
    scene.add(yokeL, yokeR);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x9fd7e8, emissive: 0x12343c, roughness: 0.15, metalness: 0.1 }),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, STAGE.apertureHeightM, -0.01);
    scene.add(lens);

    const person = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4e5966, roughness: 0.62 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xc8b4a2, roughness: 0.55 });
    for (const part of figureParts()) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.w, part.h, part.d), part.name === "head" ? headMat : bodyMat);
      mesh.position.set(part.x, part.y, part.z);
      person.add(mesh);
    }
    scene.add(person);

    const shaftGeo = new THREE.CylinderGeometry(STAGE.displayShaftRadiusM, STAGE.displayShaftRadiusM, 1, 8, 1, true);
    const spotGeo = new THREE.SphereGeometry(STAGE.displaySpotRadiusM, 14, 10);
    const shaftMats: THREE.MeshBasicMaterial[] = [];
    const shafts: THREE.Mesh[] = [];
    const spots: THREE.Mesh[] = [];
    for (let index = 0; index < MAX_RAYS; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      shaftMats.push(material);
      const shaft = new THREE.Mesh(shaftGeo, material);
      shaft.visible = false;
      shaft.frustumCulled = false;
      const spot = new THREE.Mesh(spotGeo, material);
      spot.visible = false;
      shafts.push(shaft);
      spots.push(spot);
      scene.add(shaft, spot);
    }

    const trailPositions = new Float32Array(MAX_TRAIL * 3);
    const trailColors = new Float32Array(MAX_TRAIL * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Points(
      trailGeo,
      new THREE.PointsMaterial({
        size: 0.22,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    scene.add(trail);
    let trailPoints: TrailPoint[] = [];
    const channelRgb = CHANNELS.map((channel) => hexRgb(channel.css));
    const yAxis = new THREE.Vector3(0, 1, 0);

    const latest = { packet: null as FramePacket | null };
    const unsubscribe = subscribe((packet) => {
      latest.packet = packet;
    });

    let appliedKey = "";
    let lastStatus = 0;
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let raf = 0;
    const draw = () => {
      const packet = latest.packet;
      if (packet) {
        const poseKey = `${cameraRef.current}:${packet.throwM.toFixed(2)}`;
        if (poseKey !== appliedKey) {
          const pose = stageCamera(cameraRef.current, packet.throwM);
          camera.position.set(pose.position.x, pose.position.y, pose.position.z);
          camera.fov = pose.fov;
          camera.updateProjectionMatrix();
          controls.target.set(pose.target.x, pose.target.y, pose.target.z);
          appliedKey = poseKey;
        }
        surround.position.z = packet.throwM + 0.35;
        cloth.position.z = packet.throwM;
        cove.position.z = packet.throwM - 0.16;
        washTarget.position.z = packet.throwM;
        const feet = figureFeet(packet.throwM);
        person.position.set(feet.x, feet.y, feet.z);
        const haze = hazeRef.current;
        fog.density = 0.008 + 0.028 * haze;
        const opacity = displayShaftOpacity(packet.intensity, haze);

        const visible = packet.intensity > 0 && !(packet.chopperEnabled && packet.state.angularBlank);
        const beams = liveBeams({
          theta: packet.state.theta,
          opticalAngle: packet.state.opticalAngle,
          facetCount: packet.facetCount,
          throwM: packet.throwM,
          chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
          facetTiltRad: DEFAULT_FACET_TILT_RAD,
          beamVisible: visible,
        });
        const drawn = visualShafts(beams);
        for (let index = 0; index < MAX_RAYS; index += 1) {
          const beam = drawn[index];
          const shaft = shafts[index];
          const spot = spots[index];
          const material = shaftMats[index];
          if (!beam) {
            shaft.visible = false;
            spot.visible = false;
            continue;
          }
          material.color.set(beam.css);
          material.opacity = opacity;
          aimShaft(shaft, beam.from, beam.to, yAxis);
          spot.visible = true;
          spot.position.set(beam.to.x, beam.to.y, beam.to.z);
        }

        const added: TrailPoint[] = [];
        const stride = 4;
        for (let index = 0; index < packet.samples.length; index += stride) {
          const sample = packet.samples[index];
          if (!sample.beamVisible) continue;
          const samplesBeams = liveBeams({
            theta: sample.theta,
            opticalAngle: sample.opticalAngle,
            facetCount: packet.facetCount,
            throwM: packet.throwM,
            chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
            facetTiltRad: DEFAULT_FACET_TILT_RAD,
            beamVisible: true,
          });
          for (const beam of samplesBeams) {
            added.push({ t: sample.t, x: beam.to.x, y: beam.to.y, z: beam.to.z, channel: beam.channel });
          }
        }
        trailPoints = nextTrail(trailPoints, added, packet.state.t, packet.persistenceMs / 1000, packet.reset);
        if (trailPoints.length > MAX_TRAIL) trailPoints = trailPoints.slice(trailPoints.length - MAX_TRAIL);
        const positionAttr = trailGeo.getAttribute("position") as THREE.BufferAttribute;
        const colorAttr = trailGeo.getAttribute("color") as THREE.BufferAttribute;
        for (let index = 0; index < trailPoints.length; index += 1) {
          const point = trailPoints[index];
          trailPositions[index * 3] = point.x;
          trailPositions[index * 3 + 1] = point.y;
          trailPositions[index * 3 + 2] = point.z;
          const rgb = channelRgb[point.channel] ?? channelRgb[0];
          trailColors[index * 3] = rgb[0];
          trailColors[index * 3 + 1] = rgb[1];
          trailColors[index * 3 + 2] = rgb[2];
        }
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        trailGeo.setDrawRange(0, trailPoints.length);
        (trail.material as THREE.PointsMaterial).opacity = 0.35 + 0.55 * haze;

        const nowMs = performance.now();
        if (nowMs - lastStatus > 120) {
          lastStatus = nowMs;
          const source = packet.intensity <= 0 ? "source off" : `source ${Math.round(packet.intensity * 100)}%`;
          const gate = packet.chopperEnabled && packet.state.angularBlank ? "chopper blanked" : "gate open";
          const hold = packet.paused ? "paused" : "running";
          setStatus(`${beams.length} live rays, ${source}, ${gate}, ${hold}, throw ${packet.throwM.toFixed(1)} m`);
        }
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      disposeScene(scene);
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
          <button type="button" data-testid="cam-audience" className={cameraName === "audience" ? "active" : ""} onClick={() => setCameraName("audience")}>
            Audience
          </button>
          <button type="button" data-testid="cam-side" className={cameraName === "side" ? "active" : ""} onClick={() => setCameraName("side")}>
            Side
          </button>
          <button type="button" data-testid="cam-fixture" className={cameraName === "fixture" ? "active" : ""} onClick={() => setCameraName("fixture")}>
            Fixture
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
        </div>
      </div>
    </section>
  );
}

function aimShaft(mesh: THREE.Mesh, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, yAxis: THREE.Vector3): void {
  const direction = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
  const length = direction.length();
  if (!(length > 1e-4)) {
    mesh.visible = false;
    return;
  }
  direction.multiplyScalar(1 / length);
  mesh.visible = true;
  mesh.position.set(from.x + direction.x * length * 0.5, from.y + direction.y * length * 0.5, from.z + direction.z * length * 0.5);
  mesh.quaternion.setFromUnitVectors(yAxis, direction);
  mesh.scale.set(1, length, 1);
}

function hexRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function disposeScene(scene: THREE.Scene): void {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => materials.add(item));
    else if (material) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
