# State charts

These charts are the escapement step and the simulator session, drawn from the code by the pstack `statechart` checker. They are not a stored state machine. `EscapementSolver.step` integrates a fixed-step RK4 oscillator and updates flags in the same step. The boxes are predicates over that sample.

The checker is not in this repo. From a checkout of the skill:

```bash
export PATH="$HOME/.local/bin:$PATH"
rm -rf /tmp/ed-ibs-escapement-chart && mkdir /tmp/ed-ibs-escapement-chart
scripts/statechart docs/statecharts/escapement.tla \
  --config docs/statecharts/escapement.cfg \
  --view docs/statecharts/escapement.view.ts \
  --out /tmp/ed-ibs-escapement-chart
rm -rf /tmp/ed-ibs-simrun-chart && mkdir /tmp/ed-ibs-simrun-chart
scripts/statechart docs/statecharts/simrun.tla \
  --config docs/statecharts/simrun.cfg \
  --view docs/statecharts/simrun.view.ts \
  --out /tmp/ed-ibs-simrun-chart
```

The first run installs TLC and a JDK through mise. Copy `chart.mmd` and `report.md` from each empty output directory into `docs/statecharts/escapement/` and `docs/statecharts/simrun/`. Do not commit `tlc.out`. Render each `chart.mmd` with `pele@1.9.0` and write `chart.svg` beside it.

## What the pictures leave out

- The low undriven orbit (about 2°) stays inside the blank and never counts a beat. It is a solver test, not a chart state.
- Rest at theta = 0 and omega = 0 produces no torque, so a commanded drive does not start the balance. That fixed point is not in the chart.
- `ReachHorizon` is one action for the whole unwind interval. It is not each RK4 step. The escapement action is taken from the release only. The simulator action runs only while the session is running, and it leaves the start angle.
- The first animation frame has no previous wall time, so it does not integrate. A frame is capped at 8000 solver steps and the leftover is dropped. Neither is a chart state.
- Restoring defaults is a reset onto the default settings. The chart's reset already returns the angle and the supply, and it does not change pause.
- `ChoosePolicy` and `Retarget` are hidden. The cut arrows say whether the source goes dark or stays lit. A mode change while a cut is already latched does not recapture the torque.

## Which box breaks which rule

The legend ORs every broken rule onto one swatch. Read the box, not the legend line.

Escapement (`docs/statecharts/escapement/chart.mmd`):

- **ImpulseOnlyAtZeroInsideLift**: "Drive torque while moving". The solver applies torque throughout the lift zone whenever omega is outside the epsilon, not only at a zero-velocity sample inside that zone. "Lift zone, toward the center" and the blank boxes are only sometimes that failure, because the same words also cover a coast with the source off.
- **BlankDurationIsTwoPointTwoMs**: "Measured blank, not 2.2 ms". The undriven harmonic blank at 18° and the reference frequency is about 4.652 ms. "Lift zone, toward the end of the swing" and "Free swing, toward the end of the swing" stay marked because the long measurement is kept after the window closes.
- **CutWaitsOutTheUnwind**: "Source off, torque already gone". `total-source-off` zeroes torque and intensity at the cut. The 15 s unwind is not waited out.
- **DeadCenterByUnwind**: "Fifteen seconds with the source off" and "Unwind finished, source still lit". After that interval the balance is "Still swinging after fifteen seconds". It is not parked at the center. Q near 350 leaves about 34% of the free linear amplitude.

Simulator (`docs/statecharts/simrun/chart.mmd`):

- **CutWaitsOutTheUnwind**: "Source off, torque already gone", while the angle is still "At the start angle".
- **DeadCenterByUnwind**: "Fifteen seconds with the source off" and "Unwind finished, source still lit". On that path the angle is "Away from the start angle".

`sim/tests/statechart.test.ts` replays each shortest path against `EscapementSolver` and the power latch, one segment per action.
