# Hardware PDFs versus spec and solver (2026-11-15)

Issue #10 item 4. Read-only cross-check of the two PDFs in `hardware/source-documents/` against `docs/user-specification.md` and the sim defaults. Findings only. No IDs added. Decision statuses unchanged. Nothing here is hardware validation or a safety claim.

Sources:

- `ed-ibs-blueprints-bom-gcode-openscad.pdf` (4 content pages; called BP below)
- `ed-ibs-build-manufacturing-service-manual.pdf` (20 content pages; called MAN below)

Cross-reference first (do not duplicate the full earlier pass):

- `docs/hardware-docs-review.md` (internal PDF conflicts and rough physics)
- `docs/decisions-and-deviations.md` Decision index D-01..D-43
- `docs/analysis/2026-11-15/working-revision-step1.md`
- `docs/analysis/number-provenance.md`

Tags on quantities: **[T]** target, **[C]** calculated, **[S]** sourced claim from a PDF or the locked spec.

## Conflicts already covered by a decision ID

| # | Conflict | PDF (file + page) | Spec section | Code | Decision |
| --- | --- | --- | --- | --- | --- |
| 1 | Frequency band 1.0 to 60.0 Hz [S] vs spec / working 4 to 20 Hz target [T], vs K-law band about 8.00 to 11.64 Hz [C] | BP p1 (Isochronous Modulation Frequency); MAN p17 (DMX Ch 3, default 128 = 30 Hz) | §4 DMX Ch 2 | `SOURCE_CLAIMS.frequencyBandHz` `[4,20]` in `sim/src/physics/constants.ts:32`; prescribed defaults `settings.ts:88-89`; reference endpoints from `referenceModel.ts` | D-01 WORKING |
| 2 | Clear aperture: ED-07 seat bore 28.20 mm [S], chassis feature Dia 47.00 mm [S], 6807 bearing ID 35 mm [S] vs working 56 mm clear bore [T] | BP p3 (Main Coaxial Optical Bore 47.00); BP p2 / p4 and MAN p6 (28.20 mm prism seat); BP p1-p2 (6807) | Retained target; not in locked user-specification as 56 mm | `BORE_DIAMETER_M = 0.056` in `constants.ts:28` | D-02 WORKING |
| 3 | Amplitude travel +/- 12.0 deg [S] vs spec +/- 18 deg [S/T] | BP p3 (Angular Oscillation Limit) | §4 DMX Ch 1 | `SOURCE_AMPLITUDE_TARGET_DEG = 18`, `settings.ts:83` | D-03 WORKING |
| 4 | Blade thickness 0.18 mm [S] vs spec minimum 0.25 mm [S]; fixed free span 12.00 mm [S] vs curb 18.0 to 8.5 mm [S] | BP p3 / p4 (0.18 mm, 12.00 mm unsupported); MAN p4, p7, p12, p16 | §2.A.2 / §4 thickness slider | `settings.ts:74` default 0.25 mm; `L0_M` / `L_MIN_M` in `constants.ts:15-16` | D-04 / D-05 WORKING |
| 5 | 8-channel DMX map with frequency on Ch 3 [S] vs app 4-fader bank and spec Ch 1 torque / Ch 2 curb / Ch 3 brake / Ch 4 intensity [S] | MAN p16-p17 (8-Channel DMX512 Personality); BP p1 notes frequency trim on DMX Channel 1 | §4 Pane 4 | `settings.ts` four `dmx*` faders; ConsolePane | D-06 WORKING |
| 6 | Carrier indexed by escapement / continuous optical rotation wording [S] vs release-only indexer working choice [T] | BP p1 (optical rotation 1 to 60 Hz); MAN assembly path with ED-07 in 6807 | §2 coupled dynamics | 1-DOF solver; kinematic prism index in `EscapementSolver.ts` | D-07 WORKING |
| 7 | ED-04 envelope and hard-stop package disagreements [S] | BP p3 (68/52 envelope, blade geometry); earlier review also cites MAN outer 85 / hub 30 | n/a in locked spec detail | Illustrative CAD only | D-08 / D-09 WORKING labels |
| 8 | ED-05 geometry: "15 beats per revolution" [S] vs 2 beats per tooth = 30/rev [S]; OD / root / spoke conflicts [S] | BP p3 (Z = 15, "15 beats per revolution", root Dia 5.40, OD table) | §2.B.1 (12 deg mech / 24 deg opt per beat) | `mechanicalStepRad` / `opticalStepRad` in `referenceModel.ts:93-98`; tooth default 15 | D-10 WORKING |
| 9 | ED-03 arbor radii vs larger bearing housing [C from analysis] | BP p3 arbor pockets near r 36 to 39 mm; 61813 housing prediction in step 1 | n/a | Not modeled in solver | D-11 WORKING |
| 10 | Remontoire ribbon 0.08 x 1.2 x 180 mm and 0.12 N m nominal [S] vs resized working torque [C] | BP p2 HR-03; MAN remontoire notes; MAN p17 Ch 5 "0.12 N m" | §4 remontoire fader (no N m) | Energy-balance torque map in `referenceModel.ts:52-60` (not 0.12 N m) | D-12 WORKING |
| 11 | Prism length / catalog ID conflict [S] | BP p2 OPT-03 Edmund #45-942, 106.1 mm; analysis cites Edmund 45-403 / 49-429 lengths | §3 Dove prism (no length) | Not a solver constant | D-13 / D-31 |
| 12 | Certificates / Class 3R / IP54 / proof load [S] | MAN p16; BP p1 5:1 rigging wording | Out of scope for sim | n/a | D-16 OUT_OF_SCOPE |

## Solver / sim conflicts the PDFs do not resolve (still open)

These are already OPEN in the decision log. The PDFs do not supply a sourced override that matches the locked spec claims the solver refuses.

| # | Topic | Spec / claim [S] | Solver / sim | PDF note | Decision |
| --- | --- | --- | --- | --- | --- |
| A | Blank duration | About 2.2 ms at +/- 2.1 deg | Measured about 4.65 ms at +/- 18 deg / about 8 Hz [C] | PDFs do not restate the 2.2 ms blank claim as a checked number against the sim | D-33 OPEN |
| B | Q about 350 and 15 s unwind to rest | Spec §2.A.3 / §4 | About 34% amplitude remains at 15 s [C] | No Q=350 or 15 s pinspot unwind figure found in BP/MAN text extract | D-34 OPEN |
| C | Facet tilt 15 deg vs dead-center pinspot | Spec §3.2 / §4 | Rest radius D * tan(15 deg) | PDFs do not define Phi0 or a pinspot decay law | D-35 OPEN |
| D | Zero-velocity impulse inside lift | Spec §2.A.3 | `directional-lift-zone-drive` | PDFs describe pallet drop/lock geometry; they do not pick the sim drive model | D-36 OPEN |
| E | Gravity-shift 0.25 mm any orientation | Retained target [T] | Not simulated | PDFs claim shock / deflection language; not the 0.25 mm sim target | D-37 OPEN |

## Candidate new OPEN items (propose only; do not assign IDs)

Conflicts that the existing Decision index does not cleanly own, or that need a fresh OPEN row if Caleb wants them tracked separately from the WORKING labels above:

1. **Blueprint frequency channel vs manual frequency channel.** BP p1 ties isochronous trim to DMX Channel 1. MAN p17 puts Escapement Beat Frequency on Channel 3 (1 to 60 Hz). D-06 covers the wider map clash; a dedicated OPEN for ch1-vs-ch3 would stop the two PDFs disagreeing under one WORKING umbrella.
2. **Continuous rotation 1 to 60 Hz versus oscillating balance.** BP p1 and MAN burn-in text talk about optical rotation frequency across that band while ED-04 is an oscillating flexure cage (+/- 12 deg on BP p3). D-07 chose release-only indexing; the PDF mechanism ambiguity is still a package bug, not only an architecture choice.
3. **Collimator / output cell mix-up.** BP p2 BOM lists Thorlabs ACL50832U-A 50 mm f60 asphere as OPT-02; MAN and BP also talk about a 75 mm / M78 path for output. `docs/hardware-docs-review.md` already flags this. No decision ID owns the lens schedule.
4. **Prism diagonal versus 28.2 mm seat.** 25 mm square aperture diagonal is about 35.4 mm [C], which does not fit a 28.2 mm round seat [S]. D-02 / D-13 address the working 56 mm bore fit; the PDF's own 28.2 mm seat remains an internal impossibility until the PDF is revised.
5. **ED-05 "15 beats/rev" versus two beats per tooth.** Partially under D-10. Worth an explicit OPEN if the WORKING ED-05 row is read as layout-only and the beat-count sentence keeps shipping in the blueprint.
6. **Divergence / beam size claims.** MAN / package "<0.25 mrad" style claims and 75 mm beam versus 25 mm prism aperture [S]. D-15 sets a working divergence target of at least 2.4 deg [T] and leaves the 75 mm versus 25 mm check open in prose; no separate ID for the catalog beam mismatch.

## What matches

| Topic | PDF | Spec / code |
| --- | --- | --- |
| 15-tooth escape wheel | BP p2-p3; MAN p4, p10, p12 | Spec §2; `SOURCE_TOOTH_COUNT = 15` |
| Ti-6Al-4V balance cage | BP p2 ED-04 | Spec §2.A.2 material name |
| Dove prism as image rotator | BP / MAN OPT-03 path | Spec §2.B.1 / §3 |
| Remontoire + winding motor present | BP HR-03 / HR-05; MAN | Spec §4 remontoire concept (not the same map) |

## Additional conflicts from #16

Issue #16 (Jason / @jkbennitt manufacturability pass). Items already owned by #14 are left out. Each row was re-checked with `pdftotext` against the cited pages on 2026-11-15. Verification is confirmed, partly confirmed, or not found. Decision IDs D-39..D-43 are owner picks by Caleb on Nov 15 2026 (issue #16 comment). Nothing here edits the source PDFs. Nothing is hardware-validated.

Cross-reference: `docs/hardware-docs-review.md` already notes the chassis square-vs-round clash and the ED-03 7.00 H7 vs 10.00 mm pocket clash (including 7 pockets vs 10 bearings). It does not note the ED-10 20.00 mm top block, the OpenSCAD crest-outside-OD detail, or the missing hatch BOM line.

| # | Conflict | PDF (file + page) | Verification | Covered elsewhere? | Decision |
| --- | --- | --- | --- | --- | --- |
| 16.1 | Chassis envelope: square 150.00 x 150.00 mm profile [S BP] vs round extruded tube OD 120.00 mm, wall 10.00 mm [S MAN] | BP p1 Chassis Profile Footprint; MAN p1 Part ED-01 | Confirmed | `docs/hardware-docs-review.md` internal inconsistencies ("Chassis 150 sq vs round 120 OD tube"). Not in #14. D-02 uses a 102 mm tube ID as an analysis assumption and does not pick square vs round. | D-39 OPEN |
| 16.2 | ED-03 arbor bearing pockets: Dia 7.00 mm H7, 3.00 mm deep [S BP] vs pockets sized for 10.00 mm OD bearings [S MAN]; also 7 pockets / press 7 bearings [S MAN] vs 4 arbor rows at 7.00 mm [S BP] vs BOM HR-02 qty 10 of 3 mm ID x 7 mm OD x 3 mm W [S BP] | BP p3 ED-03 arbor bores; BP p2 HR-02; BP p4 G-code arbor pockets 1-4; MAN p3 Op 20; MAN assembly press-fit of 7x bearings into ED-03 | Confirmed (diameter clash and count mismatch). Pocket count vs the 10 BOM bearings cannot be reconciled from the PDFs alone. | #14 row 9 / D-11 covers arbor radii vs a larger bearing housing, not pocket diameter or 7-vs-10 count. `docs/hardware-docs-review.md` already records 7.00 H7 vs 10.00 mm and 7 vs 10. | D-40 WORKING |
| 16.3 | ED-10 plate: BOM lists 6 mm plate only [S BP] vs traveler 6.00 mm sides plus 20.00 mm top mounting block [S MAN] | BP p2 ED-10; MAN p7 Part ED-10; MAN p8 Op 10 / Op 20 | Confirmed | Not in #14 or `docs/hardware-docs-review.md`. The review's yoke M8 vs M12 note is a different conflict. | D-41 WORKING |
| 16.4 | ED-05 OpenSCAD impulse crest vertex at `outer_r + 0.15` sits outside the table OD Dia 14.80 mm [S BP] | BP p3 Outside Tip Diameter Dia 14.80 mm; BP p4 `outer_r = 7.40`, crest `[outer_r + 0.15, 1.35]` | Confirmed. Radial distance of that vertex is about 7.67 mm [C], outside the 7.40 mm OD radius [S]. | #14 row 8 / D-10 covers broader ED-05 OD / root / spoke conflicts. `docs/hardware-docs-review.md` already records root dia 5.40 vs OpenSCAD `root_r = 5.40` as a radius. The crest-outside-OD detail is new. | D-42 WORKING |
| 16.5 | Side access hatches called out as removable [S MAN] with no BOM line, part ID, material, thickness, or quantity [S BP] | MAN p1 ED-01 Op 30 ("2x side access hatches"); MAN p16 "internal service hatches"; MAN p19 "Remove side access hatches on main chassis (ED-01)"; BP p2 master parts list has no hatch or cover line | Confirmed | Not in #14, `docs/hardware-docs-review.md`, or the prior Decision index. | D-43 WORKING |

Manufacturability note from the same #16 pass (not a decision): of the custom parts, only ED-10 matches a sheet-cut shop path as written. Nearest stock to the documented 6.00 mm and 20.00 mm thicknesses is inch plate. Recorded as a manufacturing note under D-41. Not a structural or proof-load check.

## Method note

Page numbers are `pdftotext` page indexes (1-based content pages). BP form-feed split may show a trailing empty page; content cited here is p1-p4. This note does not re-run the ribbon / inertia arithmetic in `docs/hardware-docs-review.md` or step 1; it only maps each conflict to PDF page, spec, code, and decision ID.
