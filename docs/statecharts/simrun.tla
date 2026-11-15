---- MODULE simrun ----
\* Run flags of the workbench. useSimulator keeps these as separate
\* fields, not as one enum: paused, the power latch, and Settings.
\* Parameter edits do not reset the oscillator. Reset clears the latch
\* and returns the angle to the start, and it leaves paused alone.
\*
\* Guards:
\*   paused skips integration          useSimulator loop, simulationShouldStep
\*   cutPower                          engagePowerCut + solveCommand
\*   restorePower                      idlePower
\*   setPowerMode while latched        retargetPowerMode
\*   curb, thickness, brake            settings + parameters.solveCommand
\*   chopper                           beamSampleVisible, drawing only
\*
\* Left out:
\*   the first animation frame (previous wall time is null, so no step)
\*   the 8000-step catch-up cap
\*   restore-defaults (reset plus the default settings)
\*   ReachHorizon stands for the unwind interval, not each frame

VARIABLES session, balance, power, policy, clock, curb, stiffness, brake, chopper, thickness, intensity

vars == <<session, balance, power, policy, clock, curb, stiffness, brake, chopper, thickness, intensity>>

TypeOK ==
  /\ session \in {"running", "paused"}
  /\ balance \in {"start", "away"}
  /\ power \in {"drive", "unwind", "off", "spent"}
  /\ policy \in {"total", "retained"}
  /\ clock \in {"none", "early", "late"}
  /\ curb \in {"long", "short"}
  /\ stiffness \in {"soft", "stiff"}
  /\ brake \in {"off", "on"}
  /\ chopper \in {"on", "off"}
  /\ thickness \in {"nominal", "thick"}
  /\ intensity \in {0, 1}

Finite == TypeOK

Init ==
  /\ session = "running"
  /\ balance = "start"
  /\ power = "drive"
  /\ policy = "total"
  /\ clock = "none"
  /\ curb = "long"
  /\ stiffness = "soft"
  /\ brake = "off"
  /\ chopper = "on"
  /\ thickness = "nominal"
  /\ intensity = 1

Pause ==
  /\ session = "running"
  /\ session' = "paused"
  /\ UNCHANGED <<balance, power, policy, clock, curb, stiffness, brake, chopper, thickness, intensity>>

Resume ==
  /\ session = "paused"
  /\ session' = "running"
  /\ UNCHANGED <<balance, power, policy, clock, curb, stiffness, brake, chopper, thickness, intensity>>

Integrate ==
  /\ session = "running"
  /\ balance = "start"
  /\ balance' = "away"
  /\ UNCHANGED <<session, power, policy, clock, curb, stiffness, brake, chopper, thickness, intensity>>

Reset ==
  /\ \/ balance = "away"
     \/ power # "drive"
     \/ clock # "none"
  /\ balance' = "start"
  /\ power' = "drive"
  /\ clock' = "none"
  /\ intensity' = 1
  /\ UNCHANGED <<session, policy, curb, stiffness, brake, chopper, thickness>>

ChoosePolicy ==
  /\ power = "drive"
  /\ policy' = IF policy = "total" THEN "retained" ELSE "total"
  /\ UNCHANGED <<session, balance, power, clock, curb, stiffness, brake, chopper, thickness, intensity>>

CutPower ==
  /\ power = "drive"
  /\ clock = "none"
  /\ clock' = "early"
  /\ IF policy = "total"
       THEN /\ power' = "off"
            /\ intensity' = 0
       ELSE /\ power' = "unwind"
            /\ intensity' = 1
  /\ UNCHANGED <<session, balance, policy, curb, stiffness, brake, chopper, thickness>>

\* Sim time does not advance while paused. From the start angle, fifteen
\* seconds of the real solver leaves the release. It does not park at center.
ReachHorizon ==
  /\ session = "running"
  /\ clock = "early"
  /\ clock' = "late"
  /\ balance' = "away"
  /\ \/ /\ power = "off"
        /\ power' = "off"
        /\ intensity' = 0
     \/ /\ power = "unwind"
        /\ power' = "spent"
        /\ intensity' = 1
  /\ UNCHANGED <<session, policy, curb, stiffness, brake, chopper, thickness>>

RestorePower ==
  /\ power \in {"off", "unwind", "spent"}
  /\ power' = "drive"
  /\ clock' = "none"
  /\ intensity' = 1
  /\ UNCHANGED <<session, balance, policy, curb, stiffness, brake, chopper, thickness>>

Retarget ==
  \/ /\ power = "off"
     /\ policy = "total"
     /\ clock = "early"
     /\ policy' = "retained"
     /\ power' = "unwind"
     /\ intensity' = 1
     /\ UNCHANGED <<session, balance, clock, curb, stiffness, brake, chopper, thickness>>
  \/ /\ power = "off"
     /\ policy = "total"
     /\ clock = "late"
     /\ policy' = "retained"
     /\ power' = "spent"
     /\ intensity' = 1
     /\ UNCHANGED <<session, balance, clock, curb, stiffness, brake, chopper, thickness>>
  \/ /\ power \in {"unwind", "spent"}
     /\ policy = "retained"
     /\ policy' = "total"
     /\ power' = "off"
     /\ intensity' = 0
     /\ UNCHANGED <<session, balance, clock, curb, stiffness, brake, chopper, thickness>>

ShortenCurb ==
  /\ curb = "long"
  /\ curb' = "short"
  /\ stiffness' = "stiff"
  /\ UNCHANGED <<session, balance, power, policy, clock, brake, chopper, thickness, intensity>>

LengthenCurb ==
  /\ curb = "short"
  /\ curb' = "long"
  /\ stiffness' = "soft"
  /\ UNCHANGED <<session, balance, power, policy, clock, brake, chopper, thickness, intensity>>

BrakeOn ==
  /\ brake = "off"
  /\ brake' = "on"
  /\ UNCHANGED <<session, balance, power, policy, clock, curb, stiffness, chopper, thickness, intensity>>

BrakeOff ==
  /\ brake = "on"
  /\ brake' = "off"
  /\ UNCHANGED <<session, balance, power, policy, clock, curb, stiffness, chopper, thickness, intensity>>

ChopperOff ==
  /\ chopper = "on"
  /\ chopper' = "off"
  /\ UNCHANGED <<session, balance, power, policy, clock, curb, stiffness, brake, thickness, intensity>>

ChopperOn ==
  /\ chopper = "off"
  /\ chopper' = "on"
  /\ UNCHANGED <<session, balance, power, policy, clock, curb, stiffness, brake, thickness, intensity>>

Thicken ==
  /\ thickness = "nominal"
  /\ thickness' = "thick"
  /\ UNCHANGED <<session, balance, power, policy, clock, curb, stiffness, brake, chopper, intensity>>

Next ==
  \/ Pause
  \/ Resume
  \/ Integrate
  \/ Reset
  \/ ChoosePolicy
  \/ CutPower
  \/ ReachHorizon
  \/ RestorePower
  \/ Retarget
  \/ ShortenCurb
  \/ LengthenCurb
  \/ BrakeOn
  \/ BrakeOff
  \/ ChopperOff
  \/ ChopperOn
  \/ Thicken

Spec == Init /\ [][Next]_vars

\* Stiffness follows the curb. Thickness and the brake do not retune it.
StiffnessFollowsTheCurb ==
  \/ /\ curb = "long"
     /\ stiffness = "soft"
  \/ /\ curb = "short"
     /\ stiffness = "stiff"

SourceOffBlacksTheBeam ==
  (power = "off") <=> (intensity = 0)

RetainedSourceStaysLit ==
  power \in {"unwind", "spent"} => intensity = 1

\* Source: the cut waits out the unwind instead of dropping torque now.
CutWaitsOutTheUnwind ==
  power = "off" => clock = "late"

\* Source: when the unwind time has passed, the balance is at dead center.
\* Reset returns to the start angle, which is not that center, and the
\* cut does not move the angle.
DeadCenterByUnwind ==
  clock = "late" => balance = "center"

====
