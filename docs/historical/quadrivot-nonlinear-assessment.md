# QEXT-200 nonlinear static assessment: reject reference qualification

## Terminal engineering decision
**Reject unchanged QEXT-200 for the specified reference42g gravity qualification; do not advance it as a passing suspension to3D validation.** Finite-stroke elastic compatibility is solvable in the planar model, but lateral support collapses as the main leaves bow. With the reference gravity force present BEFORE rotation, center shift reaches **1.952mm at+18°** and **1.792mm at-18°**, versus the approved0.25mm maximum. These are stable, converged sampled planar equilibria, not an extrapolation of neutral stiffness. One in-plane mounting direction is already a counterexample to the any-orientation reference gate.

This rejects this specimen/model at the reference load, NOT all QUADRIVOT architectures or every possible redesigned mass/inertia. Actual redesigned mass/COM remains unknown. No statement of mathematical impossibility, hardware validation or fatigue safety is made. Geometry/material parameters are unchanged from quadrivot-external-sizing.md. No implementation or physical work occurred.

## Frozen specimen / model boundary
QEXT-200: p36mm,L200mm,e-20mm,r80mm; all20Ti blade spans width1mm,thickness0.25mm,E114GPa; secondary L54mm,pc8mm,rays±30°; each coupling two24mm spans. Same rigid-body ports, D offsets and roots as prior unit. No pretension, extra guide, hidden stiffness or auxiliary-spring radial bracing was added. Mesh changes and numerical load continuations are not geometry changes.

Ring angle is prescribed at each static sample; ring x/y translations are FREE. Four secondary bodies translate and rotate, coupling-midpoint nodes are free. Grounded root positions remain fixed. Body ports use EXACT planar rigid rotation:
xport=xrest+u_body+[R(γ)-I](xrest-xref), θport=γ.
This resolves RCC translations and rotating attachments instead of imposing the rejected rigid Watt closure. Fixed/ring rigid bodies are ideal; their actual web/clamp shapes and masses remain undimensioned.

Reference gravity is a constant center-applied in-plane force of magnitude0.042×9.80665=0.4118793N. It is not a measured assembly mass or a distributed gravity model. COM offsets, gravity on secondary bodies, cable imbalance, shock, auxiliary transmission and all out-of-plane effects are excluded. Those omissions prevent PASS qualification; the reference in-plane failure already supplies a rejection gate for this specimen.

## Corotational elastic energy and equilibrium
Each straight rest span is subdivided into n elements with axial and flexural energy. For original length L0, current chord l and chord-angle change Δα, end bending rotations φi=θi-Δα,φj=θj-Δα:
Ue=EA(l-L0)²/(2L0)+(EJ/(2L0))(4φi²+4φj²+4φiφj),
A=bh,J=bh³/12.
Total potential Π=ΣUe-F·u_ring. End slopes are independent DOFs; main, RCC and coupling blades bend and extend rather than enforce fixed rigid-link distances. This is a standard simplified geometrically nonlinear corotational frame energy, NOT a commercial/experimentally validated FE model. Small local elastic strains and slender beam assumptions remain; section/junction concentrations and3D effects are absent.

Residual and consistent tangent are ANALYTICAL energy derivatives. Full body-port tangent includes the second derivative of rigid rotation weighted by element forces; omitting that term would be incorrect. Sparse assembled CSC tangents and sparse direct Newton solves are used.

Translations use m and rotations rad. For equilibrium/conditioning define scaled coordinates (ux,uy,0.2γ), so scaled residual components are forces and moments divided by0.2m, reported inN. Convergence threshold is max scaled free residual<1e-7N. Eigenvalues are those of the correspondingly scaled support tangent inN/m; their magnitude depends on coordinate scaling, while positive/negative definiteness does not.

One controlled numerical remedy was specified: if the Newton direction was nonfinite or not an energy descent direction, shift the tangent by μI with μ=max(1e-3,-λmin+1e-3)N/m, then apply Armijo energy line search. Used12times total, at four neutral gravity-axis load solves(3each); no shifts in angle continuation or the separate gravity-preloaded rotation paths. This is a minimization safeguard, not a geometry change or deletion of negative modes. Final stability is checked on the ORIGINAL unshifted tangent. All attempted solves completed: no nonconvergence hidden or acceptance criterion relaxed. Maximum iteration count46.

## Numerical verification and convergence
Independent full rigid-port finite differences at a deformed configuration:
- Energy-gradient relative discrepancy4.11e-10.
- Force-tangent discrepancy2.96e-10.
- Tangent symmetry relative discrepancy1.56e-17.
- Isolated element finite rigid-body rotation energy4.29e-29J.
- Re-equilibrated dU/dθ at mesh4,+18°:0.00827607053 vs reaction0.00827607345N m.
- Re-equilibrated torque derivative0.0392669 vs condensed tangent0.0392707N m/rad(~1e-4relative discrepancy under the numerical differentiation/convergence tolerances).

Meshes1,2,4,8,16 subdivisions per blade were continued0→+18° and0→-18° in1°steps, with free ring translations. Unit/neutral tangent reproduces the previous linear frame and source K0. Positive18° unloaded results:

|n|Energy J|Torque N m|Nominal maximum stress MPa|Minimum condensed radial stiffness N/m|
|---:|---:|---:|---:|---:|
|1|0.00118612|0.00963957|128.27|167531|
|2|0.00106703|0.00745207|126.17|330.87|
|4|0.00113349|0.00827607|137.41|254.86|
|8|0.00115768|0.00858304|141.35|262.28|
|16|0.00116433|0.00866807|142.41|267.58|

The1-element finite-stroke radial answer is badly misleading: it does not resolve the internal bending/shortening mode.8→16 change is~0.57%energy,0.99%torque,0.75%nominal stress,2.02%radial stiffness. Mesh16 is not an exact continuum solution; further refinement could improve precision. Crucially, meshes2/4/8/16 ALL fail the reference1647.5N/m radial screen at18° by a large margin. No pass claim rests on mesh1.

Gravity-preloaded +x-force path at+18° gives1.94933mm(mesh8) versus1.95204mm(mesh16):~0.14%difference in the rejection quantity. At-18°:1.78409 versus1.79221mm(~0.45%). Loaded nominal stress is less tightly converged(~4–5%8→16); do not report it as a validated design stress. Some intermediate6°loaded shift differences are~8%; failure margin at18° remains~7–8times the approved limit.

## Actual finite elastic accommodation
At unloaded+18°, secondary-body rotations settle near±0.0442rad, with virtual-center translations of order20µm. These are solved, not forced to the incompatible rigid-link values~±0.026rad. Coupler end chords shorten about18.40µm/11.90µm for alternating couplers, while distributed flexure bending supplies the path. The prior0.141mm rigid residual is not imposed as axial strain. Maximum unloaded element axial strain is~1.7e-5.

Unloaded+18° actual coupling axial force ranges are roughly-0.217N or+0.467N for alternating couplers; secondary blades include compression around-0.413N. These are internal forces of this model, not the previous fictitious~84N axial-only closure force. Pinned-column screenings for the48mm coupling span(~0.636N) or a54mm secondary leaf are not system buckling limits or safety factors; actual end motion, bending and load redistribution differ. No catastrophic bifurcation was established by those scalar comparisons.

Four deterministic positive/negative small interior perturbations at±18°, mesh16, reconverged to the same unloaded branch to~1e-8 or better in raw state components. Held-angle support tangents were positive definite at all recorded unloaded/loaded cases, with residuals below the threshold. This demonstrates local planar energy minima for these solves, not global uniqueness, absence of other branches, unrestricted spin stability or out-of-plane stability.

## Finite-angle support loss: decisive gate
Unloaded mesh16 condensed tangents about the ACTUAL deformed states:

|Angle|Minimum radial tangent N/m|Spin tangent N m/rad|
|---:|---:|---:|
|0°|175059|0.0194417|
|+6°|1693.88|0.0222782|
|-6°|1693.07|0.0222827|
|+12°|486.35|0.0304868|
|-12°|484.78|0.0305268|
|+18°|267.58|0.0430437|
|-18°|265.02|0.0432023|

The approved42g uncoupled radial screen1647.517N/m is only just met near6° and badly missed by12–18°. Neutral high selectivity does not survive finite main-leaf bowing.

A geometry-specific incremental-energy decomposition along the weakest condensed radial mode identifies the lost load path. At0°, modal tangent contributions(N/m) are main107529,RCC58024,coupling9506. At+18°, they are main267.255,RCC0.258,coupling0.062. The deformed system admits a predominantly MAIN-LEAF BENDING lateral mode; the secondary/coupling network no longer braces that mode appreciably. This is more precise than claiming “a leaf exceeded an Euler load” or transferring the paper's neutral stiffness. Merely quoting the source's radial ratio, or increasing a nonparticipating component's stiffness, is not a demonstrated fix.

## Gravity loads at actual deformed equilibrium
At mesh16, angles0,±6,±12,±18° and8force directions spaced45° were solved:56load cases. These are sampled in-plane directions, not an exhaustive all-orientation certificate. Ring lateral coordinates were unconstrained, and condensed tangent compliance was recomputed at the LOADED equilibria. All final free residuals≤8.05e-8N in scaled units; all recorded held-angle planar tangents were positive definite. Smallest scaled eigenvalue among these cases~7.95e-4N/m, so some are very soft and must not be portrayed as robust stability margins.

Most important independent path test: apply the+x gravity force atθ=0 FIRST, then rotate quasi-statically through±18° in1°steps (rather than jumping gravity onto an already bent state):

|Angle|Mesh16 center shift magnitude mm|Nominal maximum stress MPa|
|---:|---:|---:|
|+6°|0.47108|91.74|
|+12°|1.29777|183.04|
|+18°|1.95204|276.38|
|-6°|0.43747|92.59|
|-12°|1.19151|185.97|
|-18°|1.79221|282.37|

The same counterexample follows from gravity applied after angle-setting. Thus rejection is not merely a bad initial guess from a large force step. The largest displacement among the56sampled force cases was3.50813mm at+18° with225°gravity direction; it is NOT a proven global maximum over the gravity circle. The+x counterexample alone, checked at meshes8/16 and along a gravity-preloaded path, is enough for reference static rejection.

Actual mass changes require a new distributed-load/inertia calculation; do not linearly extrapolate a permissible mass from these nonlinear displacements. Added transmission loads were omitted rather than silently balanced into a rescue. A designed auxiliary radial load path could change the mechanism, but none exists in this frozen specimen and cannot be assumed.

## Clearance, collisions, stress and remaining physical gates
Deformed blade curves were reconstructed from each element's corotated cubic transverse shape and sampled11points/element. At±18°unloaded and loaded cases, no PROPER centerline crossings between different blade spans were detected; intentional continuous coupling joints are retained. Minimum sampled blade radius after in-plane half-thickness across loaded endpoint cases was32.665mm, still outside r28. This is sampled span evidence, NOT a certified finite-volume/self-contact sweep. Curved intervals between samples, finite width near joints, rigid webs, clamp pads, housing/cables and out-of-plane shape are not a complete collision model.

Ring inner surface was not dimensioned in this model. A56.5mm radial-only hole would not preserve the protected cylinder at a1.95–3.51mm offset; more aperture cannot cure violation of the separate0.25mm shift requirement anyway. No whole-assembly bore PASS is claimed.

Nominal unloaded endpoint stresses at mesh16:142.41MPa(+18°),143.17MPa(-18°). Maximum loaded sampled nominal stress~282.37MPa. These include beam axial plus end bending magnitude but exclude real clamp/junction stress concentrations,3D stress, defects and fatigue. No allowable, life or safety factor is assigned. The nonlinear in-plane model found local stable equilibria, not proof against3D lateral/torsional buckling.

Axial support, tilt, gravitational COM torque, full6×6coupling, real material/process properties, moving mass/inertia/period, exact amplitude-frequency behavior and auxiliary-spring tuning remain UNPASSED. A2D failure is enough to reject this reference specimen; a2D pass would not have certified any orientation.

## Recommendation / no silent rescue
Do NOT advance unchanged QEXT-200 to3D qualification or app implementation. Archive it as a finite-stroke lateral-support failure with a reproducible cause. Before any new dimension/architecture proposal, require a load path that suppresses the identified bowing-enabled lateral mode at±18°, not just neutral axial stiffness. Any revised main-leaf constraint arrangement, auxiliary support role or stiffness parameter must be explicit and requalified; this unit changed NONE. No further geometry search was run.

This completes the bounded analysis requested: finite elastic compatibility was achieved, but the same specimen fails the approved gravity-shift selection gate under the reference load. Original specification/decisions remain separate; implementation stays paused.

## Reproducibility
Interpreter: /workspace/ed-ibs/analysis-venv/bin/python; isolated NumPy/SciPy environment. Sparse-static scripts are engineering scratch, not application or oscillator code.
Run with OPENBLAS_NUM_THREADS=1:
- quadrivot-nonlinear-static.py :20blade mesh continuation,56gravity cases,alternate perturbations.
- quadrivot-gravity-continuation.py :gravity applied first, then rotation,meshes8/16.
- quadrivot-nonlinear-validation.py :independent derivatives,rigid-body invariance,work-energy checks.
- quadrivot-nonlinear-diagnostics.py :elastic chord/force and weakest-mode energy decomposition.
Captured results: quadrivot-nonlinear-results.json; quadrivot-nonlinear-loads.json; quadrivot-nonlinear-alternates.json; quadrivot-nonlinear-states.npz; quadrivot-gravity-continuation-results.json; corresponding logs; quadrivot-nonlinear-validation-results.txt; quadrivot-nonlinear-diagnostic-results.txt; quadrivot-nonlinear-summary.json.
Original full-user-specification.md unchanged. No repo/cloud/hardware/user-computer actions, external contacts or paid services.
