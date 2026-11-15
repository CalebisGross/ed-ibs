# ED-IBS working revision, step 1
Date: Sun Nov 15 2026 (CT). Status: analysis and documents only. No app code, no repo work, no hardware claims.
Numbers: `working-revision-step1.py`, output saved in `working-revision-step1-results.txt`. Every number below comes from that script or from a cited source.

Tags: **[T]** design target (picked here or by Caleb), **[C]** calculated prediction (simple closed-form models, no FEA, no test), **[S]** cited catalog or source value.
Sources: `full-user-specification.md` (spec), `blueprints-raw.txt` (BP), `manual-raw.txt` (MAN), `gemini-hardening/conversation.md` (GEM), `approved-requirements-ledger.md`, `gemini-revision-deviations.md`, `hardware-docs-review.md`. Catalog values were looked up this session: SKF 61812/61813 product tables, Kaydon Reali-Slim KA type X table, Edmund Optics Dove prism table (45-403, 49-429), and VAC / Générale Ressorts Nivaflex 45/18 datasheets.
Items 1-16 are Caleb's WORKING decisions. Where things were unclear I used real-world manufacturability and touring demands as the deciding test. Nothing below was tuned to make a target come out right.

## Summary
- **(a) Bore and bearings work.** A 56 mm clear-bore 7075 carrier on SKF 61813-2RZ (65x85x10) or Kaydon KA025 (63.5x76.2x6.35) bearings fits inside the 102 mm chassis bore. The 25 mm Dove prism fits with 10.3 mm radial room at the corners.
- **(a) Indexing the carrier through the escapement does not work. This is the big finding.** The indexed set (carrier, prism, mounts, races, index ring) is 2.1e-4 to 3.6e-4 kg m2 [C]. Reflected through the pallets, that is 14x to 24x the balance ring inertia [C]. A balance cannot drag that and stay isochronous. Stepping 12 deg inside the blanking window would take 8 to 62 N m [C], and the remontoire supplies 0.12 N m [S]. **Item 7 should go back to Caleb.**
- **(b) Ribbon resized.** For 0.12 N m at 45 deg: Nivaflex 45/18 at 0.40 x 7.0 x about 54 mm unpreloaded, or 0.30 x 12.1 x about 670 mm pre-wound spiral [C]. Both stay under a 1000 MPa allowable at the 0.18 N m clutch torque [T]. The 0.12 N m figure itself is not derived anywhere. The escapement alone needs about 0.0007 to 0.0014 N m [C]. 0.12 N m only makes sense if the remontoire also powers the indexing, so this item depends on item 7.
- **(c) DMX: 13 channels, 16-bit on intensity, frequency, amplitude and phase.** Frequency is capped to the modeled range. Transit lock and control functions need a hold-to-actuate inside dead-banded windows, plus motion interlocks. Simulation only.
- **(d) 4-20 Hz cannot be reached with blades alone.** With the original 4-blade law and the balance ring alone (item 7 architecture), the range is **8.00-11.46 Hz** [C]. The top end is limited by stress: at +/-18 deg with 0.25 mm blades, the 510 MPa limit is reached at L = 8.78 mm, and 8.5 mm gives 527 MPa [C]. If the carrier oscillates with the cage (Gemini architecture), the range is 2.6-3.8 Hz [C]. Covering 4-20 Hz needs a 25:1 stiffness ratio. The 18-8.5 mm length range gives 2.1:1. Getting there needs the approved auxiliary-spring direction, which is still unproven.

---

## (a) Core optical stack around the 56 mm clear bore (items 2, 7, 13)

### a1. Bearings
Requirement: bearing ID of at least 56 mm plus a carrier wall [T 56 mm, Caleb]. Candidates, all values [S]:

| Bearing | d x D x B (mm) | Mass | Wall over 56 mm bore [C] | Notes |
|---|---|---|---|---|
| SKF 61812-2RZ (also -2RS1) | 60 x 78 x 10 | 0.11 kg | 2.00 mm | 618 thin-section deep groove. 2 mm of 7075 under a press fit is too thin to hold roundness. Not recommended. |
| **SKF 61813-2RZ** | **65 x 85 x 10** | **0.13 kg** | **4.50 mm** | **Primary.** Metric, stocked everywhere, non-contact seals. Cheap enough to replace on the road. |
| Kaydon Reali-Slim KA025XP0 (type X, 4-point) / KA025CP0 (radial) / KA025AR0 (angular) | 63.5 x 76.2 x 6.35 | 0.059 kg (0.130 lb) | 3.75 mm | Lighter alternative with lower inertia. Inch-sized, open (no seals), longer lead time. |

Real-world picks [T]:
- **Use non-contact seals (2RZ/2Z) or open bearings with labyrinths, not contact seals (2RS).** At a 65 mm bore, contact seals should drag roughly 0.05-0.4 N m each [C]. That is an order-of-magnitude estimate, not a datasheet value. It is comparable to or larger than the whole 0.12 N m drive. Haze protection then has to come from a labyrinth plus the sealed remontoire cartridge, not from the bearing seals.
- Two bearings, one fixed and one floating (or a lightly preloaded duplex pair), spaced about 100 mm apart. That carries the 120 mm carrier in any orientation.
- The 61813 housing is 85 mm, so a 4 mm wall makes about a 93 mm OD. That fits the 102 mm chassis tube bore [S MAN ED-01]. The Gemini ED-03 arbors sit at about 36-39 mm radius [S BP], which is inside an 85 mm bearing housing. The gear train has to move outward, which affects item 11. With the 61813 there is very little radial room left inside a 102 mm tube.

### a2. Prism carrier geometry [T unless tagged]
- Material: 7075-T6 aluminum. That is lighter than Gemini's 303 SS (929 g [C] for their 46/28.2 x 112 mm part). Hard-anodize the journals or use steel journal sleeves if fretting shows up.
- ID 56.0 mm through, the protected bore.
- Body OD 60 mm (2 mm wall) between the journals. Journals 65.0 mm h5 x 10 mm at each end. Overall length 120 mm (prism 106.1 [S GEM BOM] plus retainers).
- Prism mount: four corner rails (PEEK or anodized aluminum with Viton/Kapton pads) fill the space between the prism corners and the bore. End retainers use the Belleville preload from the Gemini package (washer spec still conflicting, item list in hardware-docs-review).
- Static balance: the CoM of a Dove prism sits below its optical axis because the ends are tapered. The offset is 1.28 mm, which is 163 g mm of imbalance [C], or 0.0016 N m of worst-case gravity torque [C]. That needs a 6.3 g counterweight at 26 mm radius [C]. This matters because the fixture must work in any mounting orientation.
- Coaxial index ring / annular escape wheel (if item 7 stays): hardened steel, 80/62 x 3 mm [T].

### a3. Prism fit (item 13)
- Prism: 25 x 25 mm leg [S GEM BOM, Edmund 45-403]. Length 106.1 mm per Gemini. Edmund lists 103.18 mm for the uncoated 45-403 and 105.68 mm for the coated 49-429 [S]. I could not verify Gemini's "#45-942", so **length is a source conflict to confirm when the actual part is chosen.**
- Cross-section diagonal is 35.36 mm [C]. That leaves **10.32 mm** of radial clearance to the 56 mm bore [C]. **Fits.**
- Optical note, not a geometry problem: only the 25 x 25 mm prism aperture rotates the image. Light inside the 56 mm bore but outside the prism either passes un-rotated or hits the mounts. The manual's 75 mm collimated beam [S MAN] cannot go through a 25 mm prism. Either the light engine is sized for a beam of about 24 mm or less, or the prism grows. The largest Dove that fits the 56 mm bore with 1 mm margin is about 38 mm, and that would make it roughly 3.5x heavier with roughly 8x the inertia (scaling, [C]-rough). Carry this into the optics step (item 15).

### a4. Mass and inertia, indexed set [C]
Assumed parts are marked. Inertia is about the optical axis.

| Part | Mass | I (kg m2) |
|---|---|---|
| 7075 body tube 60/56 x 100 | 102 g | 8.62e-5 |
| 7075 journals 65/56 x 10 (x2) | 48 g | 4.42e-5 |
| N-BK7 prism 25 x 25 x 106.1 (numerically integrated trapezoid) | 127 g | 1.33e-5 |
| Prism mount rails (assumed 35 g at r = 23 mm) | 35 g | 1.85e-5 |
| Counterweight | 6 g | 0.42e-5 |
| Bearing inner races (assumed 40% of 2 x 61813) | 104 g | 13.1e-5 |
| **Subtotal carrier set** | **423 g** | **2.98e-4** |
| Steel index ring 80/62 x 3 | 47 g | 6.05e-5 |
| **Total indexed (61813 build)** | **470 g** | **3.58e-4** |
| Light variant: Kaydon KA025, 1.5 mm body wall, Ti index ring 76/62 x 3 | 343 g | 2.06e-4 |

For comparison, the spec balance ring (42 g, 56/72 mm) is 4.368e-5 [C from spec]. **The indexed set is 4.7x to 8.2x the balance ring's own inertia.**

### a5. What the escape wheel must index
- 12 deg mech per beat [S spec], which is 24 deg optical. At 8.00 / 11.46 / 20 Hz the beats come every 62.5 / 43.6 / 25 ms, so the mean prism speed is 32 / 46 / 80 rpm [C].
- Stepping 12 deg (0.209 rad) with a bang-bang profile takes tau = 4 theta I / t^2. Results for the 61813 build [C]:

| Step time | Peak torque | Peak KE per step |
|---|---|---|
| 2.2 ms (spec blanking) | 62 N m | 6.5 J |
| 4.65 ms (measured blanking at 18 deg) | 13.9 N m | 1.45 J |
| 10 ms | 3.0 N m | 0.31 J |
| 20 ms | 0.75 N m | 0.08 J |

- Free acceleration under 0.12 N m with no friction: 35 ms per step (61813 build) or 27 ms (light build) [C]. That is most of a beat at 8 Hz and longer than a beat at 20 Hz.
- **Coupling to the balance.** In a lever escapement the wheel is driven together with the balance through the lift. Crudely, the wheel turns 12 deg while the balance crosses the +/-3.5 deg lift zone, so the ratio is about 1.71 [C, crude]. The reflected inertia is I x 1.71^2 = 1.05e-3 kg m2, which is **24x the balance ring** (14x for the light build) [C]. If the carrier were dragged at balance-center speed, its KE would be 0.13 J against 0.0054 J stored in the balance at 18 deg [C]. Even the prism alone, with no carrier, reflects to 0.9x the ring [C]. A watch works because the escape wheel's reflected inertia is tiny next to the balance. Here it is the other way round.
- **Verdict [C]: the escapement cannot index this prism directly, through the pallets, inside the blanking window, at any inertia a 56 mm carrier can have.** This is physics, not a tolerance problem.
- Real-world options for Caleb (my recommendation first):
  1. **Release-only escapement plus a separately powered indexer.** The escapement only times and releases. A spring- or motor-powered Geneva/cam indexer steps the prism on each release. The balance never feels the carrier. For the light build, a 15 ms step needs about 0.77 N m peak [C], with the blanking stretched to cover it. That costs about 25-35% dark time at 8-11.5 Hz [C].
  2. **Beat-locked servo.** An encoder reads the balance, and a small servo or stepper indexes the prism in sync. This is the most manufacturable and serviceable option. The horology becomes the timebase, not the drive.
  3. **Continuous prism rotation plus synchronous LED gating.** The prism turns steadily at the mean speed, and the COB is gated so only discrete star positions show. There is no indexing torque at all, but the radial sweep gets chopped into dots unless the gate windows are long.
  4. **Keep direct indexing** and accept large smear plus a balance that is no longer isochronous. Not recommended.

---

## (b) Remontoire ribbon resizing (item 12)
Formulas, pure bending of a clamped flat ribbon (spiral or leaf, no coil contact):
- Stiffness k = E b t^3 / (12 L), torque M = k theta.
- Bending stress sigma = 6 M / (b t^2) = E t theta / (2 L). Both forms are checked in the script and agree.
- Stored energy U = M theta / 2 (linear spring).

Inputs:
- Nivaflex 45/18: E = 220 GPa, Rm 2150 MPa, Rp0.2 1720 MPa at 50% cold work, aged [S VAC datasheet]. Strip available up to 55 x 0.70 mm [S Générale Ressorts].
- Carbon spring steel: E = 205 GPa [S typical handbook value, not a specific mill cert].
- **Allowable 1000 MPa at the 0.18 N m clutch torque [T]**. That is about 0.47 Rm and 0.58 Rp0.2. It is conservative for a mostly static mean stress with a small +/-2 deg ripple, chosen because of the touring life claim (10 million cycles [S GEM]). A fatigue-rated allowable needs supplier data.
- Nominal torque 0.12 N m at 45 deg [S MAN ch5, BP]. Maximum 0.18 N m = clutch breakaway [S MAN ED-09]. Required b t^2 = 6(0.18)/1000 MPa = 1.08 mm3 [C].

The Gemini ribbon (0.08 x 1.2 x 180 mm) gives k = 6.3e-5 N m/rad, or 4.9e-5 N m at 45 deg, which is **about 2440x short** [C]. This replaces my earlier rough 2700x, which used E = 200 GPa.

**Option A: unpreloaded, 45 deg nominal (literal Gemini intent)** [C]:

| Material | t x b x L (mm) | sigma @0.12 | sigma @0.18 |
|---|---|---|---|
| Nivaflex 45/18 | 0.30 x 12.1 x 39 | 661 MPa | 992 MPa |
| **Nivaflex 45/18** | **0.40 x 7.0 x about 54** (6.8 mm min width) | about 645 MPa | about 965 MPa |
| Nivaflex 45/18 | 0.50 x 4.4 x 66 | 655 MPa | 982 MPa |
| Spring steel | 0.40 x 6.8 x 49 | 662 MPa | 993 MPa |

The weak point of Option A: a +/-2 deg control band [S BP] moves the torque by **+/-4.4%** [C]. Gemini claims +/-2.5% [S MAN], and a linear spring would need about 80 deg of total wind to deliver that [C]. Option A also stores only 0.047 J [C].

**Option B: pre-wound spiral (2 turns preset plus a 45 deg operating band). This is my pick for touring.** [C]:
- Nivaflex 0.30 x 12.1 x about 670 mm, or 0.20 x 27 x about 440 mm. k = 0.0090 N m/rad. 1000 MPa is reached at the 0.18 N m clutch torque.
- Torque ripple for +/-2 deg: **+/-0.26%**. That meets the Gemini spec with plenty of margin.
- Stores 0.80 J in total, 0.091 J in the operating band.
- This is how real mainspring barrels are built, it tolerates control error, and the supplier can make the strip.

**Caveat that ties this to item 7 [C]:** keeping 18 deg against Q 350 losses needs only about **6.7e-4 N m** (at 18 mm) to **1.4e-3 N m** (at 8.5 mm) at the escape wheel, assuming 35% escapement efficiency [T assumption]. That is 85x to 180x below 0.12 N m. Delivered straight to the escapement, 0.12 N m would overbank the balance. It only makes sense if the remontoire also powers the indexing. On top of that:
- Driving the indexed train at 0.12 N m takes about 0.40 W at 8 Hz [C].
- The spec's 15 s power-cut run-down would need about 6 J at that rate, but only about 0.034 J if the remontoire drives the escapement alone [C].

So the final torque spec waits on item 7. The formulas above scale directly.

---

## (c) Needs-based DMX map (item 6). Simulation only, no real DMX output.
This map merges the spec's 4 channels with Gemini's 8. Frequency is set in Hz and the model converts it to active length, so a designer types a tempo and not a millimeter value. Spec channel 4 ("phosphor-laser intensity") becomes source-agnostic intensity, because the Gemini source is a COB LED.

| Ch | Function | Res | Range / mapping | Default | Why this resolution [C] |
|---|---|---|---|---|---|
| 1-2 | Intensity (spec ch4, Gemini ch1-2) | 16-bit | 0-100%, square-law curve option | 0 | Industry norm. 8-bit steps are visible at low levels. |
| 3-4 | Beat frequency (spec ch2 via model) | 16-bit | 0 to 65535 maps linearly onto **[f_min, f_max] of the active model**. Today that is 8.00-11.46 Hz (d). Values never exceed the model, and there is no 1-60 Hz. Stop is not on this channel. | f_min | Span 3.46 Hz. An 8-bit step is 0.0136 Hz, which drifts up to 0.41 cycles/min, so tempo sync slips audibly within a song. A 16-bit step is 5.3e-5 Hz, or 0.0016 cycles/min. |
| 5-6 | Amplitude setpoint (spec ch1, remontoire torque, closed loop on amplitude) | 16-bit | 0 to 18 deg (or the stress-capped value at the current L). 0 = no drive, so the oscillator decays naturally. | 0 | At 50 m and phi = 51 deg, one 8-bit step moves the beam 311 mm radially, which shows as stepping during slow fades. 16-bit gives 1.2 mm. |
| 7 | Eddy brake (spec ch3) | 8-bit | 0 = off, 255 = max gamma | 0 | Damping is a rate. 256 steps is finer than the yoke can position. |
| 8-9 | Lattice phase offset (Gemini ch4) | 16-bit | 0-360 deg optical | 0 | An 8-bit step is 1.41 deg, or a 329 mm jump at a 13.4 m rest radius. Sim-only: **there is no hardware mechanism for this yet** (it needs a differential or a rotating stator). |
| 10 | Shutter / blanking / strobe (Gemini ch6 plus spec chopper toggle) | 8-bit | 0-15 closed; 16-31 open, synchronous blanking ON; 32-47 open, blanking OFF ("raw smear" compare, sim only); 48-239 LED strobe 1-30 Hz; 240-255 camera rolling-shutter sync | 16 | Discrete functions. |
| 11 | Amplitude response time (replaces Gemini "pulse-boost") | 8-bit | 0 = slow (about 2 s to full), 255 = fastest the drive allows. Always torque-capped at the clutch. | 0 | Gives the designer a real control instead of an undefined "boost" mode. |
| 12 | Transit lock (Gemini ch7) | 8-bit | 0-31 no action; 32-63 LOCK request; 64-191 no action; 192-223 RELEASE request; 224-255 no action | 0 | See interlocks below. |
| 13 | Control (Gemini ch8 plus spec power-cut test) | 8-bit | 0-9 none; 10-19 soft reset (hold 3 s); 20-29 auto-tune (hold 5 s); 30-39 power-cut decay test (sim only, hold 3 s); 40-49 re-home prism index (hold 3 s); 50-255 reserved | 0 | Dead-banded windows, so sweeping a fader never triggers anything. |

Transit lock interlocks (simulated):
- **Hold to actuate.** The value has to stay continuously inside the window for 5 s (release) or 3 s (lock). Any exit resets the timer.
- **LOCK** is accepted only when amplitude is under 0.5 deg [T] and the prism index is at rest. The sim applies the eddy brake automatically first. Engaging a cam clamp on a moving ring is how flexures get broken.
- **RELEASE** is accepted only with the lock sensor reading engaged-and-seated and no fault flags.
- **DMX loss** holds the current lock state; it never auto-locks while running. The drive stops and the brake ramps in, so the fixture decays to rest.
- **Power-up** keeps the mechanical lock state (it is a physical latch). The manual mechanical override key stays [S MAN].

---

## (d) Flexure frequency range re-derived with the working decisions (items 1, 3, 4, 5)
Laws:
- Spec law: K = 0.1104 (18 mm / L) N m/rad [S], kept unchanged.
- Beam law for cross-check: K = N E b t^3 / (12 L) with N = 4. Each leaf is in pure bending, which puts the rotation center at mid-leaf, the same assumption as the spec stress formula.
- Frequency: f = sqrt(K/I) / (2 pi).
- Stress: sigma = E t theta / (2 L).

Inputs:
- E = 114 GPa, 510 MPa limit [S spec].
- t = 0.25 mm minimum [T item 4].
- L from 18 down to 8.5 mm [T item 5].
- Amplitude +/-18 deg [T item 3].

Results:
- The spec's Kbase implies a blade width of **3.35 mm** at t = 0.25 [C]. Gemini's 4 mm blades at 0.25 give 0.132 N m/rad at 18 mm [C]. That is a consistency check, not a change.
- **Stress cap [C]:** sigma at +/-18 deg is 249 MPa at 18 mm, 510 MPa at **8.78 mm**, and **527 MPa at 8.5 mm**. So the bottom 0.28 mm of the tuning range breaks the spec's own limit at full amplitude. Working proposal [T]: clamp L_min to 8.78 mm at full amplitude, or cap amplitude at short L. The 10 mm Gemini trim actuator covers the 9.22 mm of travel. Stop contact slightly beyond +/-18 deg is rare and transient, so it should be checked against yield (about 880 MPa typical Ti-6Al-4V, [S typical]) and not against the endurance limit.

| Case | I (kg m2) | f @18 mm | f @8.78 mm | f @8.5 mm |
|---|---|---|---|---|
| D1 item-7 architecture, ring only, spec law | 4.37e-5 | **8.00** | **11.46** | 11.64 |
| D2 ring only, beam law b = 4 mm | 4.37e-5 | 8.75 | 12.53 | 12.73 |
| D3 Gemini architecture (carrier oscillates with ring), spec law | 4.02e-4 | 2.64 | 3.78 | 3.84 |
| D4 Gemini architecture, beam law b = 4 | 4.02e-4 | 2.88 | 4.13 | 4.20 |
| D5 Gemini's own 0.18 x 4 x 12 blades on the new carrier | 4.02e-4 | 2.16 (fixed) | | |

All frequencies in Hz, all [C].

**4-20 Hz is not reachable [C].**
- A 1/L law over 18 to 8.5 mm gives a 1.455:1 frequency ratio. 4-20 Hz needs 5:1, which is 25:1 in stiffness.
- With length alone that means 18 down to 0.72 mm, which is physically absurd and far over stress.
- With the ring only, 4 Hz needs K = 0.0276 and 20 Hz needs K = 0.690 N m/rad [C], the same numbers as the earlier retuning work.
- With the carrier oscillating, it needs 0.254 and 6.34 N m/rad [C].

What would have to change, real-world first:
1. **Auxiliary variable-rate spring** (approved direction, `tuning-mechanism-proposal.md`). The base pivot has to be at or below 0.0276 N m/rad. At t = 0.25 and L = 18 that means blades about 0.84 mm wide [C], which is weak out of plane and makes the open gravity-suspension problem worse. Longer leaves are the better route, as in the earlier proposal. The auxiliary spring then supplies up to about 0.66 N m/rad. Feasibility is not proven.
2. **Narrow the target** to what the blades can do (about 8-11.5 Hz, or up to about 12.5 Hz with 4 mm blades). This is Caleb's call, and item 1 currently says to keep 4-20 Hz.
3. Big inertia changes (moving masses) cannot give 25:1. Not recommended.

For now the sim and DMX cap stay at the modeled 8.00-11.46 Hz range (item 1 working rule), labeled as such.

---

## Still open (unchanged by this step, kept visible)
- **Blanking:** measured 4.65 ms at 18 deg against 2.2 ms in the spec. Step 1 adds that a real index step needs 15 ms or more, so blanking gets longer still under options 1 and 2.
- **Q 350 decay:** the amplitude e-fold time is Q/(pi f) = 13.9 s at 8 Hz and 9.7 s at 11.46 Hz [C]. The 15 s power-cut "spiral down" is mostly Q, not spring run-down.
- **15 deg optical bias:** the rest spot is never dead center, which conflicts with the spec's "dead-center pinspot".
- **Impulse timing:** spec zero-velocity impulse against center-crossing practice. Still stood in for by the lift-zone drive.
- **Suspension:** the 0.25 mm all-orientation gravity shift is still unpassed. An extra 0.47 kg carrier on its own bearings (item 7) does not load the flexures, but the Gemini architecture would.

## Items that should flip from WORKING to Caleb's decision
- **Item 7 (prism motion / indexing): FLIP.** Direct escapement indexing fails on inertia (a5). Caleb needs to pick option 1 (release-only escapement plus a powered indexer, my recommendation), 2 (beat-locked servo), 3 (continuous rotation plus LED gating), or 4 (accept smear and non-isochronism).
- **Item 12 (remontoire torque): stays WORKING, sizing done, but the final torque depends on the item 7 choice.**
- **Item 1 (frequency): stays WORKING, but Caleb should know** the honest modeled range is 8.00-11.46 Hz until an auxiliary spring is designed and checked.
- Item 13: resolved geometrically. The beam diameter against the 25 mm prism aperture moves to the optics step.

## Assumptions and uncertainties
- These are linear small-model formulas. The cross-pivot is in pure bending, so there is no load stiffening, no parasitic shift, and no curb-pin end effects. The spiral spring is free with no coil friction.
- Inner-race mass fraction (40%), mount rail mass, index ring size, and the 35% escapement efficiency are assumptions. Changing them shifts the indexed inertia by tens of percent but does not change the verdict: even the prism alone reflects to 0.9x the ring.
- The lift ratio of 1.71 is crude, from 12 deg of wheel motion over a 7 deg lift.
- Bearing seal drag is an order-of-magnitude figure only.
- Prism length differs between Gemini (106.1) and Edmund (103.18 / 105.68). Mass changes by about 3%.
- The 1000 MPa ribbon allowable is a chosen target, not supplier fatigue data.
- Ledger numbering: rows 14-16 of the deviations table (stiffness vs freq, divergence, certs) do not line up with recommendations 14-16 (divergence, touring hardware, certs). This doc uses the table numbering. Recommendation 15 (touring hardware) has no table row.
