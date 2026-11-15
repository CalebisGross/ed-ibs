# ED-IBS initial specification audit

Source: `/workspace/ed-ibs/full-user-specification.md`, all five sections. Parent reports Jeph supplied it verbatim from original context. Original source remains untouched. This scratch audit is not a repository change, hardware validation, or full implementation acceptance audit.

Labels: **Target** means user-specified; **Derived** means arithmetic/model consequence; **Unvalidated** means a physical assumption needing evidence. Numerical checks used Python 3 standard math; no hardware or solver benchmark was run.

## 1. Inertia, units, frequency and regulator travel
- Target annulus model: I = m(Ro²+Ri²)/2. Derived: 0.042(0.036²+0.028²)/2 = **4.368e-5 kg m²**, agreeing with claimed 4.37e-5 after rounding. This validates arithmetic only, not the inertia of the assembled prism/mirror/flexure cage.
- Target K0 = 0.1104 N m/rad, L0 = 0.018 m, K = K0 L0/L. Derived f = sqrt(K/I)/(2π): **8.00135 Hz at 18 mm**, **11.64368 Hz at 8.5 mm**. Angular units must be radians internally.
- Target 4–20 Hz is incompatible with that law and travel. It would require **72.0243 mm at 4 Hz** and **2.88097 mm at 20 Hz**, outside the stated range. Do not silently rescale the stiffness or fader.
- Derived beat-event rates, if two center crossings per oscillation: 16.0027–23.2874 beats/s; approximately 960.16–1397.24 beats/min and 57,609.7–83,834.5 vibrations/hour. Keep oscillations/s, beats/s, BPM, and vph distinct.

## 2. Escapement event semantics
- Target section 2A says impulse inside ±3.5° when angular velocity crosses zero in the unlocking direction. Section 2B counts center crossings; pane 3 describes kicks at peak velocity.
- Derived harmonic motion: velocity is zero at turning points, not at center. For amplitude greater than 3.5°, turning points are outside the stated impulse zone. Literal conjunction cannot sustain the intended normal orbit.
- Decision needed: center-crossing directional impulses, finite angular lift-zone torque, or a separately modeled pallet/escape-wheel contact process. These are not interchangeable. Torque magnitude/profile, unlocking energy/resistance, pallet and wheel inertias, friction, lock/drop geometry, initial conditions/start assistance, and remontoire torque law are missing.
- RK4 dt = 0.25 ms is a target. Hybrid event localization, one event per crossing, startup/stall rules, and convergence tests are necessary; ordinary RK4 alone does not resolve discontinuities deterministically across render schedules.

## 3. Blanking and lift angles
- Targets differ: ±2.1° center window, approximately 2.2 ms blanking, and 2.1 ms unlock display. For θ = A sin(2πft), total window duration = 2 asin(2.1°/A)/(2πf), provided A > 2.1°.
- Derived at A = 18°, f = 8.00135 Hz: **4.65183 ms**, not 2.1 or 2.2 ms; at maximum frequency approximately 3.20 ms. Half-window at base is approximately 2.326 ms, suggesting but not establishing a possible half/full-window mixup.
- Derived amplitudes needed for full 2.1/2.2 ms windows at base frequency are **39.80°/37.99°**, beyond target ±18°. At A ≤ 2.1°, a literal angle-only blanking predicate is continuously true, including rest; gate it by a defined transition/event policy if intended.
- Target timegrapher lift angle **44°** differs from the total **7°** balance impulse zone. It could refer to another component or a horological measurement convention, but no conversion is specified. Do not conflate them.
- A finite prism transition must be specified to demonstrate raw smear and prove the chopper covers it; instant angle jumps have no physical transition trajectory to smear.

## 4. Indexing, facets and beam count
- Derived for Z teeth, two beats/tooth: mechanical step = 180°/Z; optical step = 360°/Z; mechanical state period = 2Z beats; optical orientation period = Z beats. At Z = 15 these recover 12°, 24°, 30, and 15.
- Targets allow Z = 12–24 and 1–6 facets but equations hard-code mod 30, n = 0..14, k = 0..2, and 120° facet spacing. Decision: generalize to 2Z/Z and 360°/F, or explicitly constrain the original optical mode. Facet count also changes mass/inertia and geometry unless declared visual-only.
- Derived idealized instantaneous count from three facets times three chromatic channels is **9 rays**, not 45. Fifteen steps times three facets gives 45 facet-time samples before counting colors; however 120° equals five 24° steps, so the three facet azimuth sets overlap over a complete cycle. There are only 15 unique base azimuths before chromatic offsets, not 45 distinct spokes. Radial motion may separate samples over time but does not establish 45 simultaneous beams.
- Missing: actual splitter topology, simultaneous input count, chromatic angular offsets, power distribution, wavelength-to-display model, and whether “45-beam lattice” is instantaneous geometry, accumulated traces, or a desired effect. Magenta is two wavelengths, not one monochromatic channel.

## 5. Power cut, damping and endpoint
- Target baseline Q ≈ 350. For the linear viscous oscillator, c0 = sqrt(KI)/Q = **6.27419e-6 N m s/rad** at the base setting. Decide whether c0 stays fixed as stiffness changes or Q is actively held constant; both cannot stay fixed over regulator travel.
- Derived unforced envelope A(t) = A0 exp[-ω0 t/(2Q)]. Base amplitude time constant = **13.9237 s**; after 15 s **34.05%** remains (18° becomes about 6.13°), not zero. At the short-length setting and fixed Q about 20.85% remains. This is not a remontoire discharge model: continuing spring drive changes the result.
- Target 15 s spring unwind needs stored energy, torque-vs-unwind, cutoff and damping schedules. Eddy brake mapping and its behavior without electrical power are unspecified.
- Target dead-center pinspot conflicts with φ = 15° + 2θ: at rest θ = 0, radius = D tan(15°), approximately **1.34–13.40 m** at D = 5–50 m, not center. Multiple facets/colors also remain unless another optical state changes. At ±18°, radial angle spans -21° to 51°; negative radius flips azimuth and should be intentional.
- If mains power is cut to the laser, no illuminated decay trace remains without an explicitly powered/residual source. Decide whether the test is mechanical-drive loss with source retained, or total power loss with source extinction.

## 6. Geometry, stress and materials
- Target K is prescribed empirically while thickness/material controls imply a constitutive geometry model. Leaf bending stiffness normally depends strongly on thickness (often t³), width, modulus, length, and joint/boundary geometry. Four crossed leaves are not fully described by N and E alone. Missing width, crossing layout, clamping, preload, orientation, and allowable travel prevent physical stiffness validation and manufacturing-ready CAD.
- Target stress formula E t A/(2L) is dimensionally Pa with A in radians; it is a simplified bending estimate, not validated crossed-flexure stress analysis. Derived target-range examples at A = 18°: **248.71 MPa** for t = 0.25 mm, L = 18 mm; **3370.74 MPa** for t = 1.60 mm, L = 8.5 mm. The latter is not an elastic design demonstration.
- Target 510 MPa “infinite-life endurance limit” for Ti-6Al-4V is **unvalidated**. Fatigue depends on stress ratio, mean stress, surface finish, notch/clamp concentrations, processing, temperature, and design life. Do not certify safety from that threshold. Stainless heat treatment and polymer grade/process, modulus, yield, fatigue/creep data are missing. Resin and PETG cannot be one validated fatigue preset.
- Decide whether the app is an illustrative calibrated oscillator with warning estimates, or an engineering sizing tool requiring geometry/material validation. Export should declare assumptions and avoid presenting an unvalidated outline as fabrication-approved.

## 7. Musical tempo reachability
- Target musical tempo 60–240 BPM corresponds to 1–4 musical beats/s, below the derived 16.0027–23.2874 mechanical beats/s. Direct one-crossing/one-musical-beat mapping reaches none of it.
- Define s = mechanical beat events per musical beat. Derived BPM = 120 f/s; inverse L = L0 [120 f0/(s BPM)]². A fixed s covers only a frequency ratio of sqrt(18/8.5) ≈ 1.455, not the requested 4:1 tempo range.
- Example fixed subdivisions: s = 4 gives roughly 240.04–349.31 BPM; s = 8 gives 120.02–174.66; s = 16 gives 60.01–87.33. Octave-only subdivision changes leave gaps. Arbitrary selectable subdivisions or a materially wider mechanical tuning range are needed for the full continuous target. No exact tempo claim without tolerance, subdivision policy, actuator calibration/resolution and event phase definition.

## 8. First verifiable build slice (recommendation, not authorized implementation)
1. Preserve the supplied source verbatim as docs/user-specification.md once a repository is authorized; retain an explicit decisions/deviations ledger.
2. Build a headless SI-unit oscillator kernel at fixed 0.25 ms with separately callable deterministic stepping. Initially test unforced free motion and analytic f/Q behavior, no invented escapement law.
3. Verify default inertia, both regulator endpoints, RK4 convergence against a smaller timestep, energy conservation for c = 0, exponential decay for c > 0, and identical states for the same simulated time under different render-frame partitions.
4. After event-policy approval, add crossing localization/counting and configurable tooth indexing with tests. Then add the smallest numeric-control/trace UI; defer polished optics, fatigue claims and CAD until their missing models are explicit.

## Consequential user decisions before implementation depends on them
1. Confirm repository destination or authorize a new repository; no existing URL is confirmed.
2. Keep the derived 8–11.64 Hz model/travel, or change stiffness/travel/inertia to meet 4–20 Hz?
3. Choose center-cross/finite-zone/contact escapement model and specify torque, unlocking/startup assumptions. Define what 44° measures.
4. Make blanking angle-derived or fixed-duration, and define prism transition and stalled behavior.
5. Define 45-beam intent and whether teeth/facet changes generalize both physics and optics.
6. Define total-power versus drive-only cutoff, remontoire discharge/brake behavior, and required final optical position/source state.
7. Choose illustrative versus engineering-validated geometry/material/CAD scope; approve explicit missing-data assumptions, not silent constants.
8. Choose tempo subdivisions, rounding/tolerance and unreachable-tempo behavior.

## Discovery boundary
Own session transcript search had no record; own/shared memory yielded no relevant facts; authorized store was empty. CopyBotFile unavailable. Parent reports CloudAgent unarchived project listing empty and repository search “ed-ibs” exhausted with zero matches. No direct original user authorization or repository destination was independently recovered by this subagent. No clone, repository write, cloud launch, service connection, or user-computer operation performed.
