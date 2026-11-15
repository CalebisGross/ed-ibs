# ED-IBS statechart formal check

Use this skill when changing the escapement step, the power-cut latch, or the simulator session loop. The TLA+ models in `docs/statecharts/` are finite abstractions of those rules. They are not a stored state machine in the TypeScript code.

## When to rerun TLC

Rerun after any edit to:

- `sim/src/physics/EscapementSolver.ts`
- `sim/src/physics/powerCut.ts`
- `sim/src/sim/useSimulator.ts`
- `sim/src/sim/parameters.ts` (torque, intensity, or curb mapping that the models name)
- `docs/statecharts/*.tla` or `docs/statecharts/*.cfg`

Also rerun when a review or bug report claims a new invariant about blanking, beats, drive torque, or power-cut decay.

## What must hold

Hold-only configs (`*.hold.cfg`) are the regression gate. They must stay green:

Escapement (`docs/statecharts/escapement.hold.cfg`):

- `TypeOK`
- `TorqueMatchesGate`
- `ArmedMeansInsideBlank`
- `ReleaseHasNoImpulse`
- `BeatFollowsTheCrossing`
- `SourceOffBlacksTheBeam`
- `RetainedSourceStaysLit`

Sim session (`docs/statecharts/simrun.hold.cfg`):

- `TypeOK`
- `StiffnessFollowsTheCurb`
- `SourceOffBlacksTheBeam`
- `RetainedSourceStaysLit`

Expected distinct state counts today: escapement 74, simrun 320. The check script fails if those counts drift without an intentional model update.

## Source claims that are expected to break

The full configs (`escapement.cfg`, `simrun.cfg`) also list source-claim invariants that the solver does **not** keep. Leave them in the model. Do not weaken them to make TLC green.

- `ImpulseOnlyAtZeroInsideLift` (D-36): code uses directional lift-zone drive while moving.
- `BlankDurationIsTwoPointTwoMs` (D-33): measured blank is the long class, not 2.2 ms.
- `CutWaitsOutTheUnwind` (D-23 / D-34): `total-source-off` zeros torque and intensity at the cut.
- `DeadCenterByUnwind` (D-34 / D-35): Q about 350 does not park at dead center after 15 s.

`sim/tests/statechart.test.ts` replays the shortest broken paths against the TypeScript solver.

## How to run

From the repo root (needs Java 11+ and network once to fetch the pinned jar):

```bash
bash scripts/check-statecharts.sh
```

Pinned tool: tla2tools 1.7.4, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`. Override cache with `ED_IBS_TLA_CACHE`, jar path with `TLA2TOOLS`, java with `JAVA`.

To explore intentional breaks and redraw charts, use the pstack `statechart` checker as documented in `docs/statecharts/README.md`. That checker is not vendored in this repo.

## How to update the model with the code

1. Change the TypeScript first, or change the TLA first, but land them in the same pull request when the rule changes.
2. Update guards and actions in `escapement.tla` / `simrun.tla` so the phase vocabulary still matches the code comments at the top of each module.
3. If a hold invariant must change, say so in the PR and update `*.hold.cfg` plus this skill's hold list.
4. If a source-claim invariant newly starts holding, move it into the hold config and say why. Do not silently drop a broken source claim.
5. Run `bash scripts/check-statecharts.sh` and `cd sim && npm test` (includes `statechart.test.ts`).
6. If state counts change, update the expected counts in `scripts/check-statecharts.sh` and refresh `docs/statecharts/*/report.md` when you redraw charts.
7. Do not claim TLC results as hardware validation. Numbers stay tagged [T], [C], or [S] in docs.

## CI

The `statecharts` job in `.github/workflows/ci.yml` runs the hold-only script with the pinned jar. It does not run the full source-claim configs.
