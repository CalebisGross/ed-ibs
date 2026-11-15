"""ED-IBS tourbillon feasibility pass (item 7 add-on).
Analysis only. Tags: [T] design target / chosen value / stated assumption,
[C] calculated prediction (closed-form, no FEA, no test), [S] cited source.
Nothing here is validated. No constant is tuned to make a target pass.
Reuses working-revision-step1.py by executing it (output suppressed) and reading its
variables, so ring/carrier/drive numbers are identical to step 1.
Run: python3 tourbillon-feasibility.py > tourbillon-feasibility-results.txt
"""
import io, math, runpy, contextlib, os
pi = math.pi; deg = pi / 180; g = 9.80665

here = os.path.dirname(os.path.abspath(__file__))
with contextlib.redirect_stdout(io.StringIO()):
    S1 = runpy.run_path(os.path.join(here, "working-revision-step1.py"))

def hdr(s): print("\n## " + s)
def pr(tag, name, val, unit="", fmt="{:.4g}"):
    print(f"[{tag}] {name} = {fmt.format(val)} {unit}".rstrip())

# ------------------------------------------------------------ reused step-1 values
I_ring = S1["I_ring"]; M_RING = S1["M_RING"]; RO = S1["RO_RING"]; RI = S1["RI_RING"]
K18 = S1["K_spec"](S1["L0"]); L_st = S1["L_stress"]; Kst = S1["K_spec"](L_st)
f_lo = S1["f_of"](K18, I_ring); f_hi = S1["f_of"](Kst, I_ring)
AMP = S1["AMP"]; STEP = S1["STEP_MECH"]
I_idx = S1["I_idx"]; m_idx = S1["m_idx"]; I_lite = S1["I_lite"]; m_lite = S1["m_lite"]
TAU_NOM = S1["TAU_NOM"]
tau_w18 = 6.67e-4   # [C step-1 B2] escape-wheel torque needed, L 18 mm, eta 0.35
tau_w85 = 1.41e-3   # [C step-1 B2] same at L 8.5 mm (used as upper value near 8.78 mm)
BORE = 56e-3
RHO = {"7075": S1["RHO_AL7075"], "Ti-6Al-4V": S1["RHO_TI"]}
E_MAT = {"7075": 71.7e9, "Ti-6Al-4V": 114e9}   # [S] 7075-T6 typical handbook 71.7 GPa; Ti per spec
hdr("0 reused step-1 values")
pr("C", "I_ring (spec 42 g, 56/72)", I_ring, "kg m2")
pr("C", "f range ring only, spec law, stress cap", f_lo, "Hz"); pr("C", "  upper", f_hi, "Hz")
pr("C", "step-1 indexed set (61813) I", I_idx, "kg m2"); pr("C", "  mass", m_idx * 1e3, "g")
pr("C", "step-1 light indexed set I", I_lite, "kg m2"); pr("C", "  mass", m_lite * 1e3, "g")

# ------------------------------------------------------------ catalog values [S]
TUBE_ID = 102e-3        # [S MAN ED-01] chassis bore
TUBE_LEN = 280e-3       # [S MAN ED-01]
B61813 = dict(d=65e-3, D=85e-3, B=10e-3, m=0.13, C=11.9e3, C0=9.65e3)   # [S SKF product page 61813]
KAYDON = dict(d=63.5e-3, D=76.2e-3, B=6.35e-3, m=0.059)                # [S Kaydon table, via step 1]
MU_DGBB = 0.0015        # [S SKF/ZKL constant-coefficient friction, deep groove ball, valid near P~0.1C]
CLR = {"C2": (1e-6, 15e-6), "CN": (8e-6, 28e-6), "C3": (23e-6, 43e-6)}   # [S ISO 5753-1 Table 1, d 50-65]
KIA = {"Normal": 20e-6, "P6": 11e-6, "P5": 6e-6}                         # [S ISO 492 via Andge/CXE tables, d 50-80]
DCX_NOM = 14.6e-3       # [S maxon DCX 22 S 12 V nominal torque]
GPX16_CONT = 2.40; GPX16_ETA = 0.75; GPX16_BACKLASH = 1.05   # [S maxon GPX 22 HP 2-stage]
SR60_OD = 135e-3        # [S Servotecnica SVTS C 07 / REC RH60: 60 mm bore -> 135 mm OD]
SR60_TORQUE = 0.1       # [S REC RH60 6-ring version, +0.03 N m per extra 6 rings]
SR_LIFE = 1e8           # [S Servotecnica C series expected life up to 1e8 rev]
SHOCK_G = 5.0           # [S BP "5.0 G shock" design claim, not validated]
DROP_G = 30.0           # [T assumption] case-drop pulse for transit, uncited planning value
dE_dT_TI = -0.039e9     # [S secondary source, avg 20-200 C, approximate]

# ------------------------------------------------------------ 1 cage concept
hdr("1 cage concept: annular cage at its own Z station, around the 56 mm bore")
def tube(rho, OD, ID, L):
    m = rho * pi / 4 * (OD**2 - ID**2) * L
    return m, 0.5 * m * ((OD / 2)**2 + (ID / 2)**2)
CAGE_OD = 90e-3        # [T] cage outer envelope
STAT_BAND_OD = 100e-3  # [T] stationary ring gear / sensor band outer
BODY_L = 40e-3         # [T] axial length between flanges
FL_T = 3e-3            # [T] flange thickness
pr("T", "cage envelope OD", CAGE_OD * 1e3, "mm")
pr("C", "radial room cage OD to tube ID", (TUBE_ID - CAGE_OD) / 2 * 1e3, "mm")
pr("C", "radial room stationary band to tube ID", (TUBE_ID - STAT_BAND_OD) / 2 * 1e3, "mm")
pr("C", "61813 housing OD at 4 mm wall (step 1)", (B61813['D'] + 8e-3) * 1e3, "mm")
pr("C", "radial room 61813 housing to tube ID", (TUBE_ID - B61813['D'] - 8e-3) / 2 * 1e3, "mm")
pr("C", "Kaydon KA025 housing OD at 4 mm wall", (KAYDON['D'] + 8e-3) * 1e3, "mm")
pr("C", "balance ring OD 72 to cage OD radial room for escapement/pillars", (CAGE_OD - 72e-3) / 2 * 1e3, "mm")
L_cage_axial = BODY_L + 2 * FL_T + 2 * 10e-3 + 2 * 4e-3
pr("C", "cage axial length incl journals and housing lips (61813)", L_cage_axial * 1e3, "mm")
pr("C", "cage + step-1 prism carrier (120 mm) axial", (L_cage_axial + 0.120) * 1e3, "mm")
pr("C", "left in 280 mm chassis for light engine, optics, chopper", (TUBE_LEN - L_cage_axial - 0.120) * 1e3, "mm")

# point-ish payloads [T assumptions]: (mass kg, radius m)
payload = {
    "balance ring (spec reference 42 g, 56/72)": (M_RING, None),
    "flexure suspension frame + leaves (assumed)": (0.015, 0.040),
    "escapement: pallet fork, escape wheel, pinion, bridges (assumed)": (0.012, 0.041),
    "release linkage (assumed)": (0.003, 0.041),
    "cage-side escapement remontoire + clutch (assumed, carousel only)": (0.008, 0.041),
}
def cage(mat, bearing="61813", carry_indexer=False, carousel=True):
    rho = RHO[mat]
    parts = {}
    parts["2 flanges 90/56 x 3"] = tuple(2 * v for v in tube(rho, CAGE_OD, BORE, FL_T))
    # 3 pillars 5x5 x 40 at r 42 mm
    mp = rho * 5e-3 * 5e-3 * BODY_L
    parts["3 pillars 5x5x40 at r42"] = (3 * mp, 3 * mp * 0.042**2)
    if bearing == "61813":
        mj, Ij = tube(rho, B61813["d"], BORE, 10e-3); mr = 2 * 0.4 * B61813["m"]; rr = B61813["d"] / 2 + 3e-3
    else:
        mj, Ij = tube(rho, KAYDON["d"], BORE, KAYDON["B"]); mr = 2 * 0.4 * KAYDON["m"]; rr = KAYDON["d"] / 2 + 2.5e-3
    parts["2 journals"] = (2 * mj, 2 * Ij)
    parts["inner races 40% of bearing mass (step-1 assumption)"] = (mr, mr * rr**2)
    off = 0.0
    for n, (m, r) in payload.items():
        if "carousel" in n and not carousel: continue
        if r is None: parts[n] = (m, I_ring)
        else:
            parts[n] = (m, m * r**2); off += m * r
    if carry_indexer:
        parts["step-1 indexed set (carrier+prism+index ring)"] = (m_idx, I_idx)
        parts["indexer spring + cam/Geneva (assumed)"] = (0.040, 0.040 * 0.040**2); off += 0.040 * 0.040
    rcw = 0.043
    parts["counterweight for off-axis payload at r43"] = (off / rcw, off * rcw)
    m = sum(v[0] for v in parts.values()); I = sum(v[1] for v in parts.values())
    return m, I, parts
variants = {
    "V1 7075 cage, 61813, balance+escapement (carousel)": cage("7075"),
    "V2 Ti cage, 61813, balance+escapement (carousel)": cage("Ti-6Al-4V"),
    "V3 7075 cage, Kaydon KA025, balance+escapement (carousel)": cage("7075", "kaydon"),
    "V4 7075 cage, 61813, + indexer + prism carrier": cage("7075", carry_indexer=True),
    "V1T 7075 cage, 61813, true tourbillon (no cage remontoire)": cage("7075", carousel=False),
}
for n, (m, I, parts) in variants.items():
    print(f"-- {n}")
    for pn, (pm, pI) in parts.items():
        print(f"   [C] {pn}: {pm*1e3:.1f} g, I {pI:.3e}")
    print(f"[C] {n}: TOTAL mass {m*1e3:.0f} g, polar I {I:.3e} kg m2, I/I_ring {I/I_ring:.1f}x")

# ------------------------------------------------------------ 2 rotation rates and drive
hdr("2 rotation rates, drive torque and power (motor-driven carousel)")
rates = {
    "1 rev / 15 min": 1 / 900, "1 rev / 5 min": 1 / 300, "1 rev / 2 min": 1 / 120,
    "1 rev / min (watch)": 1 / 60,
    "prism mean speed @8.00 Hz (32 rpm)": STEP * 2 * f_lo / (2 * pi),
    "1 rev per 15-beat star @8.00 Hz": 2 * f_lo / 15,
    "1 rev per 15-beat star @11.46 Hz": 2 * f_hi / 15,
}
E_UNB = (0.02e-3, 0.05e-3, 0.10e-3)   # [T assumption] residual static CoM offset after balancing
def bearing_drag(W):
    load_dep = 0.5 * MU_DGBB * W * B61813["d"]       # both bearings share W, sum
    return load_dep, 2 * 1e-3, 2 * 1e-2               # step-1 planning range per bearing x2
for vn in ("V1 7075 cage, 61813, balance+escapement (carousel)", "V4 7075 cage, 61813, + indexer + prism carrier"):
    m, I, _ = variants[vn]; W = m * g
    ld, lo, hi = bearing_drag(W)
    print(f"-- {vn}: weight {W:.2f} N")
    pr("C", "  load-dependent friction 0.5 mu W d (both bearings, lower bound)", ld, "N m")
    pr("C", "  planning drag range, 2 bearings, non-contact seals (step 1)", lo, "N m"); pr("C", "    to", hi, "N m")
    for e in E_UNB:
        pr("C", f"  unbalance gravity torque, e {e*1e3:.2f} mm", m * g * e, "N m")
    for rn, rps in rates.items():
        Om = 2 * pi * rps
        Macc = I * Om / 1.0   # spin up in 1 s [T]
        Mtot_hi = hi + m * g * 0.10e-3 + Macc
        F_cent = m * 0.10e-3 * Om**2
        print(f"   [C] {rn}: Omega {Om:.4f} rad/s ({rps*60:.3g} rpm); accel torque (1 s spin-up) {Macc:.2e} N m; "
              f"worst steady torque {hi + m*g*0.10e-3:.2e} N m; power {Mtot_hi*Om*1e3:.3g} mW; unbalance force @0.1 mm {F_cent:.2e} N")
# escapement power delivered via cage (self-wound cage remontoire)
P_esc8 = tau_w18 * STEP * 2 * f_lo; P_esc11 = tau_w85 * STEP * 2 * f_hi
pr("C", "escapement power at 8.00 Hz (step-1 torque)", P_esc8 * 1e3, "mW")
pr("C", "escapement power at 11.46 Hz (8.5 mm torque, upper)", P_esc11 * 1e3, "mW")
for rn in ("1 rev / 5 min", "1 rev / min (watch)"):
    Om = 2 * pi * rates[rn]
    print(f"[C] extra cage torque to wind cage remontoire at {rn}: {P_esc8/Om:.3e} (8 Hz) to {P_esc11/Om:.3e} (11.46 Hz) N m")
# motor double duty
hdr("2b rewind motor double duty (Gemini Maxon DCX 22 S + GPX 22 16:1)")
w_prism8 = STEP * 2 * f_lo; w_prism11 = STEP * 2 * f_hi
pr("C", "rewind arbor mean speed (= prism mean) @8.00 Hz", w_prism8 * 60 / (2 * pi), "rpm")
pr("C", "rewind arbor mean speed @11.46 Hz", w_prism11 * 60 / (2 * pi), "rpm")
R_branch = w_prism8 / (2 * pi / 60)
pr("C", "branch ratio rewind arbor -> cage for 1 rpm at 8.00 Hz", R_branch, ":1")
pr("C", "cage rate on that branch at 11.46 Hz", w_prism11 / R_branch * 60 / (2 * pi), "rpm")
m1, I1, _ = variants["V1 7075 cage, 61813, balance+escapement (carousel)"]
Mcage_hi = 2e-2 + m1 * g * 0.1e-3 + P_esc11 / (w_prism11 / R_branch)
pr("C", "worst cage torque incl. self-winding (V1)", Mcage_hi, "N m")
pr("C", "added torque at rewind arbor via branch (eta 0.7 assumed)", Mcage_hi / R_branch / 0.7, "N m")
pr("C", "rewind arbor torque total (0.12 indexer + cage branch)", TAU_NOM + Mcage_hi / R_branch / 0.7, "N m")
pr("S", "GPX 22 HP 16:1 max continuous torque", GPX16_CONT, "N m")
pr("C", "motor torque needed at 16:1, eta 0.75", (TAU_NOM + Mcage_hi / R_branch / 0.7) / 16 / GPX16_ETA * 1e3, "mN m")
pr("S", "DCX 22 S nominal torque (12 V)", DCX_NOM * 1e3, "mN m")
pr("C", "motor speed at 8.00 Hz mean (16:1)", w_prism8 * 60 / (2 * pi) * 16, "rpm")
pr("S", "GPX 22 16:1 average backlash", GPX16_BACKLASH, "deg")
pr("C", "backlash seen at cage via branch", GPX16_BACKLASH / R_branch, "deg")

# ------------------------------------------------------------ 2c true tourbillon timing
hdr("2c true tourbillon: escapement steps the cage via a fixed fourth-wheel ring")
th_lift = 2 * 3.5 * deg   # [S spec] +/-3.5 deg lift zone
for f in (f_lo, f_hi):
    v = 2 * pi * f * AMP
    pr("C", f"balance time to cross +/-3.5 deg lift at {f:.2f} Hz, 18 deg", th_lift / v * 1e3, "ms")
mT, IT, _ = variants["V1T 7075 cage, 61813, true tourbillon (no cage remontoire)"]
for label, Ic in (("V1T", IT), ("V4 (prism on cage)", variants["V4 7075 cage, 61813, + indexer + prism carrier"][1])):
    for rev_s in (60, 120, 300, 900):
        beats = 2 * f_lo * rev_s
        R = beats / 30.0      # escape-wheel revs relative to cage per cage rev (30 beats per wheel rev)
        for tw, tl in ((tau_w18, "18 mm"), (tau_w85, "8.5 mm")):
            t_tr = math.sqrt(2 * STEP * Ic / tw) / R
            frac_drag_hi = 2e-2 / (R * tw); frac_unb = mT * g * 0.05e-3 / (R * tw)
            print(f"[C] {label} 1 rev/{rev_s} s @8.00 Hz: R {R:.0f}:1, cage step {360/beats:.3f} deg/beat, cage torque {R*tw:.3f} N m ({tl}), "
                  f"train time for 12 deg wheel step {t_tr*1e3:.1f} ms, drag 2e-2 N m = {frac_drag_hi*100:.0f}% of drive, unbalance 0.05 mm = {frac_unb*100:.1f}%")
# cage step kick on balance
for rev_s in (60, 300):
    beats = 2 * f_lo * rev_s
    pr("C", f"cage step per beat at 1 rev/{rev_s} s vs 18 deg amplitude", (360 / beats) / 18 * 100, "% of amplitude")
# indexer reaction on cage (if indexer rides the cage)
tau_idx_pk = S1["tau_bangbang"](I_lite, STEP, 15e-3)
pr("C", "indexer peak torque, light set, 15 ms step (step 1)", tau_idx_pk, "N m")
for rev_s in (60, 300):
    R = 2 * f_lo * rev_s / 30
    pr("C", f"indexer reaction reflected to escape wheel at 1 rev/{rev_s} s", tau_idx_pk / R, "N m")
    pr("C", f"  ratio to escape drive torque {tau_w18:.2e}", tau_idx_pk / R / tau_w18, "x")

# ------------------------------------------------------------ 3 gravity and rate
hdr("3 does a tourbillon help this flexure oscillator's rate?")
W_ring = M_RING * g
for e in (5e-6, 20e-6, 50e-6):
    for K, lab in ((K18, "18 mm"), (Kst, "8.78 mm")):
        dff = M_RING * g * e / (2 * K)
        print(f"[C] poise error, ring CoM offset {e*1e6:.0f} um, axis horizontal, {lab}: df/f {dff:.2e}, "
              f"{dff*f_lo:.2e} Hz at 8 Hz, {dff*86400:.1f} s/day")
# load-dependent stiffness of loaded leaves, order of magnitude
for c in (1 / 30, 2 / 15):
    P = W_ring / (2 * math.cos(45 * deg))
    dK = c * P * S1["L0"]
    print(f"[C] leaf axial-load stiffness change, c {c:.3f}, P/leaf {P:.3f} N, L 18 mm: dK {dK:.2e} N m/rad, "
          f"dK/K {dK/K18*100:.3f}%, df {dK/K18/2*f_lo:.4f} Hz at 8 Hz")
pr("C", "Ti thermoelastic rate coefficient 0.5 dE/E per K", 0.5 * dE_dT_TI / 114e9, "1/K")
pr("C", "rate change for 10 K stage swing at 8 Hz", 0.5 * dE_dT_TI / 114e9 * 10 * f_lo, "Hz")
pr("C", "DMX 8-bit freq step (step 1)", S1["span"] / 255, "Hz")
pr("C", "DMX 16-bit freq step (step 1)", S1["span"] / 65535, "Hz")
dfpk = M_RING * g * 50e-6 / (2 * K18) * f_lo
for rev_s in (60, 300):
    fc = 1 / rev_s
    pr("C", f"averaged poise error (50 um) phase wobble amplitude at 1 rev/{rev_s} s", dfpk / (2 * pi * fc) * 360, "deg of balance phase")
pr("C", "same 50 um poise error unaveraged phase drift", dfpk * 60 * 360, "deg/min")
for tilt in (90, 45, 0):
    print(f"[C] optical axis tilt from vertical {tilt} deg: gravity component the cage can average = {math.sin(tilt*deg)*100:.0f}% of g")

# ------------------------------------------------------------ 4 radial center shift
hdr("4 gravity-induced radial center shift")
Z_BALLS = (24, 28, 34); DW = (4.8e-3, 5.5e-3, 6.35e-3)  # [T assumption] 61813 internals, not catalog
def hertz(Fr, Z, Dw):
    Q = 5 * Fr / Z                  # Stribeck, nominal clearance
    return 4.36e-4 * Q**(2 / 3) / (Dw * 1e3)**(1 / 3) * 1e-3   # Palmgren, m (Q N, Dw mm)
for vn in ("V1 7075 cage, 61813, balance+escapement (carousel)", "V4 7075 cage, 61813, + indexer + prism carrier"):
    m, I, _ = variants[vn]; Fr = m * g / 2
    ds = [hertz(Fr, Z, D) for Z in Z_BALLS for D in DW]
    print(f"[C] {vn}: per-bearing load {Fr:.2f} N, Hertz radial deflection {min(ds)*1e6:.2f}-{max(ds)*1e6:.2f} um")
    ds5 = [hertz(Fr * SHOCK_G, Z, D) for Z in Z_BALLS for D in DW]
    print(f"[C]   at 5 g: {Fr*SHOCK_G:.1f} N/bearing, {min(ds5)*1e6:.2f}-{max(ds5)*1e6:.2f} um; load/C0 {Fr*SHOCK_G/B61813['C0']:.2e}")
    print(f"[C]   at {DROP_G:.0f} g drop [T]: {Fr*DROP_G:.0f} N/bearing, load/C0 {Fr*DROP_G/B61813['C0']:.2e}")
for k, (lo, hi) in CLR.items():
    print(f"[S] radial clearance {k}: {lo*1e6:.0f}-{hi*1e6:.0f} um -> [C] gravity shift from centered <= {hi/2*1e6:.1f} um, orientation flip <= {hi*1e6:.0f} um")
print("[T] preloaded pair (wave spring) removes clearance; then shift = Hertz only")
# cage structure: journals as a tube beam, simply supported over 60 mm, full V4 weight at center
mV4 = variants["V4 7075 cage, 61813, + indexer + prism carrier"][0]
Ia = pi / 64 * (B61813["d"]**4 - BORE**4)
dcage = mV4 * g * 0.060**3 / (48 * E_MAT["7075"] * Ia)
pr("C", "cage drum deflection, 65/56 7075 tube, 60 mm span, V4 weight", dcage * 1e9, "nm")
for k, v in KIA.items():
    print(f"[S] inner ring radial runout Kia {k}: {v*1e6:.0f} um -> periodic bore-center wobble at 1x cage rate (not gravity)")
pr("T", "journal TIR to bearing seat", 10, "um")
# balance-ring suspension inside cage
W = 0.41188; k_ref = 1647.52   # [C prior suspension-025mm-design-gate]
pr("C", "reference suspension sag 42 g at 1647.52 N/m", W / k_ref * 1e3, "mm")
pr("S", "QEXT-200 nonlinear endpoint gravity shift (rejected specimen)", 1.952, "mm")
for a in (1.0, 1.2, 2.0):
    smax = W / k_ref; smin = W / (k_ref * a)
    print(f"[C] suspension stiffness anisotropy {a:.1f}: sag varies {smin*1e3:.3f}-{smax*1e3:.3f} mm at 2x cage rate in world frame")
pr("C", "ring ID needed to keep 56 mm clear with 0.25 mm sag", (BORE + 2 * 0.25e-3) * 1e3, "mm")

# ------------------------------------------------------------ 5 dynamics
hdr("5 dynamic coupling")
r_g = math.sqrt((RO**2 + RI**2) / 2)
thd = 2 * pi * f_lo * AMP          # peak balance angular speed at 8 Hz, 18 deg
e_ring = 50e-6                     # [T assumption] ring CoM offset after poising
for rn, rps in (("1 rev/5 min", 1 / 300), ("1 rev/min", 1 / 60), ("64 rpm (1 rev per star)", 2 * f_lo / 15)):
    Om = 2 * pi * rps
    q = 2 * Om * r_g * thd          # distributed radial Coriolis accel on ring elements (symmetric, cancels as net force)
    Fnet = 2 * M_RING * Om * thd * e_ring
    Fcf = M_RING * r_g * Om**2      # distributed centrifugal, symmetric
    print(f"[C] {rn}: Coriolis per-element accel {q:.3f} m/s2 ({q/g*100:.2f}% of g, symmetric breathing, no net shift); "
          f"net Coriolis force with 50 um ring offset {Fnet:.2e} N ({Fnet/W_ring*100:.4f}% of ring weight), at f; "
          f"centrifugal per-element {r_g*Om**2/g*100:.3f}% of g (symmetric hoop)")
beta = 0.1 * deg  # [T] axis misalignment balance vs cage
w_bal = 2 * pi * f_lo * AMP
for rn, rps in (("1 rev/min", 1 / 60), ("64 rpm", 2 * f_lo / 15)):
    Om = 2 * pi * rps
    print(f"[C] gyroscopic tilt torque on balance flexures, 0.1 deg misalignment, {rn}: {I_ring*Om*w_bal*math.sin(beta):.2e} N m")
w_pan = 1.0  # [T assumption] yoke pan/tilt rate rad/s
pr("C", "gyroscopic torque balance oscillation x 1 rad/s yoke move (exists without tourbillon)", I_ring * w_bal * w_pan, "N m")
pr("C", "gyroscopic torque V4 cage at 64 rpm x 1 rad/s yoke move, on bearings", variants["V4 7075 cage, 61813, + indexer + prism carrier"][1] * (2 * pi * 2 * f_lo / 15) * w_pan, "N m")
print("[C] coaxial constant-rate rotation: relative restoring torque unchanged, beat frequency in cage frame unchanged (no added rate term)")
# transit / shock torques on cage
for vn in ("V1 7075 cage, 61813, balance+escapement (carousel)", "V4 7075 cage, 61813, + indexer + prism carrier"):
    m, I, _ = variants[vn]
    print(f"[C] {vn}: unbalance torque at 5 g, e 0.1 mm {m*SHOCK_G*g*0.1e-3:.2e} N m; at {DROP_G:.0f} g {m*DROP_G*g*0.1e-3:.2e} N m; "
          f"angular shock 1000 rad/s2 [T] {I*1000:.2e} N m")
pr("C", "1000 rad/s2 angular shock on V1T reflected to pallet lock at R 32 (1 rev/min)", IT * 1000 / 32, "N m")
pr("C", "  ratio to escape drive torque", IT * 1000 / 32 / tau_w18, "x")
pr("C", "ring inertial load at 5 g (needs transit lock regardless)", W_ring * SHOCK_G, "N")

# ------------------------------------------------------------ 6 signals
hdr("6 power and signals across rotation")
pr("S", "60 mm bore slip ring OD (SVTS C 07 / REC RH60)", SR60_OD * 1e3, "mm")
pr("C", "excess over 102 mm tube ID", (SR60_OD - TUBE_ID) * 1e3, "mm")
pr("S", "RH60 slip ring drag torque (6 rings)", SR60_TORQUE, "N m")
pr("C", "slip ring drag vs worst V1 bearing drag 2e-2", SR60_TORQUE / 2e-2, "x")
for rpm in (1, 64):
    revs_yr = rpm * 60 * 10 * 300   # [T] 10 h/day, 300 days/yr
    print(f"[C] slip ring revs per touring year at {rpm} rpm (10 h x 300 d [T]): {revs_yr:.2e}; years to 1e8 [S] {SR_LIFE/revs_yr:.0f}")
pillar_frac = 3 * 5e-3 / (2 * pi * 0.042)
pr("C", "fraction of ring rim hidden by 3 x 5 mm pillars (stationary optical read)", pillar_frac * 100, "%")

# ------------------------------------------------------------ 7 optics
hdr("7 projected pattern precession")
for rn, rps in (("1 rev/15 min", 1 / 900), ("1 rev/5 min", 1 / 300), ("1 rev/min", 1 / 60)):
    Om_d = 360 * rps
    print(f"[C] {rn}: cage {Om_d:.3f} deg/s; facets on cage, prism stationary -> pattern -{Om_d:.3f} deg/s, "
          f"one 24 deg spoke spacing every {24/Om_d:.0f} s; prism on cage, facets stationary -> {2*Om_d:.3f} deg/s ({12/Om_d:.0f} s per spoke)")
for rev_s in (60, 300):
    beats = 2 * f_lo * rev_s
    print(f"[C] true tourbillon 1 rev/{rev_s} s @8 Hz: pattern advance {360/beats:.4f} deg per beat, {15*360/beats:.3f} deg per 15-beat star")
