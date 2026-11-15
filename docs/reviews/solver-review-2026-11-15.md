# Solver code review (2026-11-15)

Strict findings-only review of the RK4 / power-cut / frame loop slice against `docs/user-specification.md` (issue #10 item 3). No solver behavior was changed. Proposed fixes are suggestions only. No source rewrites. Numbers are tagged [T] target, [C] calculated, or [S] source claim. This is not hardware validation or a safety claim. Decision statuses are unchanged.

Reviewed files:

- `sim/src/physics/EscapementSolver.ts`
- `sim/src/physics/powerCut.ts`
- `sim/src/sim/useSimulator.ts`

Evidence glanced at: `sim/src/sim/parameters.ts`, `sim/tests/solver.test.ts`, `sim/tests/statechart.test.ts`, `sim/src/physics/constants.ts`, `docs/decisions-and-deviations.md` (D-33..D-36), `docs/requirements-matrix.md`.

---

## Findings

### 1. severity: high (FIXED)

**status:** Fixed in https://github.com/CalebisGross/ed-ibs/pull/17. Issue #15.

**title:** Angle-only blank enter/exit can miss a full blank transit inside allowed settings

**file:line:** `sim/src/physics/EscapementSolver.ts` blank update in `step` (was `:146-166`; assumption stated near the header)

**evidence (pre-fix):** Blanking was updated only when the step starts outside and ends inside the +/- blank half-angle, or starts inside and ends outside. If one fixed step went from `|theta0| > blank` through center to `|theta1| > blank`, neither branch ran, `angularBlank` stayed false, and no blank duration was recorded. The header stated event detection assumes at most one zero crossing per step, but blank enter/exit is a second pair of level crossings with no sub-step localization for a full transit.

At `DT_S = 0.00025` s [S], peak `|Delta theta| ≈ A * 2 * pi * f * dt`. With sanitize caps that allow prescribed frequency up to 80 Hz and amplitude target up to 40 deg (`settings.ts` clamps), peak step size is about 5.03 deg [C] while the full blank width is 4.2 deg at the default 2.1 deg half-angle [S]. That can skip the window entirely. The under-resolved UI warning fires only below 40 steps/cycle (`parameters.ts:328-335`); at 80 Hz there are still 50 steps/cycle [C], so the warning does not cover this miss.

Spec §2.B.2 [S] requires `beamBlanked` whenever `|theta| <= 2.1 deg` during the zero-crossing. Chopper drawing then silently fails to blank those beats when the event is missed.

**fix applied:** Keep `dt = 0.25 ms` [S] and the RK4 integrator unchanged. When both endpoints are outside the blank window and `theta0 * theta1 < 0`, register enter and exit at the interpolated blank half-angle crossings in the same step, set `lastBlankDuration`, and increment `blankEventCount`. Determinism (partition identity) is preserved. Regression: `sim/tests/solver.test.ts` "registers a blank when one fixed step jumps across the whole window at max editable f x A".

**proposed_fix (historical):** Suggestion only from the review: either (a) detect blank level crossings with the same interpolated enter/exit logic even when both endpoints are outside (enter and exit in one step), or (b) clamp editable frequency/amplitude so peak `|Delta theta|` stays below the blank full width with margin, and lower the steps/cycle warning threshold accordingly. Option (a) was applied.
### 2. severity: medium

**title:** Hitch catch-up permanently drops simulated time after long rAF gaps

**file:line:** `sim/src/sim/useSimulator.ts:99-114`, `:245-253`

**evidence:** Wall dt is clamped to 50 ms (`clampWallDt`, `:100-101`), then fed to `consumeFixedSteps` (`:251-252`). There is no Page Visibility handler; after a hidden tab, the first resumed frame sees a large `rawDt`, clamps to 0.05 s, and advances at most 200 solver steps (0.05 s of sim time) [C]. If `steps > maxSteps` (8000), leftover accumulator time is zeroed (`:113`), which drops sim time relative to wall time. Under the RAF path the 50 ms clamp makes the 8000 cap hard to hit, but the clamp itself still discards all wall time beyond 50 ms per frame with no deferred catch-up budget.

Spec §1 [S] asks for RK4 decoupled from the render rate so physics stays correct while the UI targets 60-120 FPS [T]. Decoupling is implemented for normal frames; long gaps (tab hidden, debugger pause) desynchronize sim time from wall time without a documented policy.

**proposed_fix:** Suggestion only: document the intentional "max 50 ms sim catch-up per frame" policy in the console/status, and/or on `visibilitychange` reset `lastWall` without integrating the hidden interval (freeze while hidden, continue from the same sim clock). Optionally keep a capped backlog instead of hard-dropping remainder when `maxSteps` trips.

### 3. severity: medium

**title:** `step` accepts non-finite or non-positive stiffness and related params

**file:line:** `sim/src/physics/EscapementSolver.ts:119-125`, `:104-108`

**evidence:** Guards require only `inertia > 0`, `dt > 0`, and a positive integer `toothCount` (`:120-125`). `stiffness`, `c0`, `cEddy`, `torqueMagnitude`, `liftHalfAngle`, `blankHalfAngle`, `unlockAmplitude`, and `omegaEpsilon` are unchecked. A NaN stiffness (or negative) yields NaN acceleration (`:107`) and permanently NaN state; `isNewZeroCrossing` then returns false for NaN pairs (`:56-59`), so the integrator spins without throwing. `solveCommand` soft-fails some damping/torque NaNs to 0 (`parameters.ts:107-109`) but still forwards whatever `activeStiffness` / `activeInertia` produced.

This is a type-safety / numerical-stability hole relative to the SI kernel the spec-audit first slice called for (`docs/spec-audit.md` §8).

**proposed_fix:** Suggestion only: reject non-finite or non-positive `stiffness` and non-finite damping/angles in `step` (or in a `assertSolverParams` used by `solveCommand` and tests), matching the inertia/dt checks.

### 4. severity: medium

**title:** Drive torque is piecewise discontinuous inside each RK4 stage

**file:line:** `sim/src/physics/EscapementSolver.ts:62-68`, `:130-142`

**evidence:** `escapementTorque` is a hard gate on `|theta| <= liftHalfAngle` and `|omega| > omegaEpsilon` (`:64-66`). RK4 evaluates that gate at four intermediate states (`:130-139`). Crossing the lift boundary (or the epsilon floor) mid-step makes the RHS discontinuous, so the local truncation order is not fourth-order on those steps even though the free-oscillator tests show fourth-order convergence (`solver.test.ts:89-104`) and partition identity still holds with drive on (`solver.test.ts:202-219`).

Spec §2 [S] asks for a deterministic RK4 engine; determinism across render partitions is met. Spec-audit §2 warned that ordinary RK4 does not by itself settle discontinuous events; the prototype chose a continuous-in-time directional zone drive (D-36) rather than an impulse with event localization.

**proposed_fix:** Suggestion only: keep the labeled drive model, but either freeze torque for all four stages from `(theta0, omega0)`, or split steps on lift-boundary crossings. Treat any such change as a separate, reviewed behavior change.

### 5. severity: low

**title:** Idle power latch mode ignores loaded `settings.powerCutMode` on first mount

**file:line:** `sim/src/sim/useSimulator.ts:131-137`, `:123-127`

**evidence:** `useState` for power starts as `idlePower()` with default mode `total-source-off` (`powerCut.ts:24-25`). Settings are loaded from storage (`:131`) and may already be `retained-source-diagnostic`. `freshRun(loadSettings())` builds a matching idle latch (`:123-127`) but only its `state` is used for readout (`:134-136`); the matching power object is discarded. `cutPower` correctly reads `settings.powerCutMode` (`:206-208`), so a cut still uses the setting. Until `reset` / `restorePower` / `setPowerMode`, React `power.mode` can disagree with settings while idle.

**proposed_fix:** Suggestion only: initialize with `idlePower(loadSettings().powerCutMode)` or reuse `freshRun(...).power`.

### 6. severity: low

**title:** Re-cutting while a cut is active restarts from full commanded torque

**file:line:** `sim/src/sim/useSimulator.ts:202-211`

**evidence:** `cutPower` always builds the capture from `idlePower(...)` (`:204`), then `engagePowerCut` with a new `startTime` and `torqueAtCut` (`:205-209`). A second press during `retained-source-diagnostic` abandons the partial ramp and restarts from the live fader torque. Spec §4.4 [S] describes one emergency cut; latch restart semantics are unspecified.

**proposed_fix:** Suggestion only: no-op `cutPower` when `powerRef.current.active`, or expose an explicit "re-arm" path.

### 7. severity: low

**title:** Unbounded `mechAngle` / `opticalAngle` / `validBeats` after long runs

**file:line:** `sim/src/physics/EscapementSolver.ts:185-196`

**evidence:** Spec §2.B.1 [S] increments beat index `n = (n + 1) mod 30` (for Z = 15). The solver accumulates `validBeats` without modulus and adds unbounded radians to `mechAngle` / `opticalAngle` (`:185-196`). Indexing is still correct via those angles (`projection.ts` uses `opticalAngle` directly; the viewport uses `mechAngle`). After very long sessions, large angle magnitudes can lose float precision in trig used for drawing. Pallet flip uses `validBeats % 2` only (`MechanicalViewport.tsx:219`), which is fine.

**proposed_fix:** Suggestion only: optionally wrap displayed/render angles mod `2*pi` (or mod `2*Z` beats) while keeping a separate integer beat counter, or document that wrap is left to the renderer.

### 8. severity: low

**title:** Sample intensity is latched from pre-step command, blank from post-step state

**file:line:** `sim/src/sim/useSimulator.ts:254-274`

**evidence:** Each sample records `command.intensity` solved at `state.t` before `step` (`:256-257`, `:272`) and `angularBlank` from `next` (`:268`). At a power-cut boundary, one sample can pair the old intensity with the new blank flag (or the reverse on restore). Chopper visibility uses that pair (`:259-263`). Effect is at most one 0.25 ms sample [S].

**proposed_fix:** Suggestion only: resolve intensity after the step with `next.t`, or record both pre and post if traces need exact cut alignment.

### 9. severity: info

**title:** Spec path `src/physics/...` vs repo path `sim/src/physics/...`

**file:line:** `docs/user-specification.md:12`; `sim/src/physics/EscapementSolver.ts:1`

**evidence:** Spec names `src/physics/EscapementSolver.ts` [S]. The four-folder layout places it under `sim/`. Requirements matrix row 2.1 already maps to the sim path.

**proposed_fix:** Suggestion only: keep the matrix/decision note; do not rewrite the byte-locked spec.

### 10. severity: info

**title:** Decay readout picks `analyticHz` through a redundant `referenceHz` ternary

**file:line:** `sim/src/sim/parameters.ts:147`

**evidence:** `linearDecayRatio(command.referenceHz > 0 ? command.analyticHz : 0, ...)` uses analytic frequency whenever reference frequency is positive. Correct for the active oscillator, but the condition is easy to misread as "use reference law frequency."

**proposed_fix:** Suggestion only: call `linearDecayRatio(command.analyticHz, ...)` directly (status text only; not a solver change).

---

## What looks correct

1. **Fixed dt = 0.25 ms [S].** `DT_S = 0.00025` in `constants.ts:7`. `step` defaults to it; the RAF loop never substitutes wall dt as the integrator step (`useSimulator.ts:257`).

2. **Classical RK4 for the first-order form.** Stages at `:130-142` match `d theta/dt = omega`, `d omega/dt = a(theta, omega)`. Undamped orbit error, energy conservation to ~1e-8 relative, and ~16x error drop on halved dt are tested (`solver.test.ts:72-104`) [C].

3. **Determinism vs render partitioning.** `t = step * dt` (`EscapementSolver.ts:144`) avoids time drift. `advanceToTime` only takes whole steps (`:238-247`). Partition identity is tested free and driven (`solver.test.ts:106-120`, `:202-219`). Frame loop: accumulate wall time, consume `floor(accum/dt)` steps, keep remainder (`useSimulator.ts:105-114`, `:250-252`).

4. **Render decoupling.** `requestAnimationFrame` only schedules work; physics uses fixed `DT_S`. Chopper toggles drawing only (`beamSampleVisible`, `:117-119`; statechart test `:348-356`). Pause skips integration without draining the accumulator (`:250` with `simulationShouldStep`).

5. **Equation of motion units.** Acceleration `(tau - (c0+cEddy)*omega - K*theta) / I` (`:104-108`) is consistent in N·m, rad/s, kg·m². Angles enter the solver in radians via `solveCommand` / `degToRad`.

6. **Beat gating by unlock amplitude.** Zero crossing plus `peak > unlockAmplitude` (`:181-197`) matches §2.B.1's `|theta_max| > 3.5 deg` rule [S] (threshold editable). Sub-threshold orbits count raw crossings but not valid beats (`solver.test.ts:138-143`).

7. **Tooth generalization.** Mechanical / optical steps use `pi/Z` and `2*pi/Z` (`referenceModel.ts:93-98`), recovering 12 deg / 24 deg at Z = 15 [C].

8. **Power-cut policies are explicit and tested.** `total-source-off` zeros torque and intensity immediately; `retained-source-diagnostic` linear-ramps torque and keeps the fader (`powerCut.ts:55-71`; `model.test.ts:109-122`; statechart `CutWaitsOutTheUnwind`).

9. **Q ~ 350 decay honesty.** Free decay at 15 s leaves about 34.05% amplitude [C] (`0.340513857` in tests). Status and power-cut comments refuse a dead stop / pinspot story.

10. **Startup stall is visible.** Rest at the origin with drive on stays at rest because torque requires `|omega| > omegaEpsilon` (`statechart.test.ts:300-307`). Status warns (`parameters.ts:337-344`). Matches prototype assumption 12 in the decisions file.

11. **Immutable step style.** `step` returns a new state object; inputs are not mutated. Good for replay and tests.

---

## Intentional / documented deviations (fair review)

These are conflicts with the byte-locked spec that the prototype already labels. They are not fresh defects from this pass.

| ID | Topic | Spec [S] | Code / evidence |
| --- | --- | --- | --- |
| D-36 | Impulse timing | Impulse only when `|theta| <= 3.5 deg` and velocity crosses zero in the unlocking direction (§2.A.3) | `directional-lift-zone-drive`: `tau * sign(omega)` while inside the lift half-angle and `|omega| > epsilon` (`EscapementSolver.ts:11-15`, `:62-68`). Zero velocity at the apex lies outside the lift zone on a normal orbit; statechart `ImpulseOnlyAtZeroInsideLift` records the break. |
| D-33 | Blank duration | About 2.2 ms blank (§2.B.2) [S] | Angle window only; measured duration at 18 deg / ~8 Hz is about 4.65183 ms [C] (`solver.test.ts:145-151`). 2.1 / 2.2 ms remain source claims. |
| D-34 | Hold-Q decay | 15 s power-cut run-down to rest (§4.4) [S] | Linear viscous decay at Q 350 does not stop by 15 s (~34% remains) [C]. `DeadCenterByUnwind` tests assert continued motion. |
| D-35 | Dead-center pinspot | Rosette spirals to a dead-center pinspot (§4.4) [S] | Rest radius `D * tan(15 deg)` from facet tilt (`powerCut.ts:12-12`; status `rest-spot`). |
| D-23 (related) | Power-cut meaning | Watch remontoire unwind over 15 s with a visible spiral | Default mode `total-source-off` extinguishes the source; visible spiral needs `retained-source-diagnostic` (linear ramp, not a mainspring law) (`powerCut.ts:1-13`). Nov 15 working note: real mains loss goes dark. |
| Scope | Coupled pallet / wheel dynamics | §2 coupled dynamics of balance, pallet, escape wheel | 1-DOF balance RK4; wheel/prism/pallet are kinematic indexes from beats (decisions "What this prototype is"; matrix 2.2). |
| Scope | N, E, b, t drive K | §2.A.2 | K from the original curb law or prescribed frequency; thickness/material feed stress estimate only (matrix 2.5). |
| Scope | 4-20 Hz from curb travel | §2 / §4 [T] | Reference law endpoints ~8.001 Hz to ~11.644 Hz [C]; prescribed mode is labeled assumption. |

---

## Test evidence summary

| Claim | Test |
| --- | --- |
| RK4 accuracy / order / energy | `solver.test.ts` "RK4 free oscillator" |
| Partition determinism | `solver.test.ts` "identical under different step partitions"; driven repeat |
| Unlock / blank / tooth steps | `solver.test.ts` "events" |
| Q 350 15 s residual ~0.3405 [C] | `solver.test.ts` damping case; `statechart.test.ts` `notParked` |
| Directional drive vs zero-velocity impulse | `statechart.test.ts` `ImpulseOnlyAtZeroInsideLift` |
| Blank ≠ 2.2 ms | `statechart.test.ts` `BlankDurationIsTwoPointTwoMs` |
| Power cut immediate vs continued swing | `CutWaitsOutTheUnwind`, `DeadCenterByUnwind` |
| Wall dt clamp / step cap / pause gate | `statechart.test.ts` "steps only while running..." |
| Chopper does not change solver params | `statechart.test.ts` chopper gate case |

---

## Verdict

The fixed-step RK4 core, render decoupling, SI units, unlock/beat indexing, and honest power-cut labeling match the prototype contract and are well tested. Finding 1 (blank-window miss under editable high frequency x amplitude) is fixed by interpolated enter/exit when a step brackets the window; see issue #15. Remaining items are latch/init polish, param validation, and already-open D-33..D-36 spec conflicts.
