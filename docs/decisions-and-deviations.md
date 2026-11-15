# Decisions and deviations

This file is the current decision record for the local prototype. It does not edit `user-specification.md`. The original specification and the preimplementation audit are byte-for-byte copies of the supplied texts.

## Authority

Implementation of this local prototype is authorized.

- 2026-11-07, 5:28pm CT, Caleb: "Okay that's fine, we're still prototyping so some flexure and out of spec measurements are acceptable."
- 2026-11-07, 5:33pm CT, Caleb: "Lift the pause, keep going."

Those two statements supersede earlier pause lines in `historical/approved-requirements-ledger.md`. Prototype deviations may stay visible. They are not automatic blockers. This authorization does not allow fabricated physics, hidden conflicts, hardware safety claims, or fabricated experimental validation.

## Retained targets

These remain targets. This prototype does not newly validate them.

- Frequency band 4 to 20 Hz.
- Nominal 56 mm protected through-bore, with fixed optical prism content as the stated exception.
- Any mounting orientation.
- Gravity-induced radial shift at most 0.25 mm.
- Amplitude target +/- 18 deg.
- Minimum source thickness 0.25 mm.
- Preferred tuning travel 18.0 mm to 8.5 mm.

Additional secondary and coupling flexures, longer leaves, auxiliary springs, and ring-inertia changes are allowed. Four total physical leaves is not a binding count. That allowance is not a proof that a 20-blade frame meets the bore, shift, or frequency targets.

## What this prototype is

A local four-pane workbench around a single-degree-of-freedom oscillator. The balance angle is integrated with fixed-step RK4. The escape wheel, prism, pallet, and rays are indexed or drawn from that angle. They are not separate dynamic bodies, contact bodies, or a 3D flexure model.

The original stiffness law is untouched:

`K = 0.1104 * (0.018 / L)` with `L` from 0.018 m to 0.0085 m.

With the reference annulus inertia `0.042 * (0.036^2 + 0.028^2) / 2 = 4.368e-5 kg m^2`, that law derives about 8.001 Hz to 11.644 Hz. It does not derive 4 Hz or 20 Hz. No coefficient was changed to force that band.

An optional prescribed-frequency mode sets `K = I * (2 * pi * f)^2` from an editable band that defaults to 4 to 20 Hz. The screen labels it as an assumption. The original-law frequency at the same curb length stays on screen.

## Prototype assumptions

1. Drive model id `directional-lift-zone-drive`. Torque equals `tau * sign(omega)` while `|theta|` is inside the lift half-angle and `|omega|` exceeds an editable epsilon. It is applied on both swings. It is not a pallet contact model.
2. Full-scale torque defaults to `pi * K * A^2 / (4 * Q * liftHalf)` times an editable scale. `A` defaults to 18 deg. This is a linear energy estimate, not a remontoire calibration.
3. Hold-Q mode sets `c0 = sqrt(K I) / Q` so Q stays at the editable value when K changes. The alternative freezes `c0` at the reference K and reference I. The eddy fader adds viscous damping toward an editable Q floor. It is not a Lorentz yoke map. A power cut leaves the last brake coefficient in place.
4. Blanking is the angle window. Its duration is measured from the integrated motion. Claims of 2.1 ms and 2.2 ms stay labeled as source claims.
5. The 44 deg timegrapher lift is shown as a source claim and is not converted into the 7 deg balance zone.
6. Tooth count `Z` uses mechanical step `180/Z` deg and optical step `360/Z` deg. Facet spacing is `360/F`. Instantaneous rays are `F * 3`.
7. Chromatic offsets default to 0. Any other value is an illustrative user setting, not dispersion.
8. Total source off sets torque and source intensity to 0. Retained-source mode keeps intensity and applies a linear torque ramp over an editable unwind time (default 15 s). The ramp is not a mainspring law.
9. Material, thickness, and leaf width do not change K. Thickness and modulus feed only `sigma = E t |theta| / (2 L)`. The 510 MPa flag is the user's threshold, not a life certificate.
10. Musical tempo uses an explicit subdivision `s` in `BPM = 120 f / s`. Unreachable requests are reported. The curb is not clamped to an endpoint.
11. Drawn leaf count, pallet flip, prism wedge, wheel pitch, and fog are graphics. Anchor radius and axial ring thickness used in the export are stated assumptions.
12. Startup is the editable initial angle and rate, applied on Reset. Rest at the origin is a stall. No hidden startup impulse is added.

## Visible source conflicts

- Zero-velocity impulse inside +/- 3.5 deg conflicts with a center crossing at peak velocity. The drive assumption above is the implemented choice.
- Reference travel does not cover 4 to 20 Hz.
- Blank duration at 18 deg and about 8 Hz is about 4.65 ms, not 2.2 ms.
- 44 deg is not treated as 7 deg.
- Three facets and three channels are 9 instantaneous rays. Accumulated spokes can overlap. The source's 45-beam wording is not drawn as 45 simultaneous beams.
- A 15 deg facet tilt does not put the rest spot at the wall center.
- Q near 350 does not extinguish the motion at 15 s.
- K is prescribed. It is not derived from thickness, modulus, or leaf count.

## Historical provenance

`historical/approved-requirements-ledger.md` remains the earlier chronology. In particular:

- "Keep implementation paused" is superseded by the 5:33pm CT authorization.
- "Four total physical leaves" as a hard stop is superseded by the later allowance for secondary and coupling flexures. The allowance is not a passing suspension.
- The source-unavailable topology note is superseded inside that same historical file by the later full-source audit. The audit still does not validate an ED-IBS suspension.
- The QEXT-200 specimen remains rejected for the reference 42 g gravity screen. The nonlinear assessment is archived beside this file. This app does not draw that specimen and does not claim the 0.25 mm shift.

## Stage preview

Caleb confirmed the workbench was running, and said he was not really grasping what it would look like in a live environment. He then answered yes to an audience-view stage preview with a fixture, haze, backdrop, and a person for scale.

The Stage tab shows that preview. Engineering keeps the four panes. Both use the same oscillator, the same wall map, and the same throw, blanking, and source intensity.

Presentation assumptions, not approved hardware or measured light:

- The optical axis is level, 2.4 m above the floor. Backdrop distance is the throw control.
- The cloth is 16 m wide and 9 m tall with its bottom on the floor. Spots outside that rectangle stay at the formula endpoint.
- The figure is 1.75 m tall.
- Shaft radius, spot size, fog, and the haze slider are display choices so the rays can be seen. They are not beam diameter, radiometry, or a laser-safety result.
- Afterglow is the persistence window of samples that were actually visible. It is not a larger ray count. Coincident colors still share one path.

Pause holds the picture. Reset clears the afterglow. Source off and chopper blanking remove live shafts. The curb still only changes the oscillator, which moves the same rays.

## Out of this slice

No public deployment, paid service, real DMX, laser, or actuator output. No nonlinear multibody, contact, or 3D support model. No claim that the illustrative SCAD or DXF is manufacturing-approved. Frame rate is a session measurement, not a standing 60 to 120 FPS certificate.
