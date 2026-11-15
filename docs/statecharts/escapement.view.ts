export const title = "Escapement cycle, as the solver steps it";

export const colors = {
  release: "tan",
  coast: "teal",
  lift: "orange",
  blank: "yellow",
  decay: "pink",
};

export const group = (v) => {
  if (v.zone === "residual") return "decay";
  if (v.zone === "extreme") return "release";
  if (v.zone === "free") return "coast";
  if (v.zone === "lift") return "lift";
  return "blank";
};

const swing = (v) => {
  if (v.zone === "residual") return "Still swinging after fifteen seconds";
  if (v.zone === "extreme") return "Released outside the lift zone";
  const way = v.heading === "in" ? "toward the center" : "toward the end of the swing";
  if (v.zone === "free") return `Free swing, ${way}`;
  if (v.zone === "lift") return `Lift zone, ${way}`;
  return `Blank window, ${way}`;
};

const supply = (v) => {
  if (v.power === "drive") return "Drive commanded";
  if (v.power === "unwind") return "Unwinding, source still lit";
  if (v.power === "spent") return "Unwind finished, source still lit";
  if (v.clock === "early") return "Source off, torque already gone";
  return "Fifteen seconds with the source off";
};

const blank = (v) =>
  v.blankMs === "long" ? "Measured blank, not 2.2 ms" : "No blank measured yet";

const drive = (v) => (v.torque ? "Drive torque while moving" : "No drive torque");

export const state = (v) => ({
  Swing: swing(v),
  Drive: drive(v),
  Supply: supply(v),
  Blank: blank(v),
});

export const step = (action, _from, to) => {
  if (action === "ChoosePolicy" || action === "Retarget") return null;
  if (action === "FallFromExtreme") return "it leaves the release and swings toward the center";
  if (action === "EnterLift") return "it enters the lift zone";
  if (action === "EnterBlank") return "it enters the blank window";
  if (action === "CrossZero") return "it crosses the center and counts a beat";
  if (action === "LeaveBlank") return "the blank window closes";
  if (action === "LeaveLift") return "it leaves the lift zone";
  if (action === "TurnOutside") return "it turns around outside the lift zone, and no impulse is added";
  if (action === "CutPower") {
    return to.power === "off"
      ? "you cut power and the source goes dark"
      : "you cut power and the source stays lit";
  }
  if (action === "ReachHorizon") return "the unwind time passes";
  if (action === "RestorePower") return "you restore power";
  return null;
};
