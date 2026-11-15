# simrun

TLC reached 320 states and 2464 steps. The chart draws 17 states and 20 arrows.
The view hides 320 steps, so the chart does not draw them.
The step you reset changes Supply and Angle at the same time.
The step the unwind time passes changes Supply and Angle at the same time.

## CutWaitsOutTheUnwind breaks
The shortest path has 1 step:
0. Session Running, Supply Drive commanded, Angle At the start angle, Curb Long leaf, Brake Brake off, Chopper Chopper on, Thickness Nominal thickness
1. you cut power and the source goes dark: Session Running, Supply Source off, torque already gone, Angle At the start angle, Curb Long leaf, Brake Brake off, Chopper Chopper on, Thickness Nominal thickness

## DeadCenterByUnwind breaks
The shortest path has 2 steps:
0. Session Running, Supply Drive commanded, Angle At the start angle, Curb Long leaf, Brake Brake off, Chopper Chopper on, Thickness Nominal thickness
1. you cut power and the source goes dark: Session Running, Supply Source off, torque already gone, Angle At the start angle, Curb Long leaf, Brake Brake off, Chopper Chopper on, Thickness Nominal thickness
2. the unwind time passes: Session Running, Supply Fifteen seconds with the source off, Angle Away from the start angle, Curb Long leaf, Brake Brake off, Chopper Chopper on, Thickness Nominal thickness

## Rules that hold
TypeOK, StiffnessFollowsTheCurb, SourceOffBlacksTheBeam, RetainedSourceStaysLit, NoDeadlock
