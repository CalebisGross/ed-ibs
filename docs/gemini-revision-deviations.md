# Gemini hardening revision: decisions and deviations ledger
Status: analysis only. Nothing below is resolved until Caleb decides. Sources: blueprints PDF, build manual PDF, gemini-hardening/conversation.md. Details: hardware-docs-review.md.
States: OPEN = needs Caleb, INTERNAL = docs disagree with each other, PHYSICS = calculated problem.

| # | Item | Approved ledger / original spec | Gemini package | Type | Resolution |
|---|------|------|------|------|------|
| 1 | Beat frequency | 4-20 Hz target (source law 8.0-11.6 Hz) | 1-60 Hz DMX setpoint | OPEN | pending |
| 2 | Clear bore | 56 mm unobstructed | 28.2 carrier bore, 35 bearing ID, 47.05 cage ID | OPEN | pending |
| 3 | Amplitude | +/-18 deg | +/-12 deg travel limit | OPEN | pending |
| 4 | Blade thickness | min 0.25 mm | 0.18 mm | OPEN | pending |
| 5 | Tuning | 18-8.5 mm active length, ~9.5 mm stroke | fixed 12 mm span, 10 mm trim actuator, linkage undefined | OPEN | pending |
| 6 | DMX | 4 channels | 8 channels; freq on ch1 (blueprint) vs ch3 (manual) | OPEN+INTERNAL | pending |
| 7 | Prism motion | oscillating balance + indexing | ED-07 on 6807 bearings "rotation 1-60 Hz" and in flexure cage | INTERNAL | pending |
| 8 | ED-04 envelope | - | 68/52 (blueprint) vs 85 OD/30 ID (manual); 12 mm span in 5 mm annulus; SCAD blades cross bore; 5 vs 6 mm separation | INTERNAL | pending |
| 9 | Hard stop gap | - | 0.05 mm (conversation) vs 0.08 mm (docs) | INTERNAL | pending |
| 10 | ED-05 geometry | Z=15, 2 beats/tooth | OD 14.8 vs m0.45 PD 6.75; root dia vs radius; spokes cut root; "15 beats/rev" | INTERNAL | pending |
| 11 | ED-03 | - | pockets 7 vs 10 mm; 7 pockets vs 10 bearings; 130 mm plate vs 102 tube ID | INTERNAL | pending |
| 12 | Remontoire torque | - | ribbon ~4.5e-5 N m @45 deg vs 0.12 N m nominal | PHYSICS | pending |
| 13 | Prism fit | - | 35.4 mm diagonal vs 28.2 mm bore | PHYSICS | pending |
| 14 | Stiffness vs freq | - | ~0.074 N m/rad -> ~2.3 Hz with SS carrier, ~11.9 Hz prism only; 60 Hz needs ~50 N m/rad | PHYSICS | pending |
| 15 | Divergence | - | <0.25 mrad from 150 W COB unreachable | PHYSICS | pending |
| 16 | Hardware certs | sim only | proof load, IP54, Class 3R, rigging | OUT OF SCOPE | not validated by this project |

## Nov 15 2026 update
Caleb (via Jeph): decide case by case and show him each conflict. DMX channel count is open, built to what the system needs. Repo: private CalebisGross/ed-ibs with docs/sim/hardware/firmware, move code once Jeph confirms it exists.
Recommendations sent to Caleb via Jeph (awaiting his picks):
1 keep 4-20 Hz, DMX capped to modeled range | 2 keep 56 mm bore | 3 +/-18 deg, stops just beyond after stress check | 4 keep 0.25 mm min | 5 variable 18-8.5 mm driven by Gemini 10 mm stepper | 6 needs-based merged DMX map | 7 escape wheel steps prism on bearings, cage oscillates separately | 8 redesign cage around 56 mm bore | 9 0.08 mm stop gap | 10 regenerate ED-05 from m0.45 Z15 | 11 7 mm pockets, resize/relocate plate | 12 resize ribbon for 0.12 N m | 13 resolved by 56 mm bore | 14 drop <0.25 mrad, show calculated | 15 adopt touring hardware as modeled features | 16 certs documented, not validated.

## Nov 15 2026 10:33 working decisions
Caleb (via Jeph, verbatim): "Whatever makes sense in the real world. Remember this is a brand new, bespoke, novel, and theoretical lighting fixture and we're brainstorming and working out the details. These are the first steps and we should be thoughtful and methodical but rooted in the reality of manufacturing and touring demands."
Interpretation (Jeph's read, adopted): items 1-16 recommendations are WORKING DECISIONS, not final. Deciding test where unclear: real-world manufacturability and touring demands. Each is revisable when analysis shows otherwise.
Status per item: 1-16 = WORKING (recommendation above). Assumptions to be stated per item as analysis lands.
Still open, visible: blanking 4.65 vs 2.2 ms; Q350 decay; 15 deg bias vs dead-center pinspot; impulse timing (zero velocity vs center crossing); full suspension (0.25 mm gravity shift unpassed).
Repo move: on hold until Jeph confirms CalebisGross/ed-ibs exists.

## Nov 15 2026 step 1 status (working-revision-step1.md, numbers in working-revision-step1.py)
Numbering below follows the table rows above. Note: recommendation numbers 14-16 in the Nov 15 update do not match table rows 14-16.
1 Beat frequency: WORKING. Modeled 8.00-11.46 Hz (spec law, ring only, +/-18 deg stress cap). 4-20 Hz unreachable by blades alone (needs 25:1 K, have 2.1:1); aux spring required, unproven. DMX capped to model. Caleb should know.
2 Clear bore: WORKING, feasible. 7075 carrier ID 56 on SKF 61813-2RZ (65x85x10) primary, Kaydon KA025 (63.5x76.2x6.35) light alt; 93 mm housing fits 102 mm tube ID.
3 Amplitude +/-18: WORKING. Stress hits 510 MPa at L 8.78 mm (527 MPa at 8.5); clamp L_min 8.78 or cap amplitude at short L.
4 Blade 0.25 min: WORKING. Spec Kbase implies b 3.35 mm at t 0.25.
5 Tuning 18-8.5: WORKING with 8.78 mm stress floor; 10 mm Gemini actuator covers 9.22 mm.
6 DMX: WORKING. 13-ch needs-based map drafted (16-bit intensity, freq, amplitude, phase; hold-to-actuate lock/control with interlocks). Sim only.
7 Prism motion: NEEDS CALEB. Indexed set 2.1-3.6e-4 kg m2 reflects to 14-24x balance ring; 12 deg step in blanking needs 8-62 N m vs 0.12. Options: release-only escapement + powered indexer (rec), beat-locked servo, continuous rotation + LED gating, accept smear.
8 ED-04 envelope: WORKING, not addressed in step 1. Item 7 arch keeps balance ring at its own Z station (56/72 ref ring).
9 Stop gap: WORKING, not addressed in step 1.
10 ED-05: WORKING, depends on item 7 (coaxial index ring vs offset wheel).
11 ED-03: WORKING. Arbors at r 36-39 mm collide with 85 mm bearing housing; train must move outward.
12 Remontoire: WORKING, sized. Nivaflex 0.40x7.0x~54 mm unpreloaded (+/-4.4% per +/-2 deg) or pre-wound 0.30x12.1x~670 mm (+/-0.26%, rec). 0.12 N m itself undetermined: escapement alone needs ~7e-4 to 1.4e-3 N m; final torque depends on item 7.
13 Prism fit: RESOLVED geometrically (35.36 diag, 10.32 mm radial room). Beam vs 25 mm aperture moves to optics step; prism length 106.1 (Gemini) vs 103.18/105.68 (Edmund) to confirm.
14 Stiffness vs freq: superseded by item 1/(d) numbers.
15 Divergence: WORKING, not addressed in step 1.
16 Certs: unchanged, not validated.
Contact-seal (2RS) bearings excluded: estimated drag comparable to whole drive torque.

## Nov 15 2026 11:01 CT item 7 update
7 Prism motion: WORKING = spring-indexer blend (Caleb liked it in chat today). Balance + escapement are master clock and release each 12 deg step; spring cam/Geneva indexer powers the step; small motor rewinds the spring (remontoire); encoder supervises and can re-home. Not yet sized (next: release load on balance, indexer spring, rewind torque, blanking).
Tourbillon (cage rotating about optical axis): UNDER EVALUATION, not adopted. See tourbillon-feasibility.md / .py / -results.txt. First pass [C]: feasible with conditions as a slow motor-driven carousel (balance + escapement on a 7075 cage on 2x 61813, ~342 g, I ~4.6e-4), indexer and prism stationary, mechanical-only (no slip ring fits: 60 mm bore rings are 135 mm OD). True escapement-driven tourbillon fails timing at 1 rev/min, marginal near 1 rev/5 min. Classic gravity-averaging benefit mostly does not apply to the flexure balance. Cage passes 0.25 mm on bearings (~15 um); balance suspension inside it still unresolved. Pattern precesses at -cage rate (6 deg/s at 1 rpm). Decisions pending Caleb: tourbillon vs carousel, precession feature or not, mechanical push-ring vs optical/electric release, option vs commit.

## Nov 15 2026 11:42 CT item 7 blend sizing
Caleb's widget answers (Nov 15 2026, 11:19 CT), verbatim:
- Cage type: Carousel
- Star pattern rotation: Rotation is a feature with DMX rate and park
- Release across the rotating cage: Size both options first
- Next step: Keep the cage optional and size the item 7 blend next

Item 7 sizing done. See item7-blend-sizing.md / .py / -results.txt. Nothing is validated, and all numbers are [C] predictions on [T] assumptions and [S] catalog data.
- Release budget, working target [T]: 10% of the balance's per-beat loss = 4.9e-6 J (8.00 Hz) to 1.0e-5 J (11.46 Hz). Take it centred on the zero crossing or from the escape wheel during impulse. A one-sided trip costs 19 s/day at 6 deg amplitude [C].
- Mechanical, fixed balance: fits only through a 3-stage sear cascade [C]. Mechanical, carousel push ring: FAILS, 7.5-30x over budget [C].
- Electric (optical sensor + voice-coil latch, predictive firing): fits both builds. RECOMMENDED as the baseline. Story becomes "the watch times it, a sensor releases it". Pending Caleb.
- Indexer: no Geneva (jerk spike at pin entry, start/stop driver). The single-turn spring cam is rejected (0.31-0.54 J lost per step). WORKING proposal: a spring-swing indexer with a cam-notch lock and a continuous phase-locked motor arm. At 15 ms: k 21.7 / 12.5 N m/rad, cocked torque 1.78 / 1.03 N m, latch 45 / 26 N (baseline / light carrier) [C].
- Rewind motor: DCX 22 S 24 V kept. Gearhead changes from 16:1 2-stage to GPX 22 HP 150-186:1 3-stage, at 4.8-6.8 W baseline or 2.6-3.7 W light [C, S]. Gearhead backlash 1.2 deg [S] against a torque that reverses every beat is OPEN.
- Dark time at a 15 ms step: 26-41% across 8.00-11.46 Hz [C]. The 16-23 Hz chop is below flicker fusion, so it reads as flicker.
- Power cut: the cocked spring holds 1 step. The spec's 15 s spiral-down becomes a powered DMX effect, because on a real mains loss the COB is dark too.
- New risk: stationary-indexer reaction torque gives 0.18-0.20 ms beat error on a light rig (Gemini target 0.15 ms) [C, rough].
- DMX: 15 channels proposed. Step-1 1-13 kept; ch 8-9 becomes pattern azimuth (parked cage angle); ch 13 adds cage re-home; new ch 14 carousel rate/park and ch 15 indexer mode. LOCK requires the cage parked at home and the indexer latched.

12 Escapement remontoire torque: UPDATED. It now drives only the escapement plus the trip share. Need: 2.8e-3 N m nominal max (11.46 Hz, x2 headroom), clutch 4.2e-3 N m [C]. Gemini's 0.12 N m is 42x too high. Ribbon: Nivaflex 0.08 x 4.0 x about 177 mm, pre-wound 2 turns + 45 deg band [C]. This replaces step 1's sizing for the 0.12 N m Gemini number. Gemini's 0.08 x 1.2 section maxes at 1.28e-3 N m (30% of clutch).
Carousel conflict: with the cage parked, the cage remontoire isn't wound. It runs about 0.3-0.9 s in band, 6-18 s total [C]. Park needs a driven winding ring or must stay short. Decision pending Caleb.

## Nov 15 2026 11:44 CT Caleb item 7 decisions (his widget answers, verbatim)
Release method: Electric release
Step time: 15 ms step
Prism carrier: Light carrier
15 s power-cut decay: Powered DMX decay effect
Carousel park: Add a driven winding ring
Visible flicker from stepping: Flicker is a flaw to reduce
Status: item 7 = spring-swing indexer with cam-notch lock, stationary optical sensor plus voice-coil latch release (next coil size up), 15 ms step, light carrier; carousel optional with driven winding ring; 15 s decay is a powered DMX effect. Flicker reduction is an open design task. All values remain calculated predictions, not validated.
