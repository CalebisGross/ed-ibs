import { defaultSettings } from "../sim/settings";
import { BORE_DIAMETER_M, R_INNER_M, R_OUTER_M } from "../physics/constants";

/**
 * Lengths the meshes are allowed to treat as given.
 * Ghost parts use a documented envelope and an explicit illustrative pose or thickness.
 */

export const RING_INNER_M = R_INNER_M;
export const RING_OUTER_M = R_OUTER_M;
export const BORE_M = BORE_DIAMETER_M;

/** Illustrative CAD axial thickness. Not a drawing callout. */
export const RING_AXIAL_M = defaultSettings.ringAxialMm / 1000;

/** Blueprint ED-05 outside tip diameter. Conflicts with the pitch diameter (D-10, D-42). */
export const WHEEL_OD_M = 0.0148;

/** Analysis target, not a fitted part: hardened steel 80/62 x 3 mm. */
export const STEEL_RING_OD_M = 0.08;
export const STEEL_RING_ID_M = 0.062;
export const STEEL_RING_THICK_M = 0.003;

/** D-39, both still open. */
export const CHASSIS_SQUARE_M = 0.15;
export const CHASSIS_ROUND_OD_M = 0.12;
export const CHASSIS_ROUND_WALL_M = 0.01;

/** Extrusion used only so a profile is visible. Not a specified length. */
export const GHOST_SLICE_M = 0.02;

/** 7075 carrier inner diameter is the 56 mm bore target. This wall is not a sleeve drawing. */
export const CARRIER_WALL_M = 0.002;

/** Prism marker depth. Catalog lengths are not chosen (D-31). */
export const PRISM_MARKER_M = 0.008;

/** Jewel marker radius. The specification names ruby jewels and does not give a diameter. */
export const JEWEL_RADIUS_M = 0.0011;

/**
 * Where the ghost wheel sits relative to the balance origin.
 * Outside the 36 mm ring. The station itself is not a solved layout (D-11).
 */
export const WHEEL_STATION_M = { x: -0.052, y: 0, z: 0.004 } as const;

export interface PartNote {
  id: string;
  ghost: boolean;
  label: string;
}

export const PART_NOTES: readonly PartNote[] = [
  {
    id: "balance-ring",
    ghost: false,
    label: "Balance ring, Ti-6Al-4V, inner 28 mm and outer 36 mm. Axial thickness is the illustrative CAD value.",
  },
  {
    id: "leaves",
    ghost: false,
    label: "Leaf count and curb length follow the solver. Width and the drawn bow are illustrative.",
  },
  {
    id: "escape-wheel",
    ghost: true,
    label: "Ghost. Specification: 15-tooth silicon nitride wheel. Blueprint OD 14.80 mm still conflicts (D-10, D-42). Tooth profile is not contact geometry.",
  },
  {
    id: "pallet",
    ghost: true,
    label: "Ghost. Specification: titanium pallet fork and synthetic ruby jewels. Fork and jewel sizes are not given.",
  },
  {
    id: "prism",
    ghost: true,
    label: "Ghost. Dove prism length is not chosen (D-31). The wedge is a marker, not 106.1 mm, 103.18 mm, or 105.68 mm.",
  },
  {
    id: "steel-ring",
    ghost: true,
    label: "Ghost. Analysis target only: hardened steel 80/62 x 3 mm. Not a fitted wheel.",
  },
  {
    id: "carrier",
    ghost: true,
    label: "Ghost. 7075 carrier inner diameter is the 56 mm bore target. The drawn wall is illustrative.",
  },
  {
    id: "chassis",
    ghost: true,
    label: "Ghost. D-39 is open: square 150 mm profile and round 120 mm OD with 10 mm wall are both shown. Slice length is not specified. 6061-T6 hard anodize is the chassis material named for ED-01.",
  },
  {
    id: "scenery",
    ghost: false,
    label: "Optical table, posts, target card, and the 1.75 m figure are scenery. They are not ED-IBS parts.",
  },
];

export function ghostNotes(): readonly PartNote[] {
  return PART_NOTES.filter((part) => part.ghost);
}
