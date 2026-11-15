import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DEFAULT_FACET_TILT_RAD, projectRays } from "../optics/projection";
import { degToRad } from "../physics/units";
import type { FramePacket } from "../sim/useSimulator";

type PresetName = "coaxial" | "isometric" | "macro" | "stage";

const PRESETS: Record<PresetName, { position: [number, number, number]; target: [number, number, number] }> = {
  coaxial: { position: [0, 0, 0.24], target: [0, 0, 0] },
  isometric: { position: [0.18, 0.15, 0.16], target: [0, 0, 0] },
  macro: { position: [-0.09, 0.03, 0.055], target: [-0.05, 0.008, 0.014] },
  stage: { position: [0.24, 0.16, 0.18], target: [0, 0, 0.02] },
};

const LEAF_SEGMENTS = 12;

export function MechanicalViewport({
  subscribe,
}: {
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<PresetName>("coaxial");
  const sectionRef = useRef(false);
  const [preset, setPreset] = useState<PresetName>("coaxial");
  const [section, setSection] = useState(false);
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
    const context = renderer.getContext();
    if (!context) {
      renderer.dispose();
      setWebgl("WebGL context unavailable");
      return;
    }
    setWebgl("ready");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0c1016, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c1016, 1.4);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.005, 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xd5dde8, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(0.2, 0.3, 0.4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x89a7c2, 0.4);
    fill.position.set(-0.3, -0.1, 0.2);
    scene.add(fill);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const titanium = new THREE.MeshStandardMaterial({
      color: 0xb7c0cc,
      metalness: 0.72,
      roughness: 0.34,
      clippingPlanes: [],
      side: THREE.DoubleSide,
    });
    const ceramic = new THREE.MeshStandardMaterial({
      color: 0xd5ddd6,
      metalness: 0.08,
      roughness: 0.42,
      clippingPlanes: [],
    });
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0x9fd7e8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.12,
      metalness: 0,
      clippingPlanes: [],
      side: THREE.DoubleSide,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xc9a27a,
      metalness: 0.25,
      roughness: 0.46,
      clippingPlanes: [],
    });
    const jewelMat = new THREE.MeshStandardMaterial({
      color: 0xd81b60,
      emissive: 0x5a1028,
      roughness: 0.25,
      clippingPlanes: [],
    });
    const clipMaterials = [titanium, ceramic, prismMat, brass, jewelMat];

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.036, 96), titanium);
    scene.add(ring);

    const borePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i += 1) {
      const ang = (i / 96) * Math.PI * 2;
      borePoints.push(new THREE.Vector3(Math.cos(ang) * 0.028, Math.sin(ang) * 0.028, 0));
    }
    const bore = new THREE.Line(new THREE.BufferGeometry().setFromPoints(borePoints), new THREE.LineBasicMaterial({ color: 0xe0a45a }));
    scene.add(bore);

    const shape = new THREE.Shape();
    shape.moveTo(-0.008, -0.006);
    shape.lineTo(0.008, -0.006);
    shape.lineTo(0.004, 0.006);
    shape.lineTo(-0.004, 0.006);
    const prism = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), prismMat);
    prism.position.z = -0.006;
    scene.add(prism);

    const wheel = new THREE.Group();
    scene.add(wheel);
    let wheelCount = -1;

    const pallet = new THREE.Group();
    pallet.position.set(-0.058, 0, 0.016);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.0035), brass);
    arm.position.x = 0.006;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0028, 0.0028), brass);
    upper.position.set(0.016, 0.0055, 0);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0028, 0.0028), brass);
    lower.position.set(0.016, -0.0055, 0);
    const jewelA = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 16, 12), jewelMat);
    jewelA.position.set(0.024, 0.0055, 0);
    const jewelB = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 16, 12), jewelMat);
    jewelB.position.set(0.024, -0.0055, 0);
    pallet.add(arm, upper, lower, jewelA, jewelB);
    scene.add(pallet);

    const leafGeo = new THREE.BufferGeometry();
    const leafPositions = new Float32Array(16 * (LEAF_SEGMENTS + 1) * 2 * 3);
    leafGeo.setAttribute("position", new THREE.BufferAttribute(leafPositions, 3));
    const leafIndex: number[] = [];
    for (let leaf = 0; leaf < 16; leaf += 1) {
      const base = leaf * (LEAF_SEGMENTS + 1) * 2;
      for (let seg = 0; seg < LEAF_SEGMENTS; seg += 1) {
        const a = base + seg * 2;
        leafIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    leafGeo.setIndex(leafIndex);
    const leaves = new THREE.Mesh(leafGeo, titanium);
    scene.add(leaves);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xe0a45a, roughness: 0.4, metalness: 0.2 });
    const curbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0022, 0.008, 0.003), curbMat, 16);
    scene.add(curbs);
    const dummy = new THREE.Object3D();

    const beamMat = [0x3ec6d6, 0xe15caa, 0xe0b15a].map(
      (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    const beams: THREE.Line[] = [];
    for (let i = 0; i < 18; i += 1) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 0.05)]);
      const line = new THREE.Line(geo, beamMat[i % 3]);
      line.visible = false;
      beams.push(line);
      scene.add(line);
    }

    const latest = { packet: null as FramePacket | null };
    const unsubscribe = subscribe((packet) => {
      latest.packet = packet;
    });

    let appliedPreset: PresetName | null = null;
    let appliedSection = false;
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
      const wanted = presetRef.current;
      if (wanted !== appliedPreset) {
        const pose = PRESETS[wanted];
        camera.position.set(...pose.position);
        controls.target.set(...pose.target);
        appliedPreset = wanted;
      }
      const clip = sectionRef.current;
      if (clip !== appliedSection) {
        for (const material of clipMaterials) material.clippingPlanes = clip ? [clipPlane] : [];
        appliedSection = clip;
      }
      const packet = latest.packet;
      if (packet) {
        ring.rotation.z = packet.state.theta;
        prism.rotation.z = packet.state.mechAngle;
        pallet.rotation.z = packet.state.validBeats % 2 === 0 ? 0.42 : -0.42;
        if (packet.toothCount !== wheelCount) {
          rebuildWheel(wheel, packet.toothCount, ceramic);
          wheelCount = packet.toothCount;
        }
        wheel.rotation.z = packet.state.mechAngle;
        writeLeaves(leafPositions, packet);
        (leafGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        leafGeo.computeVertexNormals();
        for (let i = 0; i < 16; i += 1) {
          dummy.position.set(0, 0, 0);
            dummy.scale.set(0.0001, 0.0001, 0.0001);
          dummy.updateMatrix();
          if (i < packet.leafCount) {
            const alpha = (i / packet.leafCount) * Math.PI * 2;
            const radius = 0.036 + packet.leafLengthM;
            dummy.position.set(Math.cos(alpha) * radius, Math.sin(alpha) * radius, 0);
            dummy.scale.set(1, Math.max(0.4, packet.leafWidthM / 0.008), 1);
            dummy.rotation.z = alpha;
            dummy.updateMatrix();
          }
          curbs.setMatrixAt(i, dummy.matrix);
        }
        curbs.instanceMatrix.needsUpdate = true;
        const rays = projectRays({
          theta: packet.state.theta,
          opticalAngle: packet.state.opticalAngle,
          facetCount: packet.facetCount,
          throwM: packet.throwM,
          chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
          facetTiltRad: DEFAULT_FACET_TILT_RAD,
        });
        const show = packet.intensity > 0 && !(packet.chopperEnabled && packet.state.angularBlank);
        beams.forEach((line, index) => {
          const ray = rays[index];
          if (!ray || !show) {
            line.visible = false;
            return;
          }
          const direction = new THREE.Vector3(ray.x, ray.y, packet.throwM).normalize().multiplyScalar(0.22);
          const position = (line.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
          position[0] = 0;
          position[1] = 0;
          position[2] = 0;
          position[3] = direction.x;
          position[4] = direction.y;
          position[5] = direction.z;
          (line.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
          line.visible = true;
        });
      }
      controls.update();
      renderer.render(scene, camera);
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
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [subscribe]);

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
          <button type="button" className={section ? "active" : ""} onClick={() => setSection((value) => !value)}>
            Section {section ? "on" : "off"}
          </button>
        </div>
      </header>
      <div className="pane-body">
        <div className="viewport-host" ref={hostRef} />
        <p className={webgl === "ready" ? "sr" : "legend"} data-testid="webgl-status">
          {webgl === "ready" ? "WebGL viewport ready" : webgl}
        </p>
        <p className="legend">
          Simplified coaxial stack. Ring radii 28 mm and 36 mm. Amber circle is the nominal 56 mm bore. Leaves stay outside that bore and bend only as a drawing of the angle. The pallet flips on beats. It is not contact-solved. Beam lines are direction indicators, not the full throw. Fog is a depth cue, not radiometry. Gravity shift is not simulated.
        </p>
      </div>
    </section>
  );
}

function PresetButton({
  name,
  current,
  setPreset,
  label,
}: {
  name: PresetName;
  current: PresetName;
  setPreset: (name: PresetName) => void;
  label: string;
}) {
  return (
    <button type="button" className={current === name ? "active" : ""} onClick={() => setPreset(name)}>
      {label}
    </button>
  );
}

function rebuildWheel(group: THREE.Group, toothCount: number, material: THREE.Material): void {
  for (const child of [...group.children]) {
    group.remove(child);
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
  }
  const disk = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.047, Math.max(48, toothCount * 4)), material);
  disk.position.z = 0.012;
  group.add(disk);
  for (let i = 0; i < toothCount; i += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0024, 0.0024), material);
    const ang = (i / toothCount) * Math.PI * 2;
    tooth.position.set(Math.cos(ang) * 0.0495, Math.sin(ang) * 0.0495, 0.012);
    tooth.rotation.z = ang;
    group.add(tooth);
  }
}

function writeLeaves(positions: Float32Array, packet: FramePacket): void {
  const width = Math.max(0.001, packet.leafWidthM);
  for (let leaf = 0; leaf < 16; leaf += 1) {
    const base = leaf * (LEAF_SEGMENTS + 1) * 2;
    for (let seg = 0; seg <= LEAF_SEGMENTS; seg += 1) {
      if (leaf >= packet.leafCount) {
        writeVertex(positions, base + seg * 2, 0, 0, -2);
        writeVertex(positions, base + seg * 2 + 1, 0, 0, -2);
        continue;
      }
      const s = seg / LEAF_SEGMENTS;
      const alpha = (leaf / packet.leafCount) * Math.PI * 2;
      const tipAngle = alpha + packet.state.theta;
      const radius = 0.036 + packet.leafLengthM * s;
      const bow = Math.sin(Math.PI * s) * -packet.state.theta * 0.35;
      const ang = tipAngle + (alpha - tipAngle) * s + bow;
      const px = -Math.sin(ang) * width * 0.5;
      const py = Math.cos(ang) * width * 0.5;
      const x = Math.cos(ang) * radius;
      const y = Math.sin(ang) * radius;
      const z = packet.leafThicknessM / 2;
      writeVertex(positions, base + seg * 2, x - px, y - py, -z);
      writeVertex(positions, base + seg * 2 + 1, x + px, y + py, z);
    }
  }
}

function writeVertex(positions: Float32Array, index: number, x: number, y: number, z: number): void {
  positions[index * 3] = x;
  positions[index * 3 + 1] = y;
  positions[index * 3 + 2] = z;
}

function disposeScene(scene: THREE.Scene): void {
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => materials.add(item));
    else if (material) materials.add(material);
  });
  materials.forEach((material) => material.dispose());
}
