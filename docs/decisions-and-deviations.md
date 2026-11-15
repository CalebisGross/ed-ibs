# Decisions and deviations

This file is the current decision record for the local prototype and for the 2026-11-15 working hardware revision. It does not edit `user-specification.md`. The original specification and the preimplementation audit are byte-for-byte copies of the supplied texts.

The 2026-11-15 revision is analysis. Its numbers are closed-form or small-model predictions, catalog citations, or stated targets. They are not experimentally validated hardware results. Tags: **[T]** target or chosen assumption, **[C]** calculated prediction or solver result, **[S]** cited spec, catalog, or session record. The simulator source and the solver were not changed for that revision. Targets in the simulator are not validated hardware results. The hardware PDFs are not machine-ready, validated, or certified.

## Decision index

Current status of each decision. Dated sections keep their own wording. Status tokens are WORKING, OPEN, RESOLVED, SUPERSEDED, OUT_OF_SCOPE, and DROPPED. IDs follow the opening table in `docs/gemini-revision-deviations.md`. In the Nov 15 update list, recommendation 14 is D-15, recommendation 15 is D-17, and recommendation 16 is D-16. Table row 14 is D-14. Nothing here is a hardware measurement.

| ID | Status | Decision |
| --- | --- | --- |
| D-01 | WORKING | Beat frequency. Table row 1. Keep the wide target band. Cap DMX frequency to the modeled band. |
| D-02 | WORKING | Clear bore. Table row 2. Keep the protected through-bore. |
| D-03 | WORKING | Amplitude. Table row 3. Keep the wide travel, with a stress floor on length. |
| D-04 | WORKING | Blade thickness. Table row 4. Keep the source minimum. |
| D-05 | WORKING | Tuning travel. Table row 5. Keep the source travel, with the stress floor. |
| D-06 | WORKING | DMX map. Table row 6. Needs-based map. The app still has the original fader count. |
| D-07 | WORKING | Prism motion. Table row 7. Spring-swing indexer with a cam-notch lock. The escapement releases. A motor rewinds. |
| D-08 | WORKING | ED-04 envelope. Table row 8. The redesign recommendation stands. Step 1 did not draw it. |
| D-09 | WORKING | Hard-stop gap. Table row 9. The working pick is the larger of the two package figures. Step 1 did not check the gap. |
| D-10 | WORKING | ED-05 geometry. Table row 10. Depends on the indexer layout. Blueprint conflicts stay recorded. |
| D-11 | WORKING | ED-03 train. Table row 11. Move the train outward of the bearing housing. |
| D-12 | WORKING | Remontoire torque. Table row 12. Resized for the escapement plus the trip share. The Gemini nominal torque is not the working torque. |
| D-13 | RESOLVED | Prism fit. Table row 13. Resolved as geometry inside the bore. Not a measurement of a part. |
| D-14 | SUPERSEDED | Stiffness versus frequency. Table row 14. Superseded by D-01 for the ring-only architecture. |
| D-15 | WORKING | Divergence. Table row 15. Working beam-divergence target from the 12:10 CT answers. |
| D-16 | OUT_OF_SCOPE | Hardware certificates. Table row 16. Proof load, ingress rating, laser class, and rigging are not validated here. |
| D-17 | WORKING | Touring hardware as modeled features. Recommendation 15 in the Nov 15 update list. No table row. |
| D-18 | WORKING | Cage type. Carousel, kept optional. A true tourbillon is not adopted. |
| D-19 | WORKING | Star pattern rotation. A feature with a DMX rate and park. |
| D-20 | WORKING | Release method. Electric release: stationary optical sensor and voice-coil latch. |
| D-21 | OPEN | Step time, dual optical path, and continuous rotation plus strobe. The 12:10 CT answer reopened them. None is dropped. |
| D-22 | WORKING | Prism carrier. Light carrier. |
| D-23 | WORKING | Power-cut decay. The spec spiral-down is a powered DMX effect. |
| D-24 | WORKING | Carousel park. Add a driven winding ring. |
| D-25 | WORKING | Step timing. Default is the pattern centre, with the zero crossing as fallback. |
| D-26 | OPEN | Smear tolerance. Decide with a look test. The quarter-spot figure stays a placeholder, not a chosen limit. |
| D-27 | WORKING | Remaining blanking. DMX blank-depth control. |
| D-28 | WORKING | LED driver. Constant current, fast PWM, and lit-time boost. Junction temperature is unchecked. |
| D-29 | DROPPED | Raw Smear DMX look. Dropped. |
| D-30 | OPEN | Gearhead backlash against torque that reverses every beat. Not closed. |
| D-31 | OPEN | Prism length. The Gemini length and the two Edmund catalog lengths are not chosen. |
| D-32 | WORKING | Flicker reduction. Flicker at the step rate is a flaw to reduce. |
| D-33 | OPEN | Blanking duration. The solver window and the spec claim still disagree. |
| D-34 | OPEN | Hold-Q decay. The spec run-down time does not stop the motion. |
| D-35 | OPEN | Optical bias versus a dead-center pinspot. |
| D-36 | OPEN | Impulse timing. Zero-velocity conjunction versus a center crossing. |
| D-37 | OPEN | Full suspension. The all-orientation gravity-shift target is unpassed. |
| D-38 | WORKING | Bearing seals. Contact seals stay excluded. |

## Authority

Implementation of this local prototype is authorized.

- 2026-11-07, 5:28pm CT, Caleb: "Okay that's fine, we're still prototyping so some flexure and out of spec measurements are acceptable."
- 2026-11-07, 5:33pm CT, Caleb: "Lift the pause, keep going."

Those two statements supersede earlier pause lines in `historical/approved-requirements-ledger.md`. Prototype deviations may stay visible. They are not automatic blockers. This authorization does not allow fabricated physics, hidden conflicts, hardware safety claims, or fabricated experimental validation.

Working hardware decisions for 2026-11-15 come from Caleb via Jeph. At 10:33 CT the instruction was to decide from manufacturing and touring reality, and to treat the item 1-16 recommendations as working decisions, revisable when analysis says otherwise. Item 7 was then set by Caleb's widget answers at 11:19 CT and 11:44 CT, recorded in `gemini-revision-deviations.md`. Those answers are working choices. They are not a tested build.

## Retained targets

These remain targets. This prototype does not newly validate them. The Nov 15 analysis does not newly validate them either.

- Frequency band 4 to 20 Hz. [T]
- Nominal 56 mm protected through-bore, with fixed optical prism content as the stated exception. [T]
- Any mounting orientation.
- Gravity-induced radial shift at most 0.25 mm. [T]
- Amplitude target +/- 18 deg. [T]
- Minimum source thickness 0.25 mm. [T]
- Preferred tuning travel 18.0 mm to 8.5 mm. [T]

Additional secondary and coupling flexures, longer leaves, auxiliary springs, and ring-inertia changes are allowed. Four total physical leaves is not a binding count. That allowance is not a proof that a 20-blade frame meets the bore, shift, or frequency targets. [T, C]

Nov 15 analysis of the original law on the reference ring, with the 510 MPa formula as a cap at +/-18 deg and t = 0.25 mm, predicts 8.00 Hz at 18.00 mm, 11.46 Hz at 8.78 mm, and 11.64 Hz at 8.5 mm. The solver's own endpoints, which are not stress-capped, are 8.001351575 Hz and 11.643676832 Hz. The 11.46 Hz figure is the stress-capped length, not a new stiffness law. Covering 4 to 20 Hz needs about 25:1 in stiffness. The 18.0 mm to 8.5 mm travel gives about 2.1:1. The approved auxiliary-spring direction is still unproven. See `docs/analysis/2026-11-15/working-revision-step1.md` section (d). [T, C]

## What this prototype is

A local four-pane workbench around a single-degree-of-freedom oscillator. The balance angle is integrated with fixed-step RK4. The escape wheel, prism, pallet, and rays are indexed or drawn from that angle. They are not separate dynamic bodies, contact bodies, or a 3D flexure model.

The original stiffness law is untouched:

`K = 0.1104 * (0.018 / L)` with `L` from 0.018 m to 0.0085 m. [S]

With the reference annulus inertia `0.042 * (0.036^2 + 0.028^2) / 2 = 4.368e-5 kg m^2`, that law derives about 8.001 Hz to 11.644 Hz. It does not derive 4 Hz or 20 Hz. No coefficient was changed to force that band. The Nov 15 files use the same law and the same ring inertia. [C, S]

An optional prescribed-frequency mode sets `K = I * (2 * pi * f)^2` from an editable band that defaults to 4 to 20 Hz. The screen labels it as an assumption. The original-law frequency at the same curb length stays on screen. [T]

## Prototype assumptions

These twelve rules are what the simulator does. The Nov 15 hardware revision does not replace them inside `sim/`.

1. Drive model id `directional-lift-zone-drive`. Torque equals `tau * sign(omega)` while `|theta|` is inside the lift half-angle and `|omega|` exceeds an editable epsilon. It is applied on both swings. It is not a pallet contact model.
2. Full-scale torque defaults to `pi * K * A^2 / (4 * Q * liftHalf)` times an editable scale. `A` defaults to 18 deg. This is a linear energy estimate, not a remontoire calibration. [T, C]
3. Hold-Q mode sets `c0 = sqrt(K I) / Q` so Q stays at the editable value when K changes. The alternative freezes `c0` at the reference K and reference I. The eddy fader adds viscous damping toward an editable Q floor. It is not a Lorentz yoke map. A power cut leaves the last brake coefficient in place.
4. Blanking is the angle window. Its duration is measured from the integrated motion. Claims of 2.1 ms and 2.2 ms stay labeled as source claims. [C, S]
5. The 44 deg timegrapher lift is shown as a source claim and is not converted into the 7 deg balance zone. [S]
6. Tooth count `Z` uses mechanical step `180/Z` deg and optical step `360/Z` deg. Facet spacing is `360/F`. Instantaneous rays are `F * 3`.
7. Chromatic offsets default to 0. Any other value is an illustrative user setting, not dispersion. [T]
8. Total source off sets torque and source intensity to 0. Retained-source mode keeps intensity and applies a linear torque ramp over an editable unwind time (default 15 s). The ramp is not a mainspring law. [T]
9. Material, thickness, and leaf width do not change K. Thickness and modulus feed only `sigma = E t |theta| / (2 L)`. The 510 MPa flag is the user's threshold, not a life certificate. [C]
10. Musical tempo uses an explicit subdivision `s` in `BPM = 120 f / s`. Unreachable requests are reported. The curb is not clamped to an endpoint.
11. Drawn leaf count, pallet flip, prism wedge, wheel pitch, and fog are graphics. Anchor radius and axial ring thickness used in the export are stated assumptions.
12. Startup is the editable initial angle and rate, applied on Reset. Rest at the origin is a stall. No hidden startup impulse is added.

## Visible source conflicts

These simulator conflicts stay visible. Nov 15 did not close them. `docs/statecharts/escapement/report.md` records TLC at 74 states and 218 steps. `docs/statecharts/simrun/report.md` records TLC at 320 states and 2464 steps. Those runs locate the conflicts below. They do not close them. [C]

- Zero-velocity impulse inside +/- 3.5 deg conflicts with a center crossing at peak velocity. The drive assumption above is the implemented choice. The analysis rule, centre the trip or take it from the escape wheel during impulse, is not implemented as a contact model. `docs/statecharts/escapement/report.md` names this `ImpulseOnlyAtZeroInsideLift`. The shortest path is two steps and ends on drive torque while the balance is still moving. [T]
- Reference travel does not cover 4 to 20 Hz. [T]
- Blank duration at 18 deg and about 8 Hz is about 4.652 ms in the solver test (expected 0.00465183 s), not 2.2 ms. The analysis cites the same window as about 4.65 ms. A 15 ms index step is a hardware working choice. It is not what the solver draws. `docs/statecharts/escapement/report.md` names this `BlankDurationIsTwoPointTwoMs`. The shortest path is five steps and ends on a measured blank that is not 2.2 ms. [T, C]
- 44 deg is not treated as 7 deg. [T]
- Three facets and three channels are 9 instantaneous rays. Accumulated spokes can overlap. The source's 45-beam wording is not drawn as 45 simultaneous beams. [C]
- A 15 deg facet tilt does not put the rest spot at the wall center. [T]
- Q near 350 does not extinguish the motion at 15 s. The decay test expects about 34 percent of a free linear amplitude to remain (0.340513857). Analysis e-fold times are 13.92 s at 8.00 Hz and 9.723 s at 11.46 Hz. Those are predictions. Both TLC reports name the unwind `DeadCenterByUnwind`. The escapement chart ends on "Still swinging after fifteen seconds". The session chart ends with the angle away from the start. `CutWaitsOutTheUnwind` is one step to "Source off, torque already gone". [C]
- K is prescribed. It is not derived from thickness, modulus, or leaf count.

## Nov 15 2026 working revision

Read these with the files that produced them:

- `docs/analysis/2026-11-15/working-revision-step1.md`, `.py`, and `-results.txt`
- `docs/analysis/2026-11-15/tourbillon-feasibility.md`, `.py`, and `-results.txt`
- `docs/analysis/2026-11-15/item7-blend-sizing.md`, `.py`, and `-results.txt`
- `docs/gemini-revision-deviations.md`
- `docs/hardware-docs-review.md`
- Row tracker: `docs/requirements-matrix.md`, section "Nov 15 2026 working revision"

Item numbers follow the table in `gemini-revision-deviations.md`. In that file, the recommendation list numbered 14-16 does not match table rows 14-16. This record uses the table numbers. Recommendation 15 in that list is touring hardware and has no table row. [S]

The opening table's Resolution column still says "pending". Current status is the Decision index. This sync did not rewrite that column, apart from adding IDs in the dated sections.

### Working decisions

1. **D-01 Beat frequency.** WORKING. Keep 4 to 20 Hz as the target. The modeled blade-only band is the prediction in "Retained targets" above. Proposed DMX frequency is capped to the active model. Today that model is 8.00-11.46 Hz. The app still shows the uncapped original-law endpoints and still labels 4 to 20 Hz as a target. [T, C]
2. **D-02 Clear bore.** WORKING, as a layout prediction. A 7075 carrier with a 56 mm ID on SKF 61813-2RZ (65 x 85 x 10) is the primary. Kaydon KA025 (63.5 x 76.2 x 6.35) is the light alternative. A housing near 93 mm OD fits the 102 mm tube ID in the analysis. Contact-seal (2RS) bearings stay excluded. The exclusion is an order-of-magnitude drag estimate, not a datasheet torque. [T, C, S]
3. **D-03 Amplitude.** WORKING at +/-18 deg. The stress prediction hits 510 MPa at L = 8.78 mm and 527 MPa at 8.5 mm. Working proposal: clamp L_min to 8.78 mm at full amplitude, or cap amplitude when L is shorter. The 510 MPa flag in the app remains a user threshold. [T, C]
4. **D-04 Blade thickness.** WORKING at a 0.25 mm minimum. The spec Kbase implies a blade width of 3.347 mm at that thickness. Gemini's 0.18 mm is not the working thickness. [T, C, S]
5. **D-05 Tuning.** WORKING with the 8.78 mm stress floor. The 10 mm Gemini trim actuator covers the 9.22 mm from 18.00 mm to 8.78 mm. The source end at 8.5 mm is past that floor at full amplitude. [T, C, S]
6. **D-06 DMX.** WORKING as a simulation-only map. Step 1 drafted 13 channels. Item 7 sizing proposes 15. Channels 8-9 become pattern azimuth. Channel 13 adds cage re-home. Channel 14 is carousel rate and park, capped at 1 rpm in the proposal. Channel 15 is indexer mode. The app still has four virtual faders. This repository does not drive DMX hardware. Gemini's 8-channel package, and the blueprint-versus-manual channel for frequency, stay disagreeing with both maps. [T, C, S]
7. **D-07 Prism motion.** WORKING from Caleb, 11:44 CT. Spring-swing indexer with a cam-notch lock. Stationary optical sensor plus a voice-coil latch, next coil size up from the cited H2W frame. 15 ms step. Light carrier. The escapement times the beat and releases the step. It does not drag the carrier. Direct indexing stays rejected: the analysis predicts a reflected inertia of 14x to 24x the balance ring, and 8 to 62 N m to step 12 deg inside the blanking window, against a 0.12 N m remontoire figure. The 15 s decay is a powered DMX effect. A real mains loss leaves the source dark, the prism latched after at most one step, and the balance decaying freely. Carousel stays optional and gets a driven winding ring. [T, C, S]
8. **D-08 ED-04 envelope.** WORKING label only. Not addressed in step 1. Still open. The item 7 architecture keeps the balance ring at its own station.
9. **D-09 Hard-stop gap.** WORKING label only. Not addressed in step 1. Still open. The package disagrees with itself at 0.05 mm and 0.08 mm. The recommendation named 0.08 mm. Step 1 did not check that gap. [T]
10. **D-10 ED-05.** WORKING, and it waits on item 7 (coaxial index ring versus an offset wheel). The blueprint conflicts in `hardware-docs-review.md` are still open: OD 14.8 versus an m0.45 pitch diameter of 6.75, root diameter versus radius, spokes through the root, and "15 beats/rev" against two beats per tooth. [T, C, S]
11. **D-11 ED-03.** WORKING as a collision prediction. Arbors near r 36-39 mm sit inside an 85 mm bearing housing, so the train moves outward. That is not a finished gear layout. [T, C]
12. **D-12 Remontoire.** WORKING, and resized once item 7 stopped using the remontoire to index the prism. The working prediction is 2.8e-3 N m nominal maximum for the escapement plus the trip share, and a clutch at 4.2e-3 N m. Gemini's 0.12 N m is 42 times that prediction. The ribbon prediction is Nivaflex 0.08 x 4.0 x about 177 mm, pre-wound two turns plus a 45 deg band. Step 1's ribbon, sized to deliver 0.12 N m, is not the working escapement spring. Gemini's 0.08 x 1.2 section is predicted to reach 1.28e-3 N m at the 1000 MPa allowable used in the analysis, about 30 percent of the clutch figure. The "~2700x short" sentence in `hardware-docs-review.md` is the earlier rough pass (E about 200 GPa). Step 1 later used 220 GPa and called the same Gemini ribbon about 2440x short of 0.12 N m, then item 7 changed the torque target. The review file was not rewritten. The working torque is the item 7 prediction. [T, C, S]
13. **D-13 Prism fit.** RESOLVED as geometry only. Diagonal 35.36 mm, with 10.32 mm of radial room inside the 56 mm bore. That is not a measurement of a purchased prism. Light outside the 25 mm aperture is an optics question and stays with item 15. Prism length is still a source conflict: Gemini 106.1 mm, Edmund 103.18 mm for uncoated 45-403, and 105.68 mm for coated 49-429. [S]
14. **D-14 Stiffness versus frequency.** SUPERSEDED by D-01 for the ring-only architecture. If the carrier oscillates with the ring, the same law predicts 2.64 Hz to 3.84 Hz. That case is not the working item 7 architecture. [T, C]
15. **D-15 Divergence.** WORKING. The 12:10 CT target is a beam divergence of at least 2.4 deg [T]. Step 1 did not size the optics. The claim of under 0.25 mrad [S] from a 150 W COB [S] is not that target. The 75 mm beam [S] against the 25 mm prism aperture [S] is still unchecked.
16. **D-16 Certificates.** OUT_OF_SCOPE. Proof load, IP54, Class 3R, and rigging are not validated here.

Carousel, from the tourbillon pass and from Caleb's 11:19 CT and 11:44 CT answers: the working option is a slow motor-driven carousel, kept optional, with pattern rotation as a DMX rate and park, and with a driven winding ring so a parked cage still winds the escapement remontoire. A true tourbillon is not adopted. The crude timing screen in `tourbillon-feasibility.md` fails at 1 rev/min and is marginal near 1 rev per 5 min. The cage-on-bearings mass and inertia (about 342 g and 4.55e-4 kg m^2 for the 7075, 61813 carousel variant in that file's table) are predictions. The bearings are predicted to use about 15 µm of the 0.25 mm budget, about 6 percent. That does not pass the balance suspension inside the cage. QEXT-200 stays rejected. [T, C]

Item 7 sizing predictions that go with the 11:44 CT choice, all from `item7-blend-sizing.md` and its results file:

- Release budget used in the analysis: 10 percent of the balance's per-beat loss, 4.9e-6 J at 8.00 Hz to 1.0e-5 J at 11.46 Hz. A one-sided trip is predicted to cost 19 s/day at 6 deg amplitude. Centring the trip is the analysis rule. It is not a new solver mode. [C]
- Electric release is the chosen baseline. The mechanical carousel push ring fails the budget by 7.5x to 30x in the analysis. The fixed-balance 3-stage sear fits the budget on paper and was not chosen. [T]
- Light carrier, 15 ms step: spring rate 12.5 N m/rad, cocked torque 1.03 N m, latch load 26 N. The baseline carrier row is 21.7 N m/rad, 1.78 N m, and 45 N. Caleb chose the light carrier. [T]
- Rewind motor kept as the DCX 22 S, 24 V, on a GPX 22 HP 3-stage gearhead at 150:1 or 186:1. Light-carrier power in the analysis is 2.6-3.7 W. Step 1's 16:1 2-stage gearhead is not the working indexer drive. [T]
- Dark time for electric release at 15 ms: 26.1 percent at 8.00 Hz and 39.4 percent at 11.46 Hz. The chop is 16.0-22.9 Hz. The summary range 26-41 percent also covers the other release columns at the top of the band. [T]

### Left open on purpose

- Flicker at the 15 ms step. Caleb called it a flaw to reduce. Flicker reduction is sized in `docs/analysis/2026-11-15/flicker-study.md` (12:03 CT). Caleb's 12:10 CT working choices: step at pattern centre with zero-crossing fallback, beam divergence at least 2.4 deg, smear tolerance by look test, DMX blank-depth control, constant-current fast-PWM driver with lit-time boost, Raw Smear look dropped. The 15 ms step, dual path and strobe are still open ("Revisit"). Predictions, not validated, and not a photosensitivity safety finding. [T, C]
- Gearhead backlash. The cited GPX 22 HP average is 1.2 deg, against torque that reverses every beat, while the cock is supposed to hold near 0.1 deg. Named options are unsized. [S]
- The 0.25 mm all-orientation gravity shift of the balance suspension. Unpassed. The cage-bearing prediction does not close it. QEXT-200 remains a rejected specimen, at about 1.95 mm in the historical assessment. [C, S]
- Items 8, 9, and 15. Not addressed in step 1.
- The four simulator conflicts named above: blanking duration, Q 350 decay at 15 s, the 15 deg bias against a dead-center pinspot, and impulse timing. The TLC reports cited above locate blanking, the Q 350 unwind, and impulse timing. Those three stay open. The 15 deg bias is not a TLC state. [S]
- Indexer-spring fatigue. The analysis counts about 1.7e8 to 2.5e8 fully reversed cycles per stated touring year at an assumed 500 MPa, with no supplier fatigue data. [C]
- Reaction torque from a stationary indexer. Rough prediction: 0.18-0.20 ms of beat error on a 0.05 kg m^2 free body, against a Gemini 0.15 ms target. Yoke and truss stiffness are not in the model. [T, C, S]
- The driven winding ring Caleb asked for. The analysis says park without it starves the escapement in about 0.3-0.9 s on the control band, or 6-18 s on the whole store. The ring itself is not drawn. The stationary band in the tourbillon pass was already at about 1 mm. [T]
- Prism length, 106.1 mm versus 103.18 mm and 105.68 mm. [T]
- ED-05 geometry conflicts and the ED-04 envelope.

## Historical provenance

`historical/approved-requirements-ledger.md` remains the earlier chronology. In particular:

- "Keep implementation paused" is superseded by the 5:33pm CT authorization.
- "Four total physical leaves" as a hard stop is superseded by the later allowance for secondary and coupling flexures. The allowance is not a passing suspension.
- The source-unavailable topology note is superseded inside that same historical file by the later full-source audit. The audit still does not validate an ED-IBS suspension.
- The QEXT-200 specimen remains rejected for the reference 42 g gravity screen. The nonlinear assessment is archived beside this file. This app does not draw that specimen and does not claim the 0.25 mm shift. The Nov 15 cage analysis does not reverse that rejection. [T]

## Stage preview

Caleb confirmed the workbench was running, and said he was not really grasping what it would look like in a live environment. He then answered yes to an audience-view stage preview with a fixture, haze, backdrop, and a person for scale.

The Stage tab shows that preview. Engineering keeps the four panes. Both use the same oscillator, the same wall map, and the same throw, blanking, and source intensity.

Presentation assumptions, not approved hardware or measured light:

- The optical axis is level, 2.4 m above the floor. Backdrop distance is the throw control. [T]
- The cloth is 16 m wide and 9 m tall with its bottom on the floor. Spots outside that rectangle stay at the formula endpoint. [T]
- The figure is 1.75 m tall. [T]
- Shaft radius, spot size, fog, and the haze slider are display choices so the rays can be seen. They are not beam diameter, radiometry, or a laser-safety result.
- Afterglow is the persistence window of samples that were actually visible. It is not a larger ray count. Coincident colors still share one path.

Pause holds the picture. Reset clears the afterglow. Source off and chopper blanking remove live shafts. The curb still only changes the oscillator, which moves the same rays.

## Out of this slice

No public deployment, paid service, real DMX, laser, or actuator output. No nonlinear multibody, contact, or 3D support model. No claim that the illustrative SCAD or DXF is manufacturing-approved. Frame rate is a session measurement, not a standing 60 to 120 FPS certificate. The Nov 15 files do not add firmware that drives a fixture, and this docs sync does not add any. [T]

## What this sync did not collapse

These disagreements are recorded on purpose. They are not treated as one number.

- Table row 14 in `gemini-revision-deviations.md` is stiffness versus frequency. Recommendation 14 in the "Nov 15 2026 update" section of that file is divergence, which is table row 15. Recommendation 15 there is touring hardware and has no table row. `working-revision-step1.md`, section "Assumptions and uncertainties", already states the mismatch.
- `hardware-docs-review.md`, section "Physics sanity (rough, my numbers)", still shows the first-pass ribbon and stiffness estimates. Later analysis replaced the working torque and the working frequency band. That review section was left as the first pass.
- `gemini-revision-deviations.md`, section "Nov 15 2026 step 1 status", still says item 7 "NEEDS CALEB". The 11:01, 11:42, and 11:44 sections below it are the later status. Item 7 is WORKING as of 11:44 CT.
- Solver endpoint 11.643676832 Hz and analysis endpoint 11.64 Hz at 8.5 mm are the same law, rounded differently. Analysis 11.46 Hz is the 8.78 mm stress floor, not a second law. [C]
