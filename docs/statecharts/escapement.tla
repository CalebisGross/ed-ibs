---- MODULE escapement ----
\* Abstraction of the cycle the RK4 solver actually steps.
\* It is not a stored phase enum. EscapementSolver.step integrates
\* theta and omega, then updates blank and beat flags. The actions
\* below are the phase changes those flags and escapementTorque make
\* on a release that starts outside the lift zone (the 18 deg orbit).
\*
\* Source of the guards:
\*   escapementTorque          EscapementSolver.ts
\*   blank enter and exit      EscapementSolver.step
\*   valid beat on a crossing  EscapementSolver.step, peak > unlockAmplitude
\*   torque and intensity      powerCut.torqueUnderPowerPolicy
\*                             powerCut.sourceIntensityUnderPowerPolicy
\*                             parameters.solveCommand
\*
\* Left out, and checked in sim/tests/statechart.test.ts instead:
\*   the undriven release that stays inside the unlock angle
\*   the fixed point at theta = 0, omega = 0 (no startup impulse)
\*   samples between the phases (dt = 0.00025 s)
\*   ReachHorizon is the whole unwind interval, not each RK4 step
\*
\* A fixed step often has no stored sample with omega exactly 0 at the
\* far end. TurnOutside is that sign change while still outside the
\* lift zone. The release itself is the one stored still point.

VARIABLES zone, heading, side, power, policy, torque, armed, clock, blankMs, beat, intensity

vars == <<zone, heading, side, power, policy, torque, armed, clock, blankMs, beat, intensity>>

TorqueOn(z, p, h) ==
  p \in {"drive", "unwind"} /\ z \in {"lift", "blank"} /\ h # "still"

Lit(p) == IF p = "off" THEN 0 ELSE 1

TypeOK ==
  /\ zone \in {"extreme", "free", "lift", "blank", "residual"}
  /\ heading \in {"in", "out", "still"}
  /\ side \in {"pos", "neg"}
  /\ power \in {"drive", "unwind", "off", "spent"}
  /\ policy \in {"total", "retained"}
  /\ torque \in BOOLEAN
  /\ armed \in BOOLEAN
  /\ clock \in {"none", "early", "late"}
  /\ blankMs \in {"none", "long"}
  /\ beat \in {"none", "valid"}
  /\ intensity \in {0, 1}

\* Finite domains. The constraint is the type, so TLC cannot invent a phase.
Finite == TypeOK

Init ==
  /\ zone = "extreme"
  /\ heading = "still"
  /\ side = "pos"
  /\ power = "drive"
  /\ policy = "total"
  /\ torque = FALSE
  /\ armed = FALSE
  /\ clock = "none"
  /\ blankMs = "none"
  /\ beat = "none"
  /\ intensity = 1

FallFromExtreme ==
  /\ zone = "extreme"
  /\ heading = "still"
  /\ zone' = "free"
  /\ heading' = "in"
  /\ torque' = FALSE
  /\ UNCHANGED <<side, power, policy, armed, clock, blankMs, beat, intensity>>

EnterLift ==
  /\ zone = "free"
  /\ heading = "in"
  /\ zone' = "lift"
  /\ torque' = TorqueOn("lift", power, "in")
  /\ UNCHANGED <<heading, side, power, policy, armed, clock, blankMs, beat, intensity>>

EnterBlank ==
  /\ zone = "lift"
  /\ heading = "in"
  /\ zone' = "blank"
  /\ armed' = TRUE
  /\ torque' = TorqueOn("blank", power, "in")
  /\ UNCHANGED <<heading, side, power, policy, clock, blankMs, beat, intensity>>

CrossZero ==
  /\ zone = "blank"
  /\ heading = "in"
  /\ heading' = "out"
  /\ side' = IF side = "pos" THEN "neg" ELSE "pos"
  /\ beat' = "valid"
  /\ torque' = TorqueOn("blank", power, "out")
  /\ UNCHANGED <<zone, power, policy, armed, clock, blankMs, intensity>>

LeaveBlank ==
  /\ zone = "blank"
  /\ heading = "out"
  /\ zone' = "lift"
  /\ armed' = FALSE
  /\ blankMs' = IF armed THEN "long" ELSE blankMs
  /\ torque' = TorqueOn("lift", power, "out")
  /\ UNCHANGED <<heading, side, power, policy, clock, beat, intensity>>

LeaveLift ==
  /\ zone = "lift"
  /\ heading = "out"
  /\ zone' = "free"
  /\ torque' = FALSE
  /\ UNCHANGED <<heading, side, power, policy, armed, clock, blankMs, beat, intensity>>

TurnOutside ==
  /\ zone = "free"
  /\ heading = "out"
  /\ heading' = "in"
  /\ torque' = FALSE
  /\ UNCHANGED <<zone, side, power, policy, armed, clock, blankMs, beat, intensity>>

ChoosePolicy ==
  /\ power = "drive"
  /\ policy' = IF policy = "total" THEN "retained" ELSE "total"
  /\ UNCHANGED <<zone, heading, side, power, torque, armed, clock, blankMs, beat, intensity>>

CutPower ==
  /\ power = "drive"
  /\ clock = "none"
  /\ clock' = "early"
  /\ IF policy = "total"
       THEN /\ power' = "off"
            /\ torque' = FALSE
            /\ intensity' = 0
       ELSE /\ power' = "unwind"
            /\ torque' = TorqueOn(zone, "unwind", heading)
            /\ intensity' = 1
  /\ UNCHANGED <<zone, heading, side, policy, armed, blankMs, beat>>

\* One action for the unwind interval, taken from the release.
\* It does not replay each RK4 step. The landing zone is "residual":
\* still swinging, not parked at center. The vitest step integrates 15 s.
ReachHorizon ==
  /\ zone = "extreme"
  /\ heading = "still"
  /\ clock = "early"
  /\ clock' = "late"
  /\ zone' = "residual"
  /\ heading' = "in"
  /\ torque' = FALSE
  /\ \/ /\ power = "off"
        /\ power' = "off"
        /\ intensity' = 0
     \/ /\ power = "unwind"
        /\ power' = "spent"
        /\ intensity' = 1
  /\ UNCHANGED <<side, policy, armed, blankMs, beat>>

RestorePower ==
  /\ power \in {"off", "unwind", "spent"}
  /\ power' = "drive"
  /\ clock' = "none"
  /\ torque' = TorqueOn(zone, "drive", heading)
  /\ intensity' = 1
  /\ UNCHANGED <<zone, heading, side, policy, armed, blankMs, beat>>

Retarget ==
  \/ /\ power = "off"
     /\ policy = "total"
     /\ clock = "early"
     /\ policy' = "retained"
     /\ power' = "unwind"
     /\ torque' = TorqueOn(zone, "unwind", heading)
     /\ intensity' = 1
     /\ UNCHANGED <<zone, heading, side, clock, armed, blankMs, beat>>
  \/ /\ power = "off"
     /\ policy = "total"
     /\ clock = "late"
     /\ policy' = "retained"
     /\ power' = "spent"
     /\ torque' = FALSE
     /\ intensity' = 1
     /\ UNCHANGED <<zone, heading, side, clock, armed, blankMs, beat>>
  \/ /\ power \in {"unwind", "spent"}
     /\ policy = "retained"
     /\ policy' = "total"
     /\ power' = "off"
     /\ torque' = FALSE
     /\ intensity' = 0
     /\ UNCHANGED <<zone, heading, side, clock, armed, blankMs, beat>>

Next ==
  \/ FallFromExtreme
  \/ EnterLift
  \/ EnterBlank
  \/ CrossZero
  \/ LeaveBlank
  \/ LeaveLift
  \/ TurnOutside
  \/ ChoosePolicy
  \/ CutPower
  \/ ReachHorizon
  \/ RestorePower
  \/ Retarget

Spec == Init /\ [][Next]_vars

\* --- rules the solver keeps ---

TorqueMatchesGate ==
  torque = TorqueOn(zone, power, heading)

ArmedMeansInsideBlank ==
  armed => zone = "blank"

ReleaseHasNoImpulse ==
  (zone = "extreme" /\ heading = "still") => ~torque

BeatFollowsTheCrossing ==
  beat = "none" => blankMs = "none"

SourceOffBlacksTheBeam ==
  (power = "off") <=> (intensity = 0)

RetainedSourceStaysLit ==
  power \in {"unwind", "spent"} => intensity = 1

\* --- source rules the solver does not keep. Do not weaken these. ---

\* Source: impulse only while velocity crosses zero inside the lift zone.
\* The solver applies torque for the whole time |theta| is inside the lift
\* half-angle and |omega| is above the epsilon. That is on while moving.
ImpulseOnlyAtZeroInsideLift ==
  torque => (zone \in {"lift", "blank"} /\ heading = "still")

\* Source claim: the blank window lasts 2.2 ms.
\* LeaveBlank records the measured class, which is the long one.
BlankDurationIsTwoPointTwoMs ==
  blankMs = "none"

\* Source: a power cut is a 15 s unwind, not an immediate kill of torque
\* and of the source. total-source-off zeros both at the cut.
CutWaitsOutTheUnwind ==
  power = "off" => clock = "late"

\* Source: at the end of that unwind the balance sits at dead center.
\* Q about 350 does not do that. "center" is not a zone the solver reaches
\* by cutting power. ReachHorizon leaves the phase where it was.
DeadCenterByUnwind ==
  clock = "late" => zone = "center"

====
