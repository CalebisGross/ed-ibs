"""ED-IBS working revision, step 1 numbers.
Analysis only. Every value is tagged:
  [T] design target (chosen here or by Caleb), [C] calculated prediction,
  [S] cited catalog/source value. No constant is tuned to match a target.
Run: python3 working-revision-step1.py > working-revision-step1-results.txt
"""
import math
pi = math.pi
deg = pi / 180
g = 9.80665

def hdr(s):
    print("\n## " + s)

def pr(tag, name, val, unit="", fmt="{:.4g}"):
    print(f"[{tag}] {name} = {fmt.format(val)} {unit}".rstrip())

# ---------------------------------------------------------------- sources
# [S] original spec (full-user-specification.md)
E_TI = 114e9            # Pa, Ti-6Al-4V per spec
K_BASE = 0.1104         # N m/rad at L0
L0 = 18.0e-3            # m
L_MIN_SPEC = 8.5e-3     # m
SIGMA_END = 510e6       # Pa, spec endurance flag
M_RING = 0.042; RO_RING = 0.036; RI_RING = 0.028
AMP = 18 * deg          # spec amplitude
Q = 350                 # spec
STEP_MECH = 12 * deg    # per beat
BLANK_SPEC = 2.2e-3     # s, spec blanking
BLANK_MEAS = 4.65e-3    # s, measured in prototype at 18 deg
# [S] Gemini package
TAU_NOM = 0.12          # N m, Gemini remontoire nominal (manual DMX ch5)
TAU_CLUTCH = 0.18       # N m, Gemini slip clutch 1.5x nominal
WIND_NOM = 45 * deg     # Gemini wind-up angle
WIND_BAND = 2 * deg     # Gemini closed-loop band
RIB_GEM = dict(t=0.08e-3, b=1.2e-3, L=0.180)
# [S] catalogs
RHO_BK7 = 2510          # kg/m3, N-BK7 (Schott typical, 2.51 g/cc)
RHO_AL7075 = 2810
RHO_TI = 4430
RHO_STEEL = 7850
E_NIVA = 220e9          # Pa, Nivaflex 45/18 (VAC datasheet)
RM_NIVA = 2150e6        # Pa, 50% cold work, aged (VAC datasheet)
RP_NIVA = 1720e6        # Pa, yield, same condition
E_STEEL = 205e9         # Pa, carbon spring steel, typical handbook value
PRISM_A = 25.0e-3       # m, leg (Edmund 45-403 / Gemini BOM)
PRISM_B = 106.1e-3      # m, Gemini BOM length (Edmund 45-403 lists 103.18, 49-429 lists 105.68)

hdr("A1 ring reference and spec law")
I_ring = 0.5 * M_RING * (RO_RING**2 + RI_RING**2)
pr("C", "I_ring (spec 42 g, 56/72 mm)", I_ring, "kg m2")
def f_of(K, I):
    return math.sqrt(K / I) / (2 * pi)
def K_spec(L):
    return K_BASE * (L0 / L)
pr("C", "f spec law @18 mm, ring only", f_of(K_spec(L0), I_ring), "Hz")
pr("C", "f spec law @8.5 mm, ring only", f_of(K_spec(L_MIN_SPEC), I_ring), "Hz")

hdr("A2 bearings (catalog) and carrier walls over 56 mm bore")
BORE = 56.0e-3  # [T] protected clear bore
bearings = {
    # name: (d, D, B, mass_kg, note)  all [S]
    "SKF 61812-2RZ/-2RS1": (60e-3, 78e-3, 10e-3, 0.11, "SKF table"),
    "SKF 61813-2RZ": (65e-3, 85e-3, 10e-3, 0.13, "SKF table"),
    "Kaydon KA025XP0 (also KA025CP0/AR0 same envelope)": (63.5e-3, 76.2e-3, 6.35e-3, 0.130 * 0.4536, "Kaydon table"),
}
for n, (d, D, B, m, src) in bearings.items():
    wall = (d - BORE) / 2
    print(f"[S] {n}: {d*1e3:.2f} x {D*1e3:.2f} x {B*1e3:.2f} mm, {m*1e3:.0f} g ({src}); "
          f"[C] journal wall over 56 mm bore = {wall*1e3:.2f} mm")

hdr("A3 Dove prism fit and mass properties")
diag = PRISM_A * math.sqrt(2)
pr("C", "prism cross-section diagonal", diag * 1e3, "mm")
pr("C", "radial clearance prism corner to 56 mm bore", (BORE - diag) / 2 * 1e3, "mm")
top = PRISM_B - 2 * PRISM_A
area = (PRISM_B + top) / 2 * PRISM_A
V = area * PRISM_A
m_prism = V * RHO_BK7
pr("C", "prism top face length", top * 1e3, "mm")
pr("C", "prism volume", V * 1e6, "cm3")
pr("C", "prism mass", m_prism * 1e3, "g")
# numerical integration about axis through center of 25x25 square (y = A/2)
N = 2000
I_axis = 0.0; ycm_num = 0.0
dx = PRISM_B / N
for i in range(N):
    x = (i + 0.5) * dx
    h = min(PRISM_A, x, PRISM_B - x)  # height at x (45 deg ends)
    dm = RHO_BK7 * PRISM_A * h * dx
    # slab: width A (z from -A/2..A/2), height 0..h, axis at y=A/2
    Iz = RHO_BK7 * dx * (PRISM_A * (h**3 / 3 - h**2 * PRISM_A / 2 + h * PRISM_A**2 / 4) + h * PRISM_A**3 / 12)
    I_axis += Iz
    ycm_num += dm * h / 2
ycm = ycm_num / m_prism
ecc = PRISM_A / 2 - ycm
pr("C", "prism I about optical (square-center) axis", I_axis, "kg m2")
pr("C", "prism CoM offset from axis (toward base)", ecc * 1e3, "mm")
pr("C", "prism static imbalance", m_prism * ecc * 1e6, "g mm")
pr("C", "prism worst gravity torque on axis", m_prism * g * ecc, "N m")

hdr("A4 carrier (design target geometry)")
L_car = 120e-3      # [T] 106.1 prism + retainers
jour_len = 10e-3    # [T] per journal, two journals
d_j = 65e-3         # [T] for 61813
OD_body = 60e-3     # [T] 2 mm wall between journals
def tube(m_rho, OD, ID, L):
    m = m_rho * pi / 4 * (OD**2 - ID**2) * L
    I = 0.5 * m * ((OD / 2)**2 + (ID / 2)**2)
    return m, I
m_body, I_body = tube(RHO_AL7075, OD_body, BORE, L_car - 2 * jour_len)
m_j, I_j = tube(RHO_AL7075, d_j, BORE, jour_len)
m_j *= 2; I_j *= 2
# prism mount: 4 corner rails filling corners between prism and bore, assume 35 g at r=23 mm  [T]/assumption
m_mount = 0.035; r_mount = 0.023
I_mount = m_mount * r_mount**2
# counterweight to null prism imbalance at r=26 mm
r_cw = 0.026
m_cw = m_prism * ecc / r_cw
I_cw = m_cw * r_cw**2
# inner races of 2 bearings rotate with carrier: assume 40% of bearing mass at d/2+3 mm
m_race = 2 * 0.4 * 0.13; r_race = d_j / 2 + 3e-3
I_race = m_race * r_race**2
parts = {
    "7075 body tube 60/56 x 100": (m_body, I_body),
    "7075 journals 65/56 x 10 (x2)": (m_j, I_j),
    "prism N-BK7": (m_prism, I_axis),
    "prism mount rails (assumed)": (m_mount, I_mount),
    "counterweight for prism CoM": (m_cw, I_cw),
    "bearing inner races (assumed 40% of 61813 mass)": (m_race, I_race),
}
mt = 0; It = 0
for n, (m, I) in parts.items():
    print(f"[C] {n}: m = {m*1e3:.1f} g, I = {I:.3e} kg m2")
    mt += m; It += I
pr("C", "indexed carrier set WITHOUT index ring, mass", mt * 1e3, "g")
pr("C", "indexed carrier set WITHOUT index ring, I", It, "kg m2")
# coaxial index ring / annular escape wheel, hardened steel 80/62 x 3 mm [T]
m_ir, I_ir = tube(RHO_STEEL, 80e-3, 62e-3, 3e-3)
pr("C", "steel index ring 80/62 x 3, mass", m_ir * 1e3, "g")
pr("C", "steel index ring I", I_ir, "kg m2")
I_idx = It + I_ir
m_idx = mt + m_ir
pr("C", "TOTAL indexed I (carrier+prism+ring)", I_idx, "kg m2")
pr("C", "TOTAL indexed mass", m_idx * 1e3, "g")
pr("C", "indexed I / ring I", I_idx / I_ring, "x")
# Gemini 303 SS carrier for comparison: 46 OD / 28.2 ID x 112 (blueprint G-code)
m_g, I_g = tube(8000, 46e-3, 28.2e-3, 112e-3)
pr("C", "Gemini 303SS carrier 46/28.2x112 mass", m_g * 1e3, "g")
pr("C", "Gemini 303SS carrier I", I_g, "kg m2")

hdr("A5 indexing demands: 12 deg mech per beat")
f_lo = f_of(K_spec(L0), I_ring); f_hi = f_of(K_spec(L_MIN_SPEC), I_ring)
for f in (f_lo, f_hi, 20.0):
    beat = 1 / (2 * f)
    print(f"[C] f = {f:.2f} Hz: beat interval {beat*1e3:.1f} ms, mean prism speed {STEP_MECH/beat/deg:.0f} deg/s "
          f"= {STEP_MECH/beat/(2*pi)*60:.1f} rpm")
def tau_bangbang(I, th, t):
    return 4 * th * I / t**2  # accelerate half, decelerate half
def t_free(I, th, tau):
    return math.sqrt(2 * th * I / tau)  # free accel then hard stop
for t in (BLANK_SPEC, BLANK_MEAS, 10e-3, 20e-3):
    tau = tau_bangbang(I_idx, STEP_MECH, t)
    wpk = 2 * STEP_MECH / t
    KE = 0.5 * I_idx * wpk**2
    print(f"[C] step 12 deg in {t*1e3:.2f} ms: peak torque {tau:.2f} N m, peak speed {wpk:.0f} rad/s, peak KE {KE:.3f} J")
pr("C", "time to step 12 deg under 0.12 N m (free accel, no friction)", t_free(I_idx, STEP_MECH, TAU_NOM) * 1e3, "ms")
pr("C", "impact energy per beat at 0.12 N m (tau x 12 deg)", TAU_NOM * STEP_MECH, "J")
# reflected inertia if the escape wheel carries the carrier and the pallets drive it during lift
lift_half = 3.5 * deg   # spec lift zone +/-3.5 deg
ratio = STEP_MECH / (2 * lift_half)  # wheel rad per balance rad during lift, crude
I_refl = I_idx * ratio**2
pr("C", "wheel/balance angle ratio during lift (12 deg / 7 deg, crude)", ratio)
pr("C", "carrier inertia reflected to balance", I_refl, "kg m2")
pr("C", "reflected / balance ring", I_refl / I_ring, "x")
E_bal = 0.5 * K_spec(L0) * AMP**2
w0 = 2 * pi * f_lo * AMP
KE_wheel = 0.5 * I_idx * (ratio * w0)**2
pr("C", "balance energy at 18 deg, 18 mm", E_bal, "J")
pr("C", "carrier KE if dragged at balance center speed x ratio", KE_wheel, "J")
# prism-only (lightest possible) indexed
I_min = I_axis
pr("C", "prism-only reflected / ring (lower bound)", I_min * ratio**2 / I_ring, "x")
# bearing drag (rough): seals
print("[C] bearing drag, rough: contact-sealed (2RS) 60-65 mm bore bearings are expected in the 0.05-0.4 N m range each (seal-dominated, order of magnitude only); non-contact (2RZ/2Z) or open lightly oiled: ~1e-3 to 1e-2 N m. Not a datasheet value.")

hdr("B remontoire ribbon")
def rib(E, t, b, L):
    k = E * b * t**3 / (12 * L)
    return k
k_g = rib(E_NIVA, **RIB_GEM)
pr("C", "Gemini ribbon 0.08x1.2x180 stiffness", k_g, "N m/rad")
pr("C", "Gemini ribbon torque at 45 deg", k_g * WIND_NOM, "N m")
pr("C", "shortfall vs 0.12 N m", TAU_NOM / (k_g * WIND_NOM), "x")
SIG_ALLOW = 1000e6   # [T] design allowable, ~0.47 Rm / 0.58 Rp0.2 for Nivaflex 50% CW aged
pr("T", "ribbon bending allowable at MAX torque (0.18 N m clutch)", SIG_ALLOW / 1e6, "MPa")
k_req = TAU_NOM / WIND_NOM
pr("C", "required k for 0.12 N m at 45 deg (no preload)", k_req, "N m/rad")
bt2 = 6 * TAU_CLUTCH / SIG_ALLOW
pr("C", "required b t^2 (sigma = 6M/(b t^2) at 0.18 N m)", bt2 * 1e9, "mm3")
print("Option A: unpreloaded leaf, torque = k*theta, 45 deg nominal, 67.5 deg at clutch torque")
optA = []
for E, mat in ((E_NIVA, "Nivaflex 45/18"), (E_STEEL, "carbon spring steel")):
    for t in (0.30e-3, 0.40e-3, 0.50e-3):
        b = bt2 / t**2
        b = math.ceil(b * 1e4) / 1e4  # round up to 0.1 mm
        L = E * b * t**3 / (12 * k_req)
        s_nom = 6 * TAU_NOM / (b * t**2)
        s_max = 6 * TAU_CLUTCH / (b * t**2)
        s_check = E * t * (TAU_CLUTCH / k_req) / (2 * L)
        print(f"[C] {mat}: t {t*1e3:.2f} b {b*1e3:.1f} L {L*1e3:.1f} mm, sigma nom {s_nom/1e6:.0f} MPa, at 0.18 N m {s_max/1e6:.0f} MPa (check {s_check/1e6:.0f})")
        optA.append((mat, t, b, L))
dtau_A = WIND_BAND / WIND_NOM
pr("C", "Option A torque variation for +/-2 deg control band", dtau_A * 100, "%")
print("Option B: pre-wound spiral, theta_total = 2 turns preset + 45 deg operating")
th_tot = 2 * 2 * pi + WIND_NOM
for E, mat in ((E_NIVA, "Nivaflex 45/18"), (E_STEEL, "carbon spring steel")):
    for t in (0.20e-3, 0.30e-3):
        k = TAU_NOM / th_tot
        # stress at nominal torque only (spiral stress depends on M): sigma = 6M/(b t^2)
        # max torque 0.18 means theta = 0.18/k
        b = bt2 / t**2
        b = math.ceil(b * 1e4) / 1e4
        L = E * b * t**3 / (12 * k)
        s_max = 6 * TAU_CLUTCH / (b * t**2)
        print(f"[C] {mat}: t {t*1e3:.2f} b {b*1e3:.1f} L {L*1e3:.0f} mm, k {k:.4f} N m/rad, sigma at 0.18 N m {s_max/1e6:.0f} MPa, wind for 0.18 = {TAU_CLUTCH/k/deg:.0f} deg total")
pr("C", "Option B torque variation for +/-2 deg band", WIND_BAND / th_tot * 100, "%")
pr("C", "wind needed for Gemini +/-2.5% at +/-2 deg (linear spring)", (WIND_BAND / 0.025) / deg, "deg total")
# energy actually needed by the oscillator
hdr("B2 drive torque the oscillator actually needs (ring only, escapement drives balance only)")
for L in (L0, L_MIN_SPEC):
    K = K_spec(L)
    E = 0.5 * K * AMP**2
    dE_beat = 2 * pi * E / Q / 2
    for eta in (0.35,):
        tau = dE_beat / (STEP_MECH * eta)
        print(f"[C] L {L*1e3:.1f} mm: E_osc {E:.3e} J, loss/beat at Q350 {dE_beat:.3e} J, escape-wheel torque needed at eta {eta}: {tau:.2e} N m ({TAU_NOM/tau:.0f}x below 0.12)")

hdr("D flexure frequency re-derivation")
T_MIN = 0.25e-3
N_BL = 4
b_impl = K_BASE * 12 * L0 / (N_BL * E_TI * T_MIN**3)
pr("C", "blade width implied by spec Kbase with N=4, t=0.25, K=N E b t^3/(12L)", b_impl * 1e3, "mm")
def K_beam(L, b=4e-3, t=T_MIN, N=N_BL, E=E_TI):
    return N * E * b * t**3 / (12 * L)
L_stress = E_TI * T_MIN * AMP / (2 * SIGMA_END)
pr("C", "shortest L at +/-18 deg, t 0.25, sigma<=510 MPa", L_stress * 1e3, "mm")
for L in (L0, L_stress, L_MIN_SPEC):
    s = E_TI * T_MIN * AMP / (2 * L)
    print(f"[C] sigma at +/-18 deg, L {L*1e3:.2f} mm, t 0.25: {s/1e6:.0f} MPa")
cases = {
    "D1 item-7 arch, balance ring only, spec law": (lambda L: K_spec(L), I_ring),
    "D2 item-7 arch, ring only, beam law b=4 mm t=0.25": (lambda L: K_beam(L), I_ring),
    "D3 Gemini arch, carrier+prism+ring oscillate, spec law": (lambda L: K_spec(L), I_ring + I_idx),
    "D4 Gemini arch, beam law b=4 t=0.25": (lambda L: K_beam(L), I_ring + I_idx),
    "D5 Gemini own blades 0.18x4x12 on new carrier (reference)": (lambda L: K_beam(12e-3, t=0.18e-3), I_ring + I_idx),
}
for n, (Kf, I) in cases.items():
    fa = f_of(Kf(L0), I); fs = f_of(Kf(L_stress), I); fb = f_of(Kf(L_MIN_SPEC), I)
    print(f"[C] {n}: I {I:.3e}; f(18) {fa:.2f}, f(L_stress {L_stress*1e3:.2f}) {fs:.2f}, f(8.5) {fb:.2f} Hz")
for I, lab in ((I_ring, "ring"), (I_ring + I_idx, "ring+carrier")):
    print(f"[C] K needed for 4 / 20 Hz with I {lab} {I:.3e}: {I*(2*pi*4)**2:.4f} / {I*(2*pi*20)**2:.4f} N m/rad")
pr("C", "f ratio available from 1/L over 18->8.5", math.sqrt(L0 / L_MIN_SPEC))
pr("C", "f ratio needed for 4-20 Hz", 5.0)
pr("C", "length ratio needed with 1/L law alone", 25.0)
pr("C", "L_min if 1/L alone did 4-20 from 18 mm", L0 / 25 * 1e3, "mm")
b4 = (I_ring * (2 * pi * 4)**2) * 12 * L0 / (N_BL * E_TI * T_MIN**3)
pr("C", "blade width for base K = K(4 Hz) at 18 mm, t 0.25 (ring)", b4 * 1e3, "mm")

hdr("A6 lighter carrier variant (Kaydon KA025 thin section, 1.5 mm body wall)")
m_b2, I_b2 = tube(RHO_AL7075, 59e-3, BORE, L_car - 2 * 6.35e-3)
m_j2, I_j2 = tube(RHO_AL7075, 63.5e-3, BORE, 6.35e-3); m_j2 *= 2; I_j2 *= 2
m_r2 = 2 * 0.4 * 0.059; I_r2 = m_r2 * (63.5e-3 / 2 + 2.5e-3)**2
m_ir2, I_ir2 = tube(RHO_TI, 76e-3, 62e-3, 3e-3)  # Ti index ring, lighter [T]
I_lite = I_b2 + I_j2 + I_axis + I_mount + I_cw + I_r2 + I_ir2
m_lite = m_b2 + m_j2 + m_prism + m_mount + m_cw + m_r2 + m_ir2
pr("C", "light indexed set mass", m_lite * 1e3, "g")
pr("C", "light indexed set I", I_lite, "kg m2")
pr("C", "light set reflected / ring", I_lite * ratio**2 / I_ring, "x")
pr("C", "light set time to step 12 deg at 0.12 N m", t_free(I_lite, STEP_MECH, TAU_NOM) * 1e3, "ms")
pr("C", "light set bang-bang torque for 12 deg in 4.65 ms", tau_bangbang(I_lite, STEP_MECH, BLANK_MEAS), "N m")
pr("C", "light set bang-bang torque for 12 deg in 15 ms", tau_bangbang(I_lite, STEP_MECH, 15e-3), "N m")

hdr("B3 stored energy and run-down")
kA = k_req
U_A = 0.5 * kA * WIND_NOM**2
kB = TAU_NOM / th_tot
U_B = 0.5 * kB * th_tot**2 - 0.5 * kB * (th_tot - WIND_NOM)**2  # usable over the 45 deg operating band only
U_B_total = 0.5 * kB * th_tot**2
pr("C", "Option A stored energy at 45 deg", U_A, "J")
pr("C", "Option B energy in the 45 deg operating band", U_B, "J")
pr("C", "Option B total stored", U_B_total, "J")
w_mean = STEP_MECH * 2 * f_lo  # rad/s of escape wheel at 8 Hz
P_index = TAU_NOM * w_mean
P_esc = 6.67e-4 * w_mean
pr("C", "drive power if 0.12 N m turns the indexed train at 8 Hz", P_index, "W")
pr("C", "drive power escapement-only (6.7e-4 N m) at 8 Hz", P_esc, "W")
pr("C", "15 s power-cut run-down energy, 0.12 N m train", P_index * 15, "J")
pr("C", "15 s power-cut run-down energy, escapement-only", P_esc * 15, "J")
pr("C", "Q350 amplitude e-fold time at 8.00 Hz (Q/(pi f))", Q / (pi * f_lo), "s")
pr("C", "Q350 amplitude e-fold time at 11.46 Hz", Q / (pi * f_of(K_spec(L_stress), I_ring)), "s")

hdr("C DMX resolution")
fmin = f_of(K_spec(L0), I_ring); fmax = f_of(K_spec(L_stress), I_ring)
span = fmax - fmin
pr("C", "modeled frequency span (item-7 arch, spec law, stress-limited)", span, "Hz")
pr("C", "8-bit frequency step", span / 255, "Hz")
pr("C", "16-bit frequency step", span / 65535, "Hz")
pr("C", "worst phase drift/min from 8-bit half step", span / 255 / 2 * 60, "cycles/min")
pr("C", "worst phase drift/min from 16-bit half step", span / 65535 / 2 * 60, "cycles/min")
D = 50.0
phi = 15 * deg + 2 * AMP
for bits in (8, 16):
    dA = AMP / (2**bits - 1)
    dR = D * (1 / math.cos(phi))**2 * 2 * dA
    print(f"[C] amplitude {bits}-bit step {dA/deg:.5f} deg mech -> radial step at 50 m {dR*1e3:.1f} mm")
R50 = D * math.tan(15 * deg)
for bits in (8, 16):
    da = 2 * pi / (2**bits)
    print(f"[C] phase offset {bits}-bit step {da/deg:.4f} deg -> arc step at rest radius {R50:.1f} m: {R50*da*1e3:.0f} mm")
