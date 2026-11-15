# ED-IBS flicker reduction study (item 7 follow-up)
Date: Sun Nov 15 2026, CT. Status: analysis and documents only. No app code, no repo work, no outside contact, no purchases, no hardware or safety claims. **Nothing here is validated.** Every number is a target, a small closed-form or numerical prediction, or a cited value.
Numbers: `flicker-study.py`, output in `flicker-study-results.txt`. The script runs `item7-blend-sizing.py` silently (which runs `working-revision-step1.py`), so carrier, spring, latch, motor and frequency numbers are the same as the item 7 sizing. Run it with `analysis-venv/bin/python` (it needs numpy and scipy).

Tags: **[T]** target, chosen value or stated assumption. **[C]** calculated prediction. **[S]** cited source.
Sources reused: item 7 files, tourbillon files, step 1 files, `gemini-revision-deviations.md` (Caleb's 11:19 and 11:44 CT answers), `approved-requirements-ledger.md`, `full-user-specification.md` (spec), `hardware-docs-review.md`, `blueprints-raw.txt` (BP), `manual-raw.txt` (MAN). Looked up this session:
- IEEE Std 1789-2015 limits, via IES TM-39 summary and the IEEE text: low risk Mod% < 0.025 f below 90 Hz, 0.08 f to 1250 Hz; no observable effect (NOEL) Mod% < 0.01 f below 90 Hz, 0.0333 f to 3 kHz, nothing above.
- IEC TR 61547-1 light flickermeter (Pst LM), as written out in Mantela et al., "Digital implementations for determination of temporal light artefacts of LED luminaires", Lighting Res. Technol. 2023: filter equations, 0.3 s brain filter, percentile formula, and the Table 1 reference waveforms that must read Pst LM = 1.
- CIE TN 006:2016 stroboscopic visibility measure (SVM): T(f) = 1 / (1 + exp(-0.00518 (f - 306.6)) + 20 exp(-f/10)), Minkowski 3.7, up to 2 kHz. Reference test waveforms from IEC TR 63158 via Mantela 2023 Table 3.
- Lindén and Dam-Hansen, "Flicker explained" (Lund/DTU): Pst LM = 1 and SVM = 1 mean 50% of observers see it; EU Ecodesign 2019/2020 caps Pst LM at 1.0 and SVM at 0.4 for general lighting.
- Fisher et al. 2005, Epilepsia 46(9), Epilepsy Foundation working group: flash rates of 15-25 Hz are the most provocative for photosensitive seizures, with 1-65 Hz possible.
- Citizen CLU048-1818C4 datasheet: LES 22 mm, 52 V typ at 1.62 A, 4.14 A max.
- TI SNVA605 and TIDA-01415 (LM3409 with shunt FET): shunt-FET PWM dimming above 30 kHz with sub-microsecond edges. TPS92641 datasheet: shunt drive delay 29-100 ns.
- Padgett and Lesso 1999, J. Mod. Opt. 46(2), "Dove prisms and polarized light": a rotated Dove prism rotates polarization and adds TIR retardance.
- Stevens brightness power law, exponent about 0.33 for a target in the dark (textbook value, not re-checked against the original paper this session).

## Summary
- **The baseline is far over every flicker yardstick [C].** With the settled design (15 ms step on the light carrier, 2 ms settle, ±0.1 ms latch jitter), the light is fully off 26.1% of each beat at 8.00 Hz and 39.4% at 11.46 Hz. That's 100% modulation at 16.0-22.9 Hz. **Pst LM 118-131** (1 = half of people notice it), **SVM 6.1-7.3**, and IEEE 1789 low risk at that frequency allows only 0.40-0.57% modulation, so it's about 175-250x over. The chop also sits right in the 15-25 Hz band that's most provocative for photosensitive seizures [S Fisher 2005]. That's a risk flag only, not a safety finding.
- **The biggest win is free and comes from geometry, not mechanics [C].** The Dove prism turns the image about the optical axis, which is the pattern centre. The spec's radial law (phi = 15 deg + 2 theta) sends the beam through that centre whenever theta = -7.5 deg. If the electric latch fires the step so it's **centred on the moment the beam crosses the pattern centre** ("timing B"), the beam smears off its spoke by only **0.36 m (8.00 Hz) to 0.55 m (11.46 Hz) at 50 m**. Stepping centred on the zero crossing ("timing A", item 7's default) smears **2.8 m**. With a beam of **2.4 deg full divergence or wider**, timing B needs **no blanking at all** at full amplitude. That means 0% dark, Pst 0 and no camera banding from the step. Smear and spot size both scale with throw, so this threshold holds at any throw.
- **Timing B has limits [C].** It needs amplitude above 8.3 deg (8.00 Hz) or 9.2 deg (11.46 Hz). Below that, the two centre crossings per period are too close together for a 17.2 ms step, and it has to fall back to timing A. Step spacing alternates (31.7 / 55.6 ms at 11.46 Hz), so the cocking arm needs a speed profile instead of a constant speed. That's about 1.4 N m extra at the arm from rotor inertia alone, a rough number. The reaction-torque effect on the balance also comes back off-centre: about 22 mdeg of amplitude per beat on a light rig, rough. With a tight 1 deg beam it still needs 11-22% dark.
- **Partial blanking (blank only the visible-smear part) helps a lot under timing A too [C].** With a 3 deg beam and 0.25-spot tolerance, dark goes from 26-39% to 12-18%. With a 1 deg beam it goes to 19-28%. But whatever full blank remains still gives 100% modulation and Pst LM 33-92.
- **Faster steps don't pay [C].** 10 ms cuts dark to 19-28%, but the latch load doubles to 56 N, and the voice coil was already over its 0.40 W rating at 15 ms. 7 ms puts the motor rms over nominal and the gearhead peak over 3.3 N m. At 5 ms the latch takes 8.3 ms to open, which is longer than the step.
- **Dual optical path doesn't fit [C].** Two prism carriers side by side need 168-186 mm inside a 102 mm tube. It would also cut light to 25-59%, and the two paths would have to match within 0.7% in brightness or they flicker at 8-11.5 Hz with Pst > 1.
- **Not blanking at all leaves a bright streak [C].** Where the step streak is off-spoke, it gets 47-49% of the spoke's exposure. It's not faint, and it reads as a second set of lines. It could be a deliberate look (the spec's "Raw Smear"), but it isn't the star pattern.
- **PWM fixes cameras, not the beat-rate chop.** A constant-current driver with shunt-FET PWM at 25 kHz or more [S TI] keeps dimming clean on camera, but it can't touch the 16-23 Hz envelope. Separately, the COB's 4.14 A rating [S] leaves room to raise lit-time current by up to 1.46x while holding the 150 W average. That brings back brightness lost to blanking (to ~85-99% of continuous [C, T droop]) but doesn't lower flicker.
- **Continuous rotation plus a strobe is the worst option [C].** Crisp spokes need 72-96% dark (Pst 233-405), and the spokes shrink to short dashes.
- **Honest bottom line.** In total light output, the beat-rate chop can be fully removed, but only with timing B, a beam of about 2.4 deg or wider, and amplitude above about 9-10 deg. Anywhere else it can only be reduced. Any full blank left in keeps Pst LM far above 1. And a moving-beam pattern always changes the light at any one spot on the wall as spokes jump. That's the effect itself, not this flaw.

---

## 0. Metrics and how I checked my code
- **Mod% (Michelson)** = (max - min) / (max + min). IEEE 1789 compares it to a frequency-dependent line [S].
- **Pst LM** is the IEC light flickermeter [S]. In order: high-pass at 0.05 Hz, 6th-order 35 Hz low-pass, the eye weighting filter, squaring, a 0.3 s low-pass, then percentile statistics. It is the governing metric below 80 Hz, so it's the one that matters for a 16-23 Hz chop. The extracted filter text had a garbled denominator: "1781" gives unstable poles, while 11781 reproduces the IEC 61000-4-15 poles exactly, so I used 11781.
  - **Check [C]:** with the gain set from the 8.8 Hz sine definition, the five IEC TR 61547-1 Table 1 reference waveforms read 0.922-0.926. They agree to 0.5%, so the filter shape is right but the scale was 8% low. I applied one scale factor so the standard's own reference set reads 0.999-1.004.
  - That's a calibration against the standard, not against any ED-IBS number.
- **SVM** is CIE TN 006 [S]. It is meant for 80-2000 Hz stroboscopic effects, and I report it for completeness. **Check [C]:** the IEC TR 63158 reference sine (100 Hz) and square (99 Hz) both read 1.004 against 1.000.
- **What is being measured.** These metrics are for the fixture's total output, as an integrating light meter would see it. A point on the wall inside a moving pattern will always see light come and go as beams pass. That's true of any moving-beam effect and isn't what Caleb called a flaw.
- **Camera [C, T].** Rolling shutter: each row integrates over the exposure, and rows start at staggered times across a 16 ms readout [T]. Band contrast is the Michelson contrast of the exposure-averaged light over one chop period. At 16-23 Hz there are 0.26-0.37 chop periods per 16 ms readout, so a remaining blank shows as one broad dark gradient that rolls between frames. It doesn't lock, because 16.0-22.9 Hz isn't a submultiple of 24/25/30 fps. Frame-brightness beat at 24 fps: |16 - 24| = 8 Hz at 8.00 Hz and |22.92 - 24| = 1.1 Hz at 11.46 Hz [C].

## 1. Baseline (Caleb's settled item 7)
| | 8.00 Hz | 11.46 Hz |
|---|---|---|
| Beat (chop period) | 62.5 ms [C] | 43.6 ms [C] |
| Dark = step + 2 ms settle + 2 x 0.1 ms jitter | 14.1 + 2.2 = 16.3 ms [C] | 15.0 + 2.2 = 17.2 ms [C] |
| Full-dark fraction | 26.1% [C] | 39.4% [C] |
| Mod% / IEEE 1789 low-risk limit | 100% / 0.40% | 100% / 0.57% [S limit, C] |
| Pst LM / SVM | 118 / 6.1 [C] | 131 / 7.3 [C] |
| Rolling-shutter band contrast, 1/48 s / 1/60 s / 1/250 s / 1/1000 s | 64 / 96 / 100 / 100% [C] | 70 / 100 / 100 / 100% [C] |
| Time-average light | 74% [C] | 61% [C] |

## 2. Projection geometry and how much smear is acceptable at 50 m
- **Spoke geometry [S spec, C].** phi runs from -21 deg to 51 deg at ±18 deg amplitude. At 50 m a spoke runs from 19.2 m on the far side of centre, through the centre, to 61.7 m out. The rest radius is 13.4 m, and neighbouring spokes are 24 deg optical apart (5.6 m of arc at 13.4 m).
- **Each spoke is already a swept line.** The radial sweep crosses the centre at 1.4-2.1 km/s at 50 m [C], so the "dots" are really radial lines. Smear means the beam leaving its spoke line sideways.
- **Spot size is the yardstick, and item 15 (optics) isn't designed.**
  - Etendue check [C]: a 22 mm LES [S] through a 75 mm exit [S BP] gives about 3.4 deg full divergence if only ~1% of the light is captured (NA 0.1), 6.7 deg at ~4%, and 17 deg at ~25%.
  - So a tight beam is possible only by throwing most of the light away. I treat divergence as a parameter: **1 / 3 / 7 deg [T] → 0.95 / 2.69 / 6.19 m spots at 50 m [C]**.
- **Tolerance [T]:** smear up to **0.25 x spot diameter** counts as blur inside the spot, not a streak. I also show 0.5 x. These are judgment calls and need a look test.

### Timing A: step centred on the balance zero crossing (item 7 default)
During the step the beam runs from 2 m to 26 m out (8.00 Hz), or -3 m to 33 m (11.46 Hz), while the image turns 24 deg. Peak off-spoke smear is **2.8 m [C]**. The catch residual (5.5-6.6 mJ on the elastomer stop [C item 7]) wobbles the carrier 0.34-0.37 deg mech, which is 0.33-0.39 m off-spoke during settle [C]. So settle can stay lit when the tolerance is 0.33 m or more.

| Spot, tol | Dark 8.00 Hz | Dark 11.46 Hz |
|---|---|---|
| baseline (whole step + settle) | 26.1% | 39.4% |
| 1 deg, 0.25 | 19.4% | 28.0% |
| 1 deg, 0.5 | 13.8% | 20.3% |
| 3 deg, 0.25 | 12.3% | 18.2% |
| 3 deg, 0.5 | 8.2% | 12.7% |
| 7 deg, 0.25 | 7.2% | 11.3% |
| 7 deg, 0.5 | 0% | 0% |
All [C]. Zero blanking under timing A needs at least 12.6 deg divergence at 0.25 tolerance, or 6.3 deg at 0.5.

### Timing B: step centred on the beam crossing the pattern centre (new)
- **Why it works:** rotating an image about its centre doesn't move a point at the centre. The beam is on the axis at theta = -Phi0/2 = -7.5 deg. That's 8.55 ms from the zero crossing at 8.00 Hz and 5.97 ms at 11.46 Hz [C], before it on the upswing and after it on the downswing. Every spoke line passes through the centre anyway, so it's already the brightest, busiest part of the pattern. All three facet beams share the same phi, so they cross the centre together.
- **Smear [C]:** peak off-spoke is 0.36 m (8.00 Hz) or 0.55 m (11.46 Hz), against 2.8 m for timing A. Settle wobble is 0.14-0.20 m.

| Spot, tol | Dark 8.00 Hz | Dark 11.46 Hz |
|---|---|---|
| 1 deg, 0.25 (one blank / two split blanks) | 13.8 / 10.8% | 24.3 / 21.8% |
| 1 deg, 0.5 (split) | 0% | 9.2% |
| 3 deg, 0.25 | **0%** | **0%** |
| 7 deg, any | 0% | 0% |
All [C]. **Zero blanking needs at least 1.6 deg (8.00 Hz) or 2.4 deg (11.46 Hz) divergence at 0.25 tolerance, or 0.7 / 1.2 deg at 0.5.**

- **Amplitude dependence [C].** The beam only reaches the centre above 7.5 deg amplitude. The two centre crossings per period have to be at least 17.2 ms apart, so the minimum amplitude is **8.3 deg at 8.00 Hz and 9.2 deg at 11.46 Hz**.
  - Smear shrinks as amplitude drops: 0.55 m at 18 deg, 0.40 at 14, 0.28 at 11 and 0.21 at 9.5 (11.46 Hz).
  - With a 1 deg beam, dark falls to 0-6% at 9.5-11 deg.
  - Below the threshold, firmware falls back to timing A plus partial blanking. The changeover needs a hysteresis band so it doesn't toggle on DMX amplitude moves. A working value would be switching at 10 deg [T].
- **Costs [C, rough]:**
  1. **Uneven step spacing:** 45.4 / 79.6 ms at 8.00 Hz and 31.7 / 55.6 ms at 11.46 Hz. A constant-speed arm would cock alternately short and long, so the arm needs a speed profile at the balance frequency, ±1.6 deg per beat. Reflected rotor inertia at 186:1 is 0.0192 kg m2. That adds about 0.7-1.4 N m at the arm (6-12 mN m at the motor) from inertia alone. It pushes the light-carrier motor case (5.2-5.4 mN m rms) toward nominal (15.3), and it isn't sized properly.
  2. **Reaction torque off-centre:** on a light rig (0.05 kg m2 [T]), item 7's half-period model gives about 22 mdeg of balance amplitude per beat (about 0.1 m radial at 50 m). It is drained in both beats rather than being a left/right asymmetry, and the amplitude loop has to make it up inside the item-12 2x headroom. Beat shifts are ±0.053 ms per beat. This is rough, with a sign assumption for the upswing beat, and it needs a proper coupled model.
  3. **Firmware:** the fire time has to be predicted from the measured amplitude and period (asin(7.5/A) / omega). The latch is already predictive (item 7), so this is a different setpoint, not new hardware.

## 3. Options compared
Numbers are for 11.46 Hz (worst case), 3 deg beam, 0.25 tolerance, unless noted. 8.00 Hz values are in the results file.

| Option | Full-dark | Mod% | Pst LM | SVM | Band 1/48 s / 1/1000 s | Mean light | Fits settled design and 56 mm bore |
|---|---|---|---|---|---|---|---|
| O0 baseline hard blank | 39.4% | 100 | 131 | 7.3 | 70 / 100% | 61% | yes |
| O1a + 0.5 ms fades | 39.4% | 100 | 133 | 7.4 | 72 / 100% | 60% | yes |
| O1b smear-tolerant blank, timing A | 18.2% | 100 | 58 | 3.3 | 24 / 100% | 81% | yes, firmware only |
| O1c timing B, 3 deg beam | **0%** | **0** | **0** | **0** | **0 / 0%** | **100%** | yes, firmware plus arm speed profile |
| O1c timing B, 1 deg beam, split blanks | 21.8% | 100 | 73 | 4.1 | 33 / 100% | 76% | yes |
| O3 10 / 7 / 5 ms step, hard blank | 28.0 / 21.1 / 16.5% | 100 | 90 / 66 / 50 | 5.1 / 3.8 / 2.9 | 41 / 28 / 21% at 1/48 | 72-84% | 10 ms strains the latch; 7 and 5 ms break motor, gearhead, latch |
| O7 dip to 30 / 60 / 90% over the O1b window | (18.2% dipped) | 54 / 25 / 5 | 38 / 20 / 4.8 | 2.2 / 1.2 / 0.28 | 16 / 9 / 2% at 1/48 | 87-98% | yes, LED only |
| O4 no blank | 0% | 0 | 0 | 0 | 0 / 0% | 100% | yes, but streak at 47-49% of spoke exposure |
| O2 dual path | about 0% in principle | set by path mismatch | over 1 above 0.7% mismatch | small | small | 25-59% of single path | **no**: needs 168-186 mm vs 102 mm tube |
| O6 continuous plus strobe | 72-96% | 100 | 233-405 | 13-21 | 100% | 4-28% | no indexer needed, but spokes become dashes |
All [C], with yardsticks [S]. "Pst 1" means 50% of observers notice it. Architectural lighting is held to Pst LM ≤ 1 and SVM ≤ 0.4 in the EU [S]. Those rules don't apply to stage effects, and I use them only as rulers.

### O1 Overlap blanking with the LED fade, and blank only the visible-smear part
- **Fades alone (O1a) do nothing for flicker [C].** Raised-cosine 0.5 ms edges barely change Pst (131 to 133) or the camera, because the fade can only move into time that was going to be dark anyway. The real gain comes from letting light run during the parts of the step and settle where the smear is under tolerance (O1b), with the fade inside that low-smear time.
- **O1b numbers:** see section 2. Under timing A, dark roughly halves for a 3 deg beam (39.4% to 18.2%). Pst falls in proportion (131 to 58) but stays far over 1, because whatever remains is still a full on/off.
- **Camera:** at 1/48 s the band drops from 70% to 24%. At short shutters, some rows still go black.
- **Brightness:** mean light rises from 61% to 81% (11.46 Hz), or from 74% to 87% (8.00 Hz).
- **Complexity:** firmware only. It needs the carrier angle (index encoder) and the balance angle, both of which item 7 already has, plus a lookup of the blank window against amplitude, frequency and throw-independent spot size. Nothing new to tour.
- **Compatibility:** full.

### O1c Timing B (new; found while doing O1)
Covered in section 2. Where it applies (beam ≥ 2.4 deg, amplitude ≥ ~9.2 deg), it removes the blank completely, so modulation is 0, Pst is 0, there's no camera banding from the step, and there's no brightness cost. Costs are the arm speed profile and the reaction-torque energy drain above. It's compatible with the settled design. It would replace item 7's DMX ch 15 "step centred on zero crossing" as the default mode.

### O2 Dual optical path
- **How it would work [T]:** each prism holds its star position for one beat while lit, then steps two positions (24 deg mech) during the next beat while the other path shows. Each indexer gets a whole beat: 40.4-59.3 ms against 15 ms. Torque drops to about 0.12-0.26 N m (rough scaling, light carrier, against 1.03 N m).
- **Size [C]:** two carriers side by side need at least 168 mm (Kaydon KA025 housings, 84.2 mm) or 186 mm (61813, 93 mm) inside the tube, against **102 mm [S MAN]**. Doesn't fit. Two prisms coaxial in series don't work either: two Dove prisms in series rotate the image by 2(theta2 - theta1), so a step in either one moves the image. Bypassing one prism means passing through its 10 mm corner gap and rotating mount.
- **Optical efficiency [C/T]:**
  - Non-polarizing split plus recombine: 25%, continuous.
  - Polarizing split plus recombine: about 40%. It needs a half-wave plate co-rotating on each carrier, because a Dove prism rotates polarization and adds TIR retardance [S Padgett & Lesso]. Without it, output swings with star position.
  - Polarization conversion plus a fast ferroelectric switch plus a PBS router: about 59%.
  - Compare 61-74% time-average for the baseline. The coating and switch efficiencies are [T].
- **Flicker [C]:** zero in principle, but the paths alternate every beat, so any brightness difference flickers at 8-11.5 Hz, where the eye is most sensitive. **Pst LM reaches 1 at only 0.70-0.73% path mismatch.** The paths would need active intensity matching. Pattern co-registration of the two paths to 0.25 spot at 50 m is 4.7 / 13.5 / 31 mrad for 1 / 3 / 7 deg beams, held through touring.
- **Cost and parts:** a second prism, carrier, bearings, indexer, latch, encoder and motor, plus two cubes, two half-wave plates and possibly a switch. That roughly doubles the item-7 mechanism, plus optics alignment. **Not recommended** unless the fixture body grows to about 200 mm or two barrels.

### O3 Faster step (light carrier, same item-7 design rule)
| Step | Dark 8.00 / 11.46 Hz | k | Cocked torque | Latch load | Coil heat at 11.46 Hz (0.40 W rating) | Motor rms (15.3 nom) / gearhead | Spring energy / missed-catch hit |
|---|---|---|---|---|---|---|---|
| 15 ms (settled) | 26.1 / 39.4% | 12.5 N m/rad | 1.03 N m | 26 N | 0.54 W, over already | 5.4 mN m / OK | 43 / 49 mJ |
| 10 ms | 19.0 / 28.0% | 24.9 | 2.22 | 56 N | 0.58 W | 10.7 / OK | 99 / 111 mJ |
| 7 ms | 14.5 / 21.1% | 47.7 | 4.46 | 112 N | 0.68 W | 20.8, **over** / peak 4.5 N m **over 3.3** | 209 / 227 mJ |
| 5 ms | 11.4 / 16.5% | 89.5 | 8.66 | 216 N | 1.83 W, **opens in 8.3 ms, longer than the step** | 39.8, **over** / rms 4.8 N m **over** | 419 / 445 mJ |
All [C] from item-7 [S] catalog data.
- **What hits first:** the latch coil (already over at 15 ms), then the motor and gearhead at 7 ms, then latch timing at 5 ms.
- **Spring:** in carbon steel at t 2.0 mm, b grows from 3.8 mm to 8.1 / 16.1 / 31.1 mm.
- **Missed-catch energy** grows as 1/t^2. That's the event the backup pawl has to survive.
- **Reaction-torque beat error** stays about 0.11-0.12 ms when the step is centred, because the pulse is cosine-shaped. Frame acceleration grows 21 → 44 → 89 → 173 rad/s2.
- **Flicker:** even 5 ms leaves 100% modulation and Pst 50. The faster step lowers dark time but never changes the kind of flicker. **Keep 15 ms.** Timing B does more with no extra load.

### O4 No blanking, step shows as a streak
- **Flicker [C]:** none from the step (Pst 0, no banding), full brightness.
- **Streak brightness [C]:** where the streak is off-spoke, exposure is 1/beam speed. A spoke is crossed twice per beat by the radial sweep, while the streak is crossed once, at a similar speed. So the streak gets **47-49% of the spoke's exposure (range 34-50%)**. With a brightness exponent of about 0.33 [S Stevens], that looks roughly 75-80% as bright.
- **Look or flaw:** it isn't a faint ghost. Each beat adds a curved stroke from one spoke to the next through the centre region (timing A) or around it. The pattern becomes a connected, rotating zigzag lattice instead of separate spokes. As a deliberate DMX mode (the spec's "Raw Smear" toggle) it's a legitimate look. As the default it isn't the star pattern the spec asks for.
- **Camera:** clean. **Complexity:** none. **Compatibility:** full.

### O5 LED drive: high-frequency PWM and response time
- **The Gemini package has no LED driver [S BP, MAN].** The BOM lists a Mean Well LRS-200-24 (a 24 V constant-voltage PSU) and a DRV8833 (a motor driver). The manual only mentions an "LED driver PCB" and its current limit. So driver response time isn't set by anything in the package. It's a choice.
- **Recommended class:** constant-current buck with shunt-FET PWM. TI shows above 30 kHz with sub-microsecond edges, and 29-100 ns shunt-drive delay on the TPS92641 [S]. COB die and phosphor response is much faster than the 0.1-0.5 ms edges used here [T, not looked up per part]. At 25 kHz or above, PWM is outside every metric: IEEE 1789 has no limit above 3 kHz, the flickermeter band ends below 80 Hz, and the SVM threshold is defined only to 2 kHz [S]. It also keeps short-shutter and high-speed cameras clean.
- **What it doesn't do: it cannot fix the beat-rate chop.** PWM shapes light inside lit time. The 16-23 Hz on/off envelope from blanking is unchanged by definition.
- **Lit-period boost [C]:** at 150 W the COB runs about 2.83 A (53 V [T]), against a 4.14 A DC maximum [S]. Holding average electrical power at 150 W, lit-time current can rise by up to 1.46x.
  - That recovers time-average light from 61% to about 85% (11.46 Hz baseline) and to about 98% with O1b. Uses flux proportional to I^0.9 [T droop, not from the datasheet].
  - It raises the on/off contrast, so it doesn't help flicker.
  - Junction temperature ripple and the pulsed-current rating aren't checked.
  - This revises item 7's "you can't drive the COB harder" (see deviations).

### O6 Continuous rotation plus a short strobe (step-1 option 3)
For a spoke with no more than 0.25-spot sideways smear at the 13.4 m rest radius, the gate can only be 4.2% (1 deg beam), 12% (3 deg) or 27.6% (7 deg) of each beat [C]. That makes it 72-96% dark, Pst LM 233-405, SVM 13-21, and 4-28% of the light. The radial sweep inside the gate covers only 5-30 of the 72 deg, so spokes become short dashes. Long gates draw spirals instead. It removes the spring, latch and catch (big touring wins), but it's the worst option for both flicker and brightness. **Not recommended.**

### O7 Dip instead of blackout (another real option)
During whatever blank remains, the LED dims to a floor instead of going off. Modulation and Pst fall roughly in proportion to (1 - floor):
- 30%: Mod 54%, Pst 38
- 60%: Mod 25%, Pst 20
- 90%: Mod 5%, Pst 4.8
All for 11.46 Hz, O1b window [C]. **Pst 1 needs the floor at about 98% [C],** which means the streak is basically fully visible. A dip is a dial between flicker and streak, not a way out. It costs nothing in hardware and makes sense as a DMX "blank depth" control.

## Recommendation (a combination)
1. **Default step timing: timing B (step centred on the beam's crossing of the pattern centre), firmware-predicted from measured amplitude and period, whenever amplitude is at least about 10 deg [T, threshold with hysteresis].** Below that, timing A (centred on the zero crossing). This is the only option that can take the beat-rate chop to zero, and it adds no parts. It does need the arm speed profile and a proper reaction-torque check.
2. **Smear-tolerant partial blanking (O1b) for whatever remains,** in either timing: blank only while the beam is more than 0.25 spot [T] off its spoke, with split blanks allowed and 0.5 ms fades inside the low-smear time. The blank window is computed from the carrier encoder, balance angle and the set beam divergence.
3. **Steer item 15 (optics) toward 2.4 deg full divergence or wider** if Caleb accepts that look. That's the line where timing B needs no blanking at full amplitude (0.25 tolerance; 1.2 deg at 0.5). A pencil beam (around 1 deg) keeps 11-22% dark and Pst around 50-70.
4. **Dedicated constant-current LED driver with shunt-FET PWM at 25 kHz or above,** plus lit-time current boost holding the 150 W average. Clean on camera, and recovers most of the brightness lost to any blank left. Thermal check needed.
5. **DMX:** ch 10 gains a blank-depth range (O7) and a blank-off "Raw Smear" range (O4, already sim-only in the map). Ch 15 gets a new default, "step at pattern centre", with the zero-crossing mode kept.
6. **Keep the 15 ms step.** Drop the dual path and continuous-strobe options.

What this gets, all [C]:
- Wide beam, amplitude at least 9-10 deg: about 0% dark, Pst 0, no banding.
- Tight 1 deg beam or low amplitude: 11-22% dark, Pst 50-73.
- Fallback under timing A with a 3 deg beam: 12-18% dark, Pst 56-58.
- Baseline today, for comparison: 26-39% dark, Pst 118-131.

**Honest limits.** The beat-rate modulation is eliminated only in the wide-beam, mid-to-high-amplitude case. Everywhere else it's reduced, not removed. Any full blank still sits about two orders of magnitude over Pst 1 and IEEE 1789, in the 15-25 Hz band [S]. None of this is validated, and the smear tolerance is a judgment that needs a look test.

## Deviations from earlier docs (and why)
- **Item 7 default timing (DMX ch 15 "step centred on zero crossing").** I propose a new default, timing B. Item 7 chose zero-crossing centring for reaction-torque symmetry, before flicker was a priority. Timing B trades some of that for a 5-8x smaller smear (2.8 m to 0.36-0.55 m). The trade is open for Caleb.
- **Item 7 said "you can't drive the 150 W COB harder during lit time".** Partly revised. The CLU048 DC maximum (4.14 A [S]) is about 1.46x the 150 W current, so holding the average at 150 W allows a lit-time boost. Thermal ripple is unchecked.
- **Item 7 spring table lists Nivaflex 45/18 at t 1.5-2.0 mm.** Step 1 cites Nivaflex strip availability only up to 0.70 mm thick [S Générale Ressorts]. The carbon-steel column is the buildable one. Flagged here, not re-sized.
- **Item 7 "the voice coil is over its 0.40 W rating at 11.46 Hz".** Confirmed here for the light carrier: 0.54 W at 15 ms [C]. The fix (next frame up or a 1-stage cascade) stands.
- **Pst LM calibration:** the 8.8 Hz sine definition read 8% low against the standard's own reference waveforms. I calibrated to the reference set (section 0).

## Top risks
1. **Timing B's arm speed profile and reaction drain.** About 1.4 N m extra at the arm from rotor inertia, and about 22 mdeg of amplitude per beat on a light rig. Both rough. If the coupled model is worse, timing B may be limited to heavy-rig mounting or need the reaction-cancelling indexer item 7 already flagged.
2. **The result hinges on beam divergence, which isn't designed** (item 15). The etendue check says a beam under about 3 deg means throwing away about 99% of the COB's light. That's a separate brightness problem, but it pushes the same direction as flicker.
3. **The smear tolerance (0.25 spot) is a judgment** with no perception data behind it. A look test on a real cyc with haze is needed before trusting the dark-time numbers.
4. **Any remaining blank sits in the 15-25 Hz photosensitive band** [S]. The project makes no safety claims, but this needs to be visible to whoever eventually specifies it.
5. **Amplitude-dependent mode switching** (timing B vs A) could cause visible changes in streak or brightness as the DMX amplitude moves. Needs hysteresis and a crossfade.
6. **Lit-time current boost:** the junction temperature and pulsed-current rating are unchecked.
7. Unchanged and still gating: the balance suspension hasn't passed 0.25 mm in any orientation, the latch coil is over its rating, there's gearhead backlash, and there's indexer spring fatigue at 1.7-2.5e8 cycles a year.

## Decisions for Caleb
1. **Step timing:** make "step at pattern centre" (timing B) the default when amplitude is high enough, with zero-crossing timing as the fallback? It costs an arm speed profile and some reaction-torque symmetry.
2. **Beam divergence target (item 15):** about 2.4 deg or wider (no blanking with timing B at full amplitude), or a tighter pencil beam that keeps 11-22% dark?
3. **Smear tolerance:** 0.25 spot (my default) or 0.5 spot (less dark, softer spokes)? Or leave it for a look test.
4. **Whatever blank remains:** full blackout, or a dip with a DMX "blank depth" control, trading flicker for a faint streak?
5. **LED driver:** commit to a constant-current shunt-FET driver (PWM at 25 kHz or above) with lit-time boost holding 150 W average?
6. **Step time:** keep 15 ms? I recommend yes, since faster steps break the latch, motor or gearhead before they fix flicker.
7. **Drop the dual path and continuous-strobe options?** I recommend yes.
8. **Keep "Raw Smear" (no blank) as a deliberate DMX look?**

## Assumptions and uncertainties
- Smear model: rigid image rotation about the optical axis, using the spec's tan(phi) projection on a flat wall perpendicular to the axis. There is no prism wobble, beam deviation or chromatic offset. The spot is a uniform disc of the given diameter.
- The carrier trajectory is item 7's spring-swing RK4 (high-drag design case), with the balance as a pure sine at 18 deg unless stated.
- Latch jitter ±0.1 ms, 2 ms settle, elastomer stop 2e5 N/m and light rig 0.05 kg m2 are all item-7 [T].
- Metrics are for total fixture output. Pst LM is computed over 100 s windows of a periodic signal at 2 kHz. SVM uses exact harmonics of one period. The camera model is idealized: rolling shutter with a 16 ms readout [T], and no sensor response.
- Dual-path efficiencies, PCS/FLC transmissions, droop exponent, COB Vf at 150 W, and the arm speed-profile estimate are [T] or rough [C].
- Nothing here has been checked on hardware or in a look test.
