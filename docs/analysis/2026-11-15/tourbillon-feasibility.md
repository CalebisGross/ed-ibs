# ED-IBS tourbillon feasibility pass
Date: Sun Nov 15 2026, 11:01 CT. Status: analysis and documents only. No app code, no repo work, no hardware or safety claims. Nothing here is validated.
Numbers: `tourbillon-feasibility.py`, output in `tourbillon-feasibility-results.txt`. The script runs `working-revision-step1.py` and reads its variables directly, so ring, carrier, drive and DMX numbers are the same as step 1 and are not recomputed differently.

Tags: **[T]** target, chosen value or stated assumption. **[C]** calculated prediction (closed-form, no FEA, no test). **[S]** cited source.
Sources used here: step 1 files, `gemini-revision-deviations.md`, `approved-requirements-ledger.md`, `hardware-docs-review.md`, `full-user-specification.md`, `blueprints-raw.txt` (BP), `manual-raw.txt` (MAN), `suspension-025mm-design-gate.md`, `quadrivot-nonlinear-assessment.md`. Catalog values looked up this session: SKF 61813 product page (C 11.9 kN, C0 9.65 kN; resellers list 12.4/12.7 kN for -2RZ), ISO 5753-1 Table 1 radial clearance (d 50-65 mm), ISO 492 inner ring runout Kia (d 50-80 mm, via Andge/CXE tables), SKF/ZKL constant friction coefficient for deep groove ball bearings (mu 0.0015, valid near P = 0.1 C), maxon DCX 22 S datasheet (14.6 mN m nominal at 12 V), maxon GPX 22 HP catalog page (2-stage 16:1: 2.40 N m continuous, 75% max efficiency, 1.05 deg backlash), Servotecnica SVTS C 07 and REC RH60 through-bore slip rings (60 mm bore, 135 mm OD, RH60 0.1 N m drag for 6 rings, life up to 1e8 rev), Distrelec listing for a DCX22S + GPX22 (CHF 530 ex VAT, a 103:1 configuration, indicative only). Ti-6Al-4V modulus vs temperature (-0.039 GPa/K average 20-200 C) is from a weak secondary source, treat as approximate.

## Summary
- **Verdict: feasible with conditions, as a motor-driven rotating cage ("carousel"), not as a true tourbillon at watch speed. Its value is visual and story, not timekeeping.** The classic tourbillon benefit mostly does not apply to this flexure oscillator (section 3).
- **It fits.** A 90 mm OD annular cage on two SKF 61813-2RZ bearings, at its own Z station next to the prism carrier, carries the balance ring, flexure suspension, escapement and release. It comes to about **342 g and 4.6e-4 kg m2** in 7075 [C] (262 g and 3.6e-4 with Kaydon KA025 [C]). Radially it leaves 6 mm to the 102 mm tube [S MAN] at the cage and 1 mm at a stationary ring-gear and sensor band [C]. Axially, cage plus prism carrier is 194 mm of the 280 mm chassis [C], leaving 86 mm for the light engine and optics. That is tight and not checked against the optics.
- **Drive is easy for a carousel.** The worst steady torque is about 0.02 N m, dominated by bearing drag. Power is about 2 mW at 1 rpm [C]. The Gemini rewind motor can also drive the cage through a 32:1 branch. That adds about 0.003 N m at the rewind arbor [C], so 10.2 mN m at the motor against 14.6 mN m nominal [S].
- **A true tourbillon (escapement steps the cage) only works slowly.** At 1 rev/min (watch speed) and 8 Hz, the geared train needs about 16 ms per escape step [C], against 7.7 ms for the balance to cross the lift zone [C], and bearing drag could eat up to 94% of the drive [C]. At 1 rev per 5 min it passes this crude timing screen (2.2-3.2 ms) [C]. The indexer can never ride a true-tourbillon cage. Its reaction torque reaches the pallets at 7 to 36x the escape drive torque [C].
- **The 0.25 mm gravity shift: the bearings pass easily, but the cage does not fix the open problem.** The bearing-located cage moves at most about 14 µm from clearance plus under 1 µm from Hertz contact [C], which is 6% of the 0.25 mm budget [T]. The balance-ring suspension inside the cage is still unsolved (QEXT-200 was rejected at 1.95 mm [S prior]). Rotation does not reduce its sag. If the suspension is anisotropic, rotation turns it into a wobble at twice the cage rate [C].
- **Optics: yes, the pattern precesses.** With the facets on the cage and the prism stationary, the star turns at minus the cage rate. At 1 rpm that is 6 deg/s, so the pattern moves one spoke spacing (24 deg) every 4 s [C]. That could be a slow-precession feature. It cannot be cancelled by the spring indexer, only by stopping or parking the cage.
- **Power and signals: go mechanical-only.** 60 mm bore slip rings are 135 mm OD [S], 33 mm too big for the tube [C], and one drags about 5x the whole bearing budget [C]. A stationary optical encoder can read the balance rim through the open cage, which hides only about 5.7% of the rim [C].

---

## Terms used below
- **True tourbillon (T1):** the escapement is on the cage, and the escape pinion rolls on a fixed ring (the "fourth wheel"). Each beat steps the cage a little, and drive torque goes into the cage. Cage rate is locked to beat rate.
- **Carousel (T2):** a motor turns the cage at a set rate. The escapement on the cage only regulates the balance. It gets its own energy from a small cage remontoire that the cage rotation winds against a fixed ring. Horologically this is closer to a karussel than a tourbillon. I'm calling it what it is.
- **Item 7 blend (working):** balance and escapement are the master clock and release each 12 deg prism step. A spring cam or Geneva indexer powers the step, a motor rewinds the spring, and an encoder supervises. [T]

## 1. Cage concept and fit
Layout [T]: the cage is a separate Z station from the prism carrier. Two 61813-2RZ bearings sit on 65/56 x 10 journals, the same as step 1. Between them are two 90/56 x 3 mm flanges joined by three 5 x 5 x 40 mm pillars at r 42 mm. Inside are the spec reference balance ring (42 g, 56/72 mm), its flexure suspension, the escapement at r about 41 mm, and a counterweight opposite the off-axis parts. The bore stays a clear 56 mm through the journals and flanges.

| Variant | Mass [C] | Polar I [C] | I / ring |
|---|---|---|---|
| V1 7075 structure, 61813, balance + escapement + cage remontoire (carousel) | 342 g | 4.55e-4 kg m2 | 10.4x |
| V2 same, Ti-6Al-4V structure | 413 g | 5.43e-4 | 12.4x |
| V3 7075, Kaydon KA025 (light) | 262 g | 3.58e-4 | 8.2x |
| V4 7075, 61813, plus indexer and the whole step-1 prism carrier set | 890 g | 9.46e-4 | 21.7x |
| V1T true tourbillon cage (no cage remontoire) | 326 g | 4.28e-4 | 9.8x |

Payload masses are assumptions [T]: suspension 15 g, escapement 12 g, release 3 g, cage remontoire 8 g, indexer 40 g. Inner races are 40% of the bearing mass, as in step 1. **Material pick: 7075 for the cage structure.** Ti makes the cage 21% heavier for no stiffness benefit that matters here, so keep Ti for the flexures and their anchors only. Thermal mismatch between a Ti flexure frame and a 7075 cage needs a compliant joint or a Ti anchor ring. That is not sized here.

Fit [C]:
- Tube ID 102 mm [S MAN]. Cage OD 90 mm leaves 6 mm radial. A stationary band (fixed ring gear, encoder head, park lock) out to 100 mm leaves 1 mm. That is tight for a touring tube that may not be perfectly round, so a real layout would put the band at a bearing bulkhead instead.
- Bearing housings are 93 mm OD (61813) or 84.2 mm (Kaydon), with 4.5 mm of radial room to the tube. [S]
- Between the ring OD (72) and the cage OD (90) there are 9 mm of radial room for the escapement and pillars. Gemini's escape wheel is listed at 14.8 mm OD [S BP] and fits only if it sits tangentially, not radially. ED-05 geometry is still conflicted (deviation item 10).
- Axially the cage is about 74 mm. With the 120 mm carrier that is 194 mm of 280 mm [C].
- **Packaging problem that carries over:** the balance suspension has to fit inside this cage. The only analyzed candidate (QEXT-200) used a 200 mm frame [S prior]. A rotating cage makes this harder, not easier.

## 2. Rotation rates, torque, power and the motor
Carousel drive (V1, 3.35 N weight) [C]:
- Bearing drag: 1.6e-4 N m from the load-dependent SKF estimate [C from S mu]. That is a lower bound because P is far below 0.1 C. The planning range for two non-contact-seal bearings is 0.002-0.02 N m (step 1, order of magnitude). Contact seals (2RS) stay excluded.
- Unbalance gravity torque, cyclic once per rev: 6.7e-5 / 1.7e-4 / 3.4e-4 N m at a residual CoM offset of 0.02 / 0.05 / 0.10 mm [T].
- Spin-up torque (1 s ramp): 5e-5 N m at 1 rpm, 3e-3 N m at 64 rpm. [C]
- The cage self-winds its escapement remontoire. The escapement needs 2.2 mW at 8 Hz and 6.8 mW at 11.46 Hz [C]. Taken from cage rotation, that is 0.021-0.065 N m at 1 rpm, or 0.11-0.32 N m at 1 rev per 5 min [C]. Slower cages need more torque for the same power.

| Rate | Omega | Worst steady torque (drag 0.02 + unbalance 0.1 mm) | Power |
|---|---|---|---|
| 1 rev / 15 min | 0.007 rad/s | 0.020 N m | 0.14 mW |
| 1 rev / 5 min | 0.021 | 0.020 | 0.43 mW |
| 1 rev / min | 0.105 | 0.020 | 2.1 mW |
| prism mean, 32 rpm | 3.35 | 0.020 | 73 mW |
| 1 rev per 15-beat star, 64-92 rpm | 6.7-9.6 | 0.020 | 157-237 mW |
These exclude the self-winding torque above. All [C].

**Can the rewind motor drive the cage? Yes [C].** The rewind arbor's mean speed equals the prism mean, 32.0 rpm at 8.00 Hz and 45.8 rpm at 11.46 Hz [C]. A **32:1 branch** gives the cage 1.00-1.43 rpm, which tracks beat rate. Worst cage torque including self-winding is 0.065 N m, which adds 0.003 N m at the arbor (eta 0.7 [T]). Arbor total 0.123 N m, motor 10.2 mN m at 16:1 [C] against 14.6 mN m nominal [S DCX 22 S]. That's a 30% margin, which is thin for a touring motor. Gearhead backlash is 1.05 deg [S], which shows up as 0.03 deg at the cage [C], so it doesn't matter. Downsides: the cage inherits the remontoire's ±2 deg control wobble divided by 32, and DMX can't stop the cage without stopping rewind. **For touring I'd give the cage its own small gearmotor.** That's one more motor (indicative CHF 530 for a DCX22S + GPX22 [S Distrelec]), but the cage then has its own rate, stop and park, and a fault in one drive doesn't take out the other.

**True tourbillon timing (V1T, fixed ring, 8.00 Hz)** [C]. R is escape-wheel turns per cage turn (beats per cage rev / 30). Train time is the time for the geared cage to let the wheel advance 12 deg under the step-1 escape torque. It has to be well under the balance's lift-zone crossing time, which is **7.7 ms at 8.00 Hz and 5.4 ms at 11.46 Hz** [C].

| Cage rate | R | Cage step/beat | Cage drive torque | Train time (18 / 8.5 mm torque) | Drag 0.02 N m as share of drive |
|---|---|---|---|---|---|
| 1 rev/min | 32 | 0.375 deg | 0.021-0.045 N m | 16.2 / 11.1 ms (fails) | 44-94% |
| 1 rev/2 min | 64 | 0.19 deg | 0.043-0.090 | 8.1 / 5.6 ms (marginal) | 22-47% |
| 1 rev/5 min | 160 | 0.075 deg | 0.107-0.226 | 3.2 / 2.2 ms | 9-19% |
| 1 rev/15 min | 480 | 0.025 deg | 0.32-0.68 | 1.1 / 0.7 ms | 3-6% |
This is a crude screen, not an escapement simulation. Below about 1 rev per 5 min at 8 Hz, a watch-like tourbillon starves or loses impulse at this cage inertia. It gets worse at 11.46 Hz. [C]

## 3. Does a tourbillon help this oscillator's rate? Mostly no.
What a tourbillon fixes in a watch is position error in vertical positions, mainly poise error (balance CoM off the axis). It averages that over one cage turn. It does nothing for flat vs. vertical differences, temperature, or amplitude.

For ED-IBS [C]:
- **No pivot friction.** The flexure has no pivot, so the friction share of watch positional error doesn't exist here.
- **Poise error does exist.** A ring CoM offset e adds m g e of stiffness when the axis is horizontal. df/f = 9.3e-6 / 3.7e-5 / 9.3e-5 for e = 5 / 20 / 50 µm at 18 mm. That is 7.5e-5 to 7.5e-4 Hz at 8 Hz (0.8 to 8 s/day). It's smaller at short L. [C]
- **Leaf loading under gravity.** Gravity loads the leaves and changes their stiffness, which is a flexure-specific positional error. The order-of-magnitude result is dK/K = 0.16-0.63%, or **0.006-0.025 Hz at 8 Hz** [C, rough, c = 1/30 to 2/15 times P L]. That is 10-30x the poise error, and the real number depends on the unchosen suspension topology. A cage turning about a horizontal axis averages this too, but it converts a steady offset into a modulation once or twice per rev.
- **Temperature dominates.** The Ti modulus drift gives about -1.7e-4 per K in rate, so -0.014 Hz for a 10 K stage swing [C from S approx]. That is about one 8-bit DMX frequency step (0.0136 Hz) [C step 1] and 20x the 50 µm poise error.
- **Orientation.** The cage can only average the gravity component perpendicular to the optical axis. That's 100% when the axis is horizontal, 71% at 45 deg tilt, and **0% when the fixture points straight down or up** [C], which is common in touring rigs.
- **Closed loop makes it moot.** Item 7 has an encoder supervising the balance and a DMX frequency trim. A steady orientation offset is just a trim value. A rotating cage converts it into a wobble. At 50 µm poise the wobble is 2.6 deg of balance phase at 1 rpm and 12.8 deg at 1 rev/5 min, against 16 deg/min of unbounded drift without the cage [C]. The wobble is bounded, which is the one real open-loop benefit, but a supervisor trims a steady drift more easily than a periodic one.

**Plainly: the classic tourbillon benefit mostly does not apply.** The only error it averages (poise) is small next to leaf loading and temperature. It does nothing in the vertical-axis orientations touring rigs use, and the supervised trim already handles steady offsets. If Caleb wants a rotating cage, it should be for the look and the story, not for timing.

## 4. Gravity-induced radial center shift (0.25 mm [T])
Bearing-located cage [C]:
- Hertz deflection per bearing: 0.09-0.13 µm (V1) and 0.18-0.24 µm (V4) at 1 g; 0.3-0.7 µm at 5 g [S BP claim, not validated]. Ball count and size are not catalog values; I assumed Z 24-34 and Dw 4.8-6.35 mm and show the spread.
- Clearance dominates. ISO 5753 [S] CN for d 50-65 is 8-28 µm, which gives at most 14 µm off-center and at most 28 µm across an orientation flip. C2 gives 7.5 / 15 µm. A lightly preloaded pair (wave spring) [T] removes it, leaving Hertz only. Preload adds drag, which the 0.002-0.02 N m planning range should cover but nobody has checked.
- Cage drum bending is about 1.4 nm for V4 on a 60 mm span [C]. Negligible.
- Load against capacity: 5 g is 9e-4 to 2e-3 of C0 = 9.65 kN [S]. A 30 g case drop [T assumption] is 0.5-1.4% of C0. Fine for the bearings.
- **Rotation adds periodic error, not gravity error.** Inner ring runout Kia is 20 / 11 / 6 µm for Normal / P6 / P5 [S], plus about 10 µm journal TIR [T]. The bore center wobbles 15-30 µm at the cage rate. That's inside the budget but optically visible if the beam is collimated through it, so specify P6 or better.
- **Bearing share of the 0.25 mm budget: about 15 µm, or 6%** [C, CN, centered]. The cage on its bearings passes.

Balance ring inside the cage [C]:
- The open problem is the same as before. The reference sag for 42 g at the 1647.52 N/m design-gate stiffness is exactly 0.25 mm [C prior]. No suspension has passed: QEXT-200 reached 1.95 mm [S prior]. Rotation doesn't change the magnitude of gravity, so it doesn't change the sag.
- With an anisotropic suspension, the sag swings between W/k_max and W/k_min twice per rev. At 1.2:1 that is 0.21-0.25 mm, and at 2:1 it is 0.125-0.25 mm. In the world frame the ring center wobbles at twice the cage rate, which a static design would not do. [T]
- The ring ID equals the 56 mm bore. Any sag intrudes on the bore unless the ring ID goes to about 56.5 mm [C]. That's an allowed ring-inertia change, and it should happen whether or not there's a cage.
- **Bottom line:** the cage passes 0.25 mm, but the thing inside it, which is what matters, is still unresolved. The tourbillon adds the bearing contribution plus anisotropy wobble on top. [T]

## 5. Dynamic effects
- **Gyroscopic coupling:** the cage and balance are coaxial, so for perfect alignment the gyroscopic term is zero. With 0.1 deg misalignment [T] it is 1.3e-7 N m at 1 rpm [C]. The real gyroscopic load comes from moving the yoke: 1 rad/s [T] across the oscillating balance gives 6.9e-4 N m out of plane on the flexures. That exists with or without a cage. A V4 cage at 64 rpm adds 6.3e-3 N m on its bearings [C], which is fine.
- **Coriolis:** each ring element sees 2 Omega r thetadot radially. That is 1.1% of g at 1 rpm and 70% of g at 64 rpm [C]. On a symmetric ring it is a uniform breathing load with no net shift. The net force from a 50 µm CoM offset is 7e-6 N at 1 rpm and 4.5e-4 N at 64 rpm [C]. Fast cages load the flexure leaves radially at the beat rate, so that's one more reason to stay slow.
- **Rotation-induced rate error:** under constant rotation about the balance axis, the flexure restoring torque is still relative to the cage. The beat rate measured in the cage frame doesn't change, so the beat itself picks up no added or subtracted rate. What changes is what the audience sees: in the world frame, the facet and prism azimuths gain the cage angle (section 7). Cage acceleration does couple in, as -I_ring times alpha_cage. A true tourbillon steps the cage every beat, which kicks the balance by roughly the cage step: 2.1% of the 18 deg amplitude at 1 rev/min and 0.4% at 1 rev/5 min [C]. It is beat-synchronous, so it acts like part of the impulse, but it still has to be modeled. A smooth carousel has no kick.
- **Imbalance and vibration:** at 1 rpm, centrifugal force from a 0.1 mm unbalance is about 4e-7 N [C], which is nothing. The issue is gravity torque, 3.4e-4 N m per rev, which modulates drive. At touring shock levels the unbalance torque is 1.7e-3 N m at 5 g and 1.0e-2 N m at 30 g [T] (V1). Angular shock is the bigger one: 1000 rad/s2 [T assumption, uncited] on a 4.6e-4 kg m2 cage takes 0.46 N m [C]. In a true tourbillon that torque ends up on the pallet lock: 0.013 N m at R 32, which is **20x the escape drive torque** [C]. In a carousel it goes into the motor gear train and the park brake instead.
- **Transit lock on a rotating cage:** the balance ring still needs its own clamp. It carries 2.1 N at 5 g [C], and the Gemini doc already says an unlocked transit will damage the blades [S MAN]. The workable version [T] has two stages: (1) the cage drives to an encoder home angle and a stationary pin or brake locks it to the frame; (2) a stationary actuator (solenoid or the ED-08 cam idea) then works the ring clamps through a port in the cage that only lines up at home. It must also be manually lockable without power (Gemini's override key [S MAN]), which means the cage needs a manual turning key to reach home. A true tourbillon cage can't be driven to home without running the clock, which is another point against it.

## 6. Power and signals across rotation
- **Slip ring: no.** Through-bore rings with a 60 mm bore are 135 mm OD [S SVTS C 07, REC RH60], 33 mm bigger than the tube ID [C]. Ring drag of 0.1 N m [S RH60] is 5x the worst bearing drag [C]. Life isn't the issue: about 1.8e5 rev per touring year at 1 rpm [C, 10 h x 300 d T] against up to 1e8 [S]. Touring concerns are brush noise on encoder lines, debris near an open optical bore, and another IP-rated seal to maintain.
- **Mechanical-only: yes.** Nothing powered rides the cage. The cage remontoire is wound by cage rotation against a fixed ring. The encoder is stationary and optical: a reflective sensor reads the balance rim or a code track through the open cage, with pillars hiding 5.7% of the rim [C]. A second stationary sensor reads a cage index mark. Firmware ignores the pillar blanking windows, since cage angle is known.
- **The release is the hard part.** The item-7 blend has the escapement mechanically releasing a stationary indexer. Across a rotating interface there are two real options: [T]
  1. **Axial push ring:** the pallet fork lifts a coaxial ring a fraction of a mm each beat. Axial motion is rotation-invariant, so a stationary trip lever reads it through a thrust race. This keeps the "watch releases the light" story, but it adds mass and friction the balance must move each beat. It is not sized. Step 1 already said the release must be light, and this makes it heavier.
  2. **Optical read plus electric latch:** the stationary sensor sees the escape event and fires a latch on the spring indexer. It's simple and serviceable, but the honest description becomes "the watch times every step, a sensor releases it". That is a story change Caleb should make knowingly.

## 7. Optics: does the cage rotate the image?
A Dove prism at angle psi maps an input azimuth a to 2 psi - a. That doubles rotation and flips handedness. Results depend on which parts ride the cage [C]:

| What rides the cage | Projected azimuth | Precession |
|---|---|---|
| Balance with facets (upstream of prism), prism stationary-indexed | 24 n - psi_cage - a_k | **-Omega** |
| Balance with facets and prism (indexer on cage) | 24 n + psi_cage - a_k | +Omega |
| Prism only, facets stationary | 24 n + 2 psi_cage - a | +2 Omega |
| Nothing optical (cage carries a balance without facets) | 24 n - a | none |
The spec's beam equation only works if the facets are upstream of the prism, so the first row is the expected case.

At 1 rev/15 min, 5 min and 1 min the pattern turns 0.4 / 1.2 / 6 deg/s, so one 24 deg spoke spacing passes every 60 / 20 / 4 s [C]. In a true tourbillon the precession is locked to the beat: 0.375 deg per beat, or 5.6 deg per 15-beat star, at 1 rev/min [C].

**Feature or fault?** As a feature it's elegant: a slow, tempo-tied rotation of the whole star that no stepper-mirror fixture has for free. As a fault, it means the facets' azimuth is no longer fixed, so programmers lose a static star look unless the cage stops. The spring cam indexer can't cancel it because it only makes discrete 12 deg steps. A carousel can stop and park on DMX. A true tourbillon cannot, unless the clock stops too. If precession is ever unwanted, I'd suggest a DMX "cage rate" channel with 0 = parked at home. That would be a 14th channel on the step-1 map [T].

## 8. Verdict, risks, cost, cheapest version
**Verdict: feasible with conditions, as a slow motor-driven carousel. A true tourbillon is not worth it at watch speed and only marginal at about 1 rev/5 min.** The tourbillon idea does not solve any open engineering problem. It is a visual and story feature that costs packaging room and adds service steps. [C]

Conditions:
1. Indexer and prism stay stationary. Riding the cage puts 7-36x the escape torque into the pallets (true tourbillon) or adds 0.55 kg to the cage (V4), so no. [T]
2. Use a carousel, not a true tourbillon, so it can park for transit lock and stop for a static look.
3. Slow, 1 rev/min or slower. Fast rates bring Coriolis leaf loading up to 70% of g [C].
4. The balance suspension still has to pass 0.25 mm and now also fit inside a 90 mm cage. This is the gating item, the same as without a cage. [T]
5. Static balance the cage to 0.05 mm or better and the ring to 20 µm or better [T], plus P6 bearings.

**Top risks:**
1. **Suspension inside the cage.** It's still unsolved for 0.25 mm in any orientation. It now has to fit a 9 mm radial band, and anisotropy turns into a twice-per-rev wobble. The cage can't help with this. [C]
2. **The release across rotation.** The mechanical push ring adds unsized load on the balance. The electric latch changes the story. If true tourbillon is chosen, there's also the train timing (16 ms against 7.7 ms at 1 rpm) and drag eating 44-94% of the drive. [T]
3. **Transit and shock on a rotating mechanism.** It needs home indexing, a park brake, a two-stage ring clamp, and a manual override. Angular shock on a cage held by the escapement is 20x the drive torque. Any failure strands the flexures unlocked, which the Gemini doc already says destroys them. [S]

**Cost and complexity, relative to the item-7 blend without a cage** (parts not priced except the motor): [C]
- Add: 2 bearings (61813-2RZ, P6), a 5-axis 7075 cage, a fixed ring gear and cage pinion, a cage remontoire (small spring, clutch, 2-3 wheels), counterweights, a cage drive (own gearmotor, about CHF 530 indicative [S], or a 32:1 branch), a cage index sensor, a park pin or brake, and a ring-clamp port. Plus either a push ring and trip lever or an optical sensor and latch.
- That's roughly 20-30 more parts, a cage poising step and a ring poising step at build, one more DMX channel, and a park/lock service check. About 74 mm of chassis length goes to it. [T]

**Cheapest version that keeps the visual and story value:**
- A slow carousel (1 rev per 5-15 min [T]). It's V3 (Kaydon, 262 g) or V1, carrying the balance, flexures, escapement and the tiny cage remontoire.
- Its own small gearmotor, with DMX rate and park.
- Indexer and prism stationary. A stationary optical encoder reads the balance, and an electric latch releases the spring indexer. The axial push ring stays an upgrade if the mechanical release story matters enough.
- Precession appears as a slow -Omega star drift that the programmer can stop.

A note on the "decorative cage carrying only the escapement" idea: the escapement can't ride without the balance, because the pallet fork has to stay in mesh with the balance roller. So the minimum moving set is balance plus escapement. An even cheaper purely decorative cage around a stationary balance is possible, but calling it a tourbillon would be false, so I'd not do it.

**Things that should go to Caleb as decisions:**
1. True tourbillon (escapement drives the cage, rate locked to the beat, about 5 min/rev or slower, can't park) or motor-driven carousel (any rate, stops and parks, technically a carousel). My lean: carousel. [C]
2. Precession: a feature (which sign and rate, DMX-controllable) or something to avoid (park the cage during static looks)?
3. Release across rotation: mechanical axial push ring (keeps "the watch releases the light", adds unsized load on the balance) or optical read plus electric latch ("the watch times it, a sensor releases it")?
4. Priority: keep the rotating cage as an option layered on item 7 without letting it gate the work, or commit now? My lean: keep it as an option. Size the item-7 blend next, starting with release load on the balance, since both paths need that number. [C]

## Assumptions and uncertainties
- These are closed-form models only. There is no escapement dynamics simulation, no FEA, and no test. The true-tourbillon timing screen ignores escape-wheel inertia, mesh losses and pallet geometry.
- Payload masses, inner race fraction (40%), counterweight radius, flange and pillar sizes, residual unbalance, and 61813 ball count and size are assumptions [T]. Ball internals are not catalog data.
- Bearing drag 0.002-0.02 N m for a pair is an order-of-magnitude planning range (step 1), not datasheet data. The SKF mu formula is outside its stated load range here. [S]
- The leaf-loading stiffness coefficient (1/30 to 2/15 of P L) is generic beam-column order of magnitude. The real value depends on the unchosen suspension topology. [T]
- The Ti modulus temperature slope comes from a weak secondary source.
- Shock: 5 g is a Gemini design claim, not validated. 30 g drops and 1000 rad/s2 angular shock are uncited planning values. [S]
- Slip ring data are from two vendors' catalog pages. Smaller custom units may exist, but I found none with a 56 mm or larger bore that fits a 102 mm ID. [S]
- Optical precession signs assume the spec's beam model with the facets upstream of the prism. The physical order of elements isn't defined in the docs yet.
