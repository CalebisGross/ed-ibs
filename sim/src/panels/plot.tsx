import type { ReactNode } from "react";

export function paddedDomain(values: readonly number[], extras: readonly number[] = [0]): [number, number] {
  const all = [...values, ...extras].filter((value) => Number.isFinite(value));
  if (all.length === 0) return [-1, 1];
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

export function linearTicks(min: number, max: number, count: number): number[] {
  if (!(count > 1) || !(max > min)) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

export function formatTick(value: number): string {
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.01 || abs >= 10000)) return value.toExponential(1);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function scaleLinear(domain: readonly [number, number], range: readonly [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

export function polyline(points: readonly { x: number; y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function PlotFrame(props: {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  xTicks: readonly number[];
  yTicks: readonly number[];
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  children: (xOf: (value: number) => number, yOf: (value: number) => number) => ReactNode;
}) {
  const margin = { top: 32, right: 16, bottom: 68, left: 112 };
  const innerW = props.width - margin.left - margin.right;
  const innerH = props.height - margin.top - margin.bottom;
  const xOf = scaleLinear(props.xDomain, [margin.left, margin.left + innerW]);
  const yOf = scaleLinear(props.yDomain, [margin.top + innerH, margin.top]);
  const y0 = yOf(0);
  const x0 = xOf(0);
  return (
    <svg
      className="see-why-plot"
      viewBox={`0 0 ${props.width} ${props.height}`}
      role="img"
      aria-label={`${props.yLabel} against ${props.xLabel}`}
    >
      <rect x={margin.left} y={margin.top} width={innerW} height={innerH} className="see-why-plot-frame" />
      {props.yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line x1={margin.left} x2={margin.left + innerW} y1={yOf(tick)} y2={yOf(tick)} className="see-why-grid" />
          <text x={margin.left - 10} y={yOf(tick)} className="see-why-tick" textAnchor="end">
            {formatTick(tick)}
          </text>
        </g>
      ))}
      {props.xTicks.map((tick) => {
        const x = xOf(tick);
        const nearLeft = x < margin.left + 40;
        const nearRight = x > margin.left + innerW - 40;
        const anchor = nearLeft ? "start" : nearRight ? "end" : "middle";
        const labelX = nearLeft ? margin.left : nearRight ? margin.left + innerW : x;
        return (
          <text key={`x-${tick}`} x={labelX} y={margin.top + innerH + 26} className="see-why-tick" textAnchor={anchor}>
            {formatTick(tick)}
          </text>
        );
      })}
      {y0 >= margin.top && y0 <= margin.top + innerH ? (
        <line x1={margin.left} x2={margin.left + innerW} y1={y0} y2={y0} className="see-why-axis" />
      ) : null}
      {x0 >= margin.left && x0 <= margin.left + innerW ? (
        <line x1={x0} x2={x0} y1={margin.top} y2={margin.top + innerH} className="see-why-axis" />
      ) : null}
      <text x={margin.left} y={14} className="see-why-axis-label" textAnchor="start">
        {props.yLabel}
      </text>
      <text x={margin.left + innerW / 2} y={props.height - 8} className="see-why-axis-label" textAnchor="middle">
        {props.xLabel}
      </text>
      <g data-plot-origin={`${xOf(0).toFixed(2)},${yOf(0).toFixed(2)}`}>{props.children(xOf, yOf)}</g>
    </svg>
  );
}
