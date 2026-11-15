# Review of Caleb's ED-IBS hardware docs (received Nov 15 2026)
Sources: blueprints PDF (4pp, Google Sheets) sha prefix 62abbea5; build manual PDF (20pp, Google Docs) sha prefix 0c77df77. Text: blueprints-raw.txt, manual-raw.txt.
Status: read in full, analytical cross-check only. Nothing built or validated. These are design documents, not test results.

## Conflicts with approved ledger / app spec
- Freq 1-60 Hz (DMX ch3, linear, default 128=30 Hz) vs approved 4-20 Hz target.
- 8-ch DMX personality vs app's 4-ch fader bank; blueprint says freq trim on ch1, manual on ch3.
- Clear aperture: ED-07 bore 28.2, 6807 bearing ID 35, ED-04 inner ID 47.05 vs approved 56 mm clear bore.
- Blade t = 0.18 mm vs source min 0.25 mm (slider 0.25-1.60). Fixed 12 mm span vs 18-8.5 mm tuning. Trim actuator 10 mm stroke vs 9.5 mm.
- Amplitude limit +/-12 deg vs +/-18 deg.
- Mechanism ambiguity: ED-07 runs in 6807 bearings ("optical rotation 1-60 Hz", continuous) AND sits in ED-04 flexure cage (+/-12 deg oscillation).
- "15 beats per revolution" vs spec's 2 beats per tooth (30/rev).
## Internal inconsistencies
- ED-04: blueprint 68 OD/52 ID envelope vs manual outer 85 OD, hub ID 30. Annulus (62-52)/2 = 5 mm radial but 12 mm free span. OpenSCAD blade cube 63 mm long through center would block the bore; blade z 2 and 8 = 6 mm sep vs 5.00 spec. "90 deg in XY, 45 deg to optical axis" contradicts itself.
- ED-05: m 0.45, Z15 -> PD 6.75 ok, but OD 14.80 (should be ~7.65 for a gear), table root dia 5.40 vs OpenSCAD root_r 5.40 (radius), blank 24.50. Spoke holes at r 2.3-4.5 cut through 5.40 dia root.
- ED-03 bearing pockets 7.00 H7 (blueprint, matches 3x7x3 bearings) vs 10.00 mm (manual); 7 pockets vs 10 bearings in BOM. 130x130 plate cannot sit inside the 102 ID tube. Chassis 150 sq vs round 120 OD tube.
- Dowels 4 vs 2; M3 1.1 vs 1.80 N m; yoke M8 vs M12 12.9 both 22 N m.
- Prism preload: 3 Belleville 30x15.2x0.4 + 0.25 Kapton vs 4 Belleville 15x8.2x0.6 + 0.5 Viton.
- Collimator: BOM 50 mm f60 asphere; manual 75 mm double asphere in M78 cell; blueprint says M78 cell is the output achromat.
- Motor: Maxon DCX 22 S (brushed coreless, ~no cogging) vs EC-Max brushless.
## Physics sanity (rough, my numbers)
- Nivaflex ribbon 0.08x1.2x180 mm, E~200 GPa: k ~5.7e-5 N m/rad, ~4.5e-5 N m at 45 deg vs 0.12 N m nominal drive. ~2700x short as a flat-spiral estimate.
- Dove prism 25x25 square aperture diagonal 35.4 mm, does not fit 28.2 mm round bore.
- 4 blades 0.18x4x12 Ti: ~0.074 N m/rad. Prism alone ~127 g, I~1.3e-5 -> ~11.9 Hz; with ~0.93 kg SS carrier I~3.5e-4 -> ~2.3 Hz. 60 Hz would need ~50 N m/rad.
- Blade bending stress at 12 deg ~179 MPa, under 510 MPa limit. OK.
- <0.25 mrad from a 150 W COB through f60-150 optics is not reachable (source size/f ~ tens of mrad). 75 mm beam vs 25 mm prism/cube aperture.
- DMX 8-bit freq step ~0.24 Hz vs +/-0.01% stability claim.
- 100 kHz PID on AS5048A (internal update ~10 kHz) is oversampled. Unverified datasheet number.
- Class 3R is a laser class; LEDs use IEC 62471 risk groups. Proof load uses 5x tare, not 5x SWL.
## Out of scope
Rigging certification, proof load, electrical/AC, eye safety: simulation only, no hardware claims.
