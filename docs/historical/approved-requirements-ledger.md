# Approved requirement ledger: separate from original source

Authority: Caleb's direct decisions relayed by parent in this engineering workstream. This ledger records changes/clarifications; it does NOT edit or replace full-user-specification.md. Numerical examples in proposal documents are not approvals.

## Approved constraints / direction
1. Retain4–20 Hz as the target; propose physically justified revised mechanics before oscillator implementation.
2. Develop the auxiliary-spring mechanism; longer pivot leaves and ring-inertia changes allowed.
3. Keep a nominal56 mm through-bore mechanically unobstructed throughout the assembly, full±18° motion and full tuning travel. Fixed optical prism content is the stated exception.
4. Operate in ANY mounting orientation.
5. NEW: maximum **gravity-induced radial rotor/support-reference center shift =0.25 mm**, in any mounting orientation. This is a gravity-only acceptance bound, not an axial/tilt/shock tolerance.
6. Keep app/oscillator implementation paused. This workstream is analytical engineering scratch only.

## Other current fixed conditions
Four physical Ti leaves/branches, minimum thickness0.25 mm and±18° amplitude remain constraints. Do not substitute multi-leaf modules or bearings silently. Prefer the original9.5 mm tuning-actuator stroke; outer envelope has not been approved. The original42 g annular mass and radii are references, not a measured redesigned assembly BOM.

## Explicitly rejected / superseded
- Original Kbase0.1104 with inverse-length18–8.5 mm law cannot deliver4–20 Hz at reference inertia.
- Internal bridge/pin transmission violates the protected through-bore.
- Midpoint cross-leaves occupying the rotation axis violate the bore.
- Tested straight radial and folded-frame layouts are not accepted suspensions.
- Favorable vertical-only mounting is no longer a way to exclude gravity support loads.
- Earlier0.05/0.10 mm radial-displacement examples were never selected.0.25 mm is now selected.

## Unapproved / unresolved (not silently assigned)
Actual supported mass/inertia and COM; axial sag/tilt limits; load-induced reserve/tolerance allocation beyond gravity radial motion; transmission preload imbalance and dynamic/shock envelope; maximum housing radius/length; frequency-drift acceptance; material condition/endurance/life and manufacturing details. Keep these parametric until design/acceptance data exist.

## Source preservation
Original source: /workspace/ed-ibs/full-user-specification.md, unchanged. Prior audits/proposals remain historical scratch evidence, not cumulative approvals. Current gravity-support selection gate: /workspace/ed-ibs/suspension-025mm-design-gate.md.

## Published-topology audit status (not a new approval)
QUADRIVOT is identified as four main mirrored RRR chains plus Watt coupling and additional secondary/coupling flexures, not four total physical leaves. See remote-center-topology-audit.md. Its exact physical leaf count/closure remains source-limited pending the full accepted manuscript (DOI10.1115/DETC2023-109120). No compound multi-leaf substitution is approved; protected bore and0.25 mm all-orientation gravity limit remain unpassed.

## NEW approved architecture change
Caleb directly approved, relayed by parent: “Allow additional secondary and coupling flexures while retaining the bore, orientation, shift and frequency targets. Keep implementation paused.” Four TOTAL physical leaves is therefore no longer a binding restriction for the selected compound architecture; additional secondary RCC and coupling flexures are explicitly allowed. This supersedes earlier four-total-leaf rejection as an authorization gate only, NOT as proof of feasibility. Preserve56 mm protected bore, any orientation,≤0.25 mm gravity radial shift,4–20 Hz and±18°. Minimum0.25 mm source thickness and other unrelaxed requirements remain;9.5 mm tuning stroke remains preferred. No implementation is authorized.

## Full-source audit update
Official QUADRIVOT accepted manuscript recovered and checksum-matched: quadrivot-accepted-manuscript.pdf. Current remote-center-topology-audit.md supersedes the historical source-unavailable audit. Fig.6b/AppendixA identify4main leaves+4two-blade RCC modules+8coupling leaves (20blade segments). Additional secondary/coupling flexures are now approved; actual bore, all-orientation0.25 mm shift and frequency feasibility remain unproved. Published POM dimensions/results are precedents, not approved Ti dimensions.

## QEXT-200 analytical specimen status (not an approval)
One proposed external QUADRIVOT20blade frame (p36mm,L200mm,b1mm,h.25mm) passes neutral planar radial/torsional screens using its own linear beam geometry. Its centered rigid Watt reference fails finite-angle closure by~0.1412mm; elastic accommodation,3D support and loaded clearance remain unpassed. No final suspension accepted; implementation paused. See quadrivot-external-sizing.md for explicit proposed envelope/coordinates and gate table.

## QEXT-200 nonlinear design-pass disposition
Geometry unchanged.20blade planar corotational elastic analysis resolved finite-stroke compatibility but FAILED reference42g gravity radial-shift qualification: gravity-preloaded+x path gives1.952mm at+18° and1.792mm at-18°, versus approved0.25mm. Neutral stiffness did not persist: main-leaf bowing opens a bending-dominated lateral mode. Reject unchanged specimen for this reference qualification; do not advance it as a passing design to3D or implementation. This is not a proof against all masses/architectures, and no new parameters/acceptance limits are approved. See quadrivot-nonlinear-assessment.md.
