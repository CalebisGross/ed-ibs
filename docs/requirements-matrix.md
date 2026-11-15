# Requirements matrix

Legend:

- **code-built**: present in this prototype.
- **tested**: an automated test checks the behavior.
- **app-running**: exercised in Headless Chrome 157.0.8103.50 (user agent HeadlessChrome/157.0.0.0) on this machine, 1440x900, against the Vite server on port 43117, on 2026-11-15 [S]. See `verification-report.md`. Workbench rows below were part of that session unless the row says deferred.
- **physics-validated**: the numerical result matches the stated mathematical model inside the automated tests. This is not a statement that the mechanism is an adequate machine.
- **experimentally-validated**: compared with a physical experiment. No row has this.
- **assumption**: a prototype rule standing in for an unspecified source model.
- **conflict-visible**: the source contradiction remains on screen or in the decision record.
- **deferred**: not in this slice, and not faked.
- **analysis-prediction**: a 2026-11-15 closed-form or small-model figure in `docs/analysis/2026-11-15/`. It is not an automated test of this app, not FEA, and not an experimental result.

Number tags, same convention as `docs/analysis/`: **[T]** target or chosen assumption, **[C]** calculated prediction or solver result, **[S]** cited spec, catalog, or session record. No number is hardware-validated.

Original wording lives in `user-specification.md`. This table does not replace it.

The simulator sections below describe `sim/` as it is. The 2026-11-15 working revision did not change `sim/` source or the solver. Its numbers are analysis predictions. The last section is the working status of that revision. Open items stay open. Where an evidence cell names `working-revision-step1.md`, `item7-blend-sizing.md`, or `tourbillon-feasibility.md` without a directory, that file is in `docs/analysis/2026-11-15/`.

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
| D-39 | OPEN | Chassis envelope. Square profile versus round extruded tube. No choice made. |
| D-40 | WORKING | ED-03 arbor bearing pockets. Adopt H7 pockets matching the BOM miniature bearings. Pocket count versus BOM quantity stays unresolved from the PDFs. |
| D-41 | WORKING | ED-10 yoke. Add a BOM line for the thicker top mounting block alongside the side plates. Inch-plate stock is a manufacturing note only. |
| D-42 | WORKING | ED-05 escape wheel crest. Clip the OpenSCAD crest vertex to the table OD in derived CAD or notes. Do not edit the PDF. |
| D-43 | WORKING | Side access hatches. Add a BOM placeholder part ID. Material, thickness, and quantity stay OPEN sub-items. |


## 1. Role and overview

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1.1 | §1 | Local-first Vite, React, TypeScript, Three.js, Canvas, Tailwind app | target | code-built | `sim/package.json`, `sim/src/App.tsx` |
| 1.2 | §1 | Digital twin of the full ED-IBS hardware | target | deferred as a claim; reduced oscillator is code-built. The Nov 15 hardware revision is a working analysis, not a twin | `docs/decisions-and-deviations.md` |
| 1.3 | §1 | Smooth 60 to 120 FPS [T] | target | session readout, not a certificate. On 2026-11-15 the script recorded `60 FPS this session` at the end. Stills from the same run show 55, 56, 55, 56, 54, and 51 FPS [S] | `verification-report.md` |
| 1.4 | §1 | RK4 decoupled from the frame rate | target | code-built, tested, physics-validated for the linear oscillator | `advanceToTime` partition test |
| 1.5 | §1 | Tune and play from virtual DMX faders | target | code-built as four virtual faders. A 15-channel map is an analysis proposal only. Nothing here drives DMX hardware [T, C] | pane 4 faders feed `solveCommand`; `docs/analysis/2026-11-15/item7-blend-sizing.md` §8 |

## 2. Physics

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2.1 | §2 | Solver file `src/physics/EscapementSolver.ts`, dt = 0.25 ms, deterministic [S] | target | code-built, tested | `sim/src/physics/EscapementSolver.ts`, `DT_S`, partition and repeat tests |
| 2.2 | §2 | Coupled dynamics of balance, pallet fork, and escape wheel | target | deferred. Wheel, prism, and pallet are kinematic illustrations indexed by beats. Nov 15 item 7 predicts the escapement cannot index the carrier, and adopts a separate spring-swing indexer. That indexer is not in the solver | viewport caption; `working-revision-step1.md` §a5; `item7-blend-sizing.md` |
| 2.3 | §2.A.1 | `I = m (Ro^2 + Ri^2) / 2` with m = 0.042 kg, Ro = 0.036 m, Ri = 0.028 m [S] | target and derived | code-built, tested, physics-validated as arithmetic. Not an assembly measurement. Analysis uses the same ring inertia, `4.368e-5` kg m^2 | `I_ANNULUS_KG_M2 = 4.368e-5` |
| 2.4 | §2.A.2 | `K = 0.1104 * (0.018 / L)`, L from 18.0 mm to 8.5 mm [S] | target | code-built, tested. Coefficients not retuned | `referenceStiffness`, endpoint test |
| 2.5 | §2.A.2 | N = 4, E = 114 GPa, width b, thickness t drive the stiffness [S] | target | conflict-visible. Those inputs do not drive K in the solver. Analysis predicts the spec Kbase implies b = 3.347 mm at t = 0.25 mm. That width is a prediction, not a sim change [C] | thickness test; `working-revision-step1-results.txt` |
| 2.6 | §2.A.2 and §4 | Curb maps 18.0 mm to 8.5 mm onto 4 Hz to 20 Hz [S] | target | conflict-visible. Solver endpoints are 8.001351575 Hz and 11.643676832 Hz. Lengths for 4 Hz and 20 Hz are about 72.02 mm and 2.881 mm. Nov 15 analysis predicts a stress-capped ring-only band of 8.00 Hz at 18.00 mm, 11.46 Hz at 8.78 mm, and 11.64 Hz at 8.5 mm. 4 to 20 Hz stays a target. Blades alone do not reach it (about 2.1:1 in K against about 25:1 required). The auxiliary spring is unproven. Predictions, not validated [T, C] | endpoint and `lengthForFrequency` tests; `working-revision-step1.md` §(d) |
| 2.7 | §2.A.2 | Base frequency 8.0 Hz, 16 beats/s [S] | source claim | derived value kept at 8.001351575 Hz. Not forced to 8.000. Analysis rounds the same endpoint to 8.00 Hz [T, C] | endpoint test; `working-revision-step1-results.txt` |
| 2.8 | §2.A.3 | `I theta'' + (c0 + cEddy) theta' + K theta = tau` | target | code-built, tested against the analytic free and damped solutions | solver tests |
| 2.9 | §2.A.3 | c0 for Q about 350 [T] | target | assumption, tested, still open. Default hold-Q. Optional frozen reference c0. Base c0 about 6.274e-6 N m s/rad. Analysis uses Q 350 for its loss and decay predictions. TLC locates the same decay and does not close it: after the unwind interval the balance is still swinging [T, C] | damping test; `working-revision-step1.md` "Still open"; `docs/statecharts/escapement/report.md` (`DeadCenterByUnwind`; TLC 74 states, 218 steps); `docs/statecharts/simrun/report.md` (`DeadCenterByUnwind`; TLC 320 states, 2464 steps) [C] |
| 2.10 | §2.A.3 | Eddy brake from DMX channel 3, `Fd = -gamma v` | target | assumption. Fader scales a viscous torque coefficient toward an editable Q floor. Not a magnet map | `solveCommand` |
| 2.11 | §2.A.3 | Impulse only for `|theta| <= 3.5 deg` when velocity crosses zero in the unlocking direction | target | conflict-visible, still open. Not implemented. Replaced in the solver by labeled `directional-lift-zone-drive`. Analysis says a trip should be centred on the zero crossing or taken from the escape wheel during impulse. That rule is not a contact model in this app. TLC's shortest break is two steps and ends on drive torque while the balance is still moving | torque-gate test; banner; `item7-blend-sizing.md` §1; `docs/statecharts/escapement/report.md` (`ImpulseOnlyAtZeroInsideLift`; TLC 74 states, 218 steps) [C] |
| 2.12 | §2.B.1 | Beat when crossing 0 with `|theta max| > 3.5 deg`, counter mod 30 [T] | target | code-built, tested. Generalized: valid beats increment mechanical angle by `pi/Z` and optical angle by `2 pi/Z`. At Z = 15 the mechanical period is 30 beats [C] | crossing tests |
| 2.13 | §2.B.1 | Mechanical step 12 deg for 15 teeth [T] | derived | code-built, tested, and generalized to `180/Z`. The Nov 15 indexer also uses a 12 deg step. That mechanism is analysis only [C] | Z = 15 and Z = 12 tests; `item7-blend-sizing.md` §4 [T] |
| 2.14 | §2.B.1 | Optical step 24 deg, 15-spoke star every 15 beats [T] | derived | code-built as `360/Z` per beat. Prism mesh uses the mechanical angle. Field advance is twice that | optical angle test |
| 2.15 | §2.B.2 | Blank when `|theta| <= 2.1 deg`, duration about 2.2 ms, chopper toggle [S] | target | conflict-visible, still open. Angle window is code-built and tested. At 18 deg and the base frequency the solver test expects 0.00465183 s (about 4.652 ms). 2.2 ms and 2.1 ms stay source claims. Chopper toggles drawing. Nov 15 working choice is a 15 ms index step. For electric release, analysis predicts 26.1% dark at 8.00 Hz and 39.4% dark at 11.46 Hz, and a 16.0-22.9 Hz chop that reads as flicker. Caleb marked that flicker as a flaw to reduce. Reduction is sized in `flicker-study.md`; working choices are in `gemini-revision-deviations.md` "12:10 CT". The solver was not changed to a 15 ms step. Predictions, not validated. TLC's shortest break is five steps and ends on a measured blank that is not 2.2 ms [T, C, S] | blanking test; pane 2; `item7-blend-sizing.md` §6; `docs/statecharts/escapement/report.md` (`BlankDurationIsTwoPointTwoMs`; TLC 74 states, 218 steps) [C] |
| 2.16 | §2.C | `sigma = E t theta_max / (2 L)` | target | code-built, tested as a simplified estimate. Not a 3D stress result. The solver check is 248.709 MPa at 18 deg, t = 0.25 mm, L = 18 mm, which the Nov 15 analysis rounds to 249 MPa. The same analysis predicts 510 MPa at 8.78 mm and 527 MPa at 8.5 mm. Those two are predictions, not validated. The 3370.744 MPa check is the thick short-leaf case in the test, not a working blade [T, C] | 248.709 MPa and 3370.744 MPa checks; `working-revision-step1-results.txt` [C] |
| 2.17 | §2.C | Warn above 510 MPa as infinite-life endurance [S] | target | code-built as a user flag. Not experimentally-validated and not a certificate. Analysis uses 510 MPa as a stress floor on L, not as a passed life test [C] | stress status test; `working-revision-step1.md` §(d) |
| 2.18 | §2.C | Show Q, beat error, amplitude, BPM, and vph | target | code-built. Oscillations/s, beats/s, musical BPM, and vph stay distinct | status ids `q`, `beat-error`, `amplitude`, `vph`, `tempo` |

## 3. Optics

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 3.1 | §3 | 3D haze view and 2D cyclorama, persistence 20 ms to 2000 ms [T] | target | code-built. Fog is a depth cue, not radiometric haze. Persistence is canvas decay in simulated time, not a GPU shader. 1 ms shutter is an extra preset [T] | panes 1 and 2 |
| 3.2 | §3.1 | Cyan 488 nm, magenta 638+450 nm, gold 577 nm [T] | target | code-built as three display channels. Magenta is not split into two solved rays | `CHANNELS` |
| 3.3 | §3.2 | Wall map `phi = 15 deg + 2 theta`, azimuth `24 n + 120 k + delta`, times `D tan(phi)` | target | code-built, tested. Generalized to optical angle plus `360/F`. Delta defaults to 0. The 15 deg bias against a dead-center pinspot stays open [T, C] | projection test; `working-revision-step1.md` "Still open" |
| 3.4 | §4.1 | 45-beam lattice [S] | source claim | conflict-visible. Instantaneous count is `F * 3` (9 at F = 3). Accumulated spokes may overlap [C] | `rayBudget` test; pane 2 caption |

## 4. Workbench

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 4.1 | §4 | Dark four-pane workbench | target | code-built | `sim/src/App.tsx` |
| 4.2 | §4.1 | Escape wheel, dove prism, pallet, flexure ring, beam cones | target | code-built as simplified geometry. Shapes the documents leave open stay semi-transparent and labeled illustrative. Not contact-solved and not a cathedral of 45 cones [S] | `sim/src/components/MechanicalViewport.tsx` |
| 4.3 | §4.1 | Camera presets: coaxial bore, isometric cutaway, escapement macro, stage rig, orbit, push-in, and impulse | target | code-built. Depth of field runs only on the close presets, and only in the high tier | preset buttons |
| 4.4 | §4.2 | Throw 5 m to 50 m, persistence presets, chopper comparison of smear vs blanking [T] | target | code-built. Transition is the continuous angle plus the azimuth step at the beat | `sim/src/components/Cyclorama.tsx` |
| 4.5 | §4.3 | Phase portrait with +/- 3.5 deg kick at peak velocity, and spiral on brake or power cut [T] | target | code-built from samples. The kick is at center because that is where speed peaks. Decay appears when damping exceeds drive | `sim/src/components/Timegrapher.tsx` |
| 4.6 | §4.3 | Timegrapher strip with 44 deg lift and 2.1 ms unlock [T] | target | conflict-visible. Strip shows theta, blank band, and beat ticks. 44 deg and 2.1 ms are labeled source claims [S] | pane 3 legend |
| 4.7 | §4.4 | DMX 1 torque maps 0 to 100 percent onto 0 to +/- 18 deg without changing frequency [T] | target | assumption. Energy-balance scale is editable. Frequency is set by K and I, not by the torque fader. The 15-channel proposal is not in the app [T] | pane 4; `item7-blend-sizing.md` §8 |
| 4.8 | §4.4 | DMX 2 curb, DMX 3 brake, DMX 4 intensity | target | code-built with the assumptions in rows 2.6 and 2.10. Gemini's 8-channel package and the 15-channel proposal disagree with this four-fader bank. The disagreement stays visible [T, C, S] | faders; `docs/gemini-revision-deviations.md` item 6 |
| 4.9 | §4.4 | Power cut unwinds the spring in 15 s into a dead-center pinspot [S] | target | conflict-visible, still open in the simulator. Two labeled policies. Linear ramp is an assumption. Q 350 does not stop at 15 s (about 34 percent of a free linear amplitude remains; the test expects 0.340513857). Rest radius is `D tan(15 deg)`, so the rest spot is not dead center. Nov 15 working decision: the 15 s spiral-down is a powered DMX effect, because a real mains loss leaves the source dark and the cocked indexer spring holds one step. The simulator does not implement that hardware policy. TLC's cut is one step to source off with the torque already gone. The unwind step leaves the balance swinging; on the session chart the angle is away from the start [T, C] | power and decay tests; `item7-blend-sizing.md` §5; `working-revision-step1.md` "Still open"; `docs/statecharts/escapement/report.md` and `docs/statecharts/simrun/report.md` (`CutWaitsOutTheUnwind`, `DeadCenterByUnwind`; TLC 74 states / 218 steps and 320 states / 2464 steps) [C] |
| 4.10 | §4.4 | Sliders for Z in 12..24, thickness 0.25..1.60 mm, three material presets, facets 1..6 [T] | target | code-built. Tooth and facet counts change indexing and drawing. Thickness and material do not change K. Resin/PETG share one source preset and are labeled as not one fatigue model. Working minimum thickness remains 0.25 mm. Gemini's 0.18 mm blade is not adopted [T, C, S] | CAD and stiffness tests; `working-revision-step1.md` item 4 |
| 4.11 | §4.4 | Export parametric OpenSCAD and DXF | target | code-built, tested. Illustrative only. Not manufacturing-approved. Hardware PDFs are not machine-ready or certified | `sim/tests/model.test.ts` CAD case; `docs/hardware-docs-review.md` |

## 5. Deliverables in the source

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 5.1 | §5.1 | Modular Vite + React + TypeScript scaffold | target | code-built | `sim/` |
| 5.2 | §5.2 | No placeholders or TODO stubs | target | code-built for this slice. Deferred work is documented, not rendered as dead controls | source search |
| 5.3 | §5.3 | BPM tap computes the exact curb position for 60 to 240 BPM [T] | target | code-built with explicit subdivision and reachability. Unreachable tempos are not clamped and are not called exact. The modeled blade band does not make out-of-band tempos exact | tempo tests; row 2.6 |

## Authorization constraints for this prototype

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| A.1 | Current decisions | Keep 4 to 20 Hz, 56 mm bore, any orientation, and 0.25 mm shift as targets [T] | target | visible. 4 to 20 Hz and the 56 mm bore are working targets. The 0.25 mm all-orientation gravity shift is unpassed. Analysis predicts the bearing-located cage is about 15 µm (about 6% of the budget). The balance suspension inside it is still unresolved. QEXT-200 stays rejected [T, C] | status `frequency-target`, `bore`; `tourbillon-feasibility.md` §4; `docs/historical/quadrivot-nonlinear-assessment.md` |
| A.2 | Current decisions | Original K and I formulas stay intact | target | code-built, tested. Nov 15 did not retune them | endpoint test |
| A.3 | Current decisions | Optional I and K controls with explicit assumptions | assumption | code-built. Prescribed mode and custom inertia | status kinds |
| A.4 | Current decisions | Do not claim multibody, contact, or 3D support from this oscillator | constraint | honored | decisions file |
| A.5 | Current decisions | Blanking, lift, ray count, power cut, and tempo conflicts stay visible | constraint | code-built. Nov 15 left blanking, Q 350 decay, the 15 deg bias against a dead-center pinspot, and impulse timing open. The TLC charts locate blanking, the Q 350 unwind, and impulse timing, and those three stay open [C] | panes 2 to 4; decisions file; `docs/statecharts/escapement/report.md` (TLC 74 states, 218 steps); `docs/statecharts/simrun/report.md` (TLC 320 states, 2464 steps) [C] |
| A.6 | Current decisions | Illustrative CAD or an honest deferral | choice | CAD implemented and labeled | export button |
| A.7 | QEXT-200 assessment | Do not advance the failed 20-blade specimen as a passing design [S] | constraint | honored. It is not the drawn mechanism. Failure figures stay in the historical assessment. The Nov 15 cage does not reopen it | decisions file |
| A.8 | Topology audit | Published QUADRIVOT is precedent, not an ED-IBS validation | constraint | honored | `docs/historical/` |

## Stage preview

Added after Caleb asked for a live-environment view. The source specification did not require this room. It is a presentation of the current rays.

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| S.1 | 2026-11-08 approval | Audience view with floor, backdrop, fixture, and a person for scale | presentation | code-built, tested for scale and cameras. The room is an optical table, posts, and a target card. Re-exercised 2026-11-15 | `sim/tests/stage.test.ts`, stage screenshots in `verification-report.md` |
| S.2 | Same | Side and fixture cameras | presentation | code-built | camera buttons |
| S.3 | Same | Beams follow current throw, angle, blanking, and intensity | target | code-built, tested. No extra rays | `liveBeams` |
| S.4 | Same | Afterglow is time accumulation | assumption | code-built, tested | `nextTrail` |
| S.5 | Same | Haze and brightness are not photometry or a safety rating | constraint | disclosed on the stage view | `STAGE_COPY` |
| S.6 | Same | Engineering panes and controls remain | target | code-built. Stage and Engineering are modes of one simulator | header tabs |
| S.7 | Same | Quality tiers, read-only see-why panels, and a replay scrubber | presentation | code-built. The scrubber reads recorded samples and does not step the solver. The default tier is medium. The panels sit in their own row and do not cover the engineering panes. This does not add a decision ID and does not move a Decision index status | `sim/src/post/`, `sim/src/panels/`, `sim/src/replay/` |

## Nov 15 2026 working revision

Status source: `docs/gemini-revision-deviations.md` dated sections, read against `docs/analysis/2026-11-15/`. In the evidence column, `working-revision-step1.md`, `item7-blend-sizing.md`, `tourbillon-feasibility.md`, and the matching `-results.txt` names are files in `docs/analysis/2026-11-15/`. `gemini-revision-deviations.md` and `hardware-docs-review.md` are in `docs/`. Item numbers are the table rows in the ledger. The "Nov 15 2026 update" recommendation numbers 14-16 in that file do not match table rows 14-16. This section uses the table numbers. Recommendation 15 there (touring hardware) has no table row.

Caleb's 10:33 CT note makes items 1-16 working decisions, revisable. Later widget answers set item 7. Nothing in this section was measured on hardware. The opening table in `gemini-revision-deviations.md` still says Resolution "pending". Current status is the Decision index. The dated sections under the table were not rewritten except to add IDs.

| ID | Item | Class | State | Evidence |
| --- | --- | --- | --- | --- |
| N.1 | D-01 Beat frequency | working decision | WORKING. Target 4-20 Hz retained. Analysis prediction for the ring alone on the spec law: 8.00 Hz at 18.00 mm, 11.46 Hz at the 8.78 mm stress floor, 11.64 Hz at 8.5 mm. Aux spring required for 4-20 Hz and unproven. Proposed DMX frequency is capped to the modeled range. Caleb should know the modeled band [T, C] | `working-revision-step1.md` §(d) |
| N.2 | D-02 Clear bore 56 mm [T] | working decision | WORKING, feasible as a layout prediction. 7075 carrier, ID 56 mm, on SKF 61813-2RZ (65 x 85 x 10) as the primary, Kaydon KA025 (63.5 x 76.2 x 6.35) as the light alternative. About a 93 mm housing inside the 102 mm tube. Contact-seal bearings excluded on an order-of-magnitude drag estimate. Not a measured assembly [T, C, S] | `working-revision-step1.md` §a1 |
| N.3 | D-03 Amplitude +/-18 deg [T] | working decision | WORKING. Analysis predicts 510 MPa at L = 8.78 mm and 527 MPa at 8.5 mm, t = 0.25 mm, +/-18 deg. Working proposal: clamp L_min to 8.78 mm at full amplitude, or cap amplitude at short L. Not a passed stress test [T, C] | `working-revision-step1.md` §(d) |
| N.4 | D-04 Blade thickness minimum 0.25 mm [T] | working decision | WORKING. 0.25 mm kept. Implied width 3.347 mm at the spec Kbase. Gemini 0.18 mm is not the working thickness [T, S] | `working-revision-step1-results.txt` |
| N.5 | D-05 Tuning travel | working decision | WORKING with the 8.78 mm stress floor. The 10 mm Gemini trim actuator covers the 9.22 mm from 18.00 mm to 8.78 mm. The source 8.5 mm end is past the predicted 510 MPa floor at full amplitude [T, C, S] | `working-revision-step1.md` §(d) |
| N.6 | D-06 DMX map | working decision | WORKING as a simulation-only proposal. Step 1 drafted 13 channels. Item 7 sizing proposes 15: channels 8-9 become pattern azimuth, channel 13 adds cage re-home, channel 14 is carousel rate/park, channel 15 is indexer mode. The app still has four faders. No DMX output exists in this repo [T, C] | `working-revision-step1.md` §(c); `item7-blend-sizing.md` §8 |
| N.7 | D-07 Prism motion | working decision | WORKING, from Caleb's 11:44 CT answers. Spring-swing indexer with a cam-notch lock. Stationary optical sensor plus voice-coil latch, next coil size up. 15 ms step. Light carrier. Carousel stays optional, with a driven winding ring. The 15 s decay is a powered DMX effect. Direct escapement indexing of the carrier remains rejected on the inertia prediction (reflected inertia 14x to 24x the ring; 8 to 62 N m inside the blanking window). Flicker reduction is sized with 12:10 CT working choices (`flicker-study.md`); 15 ms step, dual path and strobe still open. Gearhead backlash is open. All of these figures are predictions [T, C] | `item7-blend-sizing.md`; `gemini-revision-deviations.md` "11:44 CT" |
| N.8 | D-08 ED-04 envelope | working decision | WORKING label only. Not addressed in step 1. Still open. Item 7 keeps the balance ring at its own Z station (56/72 reference ring) [T] | `working-revision-step1.md` step 1 status, item 8; `hardware-docs-review.md` |
| N.9 | D-09 Hard-stop gap | working decision | WORKING label only. Not addressed in step 1. Still open. 0.05 mm versus 0.08 mm remains an internal disagreement. The Nov 15 update recommendation named 0.08 mm. Step 1 did not check that gap [T] | `gemini-revision-deviations.md` item 9; `working-revision-step1.md` item 9 |
| N.10 | D-10 ED-05 geometry | working decision | WORKING, and it depends on item 7 (coaxial index ring versus an offset wheel). Blueprint conflicts (OD 14.8 versus m0.45 pitch diameter 6.75, root diameter versus radius, spokes through the root, "15 beats/rev") are still open [T, S] | `hardware-docs-review.md`; `working-revision-step1.md` item 10 |
| N.11 | D-11 ED-03 train | working decision | WORKING as a collision prediction. Arbors near r 36-39 mm sit inside an 85 mm bearing housing, so the train has to move outward. Not a finished layout [T, C] | `working-revision-step1.md` §a1 and item 11 |
| N.12 | D-12 Remontoire torque | working decision | WORKING, resized for the item 7 split. Analysis prediction: escapement plus the trip share needs 2.8e-3 N m nominal max, clutch 4.2e-3 N m. Gemini's 0.12 N m is 42x that prediction. Ribbon prediction: Nivaflex 0.08 x 4.0 x about 177 mm, pre-wound 2 turns plus a 45 deg band. This replaces step 1's ribbon sized for 0.12 N m. Gemini's 0.08 x 1.2 section is predicted to max at 1.28e-3 N m. Not validated. The first-pass "~2700x short" note in `hardware-docs-review.md` is an earlier estimate and is not the working torque [T, C, S] | `item7-blend-sizing.md` §7 |
| N.13 | D-13 Prism fit | working decision | RESOLVED as geometry only. Diagonal 35.36 mm, 10.32 mm radial room inside the 56 mm bore. Not a fit check of a physical prism. The beam versus the 25 mm aperture moves to item 15. Prism length is still a source conflict: Gemini 106.1 mm, Edmund 103.18 mm (45-403) and 105.68 mm (49-429) [S] | `working-revision-step1.md` §a3 |
| N.14 | D-14 Stiffness versus frequency | working decision | SUPERSEDED by D-01 for the ring-only architecture. The Gemini case, carrier oscillating with the ring, is predicted at 2.64 Hz to 3.84 Hz on the spec law. Predictions, not validated [C, S] | `working-revision-step1.md` §(d), cases D1 and D3 |
| N.15 | D-15 Divergence | working decision | WORKING. The 12:10 CT target is a beam divergence of at least 2.4 deg [T]. Step 1 did not size the optics. The "<0.25 mrad from a 150 W COB" claim [S] is not that target. The 75 mm beam [S] versus the 25 mm prism aperture [S] is still unchecked | `hardware-docs-review.md`; `working-revision-step1.md` item 15 |
| N.16 | D-16 Hardware certificates | out of scope | OUT_OF_SCOPE. Proof load, IP54, Class 3R, and rigging are not validated by this project. The hardware PDFs are not machine-ready or certified | `hardware-docs-review.md` "Out of scope" |
| N.17 | D-18 Carousel versus tourbillon | working decision | Carousel is the working option and stays optional. Caleb chose carousel, pattern rotation as a DMX-rated feature with park, and a driven winding ring. A true tourbillon is not adopted. The crude timing screen fails at 1 rev/min and is marginal near 1 rev/5 min. Cage mass and inertia predictions (342 g and 4.55e-4 kg m^2 for the 7075 / 61813 carousel row; the summary rounds inertia to 4.6e-4) are not a build approval. The balance suspension still has to pass 0.25 mm inside the cage [T, C] | `tourbillon-feasibility.md`; `gemini-revision-deviations.md` 11:19 CT and 11:44 CT |
| N.18 | D-39 Chassis envelope | open | OPEN. Square 150.00 x 150.00 mm profile [S BP p1] versus round OD 120.00 mm wall 10.00 mm tube [S MAN p1]. Affects housing and packaging of the nominal 56 mm clear through-bore [T]. No choice made. | `docs/reviews/hardware-docs-vs-spec.md` Additional conflicts; GitHub issue sixteen [S] |
| N.19 | D-40 ED-03 arbor pockets | working decision | WORKING. Adopt Dia 7.00 mm H7 pockets matching BOM HR-02 3 mm ID x 7 mm OD x 3 mm W [S]. Reject manual 10.00 mm pocket sizing for those arbors. Pocket count unresolved from PDFs: 4 arbor rows [S BP] vs 7 pockets / 7 bearings [S MAN] vs BOM qty 10 [S]. | `docs/reviews/hardware-docs-vs-spec.md` Additional conflicts; `hardware-docs-review.md` [S] |
| N.20 | D-41 ED-10 yoke BOM | working decision | WORKING. Add a BOM line for the 20.00 mm top mounting block alongside 6.00 mm side plates [S MAN p7-p8]. Inch-plate nearest stock is a manufacturing note only; no size change [T, S]. | `docs/reviews/hardware-docs-vs-spec.md` Additional conflicts [S] |
| N.21 | D-42 ED-05 crest clip | working decision | WORKING. Clip OpenSCAD crest `outer_r + 0.15` to Dia 14.80 mm OD in derived CAD or notes. Vertex radial distance about 7.67 mm [C] vs 7.40 mm OD radius [S]. Do not edit the PDF. [T, C, S] | `docs/reviews/hardware-docs-vs-spec.md` Additional conflicts [S] |
| N.22 | D-43 Side access hatches | working decision | WORKING. BOM placeholder part ID ED-11. Material, thickness, and quantity stay OPEN sub-items (unspecified in the PDFs). [T, S] | `docs/reviews/hardware-docs-vs-spec.md` Additional conflicts [S] |

### Open inside item 7 (intentionally unresolved)

- Flicker at the 15 ms step. Electric-release dark time is predicted at 26.1% (8.00 Hz) and 39.4% (11.46 Hz). The chop is 16.0-22.9 Hz. Caleb: flicker is a flaw to reduce. Flicker reduction is sized in `docs/analysis/2026-11-15/flicker-study.md` (12:03 CT). Caleb's 12:10 CT working choices: step at pattern centre with zero-crossing fallback, beam divergence at least 2.4 deg, smear tolerance by look test, DMX blank-depth control, constant-current fast-PWM driver with lit-time boost, Raw Smear look dropped. The 15 ms step, dual path and strobe are still open ("Revisit"). Predictions, not validated, and not a photosensitivity safety finding. [T, C]
- Gearhead backlash. GPX 22 HP average backlash is 1.2 deg [catalog citation in the analysis] against torque that reverses every beat. The cock angle is supposed to hold near 0.1 deg. Options are named. None is sized. [S]
- Release budget, indexer spring, latch load, and rewind power are predictions on stated assumptions. The light-carrier 15 ms row is k = 12.5 N m/rad, cocked torque 1.03 N m, latch 26 N. Rewind prediction is 2.6-3.7 W on the DCX 22 S with a 150:1 or 186:1 gearhead. Not validated. [T, C]
- Indexer-spring fatigue (about 1.7e8 to 2.5e8 fully reversed cycles per stated touring year at an assumed 500 MPa) has no supplier fatigue data. [C]
- Stationary-indexer reaction torque is a rough prediction of 0.18-0.20 ms beat error on a 0.05 kg m^2 free-body fixture, against a Gemini 0.15 ms target. Rig stiffness is not modeled. [T, C, S]
- Carousel park without a driven winding ring is predicted to starve the escapement in about 0.3-0.9 s on the control band. Caleb chose to add a driven winding ring. That ring is not laid out. The stationary band was already tight. [C]

## Deferred, not faked

- Dynamic pallet, escape wheel, and rotor as separate bodies.
- Contact, lock, drop, and jewel geometry.
- Nonlinear flexure, gravity shift, bore clearance, and any-orientation support. The 0.25 mm shift is unpassed. [T]
- A real curb-actuator calibration onto 4 to 20 Hz. The auxiliary spring is unproven. [C]
- The 15 ms indexer, the voice-coil latch, the carousel, and the 15-channel map. They are analysis proposals. They are not in `sim/`. [T, C]
- Flicker look test and the open 15 ms step question, gearhead-backlash closure, and items 8, 9, and 15. [T]
- Dispersion raytracing and a radiometric haze model.
- A GPU persistence shader.
- Manufacturing-approved drawings, fatigue life, and experimental timekeeping.
- Real DMX, laser, or actuator output.
