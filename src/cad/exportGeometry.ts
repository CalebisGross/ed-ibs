export interface IllustrativeCad {
  boreDiameterMm: number;
  ringInnerMm: number;
  ringOuterMm: number;
  ringAxialMm: number;
  leafLengthMm: number;
  leafThicknessMm: number;
  leafWidthMm: number;
  leafCount: number;
  toothCount: number;
  facetCount: number;
  wheelPitchMm: number;
}

export const ILLUSTRATIVE_WHEEL_PITCH_MM = 44;

const BANNER = [
  "ED-IBS PROTOTYPE EXPORT",
  "ILLUSTRATIVE GEOMETRY ONLY. NOT MANUFACTURING APPROVED.",
  "Not a validated flexure, not a clearance model, and not a fatigue certificate.",
  "QEXT-200 is not this geometry. The 56 mm bore is the nominal target.",
  "Annulus radii are the reference inertia radii, not a measured assembly.",
  "Escape-wheel pitch and the leaf rectangle are illustrative.",
  "Facet count is an optical parameter. It is not a solid-model face count.",
  "Stiffness is not derived from these dimensions.",
].join(" ");

export function buildOpenScad(cad: IllustrativeCad): string {
  return `// ${BANNER}
bore_diameter = ${num(cad.boreDiameterMm)};
ring_inner = ${num(cad.ringInnerMm)};
ring_outer = ${num(cad.ringOuterMm)};
ring_axial = ${num(cad.ringAxialMm)}; // assumed axial thickness, mm
leaf_length = ${num(cad.leafLengthMm)};
leaf_thickness = ${num(cad.leafThicknessMm)};
leaf_width = ${num(cad.leafWidthMm)}; // assumed width, mm
leaf_count = ${Math.round(cad.leafCount)};
tooth_count = ${Math.round(cad.toothCount)};
facet_count = ${Math.round(cad.facetCount)}; // optical only, not extruded below
wheel_pitch = ${num(cad.wheelPitchMm)}; // illustrative pitch radius, mm

module annulus() {
  linear_extrude(height = ring_axial)
    difference() {
      circle(r = ring_outer, $fn = 180);
      circle(r = ring_inner, $fn = 180);
    }
}

module leaf_blank() {
  cube([leaf_length, leaf_width, leaf_thickness]);
}

module wheel_ticks() {
  for (i = [0:tooth_count - 1]) {
    rotate([0, 0, i * 360 / tooth_count])
      translate([wheel_pitch, 0, 0])
        cube([3, 1.2, 1.2], center = true);
  }
}

annulus();
for (i = [0:leaf_count - 1]) {
  rotate([0, 0, i * 360 / leaf_count])
    translate([ring_outer, -leaf_width / 2, 0])
      leaf_blank();
}
translate([0, 0, -2]) {
  linear_extrude(height = 1.2)
    difference() {
      circle(r = wheel_pitch + 2, $fn = 180);
      circle(r = wheel_pitch - 4, $fn = 180);
    }
  wheel_ticks();
}
`;
}

export function buildDxf(cad: IllustrativeCad): string {
  const lines: string[] = [];
  const push = (...rows: string[]) => {
    for (const row of rows) lines.push(row);
  };
  push("999", BANNER);
  push("0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC");
  push("0", "SECTION", "2", "ENTITIES");
  push("999", `bore_diameter_mm ${num(cad.boreDiameterMm)}`);
  push("999", `leaf_thickness_mm ${num(cad.leafThicknessMm)}`);
  push("999", `leaf_count ${Math.round(cad.leafCount)}`);
  push("999", `tooth_count ${Math.round(cad.toothCount)}`);
  push("999", `facet_count_optical ${Math.round(cad.facetCount)}`);
  push("999", `ring_axial_mm ${num(cad.ringAxialMm)}`);
  circle(push, "BORE", 0, 0, cad.boreDiameterMm / 2);
  circle(push, "RING", 0, 0, cad.ringOuterMm);
  circle(push, "WHEEL_PITCH", 0, 0, cad.wheelPitchMm);
  const y0 = -cad.leafWidthMm / 2;
  const x0 = cad.ringOuterMm;
  const x1 = cad.ringOuterMm + cad.leafLengthMm;
  const y1 = cad.leafWidthMm / 2;
  line(push, "LEAF", x0, y0, x1, y0);
  line(push, "LEAF", x1, y0, x1, y1);
  line(push, "LEAF", x1, y1, x0, y1);
  line(push, "LEAF", x0, y1, x0, y0);
  const stock = 10;
  line(push, "STOCK_SECTION", 0, 0, cad.leafThicknessMm, 0);
  line(push, "STOCK_SECTION", cad.leafThicknessMm, 0, cad.leafThicknessMm, stock);
  line(push, "STOCK_SECTION", cad.leafThicknessMm, stock, 0, stock);
  line(push, "STOCK_SECTION", 0, stock, 0, 0);
  for (let i = 0; i < Math.round(cad.toothCount); i += 1) {
    const ang = (i * 2 * Math.PI) / Math.round(cad.toothCount);
    const x = cad.wheelPitchMm * Math.cos(ang);
    const y = cad.wheelPitchMm * Math.sin(ang);
    line(push, "TOOTH_TICK", x, y, x * 1.06, y * 1.06);
  }
  push("0", "ENDSEC", "0", "EOF");
  return `${lines.join("\n")}\n`;
}

function num(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
}

function circle(
  push: (...rows: string[]) => void,
  layer: string,
  x: number,
  y: number,
  r: number,
): void {
  push(
    "0",
    "CIRCLE",
    "8",
    layer,
    "10",
    num(x),
    "20",
    num(y),
    "30",
    "0",
    "40",
    num(r),
  );
}

function line(
  push: (...rows: string[]) => void,
  layer: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  push(
    "0",
    "LINE",
    "8",
    layer,
    "10",
    num(x1),
    "20",
    num(y1),
    "30",
    "0",
    "11",
    num(x2),
    "21",
    num(y2),
    "31",
    "0",
  );
}
