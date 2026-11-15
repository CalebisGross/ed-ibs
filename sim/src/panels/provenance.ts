/**
 * Rows copied from docs/analysis/number-provenance.md.
 * Status, PDF page, and decision ID are only those the table or its
 * conflict notes already name. This module does not classify new numbers.
 */

export type ProvenanceStatus = "sourced" | "derived" | "unsourced" | "conflicting";

export interface ProvenanceRow {
  id: string;
  name: string;
  valueLabel: string;
  source: string;
  status: ProvenanceStatus;
  pdfPage: string | null;
  decisionId: string | null;
}

export const PROVENANCE_ROWS: readonly ProvenanceRow[] = [
  { id: "dt", name: "RK4 step", valueLabel: "0.00025 s", source: "user-specification §2 header", status: "sourced", pdfPage: null, decisionId: null },
  { id: "balance-mass", name: "Balance mass", valueLabel: "0.042 kg", source: "user-specification §2.A.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "outer-radius", name: "Outer radius", valueLabel: "0.036 m", source: "user-specification §2.A.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "inner-radius", name: "Inner radius", valueLabel: "0.028 m", source: "user-specification §2.A.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "annulus-inertia", name: "Annulus inertia", valueLabel: "4.368e-5 kg m^2", source: "formula from §2.A.1; spec cites about 4.37e-5", status: "derived", pdfPage: null, decisionId: null },
  { id: "k-base", name: "Base stiffness", valueLabel: "0.1104 N m/rad", source: "user-specification §2.A.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "l0", name: "Leaf length L0", valueLabel: "0.018 m", source: "user-specification §2.A.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "l-min", name: "Leaf length L min", valueLabel: "0.0085 m", source: "user-specification §2.A.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "q-factor", name: "Q factor", valueLabel: "350", source: "user-specification §2.A.3 (Q about 350)", status: "conflicting", pdfPage: null, decisionId: "D-34" },
  { id: "lift-half-angle", name: "Lift half-angle", valueLabel: "3.5 deg", source: "user-specification §2.A.3", status: "conflicting", pdfPage: null, decisionId: "D-36" },
  { id: "blank-half-angle", name: "Blank half-angle", valueLabel: "2.1 deg", source: "user-specification §2.B.2", status: "conflicting", pdfPage: null, decisionId: "D-33" },
  { id: "facet-tilt", name: "Facet tilt", valueLabel: "15 deg", source: "user-specification §3.2", status: "conflicting", pdfPage: null, decisionId: "D-35" },
  { id: "amplitude-target", name: "Amplitude target", valueLabel: "18 deg", source: "user-specification §4 DMX Ch 1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "endurance", name: "Endurance flag", valueLabel: "510 MPa", source: "user-specification §2.C", status: "sourced", pdfPage: null, decisionId: null },
  { id: "young-ti", name: "Ti Young modulus", valueLabel: "114 GPa", source: "user-specification §2.A.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "tooth-count", name: "Tooth count", valueLabel: "15", source: "user-specification §2; blueprints PDF p2 ED-05", status: "sourced", pdfPage: "blueprints PDF p2", decisionId: null },
  { id: "facet-count", name: "Facet count", valueLabel: "3", source: "user-specification §3.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "leaf-count", name: "Leaf count", valueLabel: "4", source: "user-specification §2.A.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "bore", name: "Bore diameter", valueLabel: "56 mm", source: "retained target / analysis; not in user-specification", status: "sourced", pdfPage: null, decisionId: "D-02" },
  { id: "gravity-shift", name: "Gravity shift target", valueLabel: "0.25 mm", source: "retained target; not in user-specification", status: "conflicting", pdfPage: null, decisionId: "D-37" },
  { id: "frequency-band", name: "Frequency band claim", valueLabel: "4 to 20 Hz", source: "user-specification §4 DMX Ch 2", status: "conflicting", pdfPage: "Blueprints PDF p1", decisionId: null },
  { id: "base-frequency", name: "Base frequency claim", valueLabel: "8.0 Hz", source: "user-specification §2.A.2; matches K/I about 8.001 Hz", status: "sourced", pdfPage: null, decisionId: null },
  { id: "beats-per-second", name: "Beats per second claim", valueLabel: "16", source: "user-specification §2.A.2 (2 times f0)", status: "sourced", pdfPage: null, decisionId: null },
  { id: "blank-duration-claim", name: "Blank duration claim", valueLabel: "2.2 ms", source: "user-specification §2.B.2 / §4", status: "conflicting", pdfPage: null, decisionId: "D-33" },
  { id: "unlock-display", name: "Unlock display claim", valueLabel: "2.1 ms", source: "user-specification §4 pane 3", status: "conflicting", pdfPage: null, decisionId: "D-33" },
  { id: "timegrapher-lift", name: "Timegrapher lift claim", valueLabel: "44 deg", source: "user-specification §4 pane 3", status: "conflicting", pdfPage: null, decisionId: null },
  { id: "simultaneous-beams", name: "Simultaneous beams claim", valueLabel: "45", source: "user-specification §4 pane 1", status: "conflicting", pdfPage: null, decisionId: null },
  { id: "unwind-time", name: "Unwind time", valueLabel: "15 s", source: "user-specification §4 power-cut", status: "conflicting", pdfPage: null, decisionId: "D-34" },
  { id: "dead-center-pinspot", name: "Dead-center pinspot claim", valueLabel: "true", source: "user-specification §4 power-cut", status: "conflicting", pdfPage: null, decisionId: "D-35" },
  { id: "fps-band", name: "FPS band claim", valueLabel: "60 to 120", source: "user-specification §1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "cyan-wavelength", name: "Cyan wavelength", valueLabel: "488 nm", source: "user-specification §3.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "magenta-wavelength", name: "Magenta wavelengths", valueLabel: "638 nm + 450 nm", source: "user-specification §3.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "gold-wavelength", name: "Gold wavelength", valueLabel: "577 nm", source: "user-specification §3.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "young-17-4", name: "17-4 PH modulus", valueLabel: "197 GPa", source: "none; code calls it illustrative", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "young-resin", name: "Resin / PETG modulus", valueLabel: "2.0 GPa", source: "none; illustrative stand-in", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "reference-stiffness", name: "Reference stiffness", valueLabel: "K = 0.1104 * (0.018 / L)", source: "user-specification §2.A.2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "natural-frequency", name: "Natural frequency", valueLabel: "sqrt(K/I) / (2 pi)", source: "user-specification §2.A.2", status: "derived", pdfPage: null, decisionId: null },
  { id: "viscous-c", name: "Viscous c for Q", valueLabel: "c = sqrt(K I) / Q", source: "implied by Q in §2.A.3", status: "derived", pdfPage: null, decisionId: null },
  { id: "energy-balance-torque", name: "Energy-balance torque", valueLabel: "tau = pi K A^2 / (4 Q liftHalf)", source: "decisions Prototype assumptions #2; not in user-specification as this formula", status: "derived", pdfPage: null, decisionId: null },
  { id: "bending-stress", name: "Bending stress", valueLabel: "sigma = E t |theta| / (2 L)", source: "user-specification §2.C", status: "sourced", pdfPage: null, decisionId: null },
  { id: "harmonic-blank-duration", name: "Harmonic blank duration", valueLabel: "2 asin(blank/A) / omega", source: "spec-audit / analysis derivation", status: "derived", pdfPage: null, decisionId: null },
  { id: "mechanical-step", name: "Mechanical step", valueLabel: "pi / Z", source: "user-specification §2.B.1 (12 deg at Z=15)", status: "derived", pdfPage: null, decisionId: null },
  { id: "optical-step", name: "Optical step", valueLabel: "2 pi / Z", source: "user-specification §2.B.1 Dove 2x", status: "derived", pdfPage: null, decisionId: null },
  { id: "instantaneous-rays", name: "Instantaneous rays", valueLabel: "facets * 3", source: "facets times channels", status: "derived", pdfPage: null, decisionId: null },
  { id: "linear-decay-ratio", name: "Linear decay ratio", valueLabel: "exp(-omega0 t / (2 Q))", source: "linear oscillator; analysis e-fold notes", status: "derived", pdfPage: null, decisionId: "D-34" },
  { id: "linear-unwind-fraction", name: "Linear unwind fraction", valueLabel: "1 - elapsed / unwindSeconds", source: "decisions assumption #8", status: "derived", pdfPage: null, decisionId: null },
  { id: "musical-tempo", name: "Musical tempo map", valueLabel: "f = (BPM * subdivision) / 120", source: "decisions assumption #10", status: "derived", pdfPage: null, decisionId: null },
  { id: "dmx-torque", name: "DMX torque fader", valueLabel: "0.75", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "dmx-intensity", name: "DMX intensity fader", valueLabel: "0.85", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "blade-thickness", name: "Blade thickness default", valueLabel: "0.25 mm", source: "user-specification §4 min; PDF blade 0.18 mm", status: "conflicting", pdfPage: null, decisionId: "D-04" },
  { id: "leaf-width", name: "Leaf width", valueLabel: "6 mm", source: "none; K_base at t=0.25 mm implies about 3.347 mm", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "throw", name: "Throw default", valueLabel: "12 m", source: "none; range 5 to 50 m is in §4", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "persistence", name: "Persistence", valueLabel: "60 ms", source: "user-specification §4 pane 2", status: "sourced", pdfPage: null, decisionId: null },
  { id: "brake-q-floor", name: "Brake Q floor", valueLabel: "20", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "unlock-peak", name: "Unlock peak angle", valueLabel: "3.5 deg", source: "user-specification §2.B.1", status: "sourced", pdfPage: null, decisionId: null },
  { id: "startup-angle", name: "Startup angle", valueLabel: "12 deg", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "startup-omega", name: "Startup omega", valueLabel: "0", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "tempo-subdivision", name: "Tempo subdivision", valueLabel: "8", source: "none; pairs with 120 BPM to hit 8 Hz", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "target-bpm", name: "Target BPM", valueLabel: "120", source: "none; inside §5 60 to 240 ask", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "omega-epsilon", name: "omegaEpsilon", valueLabel: "1e-6 rad/s", source: "none; directional-drive gate", status: "unsourced", pdfPage: null, decisionId: "D-36" },
  { id: "ring-axial", name: "Ring axial", valueLabel: "4 mm", source: "none; CAD only", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "haze-display", name: "Haze display", valueLabel: "0.7", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "wall-dt", name: "Wall dt clamp", valueLabel: "0.05 s", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "max-catch-up", name: "Max catch-up steps", valueLabel: "8000", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
  { id: "tap-interval", name: "Tap interval filter", valueLabel: "under 4000 ms", source: "none", status: "unsourced", pdfPage: null, decisionId: null },
];

/** Table rows cited by the see-why panels. */
export const DISPLAYED_PROVENANCE_IDS = [
  "dt",
  "annulus-inertia",
  "k-base",
  "q-factor",
  "lift-half-angle",
  "blank-half-angle",
  "amplitude-target",
  "frequency-band",
  "base-frequency",
  "blank-duration-claim",
  "unwind-time",
  "dead-center-pinspot",
  "natural-frequency",
  "viscous-c",
  "energy-balance-torque",
  "harmonic-blank-duration",
  "linear-decay-ratio",
  "linear-unwind-fraction",
  "omega-epsilon",
  "startup-angle",
] as const;

const BY_ID = new Map(PROVENANCE_ROWS.map((row) => [row.id, row]));

export function provenanceById(id: string): ProvenanceRow | null {
  return BY_ID.get(id) ?? null;
}

export function requireProvenance(id: string): ProvenanceRow {
  const row = provenanceById(id);
  if (!row) throw new Error(`Provenance table has no row ${id}.`);
  return row;
}

/** PDF page or decision ID, only when the table names one. */
export function provenanceHover(row: ProvenanceRow): string | null {
  const parts: string[] = [];
  if (row.decisionId) parts.push(row.decisionId);
  if (row.pdfPage) parts.push(row.pdfPage);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function isProvenanceStatus(value: string): value is ProvenanceStatus {
  switch (value) {
    case "sourced":
    case "derived":
    case "unsourced":
    case "conflicting":
      return true;
    default:
      return false;
  }
}
