# ED-IBS item 7 blend sizing
Date: Sun Nov 15 2026, CT. Status: analysis and documents only. No app code, no repo work, no outside contact, no hardware or safety claims. **Nothing here is validated.** Every number is a target, a closed-form or small RK4 prediction, or a cited catalog value.
Numbers: `item7-blend-sizing.py`, output in `item7-blend-sizing-results.txt`. The script runs `working-revision-step1.py` silently and reads its variables, so ring, carrier, frequency and drive numbers are the same as step 1 and the tourbillon pass. The results file prints section 4 (indexer) before sections 2 and 3 because the release options need the latch load from the indexer.

Tags: **[T]** target, chosen value or stated assumption. **[C]** calculated prediction. **[S]** cited source.
Sources used here: step 1 files, tourbillon files, `gemini-revision-deviations.md`, `approved-requirements-ledger.md`, `hardware-docs-review.md`, `full-user-specification.md`, `blueprints-raw.txt` (BP), `manual-raw.txt` (MAN). Looked up this session:
- Airy, "On the Disturbances of Pendulums and Balances, and on the Theory of Escapements" (1830, HAL inria-02340547), and Feinstein, "Impulsing the Pendulum: Escapement Error" (NAWCC). Impulse at the equilibrium point changes amplitude, not period. [S]
- SJX, "The Geometric Efficiency of Escapements" (2024): the detent escapement loses about 5% geometrically. abbeyclock.com "Clock and Watch Escapement Mechanics": common lever escapements are below 50% efficient. Saunier, Treatise on Modern Horology, detent chapter: unlocking resistance depends on the detent design and is not given as a percentage. [S]
- BHI Horological Journal Oct 2015, "Independent-Train Watches and Jump Quarter-Seconds": a separate spring-powered train, released by the going train, is a real horological precedent for this blend.
- MechDesigner motion-law table: modified sine Cv 1.760, Ca 5.528; cycloidal 2.000 / 6.283; modified trapezoid 2.000 / 4.888. [S]
- Engineers Edge / Eng Bench Geneva equations: crank radius c sin(pi/n), motion angle 180 - 360/n. [S]
- maxon DCX 22 S catalog page 112 (24 V: 15.3 mN m nominal, 120 mN m stall, 10,800 rpm nominal, 18.4 mN m/A, 3.69 ohm). maxon GPX 22 HP catalog page 392 (3-stage: 62 to 231:1, 3.3 N m continuous, 65% max efficiency, 1.2 deg average backlash, 10,000 rpm max continuous input). [S]
- H2W NCC03-07-001-1V voice coil product page (2.6 N/A, 9.6 ohm, 0.14 ms electrical time constant, 7 g moving mass, 1.6 N at 10% duty, 0.53 N and 0.40 W continuous). [S]
- Johnson Electric Ledex 50 STA push solenoid sheet (24 V intermittent 195201-237: 12.6 oz = 3.50 N at 0.010 in, 2.4 oz = 0.67 N at 0.100 in, 1.2 g plunger; no response time on the sheet). [S]
- Omron EE-SX1041 (tr = tf = 4 us typ) and Vishay TCST1103 (ton 10 us) slotted optical sensors. [S]
- Wikipedia, "Flicker fusion threshold": Talbot-Plateau law above fusion; cone fusion plateau about 60 Hz. [S]

## Summary
- **Release budget [C, T].** The balance loses 4.9e-5 J per beat at 8.00 Hz and 1.0e-4 J at 11.46 Hz (Q 350, 18 deg). I couldn't find a published "unlocking fraction" for detent escapements, so I set a working budget of **10% of the per-beat loss [T]: 4.9e-6 to 1.0e-5 J per beat**. That's 1.4e-4 to 2.9e-4 N m at the balance over a 2 deg trip window, or 2.3e-5 to 4.8e-5 N m extra at the escape wheel over its 12 deg step. Where the trip happens matters more than how big it is. Taken 2 deg before centre it costs 0.7 s/day at 18 deg but 19 s/day at 6 deg, so it hurts isochronism. Taken centred on the zero crossing, the RK4 check shows about zero rate error (Airy).
- **Mechanical release.** (a) Fixed balance: it fits the budget only through a 3-stage sear cascade (rolling main sear plus two light stages). That's about 3 g of parts, 3-4 ms fall time and about +/-0.5 ms jitter [T]. (b) Carousel axial push ring: **fails**, at 7.5x to 30x the 10% budget before any trigger is added.
- **Electric release (optical sensor plus voice-coil latch).** Sensor latency is microseconds. The voice coil opens the latch in about 2.4-2.6 ms, and firmware can fire it early from the measured beat period, so latency drops out. It puts no load on the balance and works the same with or without the carousel. **The story changes: the watch times every step, a sensor releases it.** [C]
- **Indexer: no Geneva. A spring-swing indexer with a cam-notch lock.** A 30-slot Geneva hits 95% of peak acceleration the instant the pin enters, so it jerks at both ends, and its driver has to start and stop every beat. A spring that turns a cam one revolution per step wastes 0.31-0.54 J per step at a hard stop (5-12 W). What I recommend: a stiff spring between a motor-driven arm and the prism carrier. The latch lets the carrier swing half a period, 12 deg, and a pawl catches it in the next notch at almost zero speed, so the spring energy is reused every step. For a 15 ms worst-case step it's **21.7 N m/rad (baseline carrier) or 12.5 N m/rad (light carrier), with 1.78 / 1.03 N m cocked torque and a 45 / 26 N latch load [C]**.
- **Rewind motor.** The Gemini DCX 22 S (24 V) on a **GPX 22 HP 186:1 (or 150:1)** works: 9.0-11.6 mN m rms against 15.3 nominal (baseline), 4,800-8,500 rpm, 4.8-6.8 W (baseline) or 2.6-3.7 W (light) [C, S]. Two problems remain: gearhead backlash (1.2 deg) against a torque that reverses every beat, and the power-cut reserve. The cocked spring holds only 1 step. A full free decay is 365 steps.
- **Dark time.** At 15 ms it's 26-27% at 8.00 Hz and 39-41% at 11.46 Hz [C]. That's worse than step 1's 25-35% at the top end. A 10 ms step brings it to 19-30%, but the spring and latch load roughly double. The 16-23 Hz chop is below the roughly 60 Hz fusion threshold [S], so it reads as flicker, not just dimmer.
- **Item 12 remontoire.** The escapement now needs at most **2.8e-3 N m [C]** (with 2x headroom and the mechanical trip share), clutch 4.2e-3. That's 42x under Gemini's 0.12 N m. Recommended ribbon: **Nivaflex 0.08 x 4.0 x about 177 mm, pre-wound 2 turns plus a 45 deg band [C]**. Gemini's 0.08 x 1.2 section tops out at 1.28e-3 N m at 1000 MPa.
- **New risks found.** (1) The indexer's reaction torque goes into the chassis and back into the balance. With a light free-body fixture (0.05 kg m2 [T]) that's 0.18-0.20 ms of beat error against Gemini's 0.15 ms target, and up to 0.09 deg left/right amplitude asymmetry (about 0.4 m at 50 m). (2) Parking the carousel stops the cage remontoire from winding. The escapement then runs about 1 s on its control band, or at most 6-18 s on falling torque.

---

## 1. Release budget on the balance
Inputs [S step 1, spec]: I_ring 4.368e-5 kg m2; spec stiffness law; 8.00 Hz at L 18.00 mm and 11.46 Hz at the 8.78 mm stress floor; 18 deg amplitude; Q 350. Energy E = K A^2 / 2. Loss per beat (half period) = pi E / Q. Escape-wheel torque at 35% escapement efficiency [T step 1].

| | 8.00 Hz | 11.46 Hz |
|---|---|---|
| Beat interval | 62.5 ms | 43.6 ms |
| Balance energy at 18 deg [C] | 5.45e-3 J | 1.12e-2 J |
| Loss per beat [C] | 4.89e-5 J | 1.00e-4 J |
| Escape-wheel torque for that loss [C] | 6.67e-4 N m | 1.37e-3 N m |
| Release budget 5 / **10** / 25% of loss [T tiers] | 2.4e-6 / **4.9e-6** / 1.2e-5 J | 5.0e-6 / **1.0e-5** / 2.5e-5 J |
| 10% as balance torque over 2 deg [C] | 1.40e-4 N m (3.9 mN at the 36 mm rim) | 2.87e-4 N m (8.0 mN) |
| 10% as extra escape-wheel torque over 12 deg [C] | 2.33e-5 N m | 4.79e-5 N m |

Why 10% [T]: published numbers bracket it but don't pin it. A detent escapement's geometric loss is about 5% [S SJX]. Lever escapements lose more than half their input [S abbeyclock]. Saunier treats unlocking resistance as design-dependent [S]. 10% means the trip's scatter stays small next to what the escapement already feeds the balance.

**Isochronism (Airy) [C].** A small constant resisting torque tau over a window just before centre shifts each half period by dt = tau / (I w^3 A) x (1 - sqrt(1 - (w/A)^2)). The RK4 check matches to 3 digits (7.96e-6 both ways).
- 10% trip in the 2 deg before centre: rate +8.0e-6 (0.69 s/day) at 18 deg. That's about one 16-bit DMX frequency step (6.6e-6 relative at 8 Hz, step 1). [C]
- Same trip at 12 deg: 2.7e-5. At 6 deg: **2.2e-4 (19 s/day)**. The trip energy is fixed while the balance energy falls as A^2, so a trip before centre makes the rate depend on amplitude. That's the isochronism hit, and DMX amplitude moves A all the time. [C]
- Same trip **centred** on the zero crossing: -2e-9 [C RK4]. After centre: -8.0e-6. **Rule: take the trip energy symmetric about centre, or from the escape wheel during impulse (which sits inside the +/-3.5 deg lift zone), never from a window on one side.**
- Scatter: if the trip energy varies +/-30% beat to beat [T], amplitude jitters about 18 mdeg rms, which is about 80 mm rms of radial beam motion at 50 m [C]. That's the practical reason not to go past 10%.

## 2. Mechanical release options
Holding load comes from section 4: the cocked indexer spring sits on a pawl in a 30-notch ring at r 40 mm [T], which is the step-1 80/62 index ring. The load is **44.5 N (baseline carrier) or 25.8 N (light) [C]**. Sear travel is 0.3 mm [T]. Friction coefficients are planning values [T]: 0.15 sliding, 0.01 rolling with pivot.

### 2a. Fixed balance, no carousel: escapement trips a detent on the indexer
A direct pawl is hopeless. A sliding main sear takes 2.0e-3 J to trip, which is 400x the budget [C]. It needs a force-reducing cascade, the same trick a striking clock's warning or a firearm sear uses: each stage holds the next stage's small spring hammer.

| Main sear | Stages to get under 4.9e-6 J [C] | Trip energy at last stage [C] | Fall time [C] | Mass [T 1 g/stage] |
|---|---|---|---|---|
| Rolling, baseline | 3 | 3.0e-6 J | 2.9 ms | about 3 g |
| Rolling, light | 3 | 1.7e-6 J | 3.9 ms | about 3 g |
| Sliding, baseline | 5 | 1.0e-6 J | 5.8 ms | about 5 g |
| Sliding, light | 4 | 3.9e-6 J | 2.9 ms | about 4 g |

Arrangement [T]: a 30-lobe trip cam on the escape-wheel arbor (12 deg per lobe, one per beat) lifts the last, lightest sear. The trip energy then comes out of the escape wheel during impulse, which is inside the lift zone and close to symmetric about centre, so it's the Airy-friendly placement. The indexer's own motion re-cocks the cascade hammers, so resetting costs the balance nothing.
**Fits the budget: yes, with 3 stages and a rolling main sear [C].** Costs: about 3 g of small parts and three wear points, each a spot where a stuck sear stops the prism. Fall time is fixed at roughly 3-4 ms after centre, jitter is about +/-0.5 ms [T, unmeasured], and the release can't be moved in time.

### 2b. Carousel: axial push ring crossing the rotating interface
The cage escapement lifts a coaxial ring 0.2 mm [T] once per beat. A stationary lever reads that through one ruby contact point. Sliding friction at that point is tangential and paid by the cage motor. What the balance has to pay is lifting the ring, the return spring (strong enough for any orientation and fast enough to reset before the next beat), and gravity in the worst orientation.

| Ring 70/62 mm | Mass [C] | Return in 2 ms | Return in 5 ms |
|---|---|---|---|
| 7075 x 1.0 mm | 2.33 g | 1.4e-4 J = 30x budget | 6.6e-5 J = 13.5x |
| Ti-6Al-4V x 0.6 mm | 2.20 g | 1.4e-4 J = 28x | 6.3e-5 J = 12.8x |
| CFRP x 1.0 mm [T density] | 1.29 g | 8.0e-5 J = 16x | 3.7e-5 J = 7.5x |

**Fails [C].** Even the lightest ring takes 7.5x the 10% budget, close to the whole Q-350 loss, before the stationary hair trigger (section 2a) is added. It isn't sized away by better materials. Gravity alone on a 2.3 g ring (m g s = 4.6e-6 J) uses almost the whole budget when the fixture points up.

## 3. Optical sensor plus electric latch
**Plainly: with this option the story changes. The watch times every step. A sensor and a coil release it.** The balance still sets the tempo and still makes the beat happen. It just no longer pushes anything to make the step go.

- **Sensor.**
  - Fixed balance: a slotted interrupter on an escape-wheel flag, as the Gemini manual already describes ("ultra-fast optical beam interrupter on the escape wheel tooth profile" [S MAN]), or a reflective read of the balance rim. Candidates: Omron EE-SX1041 (4 us rise and fall) or Vishay TCST1103 (10 us) [S].
  - Carousel: a stationary reflective read of the balance rim through the open cage (5.7% hidden by pillars, tourbillon pass), with cage angle subtracted.
  - Edge timing jitter for 5 um position noise [T] at 0.57 m/s rim speed is about 9 us [C]. Negligible.
- **Latency chain.** Sensor about 10 us, MCU interrupt under 10 us [T], latch about 2.4-2.6 ms (below). The beat is periodic and measured, so firmware can **fire predictively** from the last few beat periods. The fixed latency then drops out, and the step can be placed anywhere in the beat, including centred on the zero crossing (section 4, reaction torque). Residual jitter is latch scatter, about +/-0.1 ms [T, unmeasured].
- **Latch, voice coil (recommended) [S H2W NCC03-07-001-1V, C]:** a rolling main sear needs 0.45 N (baseline) or 0.26 N (light) to trip. At 1.0 A (2.6 N) the latch opens 0.5 mm in **2.4-2.6 ms**. Coil heat is 0.36-0.39 W at 8.00 Hz and 0.52-0.56 W at 11.46 Hz, against a **0.40 W continuous rating. That's over at the top of the range.** Use the next frame size up, or a 1-stage cascade with a smaller and lighter pawl. At 2.5 A it opens in 1.6 ms but runs 1.5-2.3 W, which isn't acceptable.
- **Latch, solenoid [S Ledex 50 STA 24 V]:** 3.5 N at 0.25 mm stroke. Mechanical travel is about 0.7 ms [C], but flux build-up isn't on the sheet, and real response is typically several ms and drifts with coil temperature. I'm planning on 5-20 ms with +/-2 ms jitter [T, unverified]. Heat about 1.4 W at 11.46 Hz [C]. **Not recommended:** it's slow and temperature-sensitive, which is exactly what the blanking budget can't absorb.
- **Failure modes and what the system does [T]:**
  - Haze or fog-fluid film on the optics: use a sealed sensor and modulated IR, and watch the signal level.
  - Stray light from the 150 W COB: daylight-blocking filter [S TCST], baffle, modulation.
  - Missed beat or double trigger: the index encoder sees no step or two steps, the step is skipped, and the next blanking stays aligned.
  - Coil open or short: the latch is spring-return to locked, so the prism holds still and a fault is flagged.
  - Latch stuck open: the carrier would run through notches. A second, independent catch pawl that is spring-applied and never actuated limits it to one extra step. The worst case is the missed-catch hit in section 4.
  - Power loss: the latch closes, the prism stays where it is, and the balance decays freely.
  - EMI from the PSU or DMX lines: twisted pair, Schmitt input, firmware debounce shorter than a beat.

## 4. Indexer: 30 positions, 12 deg steps
### Geneva vs cam [C, S]
| Motion law, 12 deg in 15 ms | Peak torque baseline / light | Peak KE baseline / light | Notes |
|---|---|---|---|
| Geneva n = 30, constant driver | 1.51 / 0.87 N m | 93 / 54 mJ | Ca 4.52, Cv 1.63 [C]. Wheel acceleration at pin entry is **95% of peak**, a jerk spike at both ends. Crank radius 4.2 mm on a 40 mm wheel. Driver turns 168 deg per step and has to start and stop every beat. |
| Modified sine cam [S coefficients] | 1.84 / 1.06 N m | 108 / 62 mJ | Smooth, finite jerk, positive lock in dwell. |
| Harmonic half-swing (spring) [C] | 1.64 / 0.94 N m (arm stationary) | 86 / 49 mJ | Ca pi^2/2 = 4.93. Energy goes back into the spring. |
| Bang-bang reference (step 1) | 1.33 / 0.77 N m | 140 / 80 mJ | Not buildable as-is. |

How the step gets powered matters more than the motion law:
- **D1, spring turns a cam (or Geneva driver) one revolution per step and is stopped at a detent [C]:** the input flywheel needs about 5x the output's peak KE [T] to carry the output through. All of that ends up hitting the detent: **0.54 J per step baseline, 0.31 J light, which is 5-12 W of impacts** that the rewind motor has to supply. Loud and wearing. Rejected.
- **D2, spring-swing indexer with a cam-notch lock (recommended):** [T, C, S]
  1. A stiff spring connects a motor-driven arm to the prism carrier.
  2. The arm turns continuously at the mean step rate (12 deg per beat, 32-46 rpm), phase-locked to the beat by the encoder. That's the Gemini idea of continuous winding with a spring low-pass, kept.
  3. Between steps a pawl holds the carrier in one of 30 notches while the arm runs ahead and builds spring angle.
  4. On release the carrier swings about half a period, reaches the next notch near zero speed, and the pawl drops in.
  5. The spring then holds the swing energy (now pulling backwards) until the arm runs past again.
  Only drag and catch losses are lost.

  It's the "cam" choice in the sense that the notch ring plus pawl is a cam lock. The Geneva's job is done by the spring. **This is a deviation from the "spring-loaded cam or Geneva" wording.** The reason is energy: D1 throws away 6-12x the swing energy every step. [C]

### D2 sized [C] (spring rate set so the worst case, 11.46 Hz with high drag, steps in the target time)
| Step target | Carrier | k | Cock angle 8.00 / 11.46 Hz | Cocked torque (max) | Latch load at r 40 | Actual step 8.00 / 11.46 Hz | Spring energy (recycled) |
|---|---|---|---|---|---|---|---|
| 10 ms | baseline | 43.3 N m/rad | 5.10 / 4.65 deg | 3.86 N m | 96 N | 9.7 / 10.0 ms | 172 mJ |
| **15 ms** | **baseline** | **21.7** | **4.70 / 3.99** | **1.78** | **45 N** | **14.1 / 15.0** | **73 mJ** |
| 20 ms | baseline | 14.0 | 4.34 / 3.33 | 1.06 | 26 N | 18.2 / 20.0 | 40 mJ |
| 25 ms | baseline | 10.3 | 4.01 / 2.64 | 0.72 | 18 N | 21.8 / 25.2 | 25 mJ |
| 10 ms | light | 24.9 | 5.12 / 4.67 | 2.22 | 56 N | 9.7 / 10.0 | 99 mJ |
| **15 ms** | **light** | **12.5** | **4.74 / 4.03** | **1.03** | **26 N** | **14.1 / 15.0** | **43 mJ** |
| 20 ms | light | 8.0 | 4.40 / 3.39 | 0.62 | 15 N | 18.2 / 20.0 | 24 mJ |
| 25 ms | light | 5.9 | 4.09 / 2.72 | 0.42 | 11 N | 21.9 / 25.2 | 15 mJ |

The cock angle is under the stationary-arm 6 deg because the arm keeps moving during the swing and adds energy. Drag (0.002-0.02 N m, step-1 planning range) costs 0.4-4.2 mJ per step, which is 0.6-10% of the swing energy [C]. The cock is set so the high-drag case still arrives. At low drag the carrier arrives with 2.4-2.9 mJ left over. With a +0.1 deg arm phase error [T] that rises to 6.5-9.2 mJ.

**Spring [C], arc spring in pure bending (k = E b t^3/12L, sigma = E t theta/2L), same formulas as the step-1 ribbon.** Design swing about +/-5.8 deg relative (cock plus phase error plus 1 deg catch overtravel [T]). The stress is **fully reversed** every beat, so I used **500 MPa [T]**, not step 1's 1000 MPa. That's a placeholder until there's supplier fatigue data.
| Carrier, 15 ms | Nivaflex 45/18 | Carbon spring steel |
|---|---|---|
| baseline, k 21.7, 2.20 N m peak | t 2.0 x b 6.6 x L 44.5 mm (or 1.5 x 11.7 x 33.4) | 2.0 x 6.6 x 41.5 mm |
| light, k 12.5, 1.27 N m peak | t 2.0 x b 3.8 x L 44.8 mm (or 1.5 x 6.8 x 33.6) | 2.0 x 3.8 x 41.8 mm |

Packaging: two opposed arc segments of half width around the bore, about 70 deg of arc each at r about 35 mm [T], clamped to the arm hub at one end and the carrier flange at the other. **Cycle count: 1.7e8 (8.00 Hz) to 2.5e8 (11.46 Hz) fully reversed cycles per touring year [C, 3000 h T].** That's far outside the life the ribbon in step 1 was sized for, and no data I have covers it.

**Stop and locking [C].** A pawl drops into the 30-notch ring at r 40 mm. The notch holds the carrier both ways, because spring torque reverses sign while the carrier is held. The catch residual of 6.5-9.2 mJ (7-8 rad/s arrival) gives:
- 51-61 N peak on an elastomer-backed stop [T 2e5 N/m] over about 0.26-0.30 mm
- 512-606 N on bare hardened steel [T 2e7 N/m]

So the notch face needs a damped backstop. **A missed catch** (pawl late, carrier at full swing speed into the next tooth): 49-86 mJ, about 1.4-1.9 kN on a hard stop [C]. That's the event a second, never-actuated catch pawl and a sacrificial bumper have to survive.

**Reaction torque into the chassis [C, rough].** The prism and indexer are stationary, so every step pushes the chassis the opposite way. The balance's suspension sits on the same chassis and feels it. Free-body fixture model with the frame's rotational inertia about the optical axis as an assumption [T]:
- 0.05 kg m2 (fixture body alone): frame accel 36 rad/s2. Because the carrier always steps the same way while the balance alternates direction, the net rate over a full period is about zero. It shows up instead as **beat error 0.18-0.20 ms** (Gemini target 0.15 ms [S MAN]) and a **left/right amplitude asymmetry of 67-92 mdeg (0.30-0.41 m radial at 50 m)** when the step starts at or just after the zero crossing.
- Centring the step on the zero crossing (needs predictive electric firing) cuts the asymmetry to 0.4 mdeg, but beat error stays at 0.20 ms. [C]
- 0.5 kg m2 (rigidly clamped to heavy truss): about 10x smaller. [T]
- Real numbers depend on the yoke and truss stiffness, which aren't modeled. Fixes: a counter-rotating reaction mass on the indexer, a stiff heavy mount, or trimming the beat at setup with the pallet eccentric [S MAN], though that trim moves every time the rig changes.

## 5. Rewind motor
Catalog-class pick: the motor Gemini already chose, **maxon DCX 22 S, 24 V winding [S]**, now on a **GPX 22 HP 3-stage gearhead [S]** instead of the 16:1 2-stage. The arm turns continuously, so motor speed is just the mean step rate times the ratio.

| Carrier | Ratio | Arm peak / rms | Motor peak / rms (15.3 nominal, 120 stall) | Motor speed 8.00 / 11.46 Hz | Power (no regen / 4-quadrant regen [T]) | Verdict |
|---|---|---|---|---|---|---|
| baseline | 103:1 | 1.80 / 1.13 N m | 27.0 / 16.8 mN m | 3300 / 4720 rpm | 6.9-8.4 / 6.4-7.5 W | rms over nominal |
| baseline | 150:1 | same | 18.5 / 11.6 | 4800 / 6880 | 5.3-6.8 / 4.8-5.9 W | OK |
| **baseline** | **186:1** | same | **14.9 / 9.3** | **5950 / 8530** | **4.8-6.3 / 4.2-5.5 W** | **OK** |
| **light** | **186:1** | 1.05 / 0.65 N m | **8.6 / 5.4** | 5950 / 8530 | **2.6-3.5 / 2.3-3.0 W** | **OK, wide margin** |

All [C] from [S] catalog data. Gearhead output torque is under 3.3 N m continuous [S], and input speed is under 10,000 rpm [S]. Most of the power is gear loss on the spring's back-and-forth (65% efficiency each way [S]), not useful work.

**Backlash problem [S, C].** GPX 22 HP backlash averages 1.2 deg [S]. The arm torque reverses every beat (cock about +4.7 deg, catch about -4.6 deg relative), so the arm would clunk across 1.2 deg of lash every beat. The cock angle has to be held to about 0.1 deg [T] to keep the catch soft. Options, none sized yet: a zero-backlash drive (strain-wave gear or direct-drive frameless torque motor around the bore), a split anti-backlash gear on the last stage, or an arm-side encoder plus a softer catch. **This is open.**

**Power-cut reserve [C].**
- A free decay from 18 deg reaches the 3.5 deg unlock threshold after **2Q/pi x ln(18/3.5) = 365 beats at any frequency**. That's 22.8 s at 8.00 Hz and 15.9 s at 11.46 Hz. [T]
- The spec's 15 s test covers 240 steps (8.00 Hz, amplitude still 6.1 deg) to 344 steps (11.46 Hz, 3.85 deg). [T]
- Stored in the cocked indexer spring: **1 step**. The motor is the remontoire here, and it keeps essentially no reserve. [C]
- Adding the step-1 option-B barrel (0.80 J total) between motor and arm through reversible gearing: **11 steps (baseline) or 18 steps (light)**. Gear loss on the spring's back-and-forth makes each step cost 44-71 mJ net. [C]
- Covering the full 365-step decay mechanically would take 16-26 J of spring. That isn't a realistic spring. [C]
- Electrical hold-up for 15 s of indexing: 41-79 J, which is about 0.19-0.37 F at 24 V discharging to 12 V [C].
- **The bigger point: on a real mains loss the 150 W COB is dark too** (15 s would need 2.25 kJ). A visible "spiral down to a pinspot" can only be a powered, DMX-commanded decay: drive off, light on, indexer running. On a real power cut the honest behavior is dark, prism latched in place after at most one step, and the balance decaying freely. [C]

## 6. Dark time and duty cycle [C]
Dark per beat = actual step + 2 ms settle [T] + 2 x latch jitter. With electric firing the window is centred where it's scheduled. With the mechanical cascade it starts about 3 ms after centre.

| Step target | Release | 8.00 Hz dark | 11.46 Hz dark | Time-average light |
|---|---|---|---|---|
| (spec 2.2 ms blanking, reference) | | 3.5% | 5.0% | 95-96% |
| (measured 4.65 ms, reference) | | 7.4% | 10.7% | 89-93% |
| 10 ms | VCA / mech / solenoid | 19.0 / 20.3 / 25.1% | 28.0 / 29.8 / 36.7% | 63-81% |
| **15 ms** | **VCA / mech / solenoid** | **26.1 / 27.4 / 32.2%** | **39.4 / 41.2 / 48.1%** | **52-74%** |
| 20 ms | VCA / mech / solenoid | 32.6 / 33.9 / 38.7% | 50.9 / 52.7 / 59.6% | 40-67% |
| 25 ms | VCA / mech / solenoid | 38.5 / 39.7 / 44.5% | 62.8 / 64.6 / 71.5% | 28-62% |

- **Faster indexers trade torque for dark time.** Spring rate, cocked torque and latch load scale roughly with 1/t^2. Going from 15 to 10 ms takes the baseline latch from 45 to 96 N, the spring from 21.7 to 43.3 N m/rad and the cocked torque from 1.78 to 3.86 N m, and it saves about 7-11 points of dark time. [T]
- **Perceived brightness.** The chop runs at 16.0-22.9 Hz, below the roughly 60 Hz cone fusion plateau [S]. Talbot-Plateau (brightness = time average) only holds above fusion, so the audience will see a 16-23 Hz flicker. That could be a deliberate stutter look or a flaw. Time-averaged output at 15 ms is 59-74% of continuous [C]. You can't drive the 150 W COB harder during lit time to make up for it without exceeding its rating.

## 7. Escapement remontoire torque (item 12) [C]
Now that item 7 is set, the remontoire only drives the escapement (plus the trip share if the release is mechanical). The indexer has its own motor and spring.
- Escapement need (step 1): 6.67e-4 N m at 8.00 Hz, 1.37e-3 N m at 11.46 Hz. Mechanical trip share at 10%: 2.3e-5 to 4.8e-5. Times 2 headroom for amplitude response (DMX ch 11) [T]: **2.8e-3 N m nominal max**. Clutch at Gemini's 1.5x ratio: **4.2e-3 N m**.
- **Gemini's 0.12 N m is 42x too high.** Fed to the escapement it would overbank the balance. [S]
- Pre-wound spiral (step-1 option B layout, 2 turns plus a 45 deg band, 1000 MPa at clutch torque [T]):
  - **Nivaflex 0.08 x 4.0 x about 177 mm (recommended).** Same thickness and about the same length as Gemini's ribbon, about 3.3x wider.
  - Alternatives: 0.05 x 10.2 x 110 mm, or 0.10 x 2.6 x 225 mm.
  - k 2.1e-4 N m/rad. Ripple +/-0.26% for +/-2 deg of control error. 1.6% sawtooth per 12 deg beat if it's wound continuously while the wheel steps.
- Gemini's 0.08 x 1.2 section maxes out at 1.28e-3 N m at 1000 MPa, which is 30% of the clutch torque needed. [C, S]
- Who winds it: in the fixed-balance build, a branch from the indexer arm turns at the same mean rate as the escape wheel (both 12 deg per beat), so the wind angle self-regulates. Its setpoint, though, has to be adjustable independently of the arm phase, which is locked to the indexer cock. That means either a small trim actuator on the spring's outer end or Gemini's own small winding motor. Not decided here. [S]
- **Carousel conflict [C].** On the cage the remontoire is wound by cage rotation against a fixed ring (tourbillon pass). **Parked, nothing winds it.** It holds 2.2 mJ in its control band, which is 0.3-0.9 s of running at 2.3-6.8 mW. Its total store is 42.5 mJ, which is 6-18 s at falling torque. So "park" starves the escapement within seconds. The fix is a driven winding ring (a ring gear the cage pinion rolls on, turned by a motor instead of fixed), so winding no longer depends on cage rate. That adds a bearing and gear ring in the 1 mm stationary band, which is already tight.

## 8. DMX map update (15 channels, simulation only, no real DMX output)
Step-1 channels 1-13 stay as they were except where noted. Two channels are added. [C]

| Ch | Function | Res | Range / mapping | Default | Note |
|---|---|---|---|---|---|
| 1-2 | Intensity | 16-bit [T] | 0-100% [T] | 0 [T] | unchanged |
| 3-4 | Beat frequency | 16-bit [T] | onto the modeled 8.00-11.46 Hz [T] | f_min | unchanged |
| 5-6 | Amplitude setpoint | 16-bit [T] | 0-18 deg via escapement remontoire wind [T] | 0 [T] | now acts on the 2.8e-3 N m remontoire, not 0.12 [C, S] |
| 7 | Eddy brake | 8-bit [T] | 0 off to 255 max [T] | 0 [T] | unchanged |
| 8-9 | **Pattern azimuth** (was lattice phase offset) | 16-bit [T] | 0-360 deg optical [T] | 0 [C] | **Now has a mechanism:** with the carousel parked, the cage parks at -azimuth (the projected pattern turns at minus the cage angle, tourbillon pass). Without a carousel it stays sim-only. |
| 10 | Shutter / blanking / strobe | 8-bit [T] | 0-15 closed; 16-31 open, sync blanking on; 32-47 blanking off (sim only); 48-239 strobe; 240-255 camera sync [C] | 16 [C] | blanking window now sized from section 6 |
| 11 | Amplitude response time | 8-bit [T] | slow to fastest, torque-capped at the clutch | 0 [C] | unchanged |
| 12 | Transit lock | 8-bit [T] | 32-63 LOCK, 192-223 RELEASE, rest no action [C] | 0 [C] | interlocks extended (below) |
| 13 | Control | 8-bit [T] | 10-19 soft reset; 20-29 auto-tune; 30-39 decay test (powered, light on, drive off); 40-49 re-home prism index; **50-59 re-home cage** (all hold 3 s) [C] | 0 [C] | 50-59 added [C] |
| **14** | **Carousel rate** | 8-bit [T] | 0-15 **park** at ch 8-9 azimuth; 16-135 CW, 1 rev/15 min to 1 rev/min, log scale; 136-255 CCW, same scale [C] | 0 [C] | Capped at 1 rpm (tourbillon condition 3). Rate changes are ramp-limited [T 1 s minimum], because cage acceleration couples into the balance as -I_ring x alpha. |
| **15** | **Indexer mode** | 8-bit [T] | 0-15 normal (escapement-released, blanking synced); 16-31 **hold** (prism latched, balance still sweeps radially); 32-47 step every 2nd beat; 48-63 every 3rd; 64-79 every 5th; 80-95 step centred on zero crossing (electric only, default when available); 96-255 reserved [T] | 0 [C] | Divide and hold modes need the electric latch. With the mechanical cascade only "normal" and "hold" exist, and hold needs a blocking lever. |

Interlocks, all step-1 rules kept, plus: [T]
- **LOCK** is accepted only when amplitude is under 0.5 deg [T], the indexer is latched (index encoder at rest), and the cage is parked at its home angle with the park brake engaged. The ring clamp works through the cage port that only lines up at home (tourbillon pass). The sim applies the eddy brake first.
- **RELEASE** is accepted only with the lock seated, no fault flags, and the cage park brake engaged. The cage starts turning only after release is complete.
- **DMX loss:** hold lock state; drive stops and the brake ramps in; the cage ramps to a stop (no auto-park to home while the balance is moving); the indexer keeps following the escapement until the amplitude is below the unlock threshold, then stays latched.
- **Power-up:** mechanical lock state kept. Cage re-home and prism re-home run only after RELEASE.
- **Park duration:** while ch 14 = park, the sim shows the cage remontoire running down. Without a driven winding ring it forces cage rotation or decays the amplitude after about 1 s (section 7). [C]

## Recommendation between the release options
1. **Electric release (stationary optical sensor plus voice-coil latch on a rolling sear), as the baseline.** It's the only option that works with and without the carousel. It puts zero load on the balance. It can fire predictively and centre the step on the zero crossing, which also kills the reaction-torque amplitude asymmetry. And it's what a touring tech can diagnose and swap. Size the coil one frame up from NCC03-07, or put one cascade stage in front so the coil stays inside its 0.4 W continuous rating at 11.46 Hz. [C]
2. **Mechanical 3-stage cascade, fixed-balance build only,** as a deliberate "the watch releases the light" variant if that story matters enough. It fits the 10% budget with little margin to spare, but it adds 3 sear wear points and a fixed 3-4 ms delay after centre, which gives the larger reaction asymmetry. [T]
3. **Axial push ring: drop it.** It's 7.5-30x over budget. [C]

## Top risks
1. **Reaction torque from a stationary indexer into the balance.** 0.18-0.20 ms beat error and up to 0.4 m of left/right throw asymmetry at 50 m on a light rig. It's rig-dependent and probably needs a reaction-cancelling indexer. [T]
2. **Gearhead backlash (1.2 deg) against a torque that reverses every beat**, when the cock angle has to hold to about 0.1 deg. Without a zero-backlash drive the catch gets hard and noisy. [T]
3. **Indexer spring fatigue.** 1.7-2.5e8 fully reversed cycles per touring year at an assumed 500 MPa, with no supplier data. [C]
4. **Catch reliability at 16-23 Hz.** A missed catch is a 49-86 mJ, 1.4-1.9 kN hit. The design needs a second catch pawl and a sacrificial stop. [T]
5. **Dark time and flicker.** 26-41% dark at 15 ms, flickering at 16-23 Hz. It may undercut the look, and it gets worse toward 20 Hz if the 4-20 Hz target is ever reached. [T]
6. **Carousel park starves the escapement** unless a driven winding ring fits in the 1 mm band. [T]
7. Unchanged and still gating: the balance suspension has not passed 0.25 mm in any orientation. [T]

## Decisions for Caleb
1. **Release:** electric (story becomes "the watch times it, a sensor releases it"), or the mechanical cascade on a fixed-balance build only?
2. **Step time vs dark time:** 15 ms (26-41% dark), 10 ms (19-30% dark, about twice the spring and latch load), or something else? [T]
3. **Carrier:** the light Kaydon KA025 build (about half the torque, wide motor margin), or the 61813 baseline?
4. **Power-cut behavior:** the spec's 15 s spiral-down becomes a powered DMX decay effect, and a real mains loss goes dark with the prism latched. Or pay for hold-up (0.2-0.4 F at 24 V for the indexer, kilojoules for the light)? [C]
5. **Carousel park:** accept a short park (seconds), or add a driven winding ring so park can last?
6. **Flicker:** is a visible 16-23 Hz stutter part of the look, or a problem to engineer down? [T]

## Assumptions and uncertainties
- All closed-form or small RK4 models. No escapement dynamics simulation, no FEA, no tests.
- The 10% budget tier, friction coefficients, sear travel, stage masses, lock radius, 0.1 deg arm phase error, 2 ms settle, latch jitters, stop stiffnesses, 500 MPa reversed-bending allowable, fixture inertia and the 2x remontoire headroom are all [T].
- The solenoid response time is not from a datasheet.
- The reaction model treats the fixture as a free rigid body about the optical axis. Real yoke and truss stiffness can raise or lower these numbers.
- Drag range 0.002-0.02 N m is step 1's order-of-magnitude planning range. [T]
- Pure-bending spring formulas need end-moment clamping. The shape and clamping of a real arc spring aren't designed.
- Escapement efficiency 0.35 is step 1's assumption. A better escapement lowers the item-12 torque in proportion. [T]

## Deviations from earlier docs (and why)
- Step 1 said a 15 ms step needs about 0.77 N m (light, bang-bang). Now the cocked torque is 1.03 N m (light), because the spring's harmonic law has a higher peak than bang-bang and the moving arm changes the cock. Step 1's figure was a lower bound. [T]
- Step 1 said dark time is 25-35%. Now it's 26-41%, because the beat at 11.46 Hz is 43.6 ms and the settle and jitter are counted. [T]
- Tourbillon pass: "the cage self-winds its escapement remontoire" conflicts with Caleb's park choice. Flagged here, with the fix (driven winding ring).
- Tourbillon pass and Gemini BOM: 16:1 2-stage gearhead. Now a 150-186:1 3-stage, because the arm runs at 32-46 rpm and the torque is about 1-1.8 N m. [S]
- Parent brief: "spring-loaded cam or Geneva indexer". I'm recommending a spring-swing indexer with a cam-notch lock instead of a driven cam or Geneva. A spring-driven single-turn cam dissipates 0.31-0.54 J per step at a hard stop (section 4, D1). [C]
