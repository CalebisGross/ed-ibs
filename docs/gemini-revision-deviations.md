# Gemini hardening revision: decisions and deviations ledger
Status: analysis only. Nothing below is resolved until Caleb decides. Sources: blueprints PDF, build manual PDF, gemini-hardening/conversation.md. Details: hardware-docs-review.md.
States: OPEN = needs Caleb, INTERNAL = docs disagree with each other, PHYSICS = calculated problem.

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

| # | Item | Approved ledger / original spec | Gemini package | Type | Resolution |
|---|------|------|------|------|------|
| 1 | D-01 Beat frequency | 4-20 Hz target (source law 8.0-11.6 Hz) | 1-60 Hz DMX setpoint | OPEN | pending |
| 2 | D-02 Clear bore | 56 mm unobstructed | 28.2 carrier bore, 35 bearing ID, 47.05 cage ID | OPEN | pending |
| 3 | D-03 Amplitude | +/-18 deg | +/-12 deg travel limit | OPEN | pending |
| 4 | D-04 Blade thickness | min 0.25 mm | 0.18 mm | OPEN | pending |
| 5 | D-05 Tuning | 18-8.5 mm active length, ~9.5 mm stroke | fixed 12 mm span, 10 mm trim actuator, linkage undefined | OPEN | pending |
| 6 | D-06 DMX | 4 channels | 8 channels; freq on ch1 (blueprint) vs ch3 (manual) | OPEN+INTERNAL | pending |
| 7 | D-07 Prism motion | oscillating balance + indexing | ED-07 on 6807 bearings "rotation 1-60 Hz" and in flexure cage | INTERNAL | pending |
| 8 | D-08 ED-04 envelope | - | 68/52 (blueprint) vs 85 OD/30 ID (manual); 12 mm span in 5 mm annulus; SCAD blades cross bore; 5 vs 6 mm separation | INTERNAL | pending |
| 9 | D-09 Hard stop gap | - | 0.05 mm (conversation) vs 0.08 mm (docs) | INTERNAL | pending |
| 10 | D-10 ED-05 geometry | Z=15, 2 beats/tooth | OD 14.8 vs m0.45 PD 6.75; root dia vs radius; spokes cut root; "15 beats/rev" | INTERNAL | pending |
| 11 | D-11 ED-03 | - | pockets 7 vs 10 mm; 7 pockets vs 10 bearings; 130 mm plate vs 102 tube ID | INTERNAL | pending |
| 12 | D-12 Remontoire torque | - | ribbon ~4.5e-5 N m @45 deg vs 0.12 N m nominal | PHYSICS | pending |
| 13 | D-13 Prism fit | - | 35.4 mm diagonal vs 28.2 mm bore | PHYSICS | pending |
| 14 | D-14 Stiffness vs freq | - | ~0.074 N m/rad -> ~2.3 Hz with SS carrier, ~11.9 Hz prism only; 60 Hz needs ~50 N m/rad | PHYSICS | pending |
| 15 | D-15 Divergence | - | <0.25 mrad from 150 W COB unreachable | PHYSICS | pending |
| 16 | D-16 Hardware certs | sim only | proof load, IP54, Class 3R, rigging | OUT OF SCOPE | not validated by this project |

## Nov 15 2026 update
Caleb (via Jeph): decide case by case and show him each conflict. DMX channel count is open, built to what the system needs. Repo: CalebisGross/ed-ibs exists and is public, with docs/, sim/, hardware/, and firmware/. The earlier note that the repository was private, and that the move waited until someone confirmed it existed, is stale.
Recommendations sent to Caleb via Jeph (awaiting his picks):
1 (D-01) keep 4-20 Hz, DMX capped to modeled range | 2 (D-02) keep 56 mm bore | 3 (D-03) +/-18 deg, stops just beyond after stress check | 4 (D-04) keep 0.25 mm min | 5 (D-05) variable 18-8.5 mm driven by Gemini 10 mm stepper | 6 (D-06) needs-based merged DMX map | 7 (D-07) escape wheel steps prism on bearings, cage oscillates separately | 8 (D-08) redesign cage around 56 mm bore | 9 (D-09) 0.08 mm stop gap | 10 (D-10) regenerate ED-05 from m0.45 Z15 | 11 (D-11) 7 mm pockets, resize/relocate plate | 12 (D-12) resize ribbon for 0.12 N m | 13 (D-13) resolved by 56 mm bore | 14 (D-15) drop <0.25 mrad, show calculated | 15 (D-17) adopt touring hardware as modeled features | 16 (D-16) certs documented, not validated.

## Nov 15 2026 10:33 working decisions
Caleb (via Jeph, verbatim): "Whatever makes sense in the real world. Remember this is a brand new, bespoke, novel, and theoretical lighting fixture and we're brainstorming and working out the details. These are the first steps and we should be thoughtful and methodical but rooted in the reality of manufacturing and touring demands."
Interpretation (Jeph's read, adopted): items 1-16 recommendations are WORKING DECISIONS, not final. Deciding test where unclear: real-world manufacturability and touring demands. Each is revisable when analysis shows otherwise.
Status per item: 1-16 = WORKING (recommendation above). Assumptions to be stated per item as analysis lands.
Still open, visible: blanking 4.65 vs 2.2 ms (D-33); Q350 decay (D-34); 15 deg bias vs dead-center pinspot (D-35); impulse timing (zero velocity vs center crossing) (D-36); full suspension (0.25 mm gravity shift unpassed) (D-37).
Repo: CalebisGross/ed-ibs exists and is public. The hold until the repository was confirmed to exist is closed.

## Nov 15 2026 step 1 status (working-revision-step1.md, numbers in working-revision-step1.py)
Numbering below follows the table rows above. Note: recommendation numbers 14-16 in the Nov 15 update do not match table rows 14-16.
D-01. Beat frequency: WORKING. Modeled 8.00-11.46 Hz (spec law, ring only, +/-18 deg stress cap). 4-20 Hz unreachable by blades alone (needs 25:1 K, have 2.1:1); aux spring required, unproven. DMX capped to model. Caleb should know.
D-02. Clear bore: WORKING, feasible. 7075 carrier ID 56 on SKF 61813-2RZ (65x85x10) primary, Kaydon KA025 (63.5x76.2x6.35) light alt; 93 mm housing fits 102 mm tube ID.
D-03. Amplitude +/-18: WORKING. Stress hits 510 MPa at L 8.78 mm (527 MPa at 8.5); clamp L_min 8.78 or cap amplitude at short L.
D-04. Blade 0.25 min: WORKING. Spec Kbase implies b 3.35 mm at t 0.25.
D-05. Tuning 18-8.5: WORKING with 8.78 mm stress floor; 10 mm Gemini actuator covers 9.22 mm.
D-06. DMX: WORKING. 13-ch needs-based map drafted (16-bit intensity, freq, amplitude, phase; hold-to-actuate lock/control with interlocks). Sim only.
D-07. Prism motion: NEEDS CALEB. Indexed set 2.1-3.6e-4 kg m2 reflects to 14-24x balance ring; 12 deg step in blanking needs 8-62 N m vs 0.12. Options: release-only escapement + powered indexer (rec), beat-locked servo, continuous rotation + LED gating, accept smear.
D-08. ED-04 envelope: WORKING, not addressed in step 1. Item 7 arch keeps balance ring at its own Z station (56/72 ref ring).
D-09. Stop gap: WORKING, not addressed in step 1.
D-10. ED-05: WORKING, depends on item 7 (coaxial index ring vs offset wheel).
D-11. ED-03: WORKING. Arbors at r 36-39 mm collide with 85 mm bearing housing; train must move outward.
D-12. Remontoire: WORKING, sized. Nivaflex 0.40x7.0x~54 mm unpreloaded (+/-4.4% per +/-2 deg) or pre-wound 0.30x12.1x~670 mm (+/-0.26%, rec). 0.12 N m itself undetermined: escapement alone needs ~7e-4 to 1.4e-3 N m; final torque depends on item 7.
D-13. Prism fit: RESOLVED geometrically (35.36 diag, 10.32 mm radial room). Beam vs 25 mm aperture moves to optics step; prism length 106.1 (Gemini) vs 103.18/105.68 (Edmund) to confirm (D-31).
D-14. Stiffness vs freq: superseded by item 1/(d) numbers.
D-15. Divergence: WORKING, not addressed in step 1.
D-16. Certs: unchanged, not validated.
D-38. Contact-seal (2RS) bearings excluded: estimated drag comparable to whole drive torque.

## Nov 15 2026 11:01 CT item 7 update
D-07. Prism motion: WORKING = spring-indexer blend (Caleb liked it in chat today). Balance + escapement are master clock and release each 12 deg step; spring cam/Geneva indexer powers the step; small motor rewinds the spring (remontoire); encoder supervises and can re-home. Not yet sized (next: release load on balance, indexer spring, rewind torque, blanking).
Tourbillon (cage rotating about optical axis): UNDER EVALUATION, not adopted. See tourbillon-feasibility.md / .py / -results.txt. First pass [C]: feasible with conditions as a slow motor-driven carousel (balance + escapement on a 7075 cage on 2x 61813, ~342 g, I ~4.6e-4), indexer and prism stationary, mechanical-only (no slip ring fits: 60 mm bore rings are 135 mm OD). True escapement-driven tourbillon fails timing at 1 rev/min, marginal near 1 rev/5 min. Classic gravity-averaging benefit mostly does not apply to the flexure balance. Cage passes 0.25 mm on bearings (~15 um); balance suspension inside it still unresolved. Pattern precesses at -cage rate (6 deg/s at 1 rpm). Decisions pending Caleb: tourbillon vs carousel, precession feature or not, mechanical push-ring vs optical/electric release, option vs commit.

## Nov 15 2026 11:42 CT item 7 blend sizing
Caleb's widget answers (Nov 15 2026, 11:19 CT), verbatim:
- D-18. Cage type: Carousel
- D-19. Star pattern rotation: Rotation is a feature with DMX rate and park
- Release across the rotating cage (answered by D-20): Size both options first
- Next step: Keep the cage optional and size the item 7 blend next

Item 7 sizing done. See item7-blend-sizing.md / .py / -results.txt. Nothing is validated, and all numbers are [C] predictions on [T] assumptions and [S] catalog data.
- Release budget, working target [T]: 10% of the balance's per-beat loss = 4.9e-6 J (8.00 Hz) to 1.0e-5 J (11.46 Hz). Take it centred on the zero crossing or from the escape wheel during impulse. A one-sided trip costs 19 s/day at 6 deg amplitude [C].
- Mechanical, fixed balance: fits only through a 3-stage sear cascade [C]. Mechanical, carousel push ring: FAILS, 7.5-30x over budget [C].
- Electric (optical sensor + voice-coil latch, predictive firing): fits both builds. RECOMMENDED as the baseline. Story becomes "the watch times it, a sensor releases it". Pending Caleb.
- Indexer: no Geneva (jerk spike at pin entry, start/stop driver). The single-turn spring cam is rejected (0.31-0.54 J lost per step). WORKING proposal: a spring-swing indexer with a cam-notch lock and a continuous phase-locked motor arm. At 15 ms: k 21.7 / 12.5 N m/rad, cocked torque 1.78 / 1.03 N m, latch 45 / 26 N (baseline / light carrier) [C].
- Rewind motor: DCX 22 S 24 V kept. Gearhead changes from 16:1 2-stage to GPX 22 HP 150-186:1 3-stage, at 4.8-6.8 W baseline or 2.6-3.7 W light [C, S]. D-30. Gearhead backlash 1.2 deg [S] against a torque that reverses every beat is OPEN.
- Dark time at a 15 ms step: 26-41% across 8.00-11.46 Hz [C]. The 16-23 Hz chop is below flicker fusion, so it reads as flicker.
- Power cut: the cocked spring holds 1 step. The spec's 15 s spiral-down becomes a powered DMX effect, because on a real mains loss the COB is dark too.
- New risk: stationary-indexer reaction torque gives 0.18-0.20 ms beat error on a light rig (Gemini target 0.15 ms) [C, rough].
- DMX: 15 channels proposed. Step-1 1-13 kept; ch 8-9 becomes pattern azimuth (parked cage angle); ch 13 adds cage re-home; new ch 14 carousel rate/park and ch 15 indexer mode. LOCK requires the cage parked at home and the indexer latched.

D-12. Escapement remontoire torque: UPDATED. It now drives only the escapement plus the trip share. Need: 2.8e-3 N m nominal max (11.46 Hz, x2 headroom), clutch 4.2e-3 N m [C]. Gemini's 0.12 N m is 42x too high. Ribbon: Nivaflex 0.08 x 4.0 x about 177 mm, pre-wound 2 turns + 45 deg band [C]. This replaces step 1's sizing for the 0.12 N m Gemini number. Gemini's 0.08 x 1.2 section maxes at 1.28e-3 N m (30% of clutch).
Carousel conflict: with the cage parked, the cage remontoire isn't wound. It runs about 0.3-0.9 s in band, 6-18 s total [C]. Park needs a driven winding ring or must stay short. Decision pending Caleb.

## Nov 15 2026 11:44 CT Caleb item 7 decisions (his widget answers, verbatim)
D-20. Release method: Electric release
D-21. Step time: 15 ms step
D-22. Prism carrier: Light carrier
D-23. 15 s power-cut decay: Powered DMX decay effect
D-24. Carousel park: Add a driven winding ring
D-32. Visible flicker from stepping: Flicker is a flaw to reduce
Status: item 7 = spring-swing indexer with cam-notch lock, stationary optical sensor plus voice-coil latch release (next coil size up), 15 ms step, light carrier; carousel optional with driven winding ring; 15 s decay is a powered DMX effect. Flicker reduction is an open design task (superseded by the 12:03 and 12:10 CT sections below). All values remain calculated predictions, not validated.

## Nov 15 2026 12:03 CT flicker reduction study (flicker-study.md / .py / -results.txt)
Trigger: Caleb's 11:44 CT answer "Flicker is a flaw to reduce". Analysis only, nothing validated. Tags as in the study.
- Baseline (settled item 7, 15 ms step, light carrier): 26.1% / 39.4% full-dark at 8.00 / 11.46 Hz, Mod 100% at 16-23 Hz, Pst LM 118-131, SVM 6.1-7.3, IEEE 1789 low-risk allows 0.40-0.57% [C, S limits]. The chop sits in the 15-25 Hz photosensitive band [S Fisher 2005]. Risk flag only, no safety claim.
- NEW finding, timing B: fire the step centred on the beam's crossing of the pattern centre (theta = -7.5 deg) instead of the balance zero crossing. Peak smear drops from 2.8 m to 0.36-0.55 m at 50 m [C]. With beam divergence at least 2.4 deg (0.25-spot tolerance [T]), no blanking is needed at full amplitude: 0% dark, Pst 0 [C]. Needs amplitude at least 8.3 / 9.2 deg [C]. Costs: arm speed profile (about 1.4 N m extra at the arm, rough) and an off-centre reaction drain (about 22 mdeg per beat on a light rig, rough). PROPOSED as the new ch 15 default with zero-crossing fallback. Pending Caleb.
- Smear-tolerant partial blanking (timing A, 3 deg beam): 12-18% dark, Pst 56-58 [C]. Fades alone change nothing. Faster steps: 10 ms strains the latch (56 N), 7 ms puts the motor and gearhead over, and at 5 ms the latch opens in 8.3 ms [C]. Keep 15 ms. Dual path: does not fit (168-186 mm vs 102 mm tube), and 0.7% path mismatch already gives Pst 1 [C]. Continuous rotation plus strobe: 72-96% dark [C]. Rejected. No blank: streak at 47-49% of spoke exposure [C], a look not a default. Dip: Pst 1 needs the floor at about 98% [C].
- LED: Gemini package names no LED driver [S BP/MAN]. Recommend a constant-current shunt-FET driver, PWM at 25 kHz or above [S TI]. PWM does not fix the beat-rate chop. Lit-time boost up to 1.46x within the CLU048 4.14 A DC rating [S] holding 150 W average. Revises item 7's "can't drive harder"; thermal unchecked.
- Flagged: item 7 spring table lists Nivaflex at t 1.5-2.0 mm, but strip is cited only up to 0.70 mm [S step 1]. Use the carbon-steel column.
- Honest limit: beat-rate modulation is eliminated only with timing B, a wide beam and amplitude above about 9-10 deg. Otherwise it is reduced, not removed.
- Decisions pending Caleb: timing B default; beam divergence target (item 15); smear tolerance; full blank vs dip (DMX blank depth); LED driver plus boost; keep 15 ms; drop dual path and strobe; keep Raw Smear mode.

## 2026-11-15 12:10 CT: Caleb's flicker decisions (verbatim widget answers)

- D-25. Step timing default: "Step at pattern centre, zero crossing as fallback"
- D-15. Beam divergence target: "At least 2.4° (no flicker)"
- D-26. Smear tolerance before blanking: "Decide with a look test" (quarter spot width stays a placeholder until then, not a decision)
- D-27. Any blanking that remains: "DMX blank depth control"
- D-28. LED driver: "Constant current, fast PWM, lit-time boost" (junction temperature effect still unchecked)
- D-21. Step speed and dropped options: "Revisit" (scope being clarified with Caleb; 15 ms, dual path and strobe all stay open, none dropped yet)
- D-29. Raw Smear DMX look: "No, drop it"

Status: working decisions, design targets only. Nothing here is validated or a photosensitivity safety finding.

## Nov 15 2026 hardware PDF conflicts from #16 (owner picks)

Caleb on Nov 15 2026 (issue #16): square versus round chassis stays OPEN; the other four items are WORKING doc cleanups. Verification against the PDFs is in `docs/reviews/hardware-docs-vs-spec.md` section "Additional conflicts from #16". Sources are BP = `ed-ibs-blueprints-bom-gcode-openscad.pdf` and MAN = `ed-ibs-build-manufacturing-service-manual.pdf`. No derived BOM or CAD files exist in the repo yet, so the cleanups live in the decision record. The source PDFs are not edited.

- D-39. Chassis envelope: OPEN. BP p1 square 150.00 x 150.00 mm profile versus MAN p1 round OD 120.00 mm x wall 10.00 mm tube. Affects housing and packaging of the nominal 56 mm clear through-bore [T D-02]. No choice made.
- D-40. ED-03 arbor bearing pockets: WORKING. Adopt Dia 7.00 mm H7 pockets matching BOM HR-02 bearings 3 mm ID x 7 mm OD x 3 mm W [S BP p2-p3]. Reject the MAN p3 10.00 mm pocket sizing for those arbors. Pocket count cannot be reconciled from the PDFs: BP p3 and BP p4 list 4 arbor pockets at 7.00 mm; MAN p3 Op 20 and the ED-03 press-fit step say 7 pockets / 7 bearings; BOM HR-02 qty is 10. Count stays flagged, not invented.
- D-41. ED-10 yoke: WORKING. Add a BOM line for the 20.00 mm top mounting block alongside the 6.00 mm side plates [S MAN p7-p8]. BP p2 currently lists only 6 mm plate. Manufacturing note from Jason (@jkbennitt): nearest stock is inch plate (about 0.25 in / 0.75 in). No size change decided.
- D-42. ED-05 crest vertex: WORKING. BP p4 OpenSCAD uses `outer_r = 7.40` and crest `[outer_r + 0.15, 1.35]`, which sits outside Dia 14.80 mm on BP p3 (radial distance about 7.67 mm [C]). Clip the crest to the OD in derived CAD or notes. Do not edit the PDF.
- D-43. Side access hatches: WORKING. Add BOM placeholder part ID ED-11 for the removable side access hatches called out on MAN p1 Op 30, MAN p16, and MAN p19, missing from BP p2. Material, thickness, and quantity are OPEN sub-items (unspecified in the PDFs; do not invent values).

## 2026-11-15 viewer

The cinematic stage, quality tiers, see-why panels, and replay scrubber are a simulator presentation. The Decision index above is unchanged: no ID was added and no status moved. Scene dimensions come from the existing solver constants and the open envelopes already recorded here. They are not hardware measurements. Exploded view stays D-39 OPEN. Ray-trace stays D-35 OPEN. A decision-ID map is not part of this view. A later look pass changed beam display, camera framing, and the see-why grid. It did not add an ID and it did not move a status. The low tier skips shadows, haze, SSAO, and depth of field, and also skips the room shell and the environment map. Depth of field stays on the escapement macro preset. The phase legend sits under the plot. No brass part is assigned.
