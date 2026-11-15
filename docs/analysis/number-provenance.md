# Number provenance (solver and UI defaults)

Date: 2026-11-15. Check for issue #10 item 1. Findings only. No solver constants were changed here.

This table traces every figure in `sim/src/physics/` and the related UI defaults back to `docs/user-specification.md`, a PDF in `hardware/source-documents/`, a derivation in `docs/analysis/`, or none. Status is one of: sourced, derived, unsourced, conflicting. Conflicting means the number appears in more than one place with incompatible meaning, or the source claim disagrees with the measured or calculated result the code actually uses. Tags on each row: **[T]** target or chosen assumption, **[C]** calculated, **[S]** cited source. Nothing here is hardware-validated. Do not read this as a safety claim.

Known OPEN decision IDs that already cover several conflicts: D-33 blanking duration, D-34 hold-Q decay, D-35 optical bias versus pinspot, D-36 impulse timing, D-37 gravity-shift target. Status tokens are not changed by this note.

## Key figures

| Name | Value | Code | Source | Tag | Status |
| --- | --- | --- | --- | --- | --- |
| RK4 step `DT_S` | 0.00025 s (0.25 ms) | `sim/src/physics/constants.ts:7` | user-specification §2 header | [S] | sourced |
| Balance mass | 0.042 kg | `constants.ts:9` | user-specification §2.A.1 | [S] | sourced |
| Outer radius | 0.036 m | `constants.ts:10` | user-specification §2.A.1 | [S] | sourced |
| Inner radius | 0.028 m | `constants.ts:11` | user-specification §2.A.1 | [S] | sourced |
| Annulus inertia | 4.368e-5 kg m^2 | `constants.ts:12` | formula from §2.A.1; spec cites about 4.37e-5 | [C] | derived |
| Base stiffness `K_base` | 0.1104 N m/rad | `constants.ts:14` | user-specification §2.A.2 | [S] | sourced |
| Leaf length `L0` | 0.018 m | `constants.ts:15` | user-specification §2.A.2 | [S] | sourced |
| Leaf length `L_min` | 0.0085 m | `constants.ts:16` | user-specification §2.A.2 | [S] | sourced |
| Q factor | 350 | `constants.ts:18`, `settings.ts:81` | user-specification §2.A.3 (Q about 350) | [S] | conflicting |
| Lift half-angle | 3.5 deg | `constants.ts:19`, `settings.ts:84` | user-specification §2.A.3 | [S] | conflicting |
| Blank half-angle | 2.1 deg | `constants.ts:20`, `settings.ts:85` | user-specification §2.B.2 | [S] | conflicting |
| Facet tilt `Phi0` | 15 deg | `constants.ts:21`, hardcoded in `useSimulator.ts:90` | user-specification §3.2 | [S] | conflicting |
| Amplitude target | 18 deg | `constants.ts:22`, `settings.ts:83` | user-specification §4 DMX Ch 1 | [S] | sourced |
| Endurance flag | 510 MPa | `constants.ts:23` | user-specification §2.C | [S] | sourced |
| Ti Young modulus | 114 GPa | `constants.ts:24` | user-specification §2.A.2 | [S] | sourced |
| Tooth count | 15 | `constants.ts:25`, `settings.ts:72` | user-specification §2; blueprints PDF p2 ED-05 | [S] | sourced |
| Facet count | 3 | `constants.ts:26`, `settings.ts:73` | user-specification §3.2 | [S] | sourced |
| Leaf count | 4 | `constants.ts:27`, `settings.ts:95` | user-specification §2.A.2 | [S] | sourced |
| Bore diameter | 56 mm | `constants.ts:28` | retained target / analysis; not in user-specification | [T] | sourced |
| Gravity shift target | 0.25 mm | `constants.ts:29` | retained target; not in user-specification | [T] | conflicting |
| Frequency band claim | 4 to 20 Hz | `constants.ts:32`, `settings.ts:88-89` | user-specification §4 DMX Ch 2 | [S] | conflicting |
| Base frequency claim | 8.0 Hz | `constants.ts:33` | user-specification §2.A.2; matches K/I about 8.001 Hz | [S] | sourced |
| Beats per second claim | 16 | `constants.ts:34` | user-specification §2.A.2 (2 times f0) | [S] | sourced |
| Blank duration claim | 2.2 ms | `constants.ts:35` | user-specification §2.B.2 / §4 | [S] | conflicting |
| Unlock display claim | 2.1 ms | `constants.ts:36` | user-specification §4 pane 3 | [S] | conflicting |
| Timegrapher lift claim | 44 deg | `constants.ts:37` | user-specification §4 pane 3 | [S] | conflicting |
| Simultaneous beams claim | 45 | `constants.ts:38` | user-specification §4 pane 1 | [S] | conflicting |
| Unwind time | 15 s | `constants.ts:39`, `settings.ts:92` | user-specification §4 power-cut | [S] | conflicting |
| Dead-center pinspot claim | true | `constants.ts:40` | user-specification §4 power-cut | [S] | conflicting |
| FPS band claim | 60 to 120 | `constants.ts:41` | user-specification §1 | [S] | sourced |
| Cyan wavelength | 488 nm | `constants.ts:45` | user-specification §3.1 | [S] | sourced |
| Magenta wavelengths | 638 nm + 450 nm | `constants.ts:46` | user-specification §3.1 | [S] | sourced |
| Gold wavelength | 577 nm | `constants.ts:47` | user-specification §3.1 | [S] | sourced |
| 17-4 PH modulus | 197 GPa | `constants.ts:60` | none; code calls it illustrative | [T] | unsourced |
| Resin / PETG modulus | 2.0 GPa | `constants.ts:66` | none; illustrative stand-in | [T] | unsourced |

## Derived formulas (code)

| Name | Value / form | Code | Source | Tag | Status |
| --- | --- | --- | --- | --- | --- |
| Reference stiffness | K = 0.1104 * (0.018 / L) | `referenceModel.ts:10-12` | user-specification §2.A.2 | [S] | sourced |
| Natural frequency | sqrt(K/I) / (2 pi) | `referenceModel.ts:15-17` | user-specification §2.A.2 | [C] | derived |
| Viscous c for Q | c = sqrt(K I) / Q | `referenceModel.ts:38-40` | implied by Q in §2.A.3 | [C] | derived |
| Energy-balance torque | tau = pi K A^2 / (4 Q liftHalf) | `referenceModel.ts:52-60` | decisions Prototype assumptions #2; not in user-specification as this formula | [T] | derived |
| Bending stress | sigma = E t \|theta\| / (2 L) | `referenceModel.ts:67-74` | user-specification §2.C | [S] | sourced |
| Harmonic blank duration | 2 asin(blank/A) / omega | `referenceModel.ts:83-90` | spec-audit / analysis derivation | [C] | derived |
| Mechanical step | pi / Z | `referenceModel.ts:93-94` | user-specification §2.B.1 (12 deg at Z=15) | [C] | derived |
| Optical step | 2 pi / Z | `referenceModel.ts:97-98` | user-specification §2.B.1 Dove 2x | [C] | derived |
| Instantaneous rays | facets * 3 | `referenceModel.ts:105-106` | facets times channels | [C] | derived |
| Linear decay ratio | exp(-omega0 t / (2 Q)) | `powerCut.ts:74-77` | linear oscillator; analysis e-fold notes | [C] | derived |
| Linear unwind fraction | 1 - elapsed / unwindSeconds | `powerCut.ts:48-52` | decisions assumption #8 | [T] | derived |
| Musical tempo map | f = (BPM * subdivision) / 120 | `tempo.ts:19-26` | decisions assumption #10 | [T] | derived |

## UI and runtime defaults without a physics source

| Name | Value | Code | Source | Tag | Status |
| --- | --- | --- | --- | --- | --- |
| DMX torque fader | 0.75 | `settings.ts:68` | none | [T] | unsourced |
| DMX intensity fader | 0.85 | `settings.ts:71` | none | [T] | unsourced |
| Blade thickness default | 0.25 mm | `settings.ts:74` | user-specification §4 min; PDF blade 0.18 mm | [S] | conflicting |
| Leaf width | 6 mm | `settings.ts:75` | none; K_base at t=0.25 mm implies about 3.347 mm | [T] | unsourced |
| Throw default | 12 m | `settings.ts:77` | none; range 5 to 50 m is in §4 | [T] | unsourced |
| Persistence | 60 ms | `settings.ts:78` | user-specification §4 pane 2 | [S] | sourced |
| Brake Q floor | 20 | `settings.ts:82` | none | [T] | unsourced |
| Unlock peak angle | 3.5 deg | `settings.ts:86` | user-specification §2.B.1 | [S] | sourced |
| Startup angle | 12 deg | `settings.ts:90` | none | [T] | unsourced |
| Startup omega | 0 | `settings.ts:91` | none | [T] | unsourced |
| Tempo subdivision | 8 | `settings.ts:93` | none; pairs with 120 BPM to hit 8 Hz | [T] | unsourced |
| Target BPM | 120 | `settings.ts:94` | none; inside §5 60 to 240 ask | [T] | unsourced |
| omegaEpsilon | 1e-6 rad/s | `settings.ts:97` | none; directional-drive gate | [T] | unsourced |
| Ring axial | 4 mm | `settings.ts:98` | none; CAD only | [T] | unsourced |
| Haze display | 0.7 | `settings.ts:100` | none | [T] | unsourced |
| Wall dt clamp | 0.05 s | `useSimulator.ts:100-101` | none | [T] | unsourced |
| Max catch-up steps | 8000 | `useSimulator.ts:109` | none | [T] | unsourced |
| Tap interval filter | under 4000 ms | `tempo.ts:30` | none | [T] | unsourced |

## Conflict notes (short)

1. **D-33 blanking.** Angle window +/- 2.1 deg is sourced. Duration claim 2.2 ms is not what the harmonic window or the solver measures at +/- 18 deg and about 8 Hz (about 4.652 ms [C]). Unlock display 2.1 ms reuses the same digits as the blank angle.
2. **D-34 Q and unwind.** Q about 350 and 15 s unwind are both sourced. Free linear decay leaves about 34 percent of amplitude at 15 s [C]. Motion does not stop.
3. **D-35 facet tilt.** Phi0 = 15 deg is sourced. Dead-center pinspot is also sourced. Rest wall radius is D * tan(15 deg), not center.
4. **D-36 impulse.** Spec wants a zero-velocity impulse inside +/- 3.5 deg. Code uses `directional-lift-zone-drive` while `|omega| > omegaEpsilon`. The epsilon itself is unsourced.
5. **Frequency band.** Spec and UI claim 4 to 20 Hz. Original K law at reference inertia reaches about 8.001 to 11.644 Hz [C]. Blueprints PDF p1 claims 1.0 to 60.0 Hz.
6. **45 beams versus 9 rays.** Spec wording versus facets * channels.
7. **44 deg timegrapher lift** is not converted into the +/- 3.5 deg balance zone.
8. **Blade 0.25 mm versus PDF 0.18 mm.** Covered by D-04 (working choice keeps 0.25 mm).
9. **Bore 56 mm versus PDF carrier / 6807 geometry.** Covered by D-02 as a layout prediction; PDF pages disagree with the working target.
10. **Gravity shift 0.25 mm.** Retained target, unpassed (D-37).

## Cheap constant lock

`sim/tests/provenance.test.ts` asserts the key sourced constants and defaults still match this table. It does not change solver behavior.
