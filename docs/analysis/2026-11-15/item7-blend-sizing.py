"""ED-IBS item 7 blend sizing (escapement-released, spring-powered, motor-rewound indexer).
Analysis only. Tags: [T] target / chosen value / stated assumption, [C] calculated prediction
(closed-form or small RK4 check, no FEA, no test), [S] cited source. Nothing here is validated.
No constant is tuned to make a target pass.
Reuses working-revision-step1.py (run silently, variables read directly) so ring, carrier,
frequency and drive numbers match step 1 and the tourbillon pass.
Run: python3 item7-blend-sizing.py > item7-blend-sizing-results.txt
"""
import io, math, runpy, contextlib, os
pi = math.pi; deg = pi / 180; g = 9.80665
here = os.path.dirname(os.path.abspath(__file__))
with contextlib.redirect_stdout(io.StringIO()):
    S1 = runpy.run_path(os.path.join(here, "working-revision-step1.py"))

def hdr(s): print("\n## " + s)
def pr(tag, name, val, unit="", fmt="{:.4g}"):
    print(f"[{tag}] {name} = {fmt.format(val)} {unit}".rstrip())

# ------------------------------------------------------------------ reused step-1 values
I_ring = S1["I_ring"]; K_spec = S1["K_spec"]; f_of = S1["f_of"]
L0 = S1["L0"]; L_st = S1["L_stress"]
AMP = S1["AMP"]; Q = S1["Q"]; STEP = S1["STEP_MECH"]
I_idx = S1["I_idx"]; I_lite = S1["I_lite"]
E_NIVA = S1["E_NIVA"]; E_STEEL = S1["E_STEEL"]; RM_NIVA = S1["RM_NIVA"]
TAU_NOM = S1["TAU_NOM"]; TAU_CLUTCH = S1["TAU_CLUTCH"]
BLANK_SPEC = S1["BLANK_SPEC"]; BLANK_MEAS = S1["BLANK_MEAS"]
ETA_ESC = 0.35                     # [T step-1 assumption] escapement efficiency
CASES = [("8.00 Hz (L 18.00 mm)", L0), ("11.46 Hz (L 8.78 mm)", L_st)]
INERTIAS = [("baseline 61813 set", I_idx), ("light KA025 set", I_lite)]
f_lo = f_of(K_spec(L0), I_ring); f_hi = f_of(K_spec(L_st), I_ring)

# ------------------------------------------------------------------ cited catalog values [S]
# maxon DCX 22 S, 24 V winding (catalog page 112, 2025 ed.; Distrelec config sheet)
DCX = dict(Mnom=15.3e-3, nnom=10800, Mstall=120e-3, kt=18.4e-3, R=3.69, J=5.55e-7, tau_m=6.07e-3)
# maxon GPX 22 HP (catalog page 392): 3-stage 62..231:1, 3.3 N m cont, 3.8 intermittent, eta max 65 %,
# 1.2 deg backlash, 10000 rpm max cont input; 2-stage 16..44:1, 2.4 N m, 75 %, 1.05 deg, 8000 rpm
GPX3 = dict(ratios=(62, 83, 103), Mcont=3.3, Mint=3.8, eta=0.65, backlash=1.2, nin=10000)
GPX2 = dict(ratios=(16, 44), Mcont=2.4, eta=0.75, nin=8000)
# H2W NCC03-07-001-1V moving-coil voice coil (h2wtech product page)
VCA = dict(kf=2.6, R=9.6, L=1.4e-3, tau_e=0.14e-3, m=7.0e-3, stroke=6.4e-3, F10=1.6, P10=3.6, Fcont=0.53, Pcont=0.40)
# Ledex 50 STA push solenoid (Johnson Electric sheet): 195201-237 at 24 V intermittent (25 % duty, 5 s max on)
OZ = 0.278014  # N per ounce-force
SOL = dict(R=45.7, P=12.0, F_010in=12.6 * OZ, F_100in=2.4 * OZ, m_plunger=1.2e-3,
           Fcont_010in=6.3 * OZ, Pcont=3.0)
# Omron EE-SX1041 slotted photomicrosensor: tr = tf = 4 us typ; Vishay TCST1103: ton 10 us, toff 8 us
SENS_TR = 4e-6; SENS_TCST = 10e-6
# cam motion-law coefficients (MechDesigner motion-law table): (Cv, Ca)
LAWS = {"modified sine [S]": (1.760, 5.528), "cycloidal [S]": (2.000, 6.283),
        "modified trapezoid [S]": (2.000, 4.888), "bang-bang (step-1 reference) [C]": (2.0, 4.0),
        "harmonic half-swing (spring) [C]": (pi / 2, pi**2 / 2)}
CFF_CONE = 60.0                    # [S Wikipedia flicker fusion: cone plateau about 60 Hz]

# ------------------------------------------------------------------ chosen values [T]
W_TRIP = 2.0 * deg                 # [T] balance angle over which a trip acts (MAN locking 1.5 deg + margin)
TIERS = (0.05, 0.10, 0.25)         # [T] release energy as share of per-beat loss: tight / working / loose
R_LOCK = 0.040                     # [T] lock radius on step-1 80/62 index ring
MU_SLIDE = 0.15                    # [T] hardened steel or ruby on steel, lubricated, planning value
MU_ROLL = 0.01                     # [T] rolling sear incl. roller pivot friction, planning value
S_SEAR = 0.3e-3                    # [T] sear disengage travel incl. tolerance
DRAG = (0.002, 0.02)               # [T step-1 planning range] carrier bearing drag, 2 x non-contact seals
T_SET = 2e-3                       # [T] settle after catch before light returns
STEPS_T = (10e-3, 15e-3, 20e-3, 25e-3)
T_S = 15e-3                        # [T] baseline step time (Caleb conversation baseline)
SIG_REV = 500e6                    # [T] fully reversed bending allowable for indexer spring (no supplier fatigue data)
SIG_STATIC = 1000e6                # [T step-1] ribbon allowable at clutch torque (mostly static)
I_FRAME = (0.05, 0.5)              # [T] fixture rotational inertia about optical axis, body only / clamped to truss
HOURS = 10 * 300                   # [T] touring hours per year (tourbillon pass)
D_THROW = 50.0                     # [T step-1] throw for beam sensitivity
PHI_RAD = 15 * deg + 2 * AMP       # [S spec] radial angle at full amplitude

# ================================================================== 1 release budget
hdr("1 release budget on the balance")
bud = {}
for lab, L in CASES:
    K = K_spec(L); w0 = math.sqrt(K / I_ring); f = w0 / (2 * pi)
    E = 0.5 * K * AMP**2; dEb = pi * E / Q; tb = 1 / (2 * f)
    bud[lab] = dict(K=K, w0=w0, f=f, E=E, dEb=dEb, tb=tb)
    print(f"-- {lab}: f {f:.3f} Hz, beat {tb*1e3:.1f} ms")
    pr("C", "  balance energy at 18 deg", E, "J")
    pr("C", "  loss per beat at Q 350 (pi E / Q)", dEb, "J")
    pr("C", "  escape-wheel torque to cover it (eta 0.35)", dEb / (STEP * ETA_ESC), "N m")
    for s in TIERS:
        Er = s * dEb
        print(f"[C]   release budget {s*100:.0f}% of loss: {Er:.2e} J; = {Er/W_TRIP:.2e} N m at balance over 2 deg "
              f"({Er/W_TRIP/0.036*1e3:.2f} mN at 36 mm rim); = {Er/STEP:.2e} N m at escape wheel over 12 deg")
    bud[lab]["Er10"] = 0.10 * dEb

def rate_err_onesided(tau_r, w, A, K):
    """Airy first-order: constant resistive torque over theta in (w..0) before centre, per half period."""
    w0 = math.sqrt(K / I_ring)
    dt = tau_r / (I_ring * w0**3 * A) * (1 - math.sqrt(1 - (w / A)**2))
    return dt / (pi / w0)                      # fractional rate (positive = loses time)

def half_period_rk4(K, A, torque, dt=2e-6):
    """Integrate from theta=A, v=0 to next v=0. torque(theta, v) in N m. Returns (half period, end amplitude)."""
    th, v, t = A, 0.0, 0.0
    def acc(th, v): return (-K * th + torque(th, v)) / I_ring
    started = False
    while True:
        k1v = acc(th, v); k1x = v
        k2v = acc(th + 0.5*dt*k1x, v + 0.5*dt*k1v); k2x = v + 0.5*dt*k1v
        k3v = acc(th + 0.5*dt*k2x, v + 0.5*dt*k2v); k3x = v + 0.5*dt*k2v
        k4v = acc(th + dt*k3x, v + dt*k3v); k4x = v + dt*k3v
        th2 = th + dt/6*(k1x + 2*k2x + 2*k3x + k4x); v2 = v + dt/6*(k1v + 2*k2v + 2*k3v + k4v)
        if v2 < 0: started = True
        if started and v2 >= 0:
            frac = -v / (v2 - v); return t + frac*dt, -(th + frac*(th2 - th))
        th, v, t = th2, v2, t + dt

print("-- isochronism effect of the trip (Airy). Rate error: + = loses time")
dmx16 = (f_hi - f_lo) / 65535
for lab, L in CASES:
    b = bud[lab]; K = b["K"]; Er = b["Er10"]; tau_r = Er / W_TRIP
    d1 = rate_err_onesided(tau_r, W_TRIP, AMP, K)
    print(f"[C] {lab}: 10% budget, trip torque {tau_r:.2e} N m over 2 deg before centre: rate {d1:.2e} ({d1*86400:.2f} s/day); "
          f"16-bit DMX freq step = {dmx16/b['f']:.2e} relative")
    for Adeg in (12, 6):
        dA = rate_err_onesided(tau_r, W_TRIP, Adeg * deg, K)
        print(f"[C]   same trip at amplitude {Adeg} deg: rate {dA:.2e} ({dA*86400:.1f} s/day)")
# RK4 cross-check at 8 Hz
K = bud[CASES[0][0]]["K"]; tau_r = bud[CASES[0][0]]["Er10"] / W_TRIP
T0, _ = half_period_rk4(K, AMP, lambda th, v: 0.0)
def win(lo, hi):
    return lambda th, v: (-tau_r * math.copysign(1, v)) if (lo < th < hi) else 0.0
for name, (lo, hi) in {"before centre (0..+2 deg)": (0, W_TRIP), "centred (-1..+1 deg)": (-W_TRIP/2, W_TRIP/2),
                       "after centre (-2..0 deg)": (-W_TRIP, 0)}.items():
    T1, A1 = half_period_rk4(K, AMP, win(lo, hi))
    print(f"[C] RK4 8.00 Hz, 10% trip {name}: rate {(T1-T0)/T0:+.2e}, amplitude loss {(AMP-A1)/deg*1e3:.3f} mdeg")
pr("C", "  Airy formula, before centre, same case", rate_err_onesided(tau_r, W_TRIP, AMP, K))
# amplitude noise from trip-energy scatter
sens = D_THROW / math.cos(PHI_RAD)**2 * 2 * deg       # m of radial beam per deg mech
for lab, _ in CASES:
    b = bud[lab]
    for scat in (0.3,):
        sigE = scat * b["Er10"] * math.sqrt(Q / (2 * pi))
        sA = 0.5 * sigE / b["E"] * AMP / deg
        print(f"[C] {lab}: +/-{scat*100:.0f}% per-beat scatter of a 10% trip -> amplitude noise {sA*1e3:.1f} mdeg rms "
              f"-> {sA*sens*1e3:.0f} mm rms radial at 50 m")

# ================================================================== 4a indexer kinematics (needed by 2, 3)
hdr("4 indexer: Geneva vs cam, 30 stations, 12 deg")
n = 30; lam = math.sin(pi / n); a0 = pi / 2 - pi / n
def psi(ph): return math.atan2(lam * math.sin(ph), 1 - lam * math.cos(ph))
N = 20000; hs = 2 * a0 / N
ps = [psi(-a0 + i * hs) for i in range(N + 1)]
d1 = [(ps[i+1] - ps[i-1]) / (2*hs) for i in range(1, N)]
d2 = [(ps[i+1] - 2*ps[i] + ps[i-1]) / hs**2 for i in range(1, N)]
dpsi = ps[-1] - ps[0]
Cv_g = max(abs(x) for x in d1) * 2 * a0 / dpsi
Ca_g = max(abs(x) for x in d2) * (2 * a0)**2 / dpsi
pr("C", "Geneva n=30: lambda = sin(pi/n)", lam)
pr("C", "Geneva driver motion angle", 2 * a0 / deg, "deg"); pr("C", "Geneva driver dwell angle", 360 - 2 * a0 / deg, "deg")
pr("C", "Geneva wheel index (check)", dpsi / deg, "deg")
pr("C", "Geneva equivalent Cv (constant driver speed)", Cv_g); pr("C", "Geneva equivalent Ca", Ca_g)
pr("C", "Geneva wheel accel at pin entry / peak (acceleration jump, infinite jerk)", abs(d2[0]) / max(abs(x) for x in d2))
Rw = 0.040; Cc = Rw / math.cos(pi / n)
pr("C", "Geneva at 40 mm wheel radius: centre distance", Cc * 1e3, "mm"); pr("C", "  crank (pin) radius", Cc * lam * 1e3, "mm")
LAWS["Geneva n=30, constant driver [C]"] = (Cv_g, Ca_g)
print("-- peak output torque and peak KE for 12 deg in t_s (output inertia only, no friction)")
for nm, (Cv, Ca) in LAWS.items():
    for il, I in INERTIAS:
        row = []
        for ts in STEPS_T:
            Tpk = Ca * STEP * I / ts**2; KE = 0.5 * I * (Cv * STEP / ts)**2
            row.append(f"{ts*1e3:.0f} ms {Tpk:.2f} N m / {KE*1e3:.0f} mJ")
        print(f"[C] {nm}, {il}: " + "; ".join(row))

print("-- D1: cam or Geneva input driven one turn per step by a constant-torque spring, then arrested")
print("[T] input flywheel KE = 5 x output peak KE (about 11% speed dip while it drives the output)")
for il, I in INERTIAS:
    Cv, Ca = LAWS["modified sine [S]"]
    KE = 0.5 * I * (Cv * STEP / T_S)**2; Earr = 5 * KE
    print(f"[C] {il}, 15 ms modified sine: arrest energy per step {Earr:.3f} J; dissipated {Earr*2*f_lo:.1f} W at 8.00 Hz, "
          f"{Earr*2*f_hi:.1f} W at 11.46 Hz (all of it must come from the rewind motor)")

print("-- D2: resonant half-swing spring indexer (recommended). Spring between a motor-driven arm and the carrier.")
print("[T] arm turns continuously at the mean step rate (12 deg per beat), phase-locked to the beat by the encoder")
TH_C = STEP / 2
pr("C", "nominal cock angle (half step, arm stationary)", TH_C / deg, "deg")
PLL_ERR = 0.1 * deg                       # [T] arm phase error at release (AS5048A 0.022 deg/LSB [S MAN]; beat error <=0.15 ms [S MAN])
def swing(I, k, Om, r0, drag, dt=1e-5):
    """Carrier released at rest with spring pre-angle r0 to an arm moving at Om. Returns
    (time to reach 12 deg or to stop, angle reached, speed at 12 deg (0 if it stopped short), rel at end)."""
    th, v, t = 0.0, 0.0, 0.0
    def a(th, v, t):
        return (k * (r0 + Om * t - th) - (drag if v > 0 else 0.0)) / I
    while True:
        k1v = a(th, v, t); k1x = v
        k2v = a(th+0.5*dt*k1x, v+0.5*dt*k1v, t+0.5*dt); k2x = v+0.5*dt*k1v
        k3v = a(th+0.5*dt*k2x, v+0.5*dt*k2v, t+0.5*dt); k3x = v+0.5*dt*k2v
        k4v = a(th+dt*k3x, v+dt*k3v, t+dt); k4x = v+dt*k3v
        th2 = th+dt/6*(k1x+2*k2x+2*k3x+k4x); v2 = v+dt/6*(k1v+2*k2v+2*k3v+k4v)
        if th2 >= STEP:
            fr = (STEP - th) / (th2 - th); tt = t + fr * dt
            return tt, STEP, v + fr * (v2 - v), r0 + Om * tt - STEP
        if t > 0.002 and v2 <= 0:
            fr = v / (v - v2); tt = t + fr * dt; thr = th + fr * (th2 - th)
            return tt, thr, 0.0, r0 + Om * tt - thr
        th, v, t = th2, v2, t + dt
def find_r0(I, k, Om, drag):
    lo, hi = 0.0, 3 * TH_C
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        if swing(I, k, Om, mid, drag)[1] >= STEP: hi = mid
        else: lo = mid
    return hi
def design_k(I, ts):
    """Spring rate so the worst case (11.46 Hz, high drag, carrier just arriving) steps 12 deg in ts."""
    Om = STEP * 2 * f_hi; k = I * (pi / ts)**2
    for _ in range(8):
        r0 = find_r0(I, k, Om, DRAG[1]); t1 = swing(I, k, Om, r0, DRAG[1])[0]
        k *= (t1 / ts)**2
    return k
res = {}
for il, I in INERTIAS:
    for ts in STEPS_T:
        k = design_k(I, ts); per = {}
        for f, fn in ((f_lo, "8.00 Hz"), (f_hi, "11.46 Hz")):
            Om = STEP * 2 * f
            r0 = find_r0(I, k, Om, DRAG[1])                     # worst drag still arrives
            t_hi, _, _, rel_end = swing(I, k, Om, r0, DRAG[1])
            t_lo, _, v_lo, _ = swing(I, k, Om, r0, DRAG[0])
            _, _, v_pll, _ = swing(I, k, Om, r0 + PLL_ERR, DRAG[0])
            d = dict(k=k, r0=r0, Thold=k * r0, t_step=t_hi, rel_end=rel_end, Eres=0.5 * I * v_lo**2,
                     Epll=0.5 * I * v_pll**2, v_pll=v_pll, Esw=0.5 * k * r0**2, I=I, Om=Om)
            res[(il, ts, fn)] = d; per[fn] = d
            print(f"[C] {il}, step target {ts*1e3:.0f} ms, {fn}: k {k:.2f} N m/rad (half period {pi*math.sqrt(I/k)*1e3:.1f} ms), "
                  f"cock {r0/deg:.2f} deg, cocked torque {k*r0:.2f} N m (latch {k*r0/R_LOCK:.1f} N at r 40 mm), "
                  f"step to 12 deg {t_hi*1e3:.1f} ms, spring energy {0.5*k*r0**2*1e3:.1f} mJ (recycled), "
                  f"rel at catch {rel_end/deg:+.2f} deg, catch residual {0.5*I*v_lo**2*1e3:.2f} mJ (low drag), "
                  f"{0.5*I*v_pll**2*1e3:.2f} mJ (low drag + 0.1 deg phase error)")
        a8, a11 = per["8.00 Hz"], per["11.46 Hz"]
        res[(il, ts)] = dict(k=k, I=I, r0=max(a8["r0"], a11["r0"]), Thold=max(a8["Thold"], a11["Thold"]),
                             rel_end=max(abs(a8["rel_end"]), abs(a11["rel_end"])), Eres=max(a8["Eres"], a11["Eres"]),
                             Epll=max(a8["Epll"], a11["Epll"]), Esw=max(a8["Esw"], a11["Esw"]),
                             t_step=max(a8["t_step"], a11["t_step"]))
print("-- D2 per-step loss (drag only) and recycled share")
for il, I in INERTIAS:
    r = res[(il, T_S)]
    print(f"[C] {il} 15 ms: drag work {DRAG[0]*STEP*1e3:.2f}-{DRAG[1]*STEP*1e3:.2f} mJ/step = "
          f"{DRAG[0]*STEP/r['Esw']*100:.1f}-{DRAG[1]*STEP/r['Esw']*100:.1f}% of swing energy")

print("-- spring sizing: arc spring in pure bending (k = E b t^3 / 12 L, sigma = E t theta / 2 L), fully reversed")
for il, I in INERTIAS:
    r = res[(il, T_S)]; th_max = max(abs(r["r0"]), abs(r["rel_end"])) + PLL_ERR + 1 * deg      # [T] 1 deg extra for catch overtravel
    print(f"[T] {il} 15 ms: design swing +/-{th_max/deg:.2f} deg relative, k {r['k']:.2f} N m/rad, allowable {SIG_REV/1e6:.0f} MPa fully reversed")
    for E, mat in ((E_NIVA, "Nivaflex 45/18"), (E_STEEL, "carbon spring steel")):
        for t in (1.5e-3, 2.0e-3, 2.5e-3):
            L = E * t * th_max / (2 * SIG_REV); b = 12 * r["k"] * L / (E * t**3)
            print(f"[C]   {mat}: t {t*1e3:.1f} mm -> L {L*1e3:.1f} mm, b {b*1e3:.1f} mm, peak moment {r['k']*th_max:.2f} N m")
for f, nm in ((f_lo, "8.00 Hz"), (f_hi, "11.46 Hz")):
    pr("C", f"indexer spring cycles per touring year at {nm} ({HOURS} h [T])", 2 * f * 3600 * HOURS, "cycles")

print("-- stop and lock: pawl drops into 30-notch ring at r 40 mm and catches near zero speed")
for il, I in INERTIAS:
    r = res[(il, T_S)]; E = max(r["Eres"], r["Epll"])
    v_imp = math.sqrt(2 * E / I)
    for kl, nm in ((2e7, "hard steel pawl/notch [T 2e7 N/m]"), (2e5, "elastomer-backed stop [T 2e5 N/m]")):
        Fpk = math.sqrt(2 * E * kl); x = Fpk / kl
        print(f"[C] {il}: residual {E*1e3:.2f} mJ, arrival {v_imp:.2f} rad/s; {nm}: peak force {Fpk:.0f} N, "
              f"stop travel {x*1e6:.0f} um")
    E_full = 0.5 * I * (pi / T_S * TH_C)**2
    print(f"[C] {il}: if the catch misses and the carrier hits the next notch at full swing speed: {E_full*1e3:.0f} mJ, "
          f"peak force on hard stop {math.sqrt(2*E_full*2e7):.0f} N")

print("-- reaction torque into the chassis and back into the balance (stationary indexer, fixed balance)")
for il, I in INERTIAS:
    r = res[(il, T_S)]; k = r["k"]; Tpk = res[(il, T_S, "8.00 Hz")]["Thold"]   # cocked torque, harmonic profile approx
    for If in I_FRAME:
        K = bud[CASES[0][0]]["K"]; w0 = bud[CASES[0][0]]["w0"]
        tq = T_S
        # release when balance passes centre (t = quarter period), latch delay 2 ms [T]
        t0 = pi / (2 * w0) + 2e-3
        def frc(th, v, _t=[0.0]):
            return 0.0
        # time-dependent forcing: integrate with explicit time
        def run(Iframe):
            th, v, t, dt = AMP, 0.0, 0.0, 2e-6; started = False
            def a(th, v, t):
                Tc = Tpk * math.cos(pi * (t - t0) / tq) if t0 <= t <= t0 + tq else 0.0
                return (-K * th + I_ring * Tc / Iframe) / I_ring if Iframe else -K * th / I_ring
            while True:
                k1v = a(th, v, t); k1x = v
                k2v = a(th+0.5*dt*k1x, v+0.5*dt*k1v, t+0.5*dt); k2x = v+0.5*dt*k1v
                k3v = a(th+0.5*dt*k2x, v+0.5*dt*k2v, t+0.5*dt); k3x = v+0.5*dt*k2v
                k4v = a(th+dt*k3x, v+dt*k3v, t+dt); k4x = v+dt*k3v
                th2 = th+dt/6*(k1x+2*k2x+2*k3x+k4x); v2 = v+dt/6*(k1v+2*k2v+2*k3v+k4v)
                if v2 < 0: started = True
                if started and v2 >= 0:
                    fr = -v/(v2-v); return t+fr*dt, -(th+fr*(th2-th))
                th, v, t = th2, v2, t+dt
        Tref, _ = run(None); T1, A1 = run(If)
        print(f"[C] {il}, 8.00 Hz, frame I {If} kg m2 [T]: frame peak accel {Tpk/If:.1f} rad/s2, "
              f"that beat's half-period shift {(T1-Tref)/Tref:+.2e} ({(T1-Tref)*1e3:+.3f} ms), one-side amplitude change {(A1-AMP)/deg*1e3:+.1f} mdeg")

# ================================================================== 2 mechanical release options
print("-- same, baseline set, frame I 0.05 [T]: release delay after the balance zero crossing (electric latch can choose it)")
I = I_idx; k = res[(INERTIAS[0][0], T_S)]["k"]; Tpk = res[(INERTIAS[0][0], T_S, "8.00 Hz")]["Thold"]; If = I_FRAME[0]
K = bud[CASES[0][0]]["K"]; w0 = bud[CASES[0][0]]["w0"]
def run_delay(delay, Iframe):
    """Full period from +A with a step on each beat; step starts `delay` after each nominal zero crossing."""
    Tn = 2 * pi / w0
    starts = [Tn / 4 + delay + j * Tn / 2 for j in (-1, 0, 1, 2)]
    th, v, t, dt = AMP, 0.0, 0.0, 2e-6; phase = 0
    def a(th, v, t):
        Tc = 0.0
        if Iframe:
            for s0 in starts:
                if s0 <= t <= s0 + T_S: Tc = Tpk * math.cos(pi * (t - s0) / T_S)
        return (-K * th + (I_ring * Tc / Iframe if Iframe else 0.0)) / I_ring
    while True:
        k1v = a(th, v, t); k1x = v
        k2v = a(th+0.5*dt*k1x, v+0.5*dt*k1v, t+0.5*dt); k2x = v+0.5*dt*k1v
        k3v = a(th+0.5*dt*k2x, v+0.5*dt*k2v, t+0.5*dt); k3x = v+0.5*dt*k2v
        k4v = a(th+dt*k3x, v+dt*k3v, t+dt); k4x = v+dt*k3v
        th2 = th+dt/6*(k1x+2*k2x+2*k3x+k4x); v2 = v+dt/6*(k1v+2*k2v+2*k3v+k4v)
        if phase == 0 and v2 < 0: phase = 1
        elif phase == 1 and v2 > 0: phase = 2
        elif phase == 2 and v2 <= 0:
            fr = v/(v-v2); return t+fr*dt, th+fr*(th2-th)
        th, v, t = th2, v2, t+dt
def run_half(delay, Iframe):
    """Half period from +A with one step starting `delay` after the zero crossing."""
    t0 = pi / (2 * w0) + delay
    th, v, t, dt = AMP, 0.0, 0.0, 2e-6; started = False
    def a(th, v, t):
        Tc = Tpk * math.cos(pi * (t - t0) / T_S) if (Iframe and t0 <= t <= t0 + T_S) else 0.0
        return (-K * th + (I_ring * Tc / Iframe if Iframe else 0.0)) / I_ring
    while True:
        k1v = a(th, v, t); k1x = v
        k2v = a(th+0.5*dt*k1x, v+0.5*dt*k1v, t+0.5*dt); k2x = v+0.5*dt*k1v
        k3v = a(th+0.5*dt*k2x, v+0.5*dt*k2v, t+0.5*dt); k3x = v+0.5*dt*k2v
        k4v = a(th+dt*k3x, v+dt*k3v, t+dt); k4x = v+dt*k3v
        th2 = th+dt/6*(k1x+2*k2x+2*k3x+k4x); v2 = v+dt/6*(k1v+2*k2v+2*k3v+k4v)
        if v2 < 0: started = True
        if started and v2 >= 0:
            fr = -v/(v2-v); return t+fr*dt, -(th+fr*(th2-th))
        th, v, t = th2, v2, t+dt
print("[C]   the carrier always steps the same way while the balance alternates, so beat n and beat n+1 see opposite effects:")
Tref, _ = run_delay(0.0, None); Th0, _ = run_half(0.0, None)
qp = pi / (2 * w0)
for dl, why in ((-T_S/2, "step centred on zero crossing (needs predictive fire)"), (0.0, "starts at zero crossing"),
                (3e-3, "mechanical cascade delay ~3 ms")):
    T1, A1 = run_delay(dl, If); Th, Ah = run_half(dl, If)
    print(f"[C]   {why}, start {dl*1e3:+.1f} ms: net rate over a full period {(T1-Tref)/Tref:+.1e}; "
          f"beat error {2*abs(Th-Th0)*1e3:.3f} ms; left/right amplitude asymmetry {2*abs(Ah-AMP)/deg*1e3:.1f} mdeg "
          f"({2*abs(Ah-AMP)/deg*sens*1e3:.0f} mm radial at 50 m)")
pr("S", "Gemini beat error target", 0.15, "ms")
pr("C", "amplitude lost per beat to Q 350 alone (A pi / 2Q), for comparison", AMP * pi / (2 * Q) / deg * 1e3, "mdeg")
pr("C", "quarter period at 8.00 Hz (zero crossing to turning point)", pi / (2 * w0) * 1e3, "ms")

hdr("2 mechanical release options")
Er_lo = bud[CASES[0][0]]["Er10"]; Er_hi = bud[CASES[1][0]]["Er10"]
pr("C", "10% release budget (8.00 Hz, the tighter end)", Er_lo, "J")
print("-- 2a fixed balance: escape-wheel trip cam -> sear cascade -> main pawl on the indexer")
SF = 2.0; G = 2.0; m_h = 0.3e-3; s_h = 0.5e-3     # [T] hammer spring safety factor, lever advantage, hammer mass, travel
for il, I in INERTIAS:
    F = res[(il, T_S)]["Thold"] / R_LOCK
    for mu0, nm in ((MU_SLIDE, "sliding main sear"), (MU_ROLL, "rolling main sear")):
        Fi = F; mu = mu0; stages = 0; t_tot = 0.0; rows = []
        while True:
            Etrip = mu * Fi * S_SEAR
            rows.append(f"stage {stages+1}: load {Fi:.3g} N, trip {Etrip:.2e} J")
            if Etrip <= Er_lo or stages > 6: break
            Frel = mu * Fi; Fnext = Frel * SF / G
            t_tot += math.sqrt(2 * s_h * m_h / ((SF - 1) * Frel))
            Fi = Fnext; mu = MU_SLIDE; stages += 1
        print(f"[C] {il}, {nm}: main latch load {F:.1f} N; " + "; ".join(rows))
        print(f"[C]   -> {stages+1} stages to get under the 10% budget, cascade fall time about {t_tot*1e3:.2f} ms, "
              f"mass about {(stages+1)*1.0:.0f} g [T 1 g per stage]")
print("[C] trip energy comes from the escape wheel during its 12 deg impulse motion, i.e. inside the +/-3.5 deg lift zone")
print("-- 2b carousel: axial push ring lifted by the cage escapement, read by a stationary trip lever")
S_LIFT = 0.2e-3; T_LIFT = 2e-3                    # [T]
for nm, rho, od, idd, t in (("7075 70/62 x 1.0", 2810, 0.070, 0.062, 1.0e-3), ("Ti-6Al-4V 70/62 x 0.6", 4430, 0.070, 0.062, 0.6e-3),
                            ("CFRP 70/62 x 1.0 [T rho 1550]", 1550, 0.070, 0.062, 1.0e-3)):
    m = rho * pi / 4 * (od**2 - idd**2) * t
    for t_ret in (2e-3, 5e-3):
        F_ret = max(2 * m * g, m * 4 * S_LIFT / t_ret**2)
        KE = 0.5 * m * (2 * S_LIFT / T_LIFT)**2
        E = F_ret * S_LIFT + m * g * S_LIFT + KE
        print(f"[C] ring {nm}: {m*1e3:.2f} g; return in {t_ret*1e3:.0f} ms needs {F_ret*1e3:.0f} mN; energy per beat "
              f"{E:.2e} J = {E/Er_lo:.1f}x the 10% budget at 8.00 Hz (before the stationary hair trigger is added)")
print("[T] thrust interface: one ruby point on the stationary lever riding the ring face; its sliding friction is tangential and paid by the cage motor, not the balance")

# ================================================================== 3 optical sensor + electric latch
hdr("3 optical sensor + electric latch")
pr("S", "Omron EE-SX1041 rise/fall time", SENS_TR * 1e6, "us"); pr("S", "Vishay TCST1103 turn-on time", SENS_TCST * 1e6, "us")
v_rim = AMP * bud[CASES[0][0]]["w0"] * 0.036
pr("C", "balance rim speed at centre, 8.00 Hz, r 36 mm", v_rim, "m/s")
pr("C", "edge timing jitter for 5 um position noise [T] on the rim", 5e-6 / v_rim * 1e6, "us")
m_pawl = 1.5e-3; s_pawl = 0.5e-3; F_retsp = 0.3       # [T] pawl mass, travel, return spring
print("-- voice coil H2W NCC03-07-001-1V tripping the main pawl directly (rolling sear) or a 1-stage cascade")
for il, I in INERTIAS:
    F = res[(il, T_S)]["Thold"] / R_LOCK
    for Ipk in (1.0, 2.5):
        Fv = VCA["kf"] * Ipk
        for nm, Ffr in (("rolling main sear", MU_ROLL * F), ("via 1 cascade stage", MU_SLIDE * MU_ROLL * F * SF / G)):
            Fnet = Fv - Ffr - F_retsp
            if Fnet <= 0:
                print(f"[C] {il}, {Ipk} A ({Fv:.1f} N), {nm}: friction {Ffr:.2f} N, does not move"); continue
            tm = math.sqrt(2 * s_pawl * (VCA['m'] + m_pawl) / Fnet) + 3 * VCA["tau_e"]
            Epulse = Ipk**2 * VCA["R"] * tm
            print(f"[C] {il}, {Ipk} A ({Fv:.1f} N), {nm}: friction {Ffr:.2f} N, open in {tm*1e3:.2f} ms, "
                  f"coil heat {Epulse*2*f_lo:.2f} W at 8.00 Hz / {Epulse*2*f_hi:.2f} W at 11.46 Hz vs {VCA['Pcont']} W continuous rating")
print("-- Ledex 50 STA push solenoid, 24 V intermittent")
pr("S", "force at 0.010 in stroke", SOL["F_010in"], "N"); pr("S", "force at 0.100 in stroke", SOL["F_100in"], "N")
for il, I in INERTIAS:
    F = res[(il, T_S)]["Thold"] / R_LOCK
    Fnet = SOL["F_010in"] - MU_ROLL * F - F_retsp
    tm = math.sqrt(2 * 0.25e-3 * (SOL["m_plunger"] + m_pawl) / Fnet)
    print(f"[C] {il}: mechanical travel time 0.25 mm at full force {tm*1e3:.2f} ms (plus flux build-up, not on the sheet; "
          f"planning 5-20 ms [T], temperature dependent)")
pr("C", "solenoid heat at 24 V, 5 ms pulse, 11.46 Hz", 24**2 / SOL["R"] * 5e-3 * 2 * f_hi, "W")

# ================================================================== 5 rewind (cocking) motor
hdr("5 rewind motor (cocks the indexer spring each beat)")
def motor_case(il, f, ratio, eta=GPX3["eta"]):
    """Continuous arm at Om; rel(t) from the swing model, then linear rise in the dwell."""
    fn = "8.00 Hz" if f == f_lo else "11.46 Hz"
    r = res[(il, T_S, fn)]; k = r["k"]; I = r["I"]; Om = r["Om"]; r0 = r["r0"]
    tb = 1 / (2 * f); dt = 2e-5
    # swing segment (worst drag, as designed)
    th, v, t = 0.0, 0.0, 0.0; Tsq = 0.0; Tpk = 0.0; Epos = 0.0; Eneg = 0.0
    while th < STEP and t < tb:
        rel = r0 + Om * t - th; Ta = k * rel
        acc = (Ta - DRAG[1]) / I; v += acc * dt; th += v * dt
        Tsq += Ta**2 * dt; Tpk = max(Tpk, abs(Ta)); Epos += max(Ta, 0) * Om * dt; Eneg += max(-Ta, 0) * Om * dt; t += dt
    rel = r0 + Om * t - STEP
    while t < tb:
        Ta = k * rel; Tsq += Ta**2 * dt; Tpk = max(Tpk, abs(Ta)); Epos += max(Ta, 0) * Om * dt; Eneg += max(-Ta, 0) * Om * dt
        rel += Om * dt; t += dt
    Trms = math.sqrt(Tsq / tb)
    Tm_pk = Tpk / (ratio * eta); Tm_rms = Trms / (ratio * eta)
    n_m = Om * ratio * 60 / (2 * pi)
    P_mech = (Epos / eta + DRAG[1] * STEP / eta) / tb
    P_cu = (Tm_rms / DCX["kt"])**2 * DCX["R"]
    P_regen = (Epos / eta - Eneg * eta + DRAG[1] * STEP / eta) / tb
    return dict(Tpk=Tpk, Trms=Trms, Tm_pk=Tm_pk, Tm_rms=Tm_rms, n_m=n_m, P=P_mech + P_cu, P_mech=P_mech, P_cu=P_cu, P_regen=P_regen + P_cu)
pr("S", "DCX 22 S 24 V nominal (max continuous) torque", DCX["Mnom"] * 1e3, "mN m")
pr("S", "DCX 22 S 24 V stall torque", DCX["Mstall"] * 1e3, "mN m"); pr("S", "DCX 22 S nominal speed", DCX["nnom"], "rpm")
pr("S", "GPX 22 HP 3-stage max continuous output torque", GPX3["Mcont"], "N m"); pr("S", "  max efficiency", GPX3["eta"] * 100, "%")
pr("S", "  max continuous input speed", GPX3["nin"], "rpm"); pr("S", "  average backlash, no load", GPX3["backlash"], "deg")
for il, I in INERTIAS:
    for f, fn in ((f_lo, "8.00 Hz"), (f_hi, "11.46 Hz")):
        for ratio in (103, 150, 186):
            m = motor_case(il, f, ratio)
            ok = "OK" if (m["Tm_rms"] <= DCX["Mnom"] and m["n_m"] <= GPX3["nin"] and m["Tm_pk"] < DCX["Mstall"]) else "over"
            print(f"[C] {il}, {fn}, GPX 22 HP {ratio}:1: arm peak {m['Tpk']:.2f} N m, rms {m['Trms']:.2f} N m; motor peak "
                  f"{m['Tm_pk']*1e3:.1f} mN m, rms {m['Tm_rms']*1e3:.1f} mN m vs 15.3 nominal, speed {m['n_m']:.0f} rpm; "
                  f"power {m['P']:.2f} W (mech {m['P_mech']:.2f} + copper {m['P_cu']:.2f}); with 4-quadrant regen [T] {m['P_regen']:.2f} W -> {ok}")
print("-- power-cut reserve")
steps_full = 2 * Q / pi * math.log(AMP / (3.5 * deg))
pr("C", "beats from 18 deg down to the 3.5 deg unlock threshold, free decay (2Q/pi ln(A0/3.5))", steps_full, "beats")
for f, fn in ((f_lo, "8.00 Hz"), (f_hi, "11.46 Hz")):
    tau = Q / (pi * f); t_unl = tau * math.log(AMP / (3.5 * deg))
    A15 = AMP * math.exp(-15 / tau)
    print(f"[C] {fn}: time to unlock threshold {t_unl:.1f} s; amplitude after 15 s {A15/deg:.2f} deg; steps in 15 s "
          f"{2*f*min(15, t_unl):.0f}")
for il, I in INERTIAS:
    r = res[(il, T_S)]
    E_net = r["Esw"] * (1 / GPX3["eta"] - GPX3["eta"]) + DRAG[1] * STEP / GPX3["eta"]
    print(f"[C] {il}: cocked spring alone = 1 step. With a step-1 option-B barrel (0.80 J total) feeding the arm through "
          f"reversible gearing: {E_net*1e3:.1f} mJ/step net -> {0.8011/E_net:.0f} steps; full decay needs "
          f"{steps_full*E_net:.1f} J")
    m = motor_case(il, f_lo, 150)
    E_hold = m["P"] * 15
    C = 2 * E_hold / (24**2 - 12**2)
    print(f"[C] {il}: electrical hold-up for 15 s of cocking at 8.00 Hz: {E_hold:.0f} J -> {C:.2f} F at 24 V discharging to 12 V")
pr("C", "150 W COB for 15 s (light also needs hold-up for a visible decay)", 150 * 15, "J")

# ================================================================== 6 dark time
hdr("6 dark time and duty cycle")
LATCH = {"electric VCA, predictive fire [T jitter +/-0.1 ms]": 0.1e-3,
         "mechanical cascade [T jitter +/-0.5 ms]": 0.5e-3,
         "solenoid, predictive fire [T jitter +/-2 ms]": 2e-3}
for ts in (BLANK_SPEC, BLANK_MEAS):
    d = [ts * 2 * f for f in (f_lo, f_hi)]
    print(f"[C] spec/measured blanking {ts*1e3:.2f} ms (reference, no indexer): {d[0]*100:.1f}% at 8.00 Hz, {d[1]*100:.1f}% at 11.46 Hz")
for ts in STEPS_T:
    for ln, j in LATCH.items():
        row = []
        for f, fn in ((f_lo, "8.00 Hz"), (f_hi, "11.46 Hz")):
            tst = res[(INERTIAS[0][0], ts, fn)]["t_step"]
            blank = tst + T_SET + 2 * j; d = blank * 2 * f
            row.append(f"{fn}: step {tst*1e3:.1f} + settle + jitter = dark {blank*1e3:.1f} ms = {d*100:.1f}%, light {100-d*100:.0f}%")
        print(f"[C] design t_s {ts*1e3:.0f} ms, {ln}: " + "; ".join(row))
pr("C", "beat (chop) rate range", 2 * f_lo, "Hz"); pr("C", "  upper", 2 * f_hi, "Hz")
pr("S", "cone flicker fusion plateau (chop rate is below it, so blanking reads as flicker, not dimming)", CFF_CONE, "Hz")
for il, I in INERTIAS:
    print(f"[C] {il}: " + "; ".join(f"{ts*1e3:.0f} ms -> spring {res[(il,ts)]['k']:.1f} N m/rad, latch load {res[(il,ts)]['Thold']/R_LOCK:.0f} N"
                                    for ts in STEPS_T))

# ================================================================== 7 remontoire torque (item 12)
hdr("7 escapement remontoire torque (item 12)")
HEAD = 2.0                                           # [T] headroom for amplitude response (DMX ch 11)
tw = {}
for lab, L in CASES:
    b = bud[lab]
    t_esc = b["dEb"] / (STEP * ETA_ESC); t_rel = b["Er10"] / STEP
    tw[lab] = (t_esc + t_rel) * HEAD
    print(f"[C] {lab}: escapement {t_esc:.2e} + mechanical trip (10%) {t_rel:.2e} N m; x{HEAD:.0f} headroom -> {tw[lab]:.2e} N m nominal max")
M_nom = max(tw.values()); M_cl = M_nom * TAU_CLUTCH / TAU_NOM
pr("C", "nominal max escape-arbor torque", M_nom, "N m"); pr("C", "clutch torque (Gemini 1.5x ratio)", M_cl, "N m")
pr("C", "Gemini 0.12 N m vs need", TAU_NOM / M_nom, "x too high")
bt2 = 6 * M_cl / SIG_STATIC
pr("C", "required b t^2 at clutch torque, 1000 MPa", bt2 * 1e9, "mm3")
th_tot = 2 * 2 * pi + 45 * deg
k_rb = M_nom / th_tot
for t in (0.05e-3, 0.08e-3, 0.10e-3):
    b = math.ceil(bt2 / t**2 * 1e4) / 1e4; L = E_NIVA * b * t**3 / (12 * k_rb)
    print(f"[C] Nivaflex pre-wound (2 turns + 45 deg band): t {t*1e3:.2f} b {b*1e3:.1f} L {L*1e3:.0f} mm, k {k_rb:.2e} N m/rad, "
          f"ripple +/-2 deg {2*deg/th_tot*100:.2f}%, ripple per 12 deg beat {STEP/th_tot*100:.2f}%")
Mg = SIG_STATIC * 1.2e-3 * (0.08e-3)**2 / 6
pr("C", "Gemini 0.08 x 1.2 ribbon, max torque at 1000 MPa", Mg, "N m")
pr("C", "  share of needed clutch torque", Mg / M_cl)
U_tot = 0.5 * k_rb * (M_cl / k_rb)**2
for lab, L in CASES:
    P = tw[lab] / HEAD * STEP * 2 * bud[lab]["f"]
    print(f"[C] {lab}: escapement + trip power {P*1e3:.2f} mW; pre-wound spring total store {U_tot*1e3:.1f} mJ at clutch wind; "
          f"band 45 deg holds {0.5*k_rb*(th_tot**2-(th_tot-45*deg)**2)*1e3:.2f} mJ -> {0.5*k_rb*(th_tot**2-(th_tot-45*deg)**2)/P:.1f} s "
          f"of running inside the band, {U_tot/P:.0f} s on the whole store at falling torque (carousel parked, nothing winding)")
