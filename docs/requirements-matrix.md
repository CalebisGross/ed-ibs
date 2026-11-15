# Requirements matrix

Legend:

- **code-built**: present in this prototype.
- **tested**: an automated test checks the behavior.
- **app-running**: exercised in Headless Chrome 156 on this machine, 1440x900, against the Vite server on port 43117. See `verification-report.md`. Workbench rows below were part of that session unless the row says deferred.
- **physics-validated**: the numerical result matches the stated mathematical model inside the automated tests. This is not a statement that the mechanism is an adequate machine.
- **experimentally-validated**: compared with a physical experiment. No row has this.
- **assumption**: a prototype rule standing in for an unspecified source model.
- **conflict-visible**: the source contradiction remains on screen.
- **deferred**: not in this slice, and not faked.

Original wording lives in `user-specification.md`. This table does not replace it.

## 1. Role and overview

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1.1 | §1 | Local-first Vite, React, TypeScript, Three.js, Canvas, Tailwind app | target | code-built | `package.json`, `src/App.tsx` |
| 1.2 | §1 | Digital twin of the full ED-IBS hardware | target | deferred as a claim; reduced oscillator is code-built | `docs/decisions-and-deviations.md` |
| 1.3 | §1 | Smooth 60 to 120 FPS | target | measured, not certified. About 59 FPS in the named headless session below | `verification-report.md` |
| 1.4 | §1 | RK4 decoupled from the frame rate | target | code-built, tested, physics-validated for the linear oscillator | `advanceToTime` partition test |
| 1.5 | §1 | Tune and play from virtual DMX faders | target | code-built | pane 4 faders feed `solveCommand` |

## 2. Physics

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2.1 | §2 | Solver file `src/physics/EscapementSolver.ts`, dt = 0.25 ms, deterministic | target | code-built, tested | `DT_S`, partition and repeat tests |
| 2.2 | §2 | Coupled dynamics of balance, pallet fork, and escape wheel | target | deferred. Wheel, prism, and pallet are kinematic illustrations indexed by beats | viewport caption |
| 2.3 | §2.A.1 | `I = m (Ro^2 + Ri^2) / 2` with m = 0.042 kg, Ro = 0.036 m, Ri = 0.028 m | target and derived | code-built, tested, physics-validated as arithmetic. Not an assembly measurement | `I_ANNULUS_KG_M2 = 4.368e-5` |
| 2.4 | §2.A.2 | `K = 0.1104 * (0.018 / L)`, L from 18.0 mm to 8.5 mm | target | code-built, tested. Coefficients not retuned | `referenceStiffness`, endpoint test |
| 2.5 | §2.A.2 | N = 4, E = 114 GPa, width b, thickness t drive the stiffness | target | conflict-visible. Those inputs do not drive K. Coupling is unspecified | thickness test; stress uses E and t only |
| 2.6 | §2.A.2 and §4 | Curb maps 18.0 mm to 8.5 mm onto 4 Hz to 20 Hz | target | conflict-visible. Original law derives about 8.001 Hz to 11.644 Hz. Lengths for 4 Hz and 20 Hz are about 72.02 mm and 2.881 mm | endpoint and `lengthForFrequency` tests |
| 2.7 | §2.A.2 | Base frequency 8.0 Hz, 16 beats/s | source claim | derived value kept at about 8.001 Hz. Not forced to 8.000 | endpoint test |
| 2.8 | §2.A.3 | `I theta'' + (c0 + cEddy) theta' + K theta = tau` | target | code-built, tested against the analytic free and damped solutions | solver tests |
| 2.9 | §2.A.3 | c0 for Q about 350 | target | assumption, tested. Default hold-Q. Optional frozen reference c0. Base c0 about 6.274e-6 N m s/rad | damping test |
| 2.10 | §2.A.3 | Eddy brake from DMX channel 3, `Fd = -gamma v` | target | assumption. Fader scales a viscous torque coefficient toward an editable Q floor. Not a magnet map | `solveCommand` |
| 2.11 | §2.A.3 | Impulse only for `|theta| <= 3.5 deg` when velocity crosses zero in the unlocking direction | target | conflict-visible. Not implemented. Replaced by labeled `directional-lift-zone-drive` | torque-gate test; banner |
| 2.12 | §2.B.1 | Beat when crossing 0 with `|theta max| > 3.5 deg`, counter mod 30 | target | code-built, tested. Generalized: valid beats increment mechanical angle by `pi/Z` and optical angle by `2 pi/Z`. At Z = 15 the mechanical period is 30 beats | crossing tests |
| 2.13 | §2.B.1 | Mechanical step 12 deg for 15 teeth | derived | code-built, tested, and generalized to `180/Z` | Z = 15 and Z = 12 tests |
| 2.14 | §2.B.1 | Optical step 24 deg, 15-spoke star every 15 beats | derived | code-built as `360/Z` per beat. Prism mesh uses the mechanical angle. Field advance is twice that | optical angle test |
| 2.15 | §2.B.2 | Blank when `|theta| <= 2.1 deg`, duration about 2.2 ms, chopper toggle | target | conflict-visible. Angle window is code-built and tested. Duration is measured (about 4.652 ms at 18 deg and the base frequency). 2.2 ms and 2.1 ms stay source claims. Chopper toggles drawing | blanking test; pane 2 |
| 2.16 | §2.C | `sigma = E t theta_max / (2 L)` | target | code-built, tested as a simplified estimate. Not a 3D stress result | 248.71 MPa and 3370.74 MPa checks |
| 2.17 | §2.C | Warn above 510 MPa as infinite-life endurance | target | code-built as a user flag. Not experimentally-validated and not a certificate | stress status test |
| 2.18 | §2.C | Show Q, beat error, amplitude, BPM, and vph | target | code-built. Oscillations/s, beats/s, musical BPM, and vph stay distinct | status ids `q`, `beat-error`, `amplitude`, `vph`, `tempo` |

## 3. Optics

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 3.1 | §3 | 3D haze view and 2D cyclorama, persistence 20 ms to 2000 ms | target | code-built. Fog is a depth cue, not radiometric haze. Persistence is canvas decay in simulated time, not a GPU shader. 1 ms shutter is an extra preset | panes 1 and 2 |
| 3.2 | §3.1 | Cyan 488 nm, magenta 638+450 nm, gold 577 nm | target | code-built as three display channels. Magenta is not split into two solved rays | `CHANNELS` |
| 3.3 | §3.2 | Wall map `phi = 15 deg + 2 theta`, azimuth `24 n + 120 k + delta`, times `D tan(phi)` | target | code-built, tested. Generalized to optical angle plus `360/F`. Delta defaults to 0 | projection test |
| 3.4 | §4.1 | 45-beam lattice | source claim | conflict-visible. Instantaneous count is `F * 3` (9 at F = 3). Accumulated spokes may overlap | `rayBudget` test; pane 2 caption |

## 4. Workbench

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 4.1 | §4 | Dark four-pane workbench | target | code-built | `src/App.tsx` |
| 4.2 | §4.1 | Escape wheel, dove prism, pallet, flexure ring, beam cones | target | code-built as simplified geometry. Not contact-solved and not a cathedral of 45 cones | `MechanicalViewport.tsx` |
| 4.3 | §4.1 | Camera presets: coaxial bore, isometric cutaway, escapement macro, stage rig | target | code-built | preset buttons |
| 4.4 | §4.2 | Throw 5 m to 50 m, persistence presets, chopper comparison of smear vs blanking | target | code-built. Transition is the continuous angle plus the azimuth step at the beat | `Cyclorama.tsx` |
| 4.5 | §4.3 | Phase portrait with +/- 3.5 deg kick at peak velocity, and spiral on brake or power cut | target | code-built from samples. The kick is at center because that is where speed peaks. Decay appears when damping exceeds drive | `Timegrapher.tsx` |
| 4.6 | §4.3 | Timegrapher strip with 44 deg lift and 2.1 ms unlock | target | conflict-visible. Strip shows theta, blank band, and beat ticks. 44 deg and 2.1 ms are labeled source claims | pane 3 legend |
| 4.7 | §4.4 | DMX 1 torque maps 0 to 100 percent onto 0 to +/- 18 deg without changing frequency | target | assumption. Energy-balance scale is editable. Frequency is set by K and I, not by the torque fader | pane 4 |
| 4.8 | §4.4 | DMX 2 curb, DMX 3 brake, DMX 4 intensity | target | code-built with the assumptions in rows 2.6, 2.10 | faders |
| 4.9 | §4.4 | Power cut unwinds the spring in 15 s into a dead-center pinspot | target | conflict-visible. Two labeled policies. Linear ramp is an assumption. Q 350 does not stop at 15 s (about 34 percent of a free linear amplitude remains). Rest radius is `D tan(15 deg)` | power and decay tests |
| 4.10 | §4.4 | Sliders for Z in 12..24, thickness 0.25..1.60 mm, three material presets, facets 1..6 | target | code-built. Tooth and facet counts change indexing and drawing. Thickness and material do not change K. Resin/PETG share one source preset and are labeled as not one fatigue model | CAD and stiffness tests |
| 4.11 | §4.4 | Export parametric OpenSCAD and DXF | target | code-built, tested. Illustrative only. Not manufacturing-approved | `tests/model.test.ts` CAD case |

## 5. Deliverables in the source

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| 5.1 | §5.1 | Modular Vite + React + TypeScript scaffold | target | code-built | repository layout |
| 5.2 | §5.2 | No placeholders or TODO stubs | target | code-built for this slice. Deferred work is documented, not rendered as dead controls | source search |
| 5.3 | §5.3 | BPM tap computes the exact curb position for 60 to 240 BPM | target | code-built with explicit subdivision and reachability. Unreachable tempos are not clamped and are not called exact | tempo tests |

## Authorization constraints for this prototype

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| A.1 | Current decisions | Keep 4 to 20 Hz, 56 mm bore, any orientation, and 0.25 mm shift as targets | target | visible. Not simulated as a suspension result | status `frequency-target`, `bore` |
| A.2 | Current decisions | Original K and I formulas stay intact | target | code-built, tested | endpoint test |
| A.3 | Current decisions | Optional I and K controls with explicit assumptions | assumption | code-built. Prescribed mode and custom inertia | status kinds |
| A.4 | Current decisions | Do not claim multibody, contact, or 3D support from this oscillator | constraint | honored | decisions file |
| A.5 | Current decisions | Blanking, lift, ray count, power cut, and tempo conflicts stay visible | constraint | code-built | panes 2 to 4 |
| A.6 | Current decisions | Illustrative CAD or an honest deferral | choice | CAD implemented and labeled | export button |
| A.7 | QEXT-200 assessment | Do not advance the failed 20-blade specimen as a passing design | constraint | honored. It is not the drawn mechanism. Failure figures stay in the historical assessment | decisions file |
| A.8 | Topology audit | Published QUADRIVOT is precedent, not an ED-IBS validation | constraint | honored | `docs/historical/` |

## Stage preview

Added after Caleb asked for a live-environment view. The source specification did not require this room. It is a presentation of the current rays.

| ID | Source | Requirement | Class | State | Evidence |
| --- | --- | --- | --- | --- | --- |
| S.1 | 2026-11-08 approval | Audience view with floor, backdrop, fixture, and a person for scale | presentation | code-built, tested for scale and cameras | `tests/stage.test.ts`, stage screenshots |
| S.2 | Same | Side and fixture cameras | presentation | code-built | camera buttons |
| S.3 | Same | Beams follow current throw, angle, blanking, and intensity | target | code-built, tested. No extra rays | `liveBeams` |
| S.4 | Same | Afterglow is time accumulation | assumption | code-built, tested | `nextTrail` |
| S.5 | Same | Haze and brightness are not photometry or a safety rating | constraint | disclosed on the stage view | `STAGE_COPY` |
| S.6 | Same | Engineering panes and controls remain | target | code-built. Stage and Engineering are modes of one simulator | header tabs |

## Deferred, not faked

- Dynamic pallet, escape wheel, and rotor as separate bodies.
- Contact, lock, drop, and jewel geometry.
- Nonlinear flexure, gravity shift, bore clearance, and any-orientation support.
- A real curb-actuator calibration onto 4 to 20 Hz.
- Dispersion raytracing and a radiometric haze model.
- A GPU persistence shader.
- Manufacturing-approved drawings, fatigue life, and experimental timekeeping.
- Real DMX, laser, or actuator output.
