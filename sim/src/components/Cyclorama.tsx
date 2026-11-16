import { useEffect, useRef } from "react";
import { DEFAULT_FACET_TILT_RAD, projectRays } from "../optics/projection";
import { CHANNELS } from "../physics/constants";
import { instantaneousRayCount } from "../physics/referenceModel";
import { degToRad, radToDeg } from "../physics/units";
import type { Settings } from "../sim/settings";
import type { FramePacket } from "../sim/useSimulator";

export function Cyclorama({
  settings,
  setSettings,
  subscribe,
}: {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const persistRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const view = persistRef.current;
    const overlay = overlayRef.current;
    if (!host || !view || !overlay) return;
    const buffer = document.createElement("canvas");
    const trail: { x: number; y: number; blank: boolean }[] = [];
    let bufferReady = false;

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const canvas of [view, overlay]) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      const next = document.createElement("canvas");
      next.width = view.width;
      next.height = view.height;
      const ctx = next.getContext("2d");
      if (ctx && bufferReady) ctx.drawImage(buffer, 0, 0, next.width, next.height);
      buffer.width = next.width;
      buffer.height = next.height;
      buffer.getContext("2d")?.drawImage(next, 0, 0);
      bufferReady = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const unsubscribe = subscribe((packet) => {
      const bctx = buffer.getContext("2d");
      const vctx = view.getContext("2d");
      const octx = overlay.getContext("2d");
      if (!bctx || !vctx || !octx) return;
      const width = buffer.width;
      const height = buffer.height;
      if (packet.reset || !bufferReady) {
        bctx.globalCompositeOperation = "source-over";
        bctx.globalAlpha = 1;
        bctx.fillStyle = "#141618";
        bctx.fillRect(0, 0, width, height);
        trail.length = 0;
      } else if (packet.simDt > 0) {
        const tau = Math.max(0.001, packet.persistenceMs / 1000);
        const fade = 1 - Math.exp(-packet.simDt / tau);
        bctx.globalCompositeOperation = "source-over";
        bctx.globalAlpha = fade;
        bctx.fillStyle = "#141618";
        bctx.fillRect(0, 0, width, height);
        bctx.globalAlpha = 1;
      }
      const viewRadius = packet.throwM * Math.tan(degToRad(58)) * 1.15;
      const scale = (0.46 * Math.min(width, height)) / viewRadius;
      const mapX = (x: number) => width / 2 + x * scale;
      const mapY = (y: number) => height / 2 - y * scale;
      bctx.globalCompositeOperation = "source-over";
      let lastRadial = packet.facetTiltDeg;
      for (const sample of packet.samples) {
        const rays = projectRays({
          theta: sample.theta,
          opticalAngle: sample.opticalAngle,
          facetCount: packet.facetCount,
          throwM: packet.throwM,
          chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
          facetTiltRad: DEFAULT_FACET_TILT_RAD,
        });
        lastRadial = radToDeg(rays[0]?.radialRad ?? 0);
        if (rays[0]) trail.push({ x: rays[0].x, y: rays[0].y, blank: sample.angularBlank });
        if (trail.length > 240) trail.splice(0, trail.length - 240);
        if (!sample.beamVisible) continue;
        for (const ray of rays) {
          bctx.globalAlpha = 0.35 * Math.max(0.2, sample.intensity);
          bctx.fillStyle = ray.css;
          bctx.fillRect(mapX(ray.x) - 0.8, mapY(ray.y) - 0.8, 1.6, 1.6);
        }
      }
      bctx.globalCompositeOperation = "source-over";
      bctx.globalAlpha = 1;
      vctx.setTransform(1, 0, 0, 1, 0, 0);
      vctx.clearRect(0, 0, width, height);
      vctx.drawImage(buffer, 0, 0);

      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.clearRect(0, 0, width, height);
      octx.strokeStyle = "#3a3e42";
      octx.lineWidth = 1;
      octx.beginPath();
      const gridSteps = Math.min(80, Math.ceil(viewRadius));
      for (let meter = -gridSteps; meter <= gridSteps; meter += 1) {
        octx.moveTo(mapX(meter), mapY(-viewRadius));
        octx.lineTo(mapX(meter), mapY(viewRadius));
        octx.moveTo(mapX(-viewRadius), mapY(meter));
        octx.lineTo(mapX(viewRadius), mapY(meter));
      }
      octx.stroke();
      octx.strokeStyle = "#d5d8dc";
      octx.beginPath();
      octx.moveTo(width / 2, 0);
      octx.lineTo(width / 2, height);
      octx.moveTo(0, height / 2);
      octx.lineTo(width, height / 2);
      octx.stroke();
      const rest = packet.throwM * Math.tan(degToRad(15));
      octx.strokeStyle = "#e0a45a";
      octx.beginPath();
      octx.arc(width / 2, height / 2, Math.abs(rest) * scale, 0, Math.PI * 2);
      octx.stroke();
      octx.strokeStyle = "#d7dee8";
      octx.setLineDash([4, 4]);
      octx.beginPath();
      trail.forEach((point, index) => {
        const sx = mapX(point.x);
        const sy = mapY(point.y);
        if (index === 0) octx.moveTo(sx, sy);
        else octx.lineTo(sx, sy);
      });
      octx.stroke();
      octx.setLineDash([]);
      const live = projectRays({
        theta: packet.state.theta,
        opticalAngle: packet.state.opticalAngle,
        facetCount: packet.facetCount,
        throwM: packet.throwM,
        chromaticOffsetRad: packet.chromaticOffsetDeg.map((deg) => degToRad(deg)) as [number, number, number],
        facetTiltRad: DEFAULT_FACET_TILT_RAD,
      });
      const liveOn = packet.intensity > 0 && !(packet.chopperEnabled && packet.state.angularBlank);
      if (liveOn) {
        for (const ray of live) {
          octx.beginPath();
          octx.fillStyle = ray.css;
          octx.globalAlpha = 0.95;
          octx.arc(mapX(ray.x), mapY(ray.y), 3.2, 0, Math.PI * 2);
          octx.fill();
        }
      }
      octx.globalAlpha = 1;
      const rays = instantaneousRayCount(packet.facetCount);
      const mode = packet.chopperEnabled
        ? "Chopper on: wall samples pause inside the angle window. Dashed path is the geometric transition, not extra light."
        : "Chopper off: the spot is recorded through the transition, including the azimuth step at the beat.";
      const negative = live.some((ray) => ray.negativeRadial) ? " Negative radial angle flips the plotted azimuth." : "";
      if (captionRef.current) {
        captionRef.current.textContent = `${mode} Rays ${rays}. phi ${lastRadial.toFixed(2)} deg. Rest radius ${rest.toFixed(2)} m.${negative}`;
      }
    });

    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [subscribe]);

  return (
    <section className="pane" data-testid="pane-cyclorama">
      <header className="pane-head">
        <h2>Pane 2 · Cyclorama</h2>
        <div className="toolbar">
          <button
            type="button"
            data-testid="btn-chopper"
            className={settings.chopperEnabled ? "active" : ""}
            onClick={() => setSettings({ chopperEnabled: !settings.chopperEnabled })}
          >
            Chopper {settings.chopperEnabled ? "on" : "off"}
          </button>
          <button type="button" onClick={() => setSettings({ persistenceMs: 60 })}>Eye 60 ms</button>
          <button type="button" onClick={() => setSettings({ persistenceMs: 1 })}>Shutter 1 ms</button>
          <button type="button" onClick={() => setSettings({ persistenceMs: 2000 })}>Long 2000 ms</button>
        </div>
      </header>
      <div className="pane-body">
        <div className="wall-host" ref={hostRef}>
          <canvas ref={persistRef} className="overlay" />
          <canvas ref={overlayRef} className="overlay" />
        </div>
        <div className="legend">
          <label>
            Throw {settings.throwM.toFixed(1)} m
            <input
              data-testid="throw-slider"
              type="range"
              min={5}
              max={50}
              step={0.5}
              value={settings.throwM}
              onChange={(event) => setSettings({ throwM: Number(event.target.value) })}
            />
          </label>
          <label>
            Haze display {settings.hazeDisplay.toFixed(2)}
            <input
              data-testid="haze-display"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.hazeDisplay}
              onChange={(event) => setSettings({ hazeDisplay: Number(event.target.value) })}
            />
          </label>
          <label>
            Persistence {settings.persistenceMs.toFixed(0)} ms
            <input
              data-testid="persistence"
              type="range"
              min={1}
              max={2000}
              step={1}
              value={settings.persistenceMs}
              onChange={(event) => setSettings({ persistenceMs: Number(event.target.value) })}
            />
          </label>
          <p ref={captionRef} data-testid="cyclorama-caption">
            Wall samples appear as the solver runs. The line stays off the plot.
          </p>
          <p>Wall map D tan(phi). The overlay grid is 1 m. A blanked step draws no live spot.</p>
          <details>
            <summary>Channel notes</summary>
            <p>
              Persistence is 20 to 2000 ms. Pause holds the plate. Channels: {CHANNELS.map((channel) => `${channel.name} (${channel.wavelengths})`).join(", ")}. Offsets at 0 share one path.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
