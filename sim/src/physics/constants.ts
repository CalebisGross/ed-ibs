/**
 * Source coefficients and prototype defaults.
 * The reference stiffness law is the original formula. It is not retuned
 * to force the 4 to 20 Hz design target.
 */

export const DT_S = 0.00025;

export const MASS_KG = 0.042;
export const R_OUTER_M = 0.036;
export const R_INNER_M = 0.028;
export const I_ANNULUS_KG_M2 = (MASS_KG * (R_OUTER_M ** 2 + R_INNER_M ** 2)) / 2;

export const K_BASE_N_M_PER_RAD = 0.1104;
export const L0_M = 0.018;
export const L_MIN_M = 0.0085;

export const SOURCE_Q = 350;
export const SOURCE_LIFT_DEG = 3.5;
export const SOURCE_BLANK_DEG = 2.1;
export const SOURCE_FACET_TILT_DEG = 15;
export const SOURCE_AMPLITUDE_TARGET_DEG = 18;
export const SOURCE_ENDURANCE_MPA = 510;
export const SOURCE_YOUNG_TI_PA = 114e9;
export const SOURCE_TOOTH_COUNT = 15;
export const SOURCE_FACET_COUNT = 3;
export const SOURCE_LEAF_COUNT = 4;
export const BORE_DIAMETER_M = 0.056;
export const GRAVITY_SHIFT_TARGET_M = 0.00025;

export const SOURCE_CLAIMS = {
  frequencyBandHz: [4, 20] as const,
  baseFrequencyHz: 8,
  beatsPerSecond: 16,
  blankDurationMs: 2.2,
  unlockDisplayMs: 2.1,
  timegrapherLiftDeg: 44,
  simultaneousBeams: 45,
  unwindSeconds: 15,
  deadCenterPinspot: true,
  fpsBand: [60, 120] as const,
} as const;

export const CHANNELS = [
  { id: "A", name: "Cyan", wavelengths: "488 nm", css: "#3ec6d6" },
  { id: "B", name: "Magenta", wavelengths: "638 nm + 450 nm", css: "#e15caa" },
  { id: "C", name: "Gold", wavelengths: "577 nm", css: "#e0b15a" },
] as const;

export const MATERIALS = [
  {
    id: "ti-6al-4v",
    name: "Ti-6Al-4V Grade 5",
    youngPa: SOURCE_YOUNG_TI_PA,
    note: "Source modulus, used only in the simplified bending estimate. The 510 MPa flag is a user target, not an endurance certificate.",
  },
  {
    id: "ss-17-4",
    name: "17-4 PH Stainless",
    youngPa: 197e9,
    note: "Illustrative modulus 197 GPa. Heat treatment is unspecified. This modulus does not drive K.",
  },
  {
    id: "resin-petg",
    name: "SLA Tough Resin / PETG Prototype",
    youngPa: 2.0e9,
    note: "The source groups two different materials as one preset. 2.0 GPa is an illustrative stand-in, not a validated resin or PETG grade, and it does not drive K.",
  },
] as const;

export type MaterialId = (typeof MATERIALS)[number]["id"];

export const PROVENANCE = {
  userSpecificationSha256: "995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a",
  specAuditSha256: "b8c6461663685241b43d66af4f76894340a80cc7b194643fe4c771cdbcabaa72",
} as const;

export const DRIVE_MODEL_ID = "directional-lift-zone-drive";
