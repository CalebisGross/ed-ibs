export const title = "Simulator run, as the workbench controls it";

export const colors = {
  live: "teal",
  unwind: "yellow",
  cut: "pink",
  decay: "orange",
};

export const group = (v) => {
  if (v.power === "off" && v.clock === "early") return "cut";
  if (v.clock === "late") return "decay";
  if (v.power === "unwind") return "unwind";
  return "live";
};

const session = (v) => (v.session === "paused" ? "Paused" : "Running");

const supply = (v) => {
  if (v.power === "drive") return "Drive commanded";
  if (v.power === "unwind") return "Unwinding, source still lit";
  if (v.power === "spent") return "Unwind finished, source still lit";
  if (v.clock === "early") return "Source off, torque already gone";
  return "Fifteen seconds with the source off";
};

const angle = (v) => (v.balance === "start" ? "At the start angle" : "Away from the start angle");

const curb = (v) => (v.curb === "long" ? "Long leaf" : "Shorter leaf");

const brake = (v) => (v.brake === "off" ? "Brake off" : "Brake on");

const chopper = (v) => (v.chopper === "on" ? "Chopper on" : "Chopper off");

const leaf = (v) => (v.thickness === "nominal" ? "Nominal thickness" : "Thicker leaf");

export const state = (v) => ({
  Session: session(v),
  Supply: supply(v),
  Angle: angle(v),
  Curb: curb(v),
  Brake: brake(v),
  Chopper: chopper(v),
  Thickness: leaf(v),
});

export const step = (action, _from, to) => {
  if (action === "ChoosePolicy" || action === "Retarget") return null;
  if (action === "Pause") return "you pause";
  if (action === "Resume") return "you run";
  if (action === "Integrate") return "the clock advances";
  if (action === "Reset") return "you reset";
  if (action === "CutPower") {
    return to.power === "off"
      ? "you cut power and the source goes dark"
      : "you cut power and the source stays lit";
  }
  if (action === "ReachHorizon") return "the unwind time passes";
  if (action === "RestorePower") return "you restore power";
  if (action === "ShortenCurb") return "you shorten the curb";
  if (action === "LengthenCurb") return "you lengthen the curb";
  if (action === "BrakeOn") return "you apply the eddy brake";
  if (action === "BrakeOff") return "you release the eddy brake";
  if (action === "ChopperOff") return "you turn the chopper off";
  if (action === "ChopperOn") return "you turn the chopper on";
  if (action === "Thicken") return "you thicken the leaf";
  return null;
};
