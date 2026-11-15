# escapement

TLC reached 74 states and 218 steps. The chart draws 17 states and 21 arrows.
The view hides 74 steps, so the chart does not draw them.
The step you cut power and the source goes dark changes Drive and Supply at the same time.
The step you restore power changes Drive and Supply at the same time.
The step the unwind time passes changes Swing and Supply at the same time.
The step it enters the lift zone changes Swing and Drive at the same time.
The step the blank window closes changes Swing and Blank at the same time.
The step it leaves the lift zone changes Swing and Drive at the same time.

## CutWaitsOutTheUnwind breaks
The shortest path has 1 step:
0. Swing Released outside the lift zone, Drive No drive torque, Supply Drive commanded, Blank No blank measured yet
1. you cut power and the source goes dark: Swing Released outside the lift zone, Drive No drive torque, Supply Source off, torque already gone, Blank No blank measured yet

## DeadCenterByUnwind breaks
The shortest path has 2 steps:
0. Swing Released outside the lift zone, Drive No drive torque, Supply Drive commanded, Blank No blank measured yet
1. you cut power and the source goes dark: Swing Released outside the lift zone, Drive No drive torque, Supply Source off, torque already gone, Blank No blank measured yet
2. the unwind time passes: Swing Still swinging after fifteen seconds, Drive No drive torque, Supply Fifteen seconds with the source off, Blank No blank measured yet

## ImpulseOnlyAtZeroInsideLift breaks
The shortest path has 2 steps:
0. Swing Released outside the lift zone, Drive No drive torque, Supply Drive commanded, Blank No blank measured yet
1. it leaves the release and swings toward the center: Swing Free swing, toward the center, Drive No drive torque, Supply Drive commanded, Blank No blank measured yet
2. it enters the lift zone: Swing Lift zone, toward the center, Drive Drive torque while moving, Supply Drive commanded, Blank No blank measured yet

## BlankDurationIsTwoPointTwoMs breaks
The shortest path has 5 steps:
0. Swing Released outside the lift zone, Drive No drive torque, Supply Drive commanded, Blank No blank measured yet
1. it leaves the release and swings toward the center: Swing Free swing, toward the center, Drive No drive torque, Supply Drive commanded, Blank No blank measured yet
2. it enters the lift zone: Swing Lift zone, toward the center, Drive Drive torque while moving, Supply Drive commanded, Blank No blank measured yet
3. it enters the blank window: Swing Blank window, toward the center, Drive Drive torque while moving, Supply Drive commanded, Blank No blank measured yet
4. it crosses the center and counts a beat: Swing Blank window, toward the end of the swing, Drive Drive torque while moving, Supply Drive commanded, Blank No blank measured yet
5. the blank window closes: Swing Lift zone, toward the end of the swing, Drive Drive torque while moving, Supply Drive commanded, Blank Measured blank, not 2.2 ms

## Rules that hold
TypeOK, TorqueMatchesGate, ArmedMeansInsideBlank, ReleaseHasNoImpulse, BeatFollowsTheCrossing, SourceOffBlacksTheBeam, RetainedSourceStaysLit, NoDeadlock
