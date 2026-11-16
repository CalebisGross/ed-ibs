import { useEffect, useRef } from "react";
import { SOURCE_CLAIMS } from "../physics/constants";
import { degToRad, radToDeg } from "../physics/units";
import type { FramePacket, Sample } from "../sim/useSimulator";

interface TracePoint {
  t: number;
  theta: number;
  omega: number;
  blank: boolean;
  beat: number;
}

export function Timegrapher({
  subscribe,
  amplitudeDeg,
  analyticHz,
  measuredHz,
  beatErrorMs,
  blankMs,
  beatCount,
}: {
  subscribe: (listener: (packet: FramePacket) => void) => () => void;
  amplitudeDeg: number;
  analyticHz: number;
  measuredHz: number | null;
  beatErrorMs: number | null;
  blankMs: number | null;
  beatCount: number;
}) {
  const phaseRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const trace: TracePoint[] = [];
    let liftDeg = 3.5;
    let blankDeg = 2.1;
    const draw = () => {
      paintPhase(phaseRef.current, trace, liftDeg, blankDeg);
      paintStrip(stripRef.current, trace, blankDeg);
    };
    const unsubscribe = subscribe((packet) => {
      liftDeg = packet.liftDeg;
      blankDeg = packet.blankDeg;
      if (packet.reset) trace.length = 0;
      for (const sample of packet.samples) trace.push(toPoint(sample));
      const cutoff = (trace[trace.length - 1]?.t ?? 0) - 2.5;
      while (trace.length > 0 && trace[0].t < cutoff) trace.shift();
      draw();
    });
    const observer = new ResizeObserver(draw);
    if (phaseRef.current) observer.observe(phaseRef.current);
    if (stripRef.current) observer.observe(stripRef.current);
    draw();
    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [subscribe]);

  return (
    <section className="pane" data-testid="pane-timegrapher">
      <header className="pane-head">
        <h2>Pane 3 · Phase and timegrapher</h2>
        <p className="note">Orbit from the solver samples. Impulse is drawn at the center, where speed peaks.</p>
        <p className="plot-caption" data-testid="strip-caption">0.6 s strip. Ticks are valid beats. Band is the blank angle.</p>
      </header>
      <div className="pane-body">
        <div className="plots">
          <div className="plot-host">
            <canvas ref={phaseRef} />
          </div>
          <div className="plot-host">
            <canvas ref={stripRef} />
          </div>
        </div>
        <div className="legend">
          <p>
            Amplitude {amplitudeDeg.toFixed(2)} deg · analytic {analyticHz.toFixed(3)} Hz · measured{" "}
            {measuredHz === null ? "n/a" : `${measuredHz.toFixed(3)} Hz`} · beats {beatCount} · beat error{" "}
            {beatErrorMs === null ? "n/a" : `${beatErrorMs.toFixed(3)} ms`} · blank window{" "}
            {blankMs === null ? "n/a" : `${blankMs.toFixed(3)} ms`}
          </p>
          <p>
            Balance lift zone is the editable +/- half-angle (default 3.5 deg, 7 deg total). Source timegrapher lift {SOURCE_CLAIMS.timegrapherLiftDeg} deg is not that zone. Source unlock display {SOURCE_CLAIMS.unlockDisplayMs} ms and blanking claim {SOURCE_CLAIMS.blankDurationMs} ms are not the measured window.
          </p>
        </div>
      </div>
    </section>
  );
}

function toPoint(sample: Sample): TracePoint {
  return {
    t: sample.t,
    theta: sample.theta,
    omega: sample.omega,
    blank: sample.angularBlank,
    beat: sample.validBeats,
  };
}

function fit(canvas: HTMLCanvasElement | null): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  if (!canvas) return null;
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.floor(width * dpr);
  const bh = Math.floor(height * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function paintPhase(canvas: HTMLCanvasElement | null, trace: TracePoint[], liftDeg: number, blankDeg: number): void {
  const fitted = fit(canvas);
  if (!fitted) return;
  const { ctx, width, height } = fitted;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c1016";
  ctx.fillRect(0, 0, width, height);
  const left = 42;
  const right = 12;
  const top = 16;
  const bottom = 28;
  const plotW = Math.max(10, width - left - right);
  const plotH = Math.max(10, height - top - bottom);
  const maxDeg = 25;
  let maxW = 8;
  for (const point of trace) maxW = Math.max(maxW, Math.abs(point.omega));
  const xOf = (theta: number) => left + ((radToDeg(theta) + maxDeg) / (2 * maxDeg)) * plotW;
  const yOf = (omega: number) => top + ((maxW - omega) / (2 * maxW)) * plotH;
  ctx.strokeStyle = "#243044";
  ctx.strokeRect(left, top, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(xOf(0), top);
  ctx.lineTo(xOf(0), top + plotH);
  ctx.moveTo(left, yOf(0));
  ctx.lineTo(left + plotW, yOf(0));
  ctx.stroke();
  guide(ctx, xOf(degToRad(liftDeg)), top, plotH, "#e36a58");
  guide(ctx, xOf(degToRad(-liftDeg)), top, plotH, "#e36a58");
  guide(ctx, xOf(degToRad(blankDeg)), top, plotH, "#8b97a8");
  guide(ctx, xOf(degToRad(-blankDeg)), top, plotH, "#8b97a8");
  ctx.strokeStyle = "#79d0cb";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  trace.forEach((point, index) => {
    const x = xOf(point.theta);
    const y = yOf(point.omega);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const last = trace[trace.length - 1];
  if (last) {
    ctx.fillStyle = "#e0a45a";
    ctx.beginPath();
    ctx.arc(xOf(last.theta), yOf(last.omega), 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#8b97a8";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText("Initial condition. The orbit fills as the solver steps.", left + 8, top + 18);
  }
  ctx.fillStyle = "#8b97a8";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText("theta deg", left + plotW - 58, height - 8);
  ctx.fillText("omega", 4, top + 10);
}

function paintStrip(canvas: HTMLCanvasElement | null, trace: TracePoint[], blankDeg: number): void {
  const fitted = fit(canvas);
  if (!fitted) return;
  const { ctx, width, height } = fitted;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c1016";
  ctx.fillRect(0, 0, width, height);
  const left = 42;
  const top = 16;
  const plotW = Math.max(10, width - left - 12);
  const plotH = Math.max(10, height - top - 22);
  const t1 = trace[trace.length - 1]?.t ?? 0;
  const t0 = Math.max(0, t1 - 0.6);
  const xOf = (t: number) => left + ((t - t0) / 0.6) * plotW;
  const yOf = (theta: number) => top + ((25 - radToDeg(theta)) / 50) * plotH;
  ctx.strokeStyle = "#243044";
  ctx.strokeRect(left, top, plotW, plotH);
  ctx.fillStyle = "rgba(143, 206, 120, 0.08)";
  ctx.fillRect(left, yOf(blankDeg), plotW, yOf(-blankDeg) - yOf(blankDeg));
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, plotW, plotH);
  ctx.clip();
  ctx.strokeStyle = "#79d0cb";
  ctx.beginPath();
  let started = false;
  for (const point of trace) {
    if (point.t < t0) continue;
    const x = xOf(point.t);
    const y = yOf(point.theta);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#e0a45a";
  let previousBeat = trace.find((point) => point.t >= t0)?.beat ?? 0;
  for (const point of trace) {
    if (point.t < t0) continue;
    if (point.beat !== previousBeat) {
      ctx.beginPath();
      ctx.moveTo(xOf(point.t), top);
      ctx.lineTo(xOf(point.t), top + plotH);
      ctx.stroke();
      previousBeat = point.beat;
    }
  }
  ctx.fillStyle = "#8b97a8";
  ctx.font = "11px ui-monospace, monospace";
  if (trace.length === 0) ctx.fillText("Waiting for samples.", left + 8, top + 18);
}

function guide(ctx: CanvasRenderingContext2D, x: number, top: number, plotH: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, top + plotH);
  ctx.stroke();
  ctx.restore();
}
