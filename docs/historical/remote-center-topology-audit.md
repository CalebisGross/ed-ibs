# QUADRIVOT full-source topology audit: current status

## Result / approval state
**Full accepted manuscript recovered from the official EPFL public download and inspected, including figures and appendix equations.** The previous missing-paper blocker is resolved. Caleb approved additional secondary and coupling flexures; that supersedes the earlier four-total-leaf authorization barrier. It does NOT establish a feasible ED-IBS suspension.

The published QUADRIVOT realization has four main leaves, four TWO-BLADE secondary RCC modules and eight coupling leaves: **20 slender blade segments grouped into16 flexural members/modules** (4main+4RCC+8coupling). A monolithic manufactured part is not one leaf. Protected56 mm bore, any mounting orientation,≤0.25 mm gravity radial shift,4–20 Hz,±18° remain unpassed for any dimensioned Ti adaptation. Implementation remains paused.

## Source provenance and verification
Paper: Tissot-Daguette, Thalmann, Cosandier and Henein, “Zero Parasitic Shift Pivoting Kinematic Structures Based on Coupled n-RRR Planar Parallel Mechanisms for Flexure Pivot Design,” ASME IDETC-CIE2023, **DETC2023-109120**.
DOI: https://doi.org/10.1115/DETC2023-109120
Official repository landing page:
https://infoscience.epfl.ch/entities/publication/90c94f18-4ee3-4186-93ed-bdc7b1f4b4f4
Official PUBLIC PDF link, recovered from that page's visible link and citation_pdf_url metadata:
https://infoscience.epfl.ch/bitstreams/72516db6-4274-4d9d-ac19-b479bbf3c505/download

Local PDF: **/workspace/ed-ibs/quadrivot-accepted-manuscript.pdf**
Bytes9,913,562; MD5 **fab0e6c3c0b17db41a82f5c5e044b3e0**, matching official repository metadata. Text extraction: quadrivot-accepted-manuscript.txt. Pages4–5 and9–10 rendered and visually inspected as quadrivot-figure-04.png, quadrivot-figure-05.png, quadrivot-equations-09.png and quadrivot-equations-10.png. Printed page numbers match PDF page numbers.

This retrieval used the official repository public HTML and linked bitstream, not an internal endpoint, guessed identifier or publisher bypass. No repeat of blocked publisher challenge. WebFetch's “page image” initially led to a JPEG thumbnail, correctly identified as NOT a PDF and saved separately as quadrivot-repository-thumbnail.jpg; no source claim rests on that thumbnail. Official raw landing HTML is quadrivot-repository-page.html.

Previous source-limited audit preserved as remote-center-topology-audit-before-full-source.md. Its “full paper unavailable” and count-unknown statements are historical and superseded here. The source is an accepted manuscript with some editorial artifacts; use its actual equations/figures rather than garbled PDF text extraction.

## Published topology: incidence graph and counts
**Source: Section2.1.1, Section2.3.2 and Fig.4, pp.2–4; Section3 and Fig.6b, pp.4–5; AppendixA2, pp.9–10.**

Rigid-body graph:
- Fixed base G and moving platform PF.
- Four main links ML_i and four secondary links SL_i, i=1..4.
- Four coupling links CL_j, j=1..4.
- Each chain: PF - R(A_i) - ML_i - R(B_i) - SL_i - R(C_i) - G.
- CL1 couples SL1/SL2 through D11/D12.
- CL2 couples SL2/SL3 through D21/D22.
- CL3 couples SL3/SL4 through D31/D32.
- CL4 couples SL4/SL1 through D41/D42.
Thus14 rigid bodies including G,20 ideal R joints:4A+4B+4C+8D. This special coupled architecture is not a generic isostatic linkage: redundant couplers introduce overconstraints (Section2.1.6). Naive planar mobility counting gives-1; special geometric dependencies permit the intended motion. Do not use a generic joint-count formula as its motion proof.

Physical compliance realization:
- Each ML_i AND its two associated end-R motions become ONE distributed-bending main leaf (4total), not two separate hinges plus a rigid link.
- Each C_i becomes a secondary RCC module (4modules); Fig.6b depicts two blades per RCC, consistent with AppendixA Remark4's8EI/L factor versus4EI/L for one main leaf.
- Each coupler contributes TWO coupling leaves at its ends (8total). For QUADRIVOT these form the coupler without TRIOVOT's extra rigid middle connecting rod.
- Therefore20 slender blades,16 named flexural members/modules. Count straight blade spans, not manufacturing part count or rigid R symbols. AppendixA2 explicitly states one secondary flexure per chain and two coupling flexures per coupler.

## Published geometric conditions and finite-motion center
Generic Type I, Sections2.1.2–2.1.4:
1. Quadrilaterals O A_i B_i C_i are geometrically similar, NOT reflected.
2. Secondary-link coupling quadrilaterals C_i D_j1 D_j2 C_k are parallelograms.
With these conditions and away from singularities, the source proves1DOF pure rotation about O: imposing platform rotation makes all secondary links rotate by equal angle; parallelogram couplers enforce exactly that relation. This is a finite-motion constraint proof, not virtual-line intersection alone.

QUADRIVOT is **Quasi-Type I**, not the same exact parallelogram case:
- Four adjacent similar quadrilaterals are mirrored.
- In neutral configuration, C_i B_i is perpendicular to B_i A_i (Condition3).
- Coupling spans are perpendicular to their secondary-link attachment arms in neutral configuration (Condition4).
- |OA_i| are equal (Condition5).
- Base pivots have rotational symmetry of ORDER2 (Condition6).
- Four Watt couplers replace parallelograms; they make mirrored secondary rotations approximately equal/opposite locally, NOT exactly equal/opposite at arbitrary amplitude (Section2.1.6).

The source attributes centered finite rotation of QUADRIVOT to its rotational symmetry, despite individual Quasi-Type I path defects. A symmetry argument supports this on a unique centered equilibrium/motion branch:180° invariance maps platform translation t to-t while retaining the same spin setting; uniqueness then requires t=0. That argument requires symmetry, compatible constraints and branch stability; it does not prove uniqueness or zero translation under an applied gravity force. Order2 symmetry alone also does NOT imply an exactly isotropic2×2 lateral stiffness tensor; the paper's computed x/y values are close but not identical.

General loop equations, derived here to encode the SOURCE incidence (not quoted as numbered equations):
A_i=t+R(θ)a_i;
B_i=A_i+R(μ_i)m_i=C_i+R(γ_i)b_i;
D_j1=C_i+R(γ_i)d_ij;
D_j2=C_k+R(γ_k)d_kj;
|D_j2-D_j1|²=d_j².
These equations use fixed C_i, platform-local a_i, main-link rest vector m_i and secondary-link-local b_i,d_ij. Four chain vector closures plus four coupler-length constraints encode the graph above; mirror/perpendicular/similarity conditions restrict their constants. They are the rigid model only. Replace ideal link/end joints by distributed flexure energy before predicting elastic support or loads.

The source gives schematic geometry, key flexure parameters and analytical kinematics, but NOT a complete dimensioned fabrication drawing/CAD with every D-point offset and rigid-junction outline. These local coordinates must be explicitly reconstructed respecting Fig.4/Conditions, and closure checked; they must not be guessed from raster pixels and treated as source dimensions.

## Actual analytical mechanics: source equations checked against images
Use J=bh³/12 for section second moment (paper uses I for this, not rotor inertia). Main flexure length L, p=distance O to inner leaf end, e/r=horizontal/vertical offset from leaf outer end to secondary center C; barred variables normalize by L (AppendixA Fig.10).

Small-deformation main-leaf stiffness, Eq.(9):
K0,one=4EJ/L [1+3p/L+3(p/L)²].
Total baseline Eq.(16): K0=n K0,one.
For equal clockwise/counterclockwise chain counts, Eq.(17) gives K1=0; QUADRIVOT has2and2. This does not mean cubic nonlinearity vanishes.

Eq.(7), leading secondary rotation:
θc=[(1+9pbar+9pbar²)/(15 rbar)] θ²+O(θ³).
This is the physical beam-shortening accommodation missing from the failed directly clamped radial-leaf design: C's compliant secondary link is allowed to rotate. It does not leave the leaf outer clamp fixed.

Eq.(12): Usecondary+coupling=(n/2)KC θc² + mKD θc².
Eqs.(13)–(14) give a cubic restoring term with
K2,couplers=2(nKC+2mKD)(1+9pbar+9pbar²)²/(225 rbar²).
AppendixA Remark4:
KC=8EJc/Lc[1+3pc/Lc+3(pc/Lc)²], KD=EJD/LD.
Source model treats secondary/coupling stiffness as constant because their motion begins at second order. Their role in support/nonlinearity cannot be ignored just because their infinitesimal rotation is small.

Source stress Eq.(19), first order only:
σmax≈E h(2+3p/L)|θ|/L.
The appendix neglects axial-force influence on curvature and uses small-deformation beam theory. At large angles the authors recommend FEM. These equations are engineering starting points, NOT valid substitutes for a3D±18° load/clearance calculation.

## Published dimensions/results: precedent, not our design
Table1(p.6): QUADRIVOT POM demonstrator/model uses OD150 mm, E=3 GPa, out-of-plane width b=5 mm; main L=50,h=1,p=5,e=-5,r=20 mm; secondary Lc=13.5,hc=1,pc=2 mm; coupling LD=6,hD=0.75 mm. Fig.6b's inner body is solid, not a56 mm clear ring.

Reproduction of Eq.(9)/(16): K0=0.5320 N m/rad, matching Table2's analytical532.0 N mm/rad. Source2D nonlinear FEM gives K0=0.5223 N m/rad, K2/K0=2.08 rad^-2, max von Mises69.3 MPa at±20° for POM model. Analytical maximum49.9 MPa underpredicts FEM by about39%. No Ti fatigue allowable follows.

Table3's normalized x/y radial stiffness is292.3/293.6 **mrad/mm²**, equivalent to292300/293600 m^-2. Combined with source FEM K0, derived raw radial stiffness is approximately152668/153347 N/m. These are source-model neutral-angle, held-spin radial screens, NOT all-orientation loaded Ti results. They exceed our reference necessary selectivity59712.8 m^-2 by about4.9×, establishing a substantive architectural lead compared with the failed folded-frame ratio160.98 m^-2. The selectivity does not automatically survive changed p, thickness ratios, bore, stiffness level or load angle.

Source FEM scope, Section4.2:2D nonlinear static COMSOL6.0; applied rotation-20°..+20° in0.1° steps, inner body fixed; separate0.2 mm x/y imposed displacements at NEUTRAL/held spin; quadrilateral elements4across thickness and≥50along length. No full gravity sphere, axial/tilt study or support-loaded bore validation is reported. No radial mesh-convergence sweep is supplied as our independent validation.

Source Section5 reports cubic nonlinearity near2rad^-2 by design, NOT near-zero amplitude drift. A leading Duffing estimate using2.08rad^-2 gives roughly+7.7% frequency shift at18°; this is a derived approximation for the source curve, not a measured result or an ED-IBS prediction. Source Remark3 says cubic nonlinearity can in principle be tuned, requiring actual dimensional design.

Section3: POM mockups were assessed qualitatively by hand; no recorded radial-stiffness/center-shift experimental data. Section6/Fig.9: a75 mm diameter Ti alloy oscillator prototype was built for FUTURE experimental testing. It is distinct from the150 mm POM FEM benchmark and is not evidence of measured ED-IBS performance.

## Bore/frequency adaptation: grounded incompatibility of copying dimensions
The source's p=5 mm main-leaf roots enter the protected r28 cylinder. The published geometry therefore cannot be copied unchanged. Enlarging only the inner solid body into a ring does not move those leaf roots. Need physical root radius at least bore reserve plus actual clamp material; retaining the proposed original36 mm attachment is a reasonable analysis DATUM, not an approved fabricated detail.

A targeted sensitivity, not a new feasible design: retain L50,e-5,r20 mm but change p to36 mm, E to114 GPa, h to minimum0.25 mm and b to5 mm. Eq.(9)/(16) gives baseline **1.11986 N m/rad**, forty times the reference4 Hz total stiffness budget. At this L/p it would require b<**0.12319 mm** merely to put baseline below0.0275907. Width was not bounded in the source, but such a narrow section does not establish axial/tilt support; we do NOT select it.

The same p change increases the leading θc prediction at18° from0.0327rad(~1.88°) to0.1998rad(~11.45°). The latter invalidates casually assuming secondary motion remains tiny. Longer main flexures and/or altered secondary lever geometry are required, followed by nonlinear checking. No fitted exponent or silent effective-stiffness calibration is used.

Actual supported mass/inertia and gravity wrench remain parametric. At reference42 g, radial stiffness necessary screen1647.52 N/m with0.25 mm maximum gravity shift; use the full correlated gravity-compliance gate in suspension-025mm-design-gate.md. Baseline must be below4Hz stiffness based on ACTUAL total referred inertia. Ring aperture must exceed radial-only56.5 mm if tilt/deformation/tolerances require reserve. All secondary/coupling leaves and clamps must stay outside r28 during motion and under load. Source centered-symmetry result does not certify any of these conditions.

## One next authorized engineering analysis
Now that source and leaf authorization are resolved, perform a **single parametric QUADRIVOT reconstruction/closure and main/secondary-flexure sizing study** with the root datum at36 mm and explicit source-based D-point incidence. Sweep L and secondary geometry within an EXPLICIT proposed outer envelope; use Eq.(9)/(16) to reject excessive baseline, Eq.(7) to flag excessive secondary rotation, and exact rigid closure to detect incompatible couplers/singularities. Treat coupling/junction coordinates not numerically fixed by the paper as design parameters, never published measurements. Record every physical surface and blade group so r28 exclusion is checked before claiming feasibility.

Do not yet implement the oscillator. A surviving geometry still requires3D nonlinear static gravity/compliance and finite-thickness clearance verification including axial/tilt behavior, plus mass integration and transmission/period recalculation. The existing planar scratch frame is not a validated3D model. This is a concrete next analysis now possible from the recovered mechanics, not another generic topology search or user-question ladder.

## Saved files / provenance boundary
Source PDF, extracted text, public landing HTML, thumbnail and page renders are listed above. Reproduce model checks with **/workspace/ed-ibs/quadrivot-source-calculations.py**. Original full-user-specification.md remains unchanged. No paid access, outside contacts, repo/cloud changes, hardware or user-computer actions occurred.
