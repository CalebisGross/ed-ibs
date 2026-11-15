"""ED-IBS flicker reduction study (item 7 follow-up: beat-rate blanking flicker).
Analysis only. Tags: [T] target / chosen value / stated assumption, [C] calculated prediction
(closed-form or small numerical model, no test), [S] cited source. Nothing here is validated.
No constant is tuned to make a target pass. The one calibration step (Pst LM gain) is set against the
IEC TR 61547-1 reference waveforms, the standard's own validation set, not against any ED-IBS target.
Reuses item7-blend-sizing.py (run silently, which itself runs working-revision-step1.py), so carrier,
spring, frequency, latch and motor numbers match the item 7 sizing exactly.
Needs numpy + scipy: run with analysis-venv/bin/python flicker-study.py > flicker-study-results.txt
"""
import io, math, runpy, contextlib, os
import numpy as np
from scipy import signal

pi = math.pi; deg = pi / 180
here = os.path.dirname(os.path.abspath(__file__))
with contextlib.redirect_stdout(io.StringIO()):
    S2 = runpy.run_path(os.path.join(here, "item7-blend-sizing.py"))

def hdr(s): print("\n## " + s)
def pr(tag, name, val, unit="", fmt="{:.4g}"):
    print(f"[{tag}] {name} = {fmt.format(val)} {unit}".rstrip())

# ------------------------------------------------------------------ reused item-7 / step-1 values
f_lo, f_hi = S2["f_lo"], S2["f_hi"]
FREQS = ((f_lo, "8.00 Hz"), (f_hi, "11.46 Hz"))
AMP = S2["AMP"]; STEP = S2["STEP"]; I_lite = S2["I_lite"]; I_idx = S2["I_idx"]
T_SET = S2["T_SET"]; R_LOCK = S2["R_LOCK"]; DRAG = S2["DRAG"]; PLL_ERR = S2["PLL_ERR"]
VCA = S2["VCA"]; MU_ROLL = S2["MU_ROLL"]; MU_SLIDE = S2["MU_SLIDE"]; SF = S2["SF"]; G = S2["G"]
m_pawl = S2["m_pawl"]; s_pawl = S2["s_pawl"]; F_retsp = S2["F_retsp"]
DCX = S2["DCX"]; GPX3 = S2["GPX3"]; E_STEEL = S2["E_STEEL"]; SIG_REV = S2["SIG_REV"]; TH_C = S2["TH_C"]
design_k = S2["design_k"]; swing = S2["swing"]; find_r0 = S2["find_r0"]
res7 = S2["res"]; LITE = S2["INERTIAS"][1][0]
J_VCA = 0.1e-3                      # [T item 7] electric latch jitter +/-0.1 ms
PHI0 = 15 * deg                     # [S spec] facet bias
D = 50.0                            # [S spec] max throw 50 m
TS0 = 15e-3                         # [T Caleb 11:44 CT] 15 ms step, light carrier

# ------------------------------------------------------------------ flicker metrics
FS = 2000.0                         # [T] sample rate for Pst LM (flickermeter band ends ~35 Hz)
def _pinst_raw(E, fs=FS):
    """IEC TR 61547-1 light flickermeter blocks A-C [S, form per Mantela et al. 2023, LRT, eqs 1-3].
    HP tau 3.18 s; 6th-order Butterworth LP 35 Hz; eye weighting filter; squaring; 1st-order LP tau 0.3 s.
    Weighting-filter denominator read as 11781 (the extracted text showed 1781, which gives unstable poles;
    11781 reproduces the IEC 61000-4-15 poles exactly)."""
    E = np.asarray(E, float); E = E / E.mean()
    b, a = signal.bilinear([3.18, 0], [3.18, 1], fs); y = signal.lfilter(b, a, E - 1.0)
    z, p, k = signal.butter(6, 2 * pi * 35, analog=True, output="zpk")
    y = signal.sosfilt(signal.zpk2sos(*signal.bilinear_zpk(z, p, k, fs)), y)
    b, a = signal.bilinear([0.041661, 44.758, 2715.6, 29839, 0], [1, 196.32, 11781, 534820, 3505380], fs)
    y = signal.lfilter(b, a, y); y = y * y
    b, a = signal.bilinear([1], [0.3, 1], fs); return signal.lfilter(b, a, y)
def _s0(fs=FS):
    t = np.arange(0, 60, 1 / fs); E = 1 + 0.006832 / 2 * np.sin(2 * pi * 8.8 * t)
    return 1.0 / _pinst_raw(E, fs)[int(30 * fs):].max()
S0_SINE = _s0()
def _pst_from(y):
    P = lambda q: np.percentile(y, 100 - q)
    P1s = (P(0.7) + P(1) + P(1.5)) / 3; P3s = (P(2.2) + P(3) + P(4)) / 3
    P10s = (P(6) + P(8) + P(10) + P(13) + P(17)) / 5; P50s = (P(30) + P(50) + P(80)) / 3
    return math.sqrt(max(0.0, 0.0314 * P(0.1) + 0.0525 * P1s + 0.0657 * P3s + 0.28 * P10s + 0.08 * P50s))
REF_TABLE1 = ((0.3250, 0.025386), (0.9167, 0.020473), (8.8, 0.006832), (13.5, 0.007780), (33.3, 0.020027))
def _ref_check(gain):
    out = []
    t = np.arange(0, 120, 1 / FS)
    for fm, dE in REF_TABLE1:
        E = 1 + dE / 2 * np.sign(np.sin(2 * pi * fm * t))
        out.append(_pst_from((_pinst_raw(E) * gain)[int(20 * FS):]))
    return out
ref_sine_gain = _ref_check(S0_SINE)
GAIN = S0_SINE / np.mean(ref_sine_gain) ** 2      # Pst ~ sqrt(Pinst): scale Pinst so the reference set reads 1.00
ref_final = _ref_check(GAIN)
def pst_lm(E):
    return _pst_from((_pinst_raw(E) * GAIN)[int(20 * FS):])

def svm(period_wave, f0):
    """CIE TN 006:2016 stroboscopic visibility measure [S] from one exact period (so harmonics are exact).
    T(f) = 1 / (1 + exp(-a (f - b)) + 20 exp(-f / c)), a 0.00518 s, b 306.6 Hz, c 10 Hz, Minkowski n 3.7, f <= 2000 Hz."""
    x = np.asarray(period_wave, float); x = x / x.mean(); N = len(x)
    C = 2 * np.abs(np.fft.rfft(x)) / N
    tot = 0.0
    for m in range(1, len(C)):
        fm = m * f0
        if fm > 2000: break
        T = 1 / (1 + math.exp(-0.00518 * (fm - 306.6)) + 20 * math.exp(-fm / 10))
        tot += (C[m] / T) ** 3.7
    return tot ** (1 / 3.7)

def ieee1789(mod_pct, f):
    """IEEE 1789-2015 [S]: low risk Mod% < 0.025 f (f < 90 Hz), 0.08 f (90-1250 Hz), none above;
    no observable effect (NOEL) Mod% < 0.01 f (< 90 Hz), 0.0333 f (90-3000 Hz), none above."""
    if f < 90: lr, no = 0.025 * f, 0.01 * f
    elif f <= 1250: lr, no = 0.08 * f, 0.0333 * f
    elif f <= 3000: lr, no = float("inf"), 0.0333 * f
    else: lr, no = float("inf"), float("inf")
    return lr, no

# ------------------------------------------------------------------ light waveform builder
def period_wave(Tb, dark_windows, ramp=0.5e-3, floor=0.0, n=4000):
    """One beat period (chop period) of normalized light. dark_windows: list of (start, end) in s within [0, Tb).
    Edges are raised-cosine ramps of length `ramp` placed OUTSIDE the dark window (fade overlaps the low-smear
    part of the step, option 1). floor = dip level (0 = full blank)."""
    t = (np.arange(n) + 0.5) / n * Tb
    L = np.ones(n)
    for (a, b) in dark_windows:
        for i, ti in enumerate(t):
            # distance into dark (negative outside); shortest wrap distance
            if a <= ti <= b: lvl = floor
            elif a - ramp < ti < a: x = (a - ti) / ramp; lvl = floor + (1 - floor) * 0.5 * (1 - math.cos(pi * x))
            elif b < ti < b + ramp: x = (ti - b) / ramp; lvl = floor + (1 - floor) * 0.5 * (1 - math.cos(pi * x))
            else: continue
            L[i] = min(L[i], lvl)
    return t, L
def long_wave(Tb, Lper, dur=120.0, fs=FS):
    t = np.arange(0, dur, 1 / fs)
    idx = ((t % Tb) / Tb * len(Lper)).astype(int) % len(Lper)
    return Lper[idx]

def camera(Tb, t, L, exposures=(1/48, 1/60, 1/250, 1/1000), readout=16e-3):
    """Rolling shutter: each row integrates `exposure`; rows start spread across `readout` [T].
    Band contrast = Michelson contrast of the moving average over one chop period (worst rows).
    Bands per frame = readout / chop period."""
    n = len(L); dt = Tb / n; out = []
    Lc = np.tile(L, 40)
    for E in exposures:
        w = max(1, int(round(E / dt)))
        if w > len(Lc) - n: w = len(Lc) - n
        cs = np.concatenate([[0], np.cumsum(Lc)])
        avg = (cs[w:w + n] - cs[:n]) / w
        c = (avg.max() - avg.min()) / (avg.max() + avg.min())
        out.append((E, c))
    return out, readout / Tb

def metrics(name, Tb, dark_windows, floor=0.0, ramp=0.5e-3, f_beat=None, verbose=True):
    t, Lp = period_wave(Tb, dark_windows, ramp=ramp, floor=floor)
    mean = Lp.mean(); mod = (Lp.max() - Lp.min()) / (Lp.max() + Lp.min()) * 100
    fchop = 1 / Tb
    p = pst_lm(long_wave(Tb, Lp)); s = svm(Lp, fchop); lr, no = ieee1789(mod, fchop)
    cams, bpf = camera(Tb, t, Lp)
    dark_full = sum(b - a for a, b in dark_windows) / Tb
    if verbose:
        cs = ", ".join(f"1/{1/E:.0f} s: {c*100:.0f}%" for E, c in cams)
        print(f"[C] {name}: full-dark {dark_full*100:.1f}% of beat, mean light {mean*100:.1f}%, Mod {mod:.1f}% at {fchop:.2f} Hz "
              f"(IEEE 1789 low-risk limit {lr:.2f}%, NOEL {no:.2f}%), Pst LM {p:.2f}, SVM {s:.2f}; "
              f"rolling-shutter band contrast {cs}; {bpf:.2f} bands per 16 ms readout")
    return dict(dark=dark_full, mean=mean, mod=mod, pst=p, svm=s, cams=cams, bpf=bpf, lr=lr)

# ================================================================== 0 metric implementation checks
hdr("0 metric implementation checks (not validation of ED-IBS, only of my metric code)")
print("[S] IEC TR 61547-1 Table 1 reference waveforms (rectangular, peak-to-peak dE) should read Pst LM = 1.000")
print("[C] with gain set from the 8.8 Hz sine (max Pinst = 1): " + ", ".join(f"{fm} Hz {v:.3f}" for (fm, _), v in zip(REF_TABLE1, ref_sine_gain)))
print("[C]   the five agree with each other to <0.5%, so the filter shape is right; the absolute scale is 8% low. "
      "I rescale Pinst by a single factor so the standard's own reference set reads 1.00:")
print("[C] after rescale: " + ", ".join(f"{fm} Hz {v:.3f}" for (fm, _), v in zip(REF_TABLE1, ref_final)))
n = 2000
for nm, f0, wave, ref in (("Sin-2 100 Hz, m 0.25628", 100, 1 + 0.25628 * np.sin(2 * pi * np.arange(n) / n), 1.0),
                          ("Sqr-1 99 Hz, m 0.20049", 99, 1 + 0.20049 * np.sign(np.sin(2 * pi * (np.arange(n) + 0.5) / n)), 1.0)):
    print(f"[C] SVM check {nm}: {svm(wave, f0):.3f} (reference {ref:.3f} [S IEC TR 63158 test set via Mantela 2023 Table 3])")

# ================================================================== 1 baseline (Caleb's settled item 7)
hdr("1 baseline: settled item 7 (15 ms step, light carrier, electric latch, hard blanking)")
base = {}
for f, fn in FREQS:
    r = res7[(LITE, TS0, fn)]; Tb = 1 / (2 * f)
    dark = r["t_step"] + T_SET + 2 * J_VCA
    base[fn] = dict(Tb=Tb, dark=dark, r=r)
    pr("C", f"{fn}: beat {Tb*1e3:.1f} ms, step {r['t_step']*1e3:.2f} ms + settle {T_SET*1e3:.0f} + 2 x jitter {J_VCA*1e3:.1f} = dark", dark * 1e3, "ms")
    metrics(f"baseline hard blank, {fn}", Tb, [(0.0, dark)], ramp=1e-6)
pr("S", "photosensitive seizure band (flash frequencies 15-25 Hz most provocative; 1-65 Hz possible), Fisher et al. 2005 Epilepsia 46(9)", 15, "-25 Hz")

# ================================================================== 2 projection geometry and smear tolerance
hdr("2 projection geometry, spot size and how much smear is tolerable at 50 m")
pr("S", "spec radial angle phi = Phi0 + 2 theta, Phi0", 15, "deg")
pr("C", "phi range at +/-18 deg", (PHI0 - 2 * AMP) / deg, "deg"); pr("C", "  to", (PHI0 + 2 * AMP) / deg, "deg")
pr("C", "spoke radius at rest (theta 0) at 50 m", D * math.tan(PHI0), "m")
pr("C", "spoke outer end at 50 m (phi 51 deg)", D * math.tan(PHI0 + 2 * AMP), "m")
pr("C", "spoke inner end at 50 m (phi -21 deg, opposite side of centre)", D * math.tan(PHI0 - 2 * AMP), "m")
pr("C", "spoke-to-spoke arc at the rest radius (24 deg optical)", D * math.tan(PHI0) * 24 * deg, "m")
for f, fn in FREQS:
    thd = 2 * pi * f * math.sqrt(AMP**2 - (PHI0 / 2)**2)
    pr("C", f"{fn}: radial beam speed where it crosses the pattern centre at 50 m", D * 2 * thd, "m/s")
LES = 22e-3                          # [S Citizen CLU048-1818C4 datasheet: LES 22 mm]
for NA in (0.1, 0.2, 0.5):
    th_out = LES * 2 * NA / 0.075    # etendue: d_out * theta_out ~ LES * 2 NA (small-angle, full angles)
    print(f"[C] etendue check: 22 mm LES [S], captured NA {NA} [T] (~{NA**2*100:.0f}% of a Lambertian source), 75 mm exit [S BP]: "
          f"full divergence ~{th_out/deg:.1f} deg -> spot ~{2*D*math.tan(th_out/2):.1f} m at 50 m; inside the 25 mm prism ~{LES*2*NA/0.025/deg:.0f} deg")
print("[T] item 15 (optics) is not designed, so spot size is a parameter here: full divergence 1, 3 and 7 deg")
SPOTS = [(dv, 2 * D * math.tan(dv * deg / 2) + 0.075) for dv in (1.0, 3.0, 7.0)]
for dv, w in SPOTS: pr("C", f"spot diameter at 50 m, {dv:.0f} deg full divergence", w, "m")
TOLS = (0.25, 0.5)                   # [T] smear allowed as a fraction of spot diameter before it reads as a streak

def record_swing(I, k, Om, r0, drag, dt=1e-5):
    """Same equations and stop rule as item7 swing(), but records the carrier angle c(t) until it reaches 12 deg
    (or stops within a hair of it: the design case 'just arrives' by construction, and the pawl drops there)."""
    th, v, t = 0.0, 0.0, 0.0; T = [0.0]; C = [0.0]
    def a(th, v, t): return (k * (r0 + Om * t - th) - (drag if v > 0 else 0.0)) / I
    while th < STEP and t < 0.05:
        k1v = a(th, v, t); k1x = v
        k2v = a(th+0.5*dt*k1x, v+0.5*dt*k1v, t+0.5*dt); k2x = v+0.5*dt*k1v
        k3v = a(th+0.5*dt*k2x, v+0.5*dt*k2v, t+0.5*dt); k3x = v+0.5*dt*k2v
        k4v = a(th+dt*k3x, v+dt*k3v, t+dt); k4x = v+dt*k3v
        th += dt/6*(k1x+2*k2x+2*k3x+k4x); v2 = v + dt/6*(k1v+2*k2v+2*k3v+k4v); t += dt
        T.append(t); C.append(min(th, STEP))
        if t > 0.002 and v2 <= 0: C[-1] = STEP; break
        v = v2
    return np.array(T), np.array(C)

def beam(t_rel_zero, f, sign, amp=None):
    """balance angle and wall radius; t_rel_zero = time from balance zero crossing; sign = swing direction."""
    th = sign * (AMP if amp is None else amp) * np.sin(2 * pi * f * t_rel_zero)
    ph = PHI0 + 2 * th
    return th, D * np.tan(ph)

def smear_profile(ts, f, fn, centre_offset, amp=None):
    """Distance of the beam from the nearest spoke line (n or n+1) during the step, for both swing directions.
    centre_offset: time of step middle relative to balance zero crossing."""
    r = res7[(LITE, ts, fn)] if (LITE, ts, fn) in res7 else EXTRA[(ts, fn)]
    T, C = record_swing(r["I"], r["k"], r["Om"], r["r0"], DRAG[1])
    tmid = T[-1] / 2
    out = []
    for sg in (+1, -1):
        trel = T - tmid + sg * centre_offset if centre_offset else T - tmid
        _, R = beam(trel, f, sg, amp)
        az = 2 * C                                   # optical azimuth from spoke n
        d = np.minimum(np.abs(R * np.sin(az)), np.abs(R * np.sin(az - 2 * STEP)))
        out.append((T, C, R, d))
    return out

def lit_split(T, d, tol):
    """Contiguous blank from first to last sample where smear > tol. Returns (blank_start, blank_end) or None."""
    idx = np.where(d > tol)[0]
    if len(idx) == 0: return None
    return T[idx[0]], T[idx[-1]]

def exceed_windows(T, d, tol, pad=J_VCA, merge=0.5e-3):
    """Non-contiguous version: every stretch where smear > tol, padded by the latch jitter, merged if gaps < merge [T]."""
    m = d > tol; wins = []; i = 0; n = len(T)
    while i < n:
        if m[i]:
            j = i
            while j + 1 < n and m[j + 1]: j += 1
            a, b = T[i] - pad, T[j] + pad
            if wins and a - wins[-1][1] < merge: wins[-1] = (wins[-1][0], b)
            else: wins.append((a, b))
            i = j + 1
        else: i += 1
    return wins

EXTRA = {}
# settle: catch residual on elastomer-backed stop (item 7): x = sqrt(2E/k_stop), angle = x / R_LOCK
K_STOP = 2e5                          # [T item 7] elastomer-backed stop stiffness
print("-- step timing A: step centred on the balance zero crossing (item 7 default, kills reaction-torque asymmetry)")
part = {}
for f, fn in FREQS:
    r = res7[(LITE, TS0, fn)]; Tb = 1 / (2 * f)
    E = max(r["Eres"], r["Epll"]); x = math.sqrt(2 * E / K_STOP); a_set = x / R_LOCK
    prof = smear_profile(TS0, f, fn, 0.0)
    for (T, C, R, d), sg in zip(prof, ("+", "-")):
        print(f"[C] {fn}, swing {sg}: wall radius during step {R[0]:+.1f} m -> {R[-1]:+.1f} m, peak smear off-spoke {d.max():.2f} m")
    R_end = max(abs(prof[0][2][-1]), abs(prof[1][2][-1]))
    d_set = R_end * 2 * a_set
    print(f"[C] {fn}: catch residual {E*1e3:.2f} mJ -> stop travel {x*1e3:.2f} mm -> carrier {a_set/deg:.2f} deg mech -> "
          f"{d_set:.2f} m off-spoke at |R| {R_end:.1f} m during settle")
    for dv, w in SPOTS:
        for tf in TOLS:
            tol = tf * w; blanks = []
            for (T, C, R, d) in prof:
                bl = lit_split(T, d, tol)
                blanks.append(bl)
            # worst of the two directions
            lens = [(b[1] - b[0]) if b else 0.0 for b in blanks]
            worst = max(lens)
            settle_dark = 0.0 if d_set <= tol else T_SET
            dark = (worst + 2 * J_VCA + settle_dark) if worst > 0 else (settle_dark + (2 * J_VCA if settle_dark else 0.0))
            part[(fn, dv, tf)] = dict(dark=dark, Tb=Tb, settle_lit=settle_dark == 0.0, blanks=blanks)
            print(f"[C] {fn}, spot {w:.2f} m ({dv:.0f} deg), tolerance {tf:.2f} x spot = {tol:.2f} m: blank {worst*1e3:.1f} ms of the "
                  f"{TS0*1e3:.0f} ms step, settle {'lit' if settle_dark == 0 else 'dark'} -> dark {dark*1e3:.1f} ms = {dark/Tb*100:.1f}% "
                  f"(baseline {base[fn]['dark']/Tb*100:.1f}%)")

print("-- step timing B: step centred on the moment the beam crosses the pattern centre (theta = -Phi0/2 = -7.5 deg)")
print("[C] why it works: the Dove prism turns the image about the optical axis, which is the pattern centre. A beam that is AT the centre "
      "does not move when the image turns, so a step taken while the beam passes through the centre barely smears")
pr("C", "needs amplitude above", PHI0 / 2 / deg, "deg")
partB = {}
def timingB(f, fn, amp, ts=TS0, verbose=True):
    w0 = 2 * pi * f; Tb = 1 / (2 * f)
    if amp <= PHI0 / 2: return None
    toff = math.asin((PHI0 / 2) / amp) / w0
    gaps = (Tb - 2 * toff, Tb + 2 * toff)
    r = res7[(LITE, ts, fn)] if (LITE, ts, fn) in res7 else EXTRA[(ts, fn)]
    E = max(r["Eres"], r["Epll"]); a_set = math.sqrt(2 * E / K_STOP) / R_LOCK
    prof = smear_profile(ts, f, fn, -toff, amp)
    R_end = max(abs(prof[0][2][-1]), abs(prof[1][2][-1])); d_set = R_end * 2 * a_set
    pk = max(p_[3].max() for p_ in prof)
    out = dict(toff=toff, gaps=gaps, ok=gaps[0] > r["t_step"] + T_SET + 2 * J_VCA, pk=pk, R=(prof[0][2][0], prof[0][2][-1]),
               d_set=d_set, Tb=Tb, darks={})
    for dv, w in SPOTS:
        for tf in TOLS:
            tol = tf * w; lens = []
            for (T, C, R, d) in prof:
                bl = lit_split(T, d, tol); lens.append((bl[1] - bl[0]) if bl else 0.0)
            worst = max(lens); settle = 0.0 if d_set <= tol else T_SET
            dark = (worst + 2 * J_VCA + settle) if worst > 0 else (settle + 2 * J_VCA if settle else 0.0)
            out["darks"][(dv, tf)] = dark
            # split windows (worst direction by total length), shifted so the step starts at 0
            best = None
            for (T, C, R, d) in prof:
                wl = exceed_windows(T, d, tol)
                if settle: wl = wl + [(T[-1], T[-1] + settle + J_VCA)]
                tot = sum(b - a for a, b in wl)
                if best is None or tot > best[0]: best = (tot, wl)
            out.setdefault("split", {})[(dv, tf)] = best
    return out
for f, fn in FREQS:
    o = timingB(f, fn, AMP)
    print(f"[C] {fn}: beam on axis {o['toff']*1e3:.2f} ms from the zero crossing; step spacing alternates {o['gaps'][0]*1e3:.1f} / {o['gaps'][1]*1e3:.1f} ms "
          f"(needs > step + settle + jitter: {'OK' if o['ok'] else 'FAILS'}); wall radius during step {o['R'][0]:+.1f} -> {o['R'][1]:+.1f} m; "
          f"peak smear off-spoke {o['pk']:.2f} m; settle wobble {o['d_set']:.2f} m off-spoke")
    for (dv, tf), dark in o["darks"].items():
        partB[(fn, dv, tf)] = dark
        tot, wl = o["split"][(dv, tf)]
        partB[(fn, dv, tf, "split")] = wl
        print(f"[C] {fn}, {dv:.0f} deg spot, tol {tf:.2f} x spot: one blank {dark*1e3:.1f} ms = {dark/o['Tb']*100:.1f}%; split blanks "
              f"{len(wl)} x = {tot*1e3:.1f} ms = {tot/o['Tb']*100:.1f}% (timing A: {part[(fn, dv, tf)]['dark']/o['Tb']*100:.1f}%, baseline {base[fn]['dark']/o['Tb']*100:.1f}%)")
print("-- smallest beam divergence that needs NO blanking (smear and spot both scale with throw, so this holds at any throw, less the 75 mm exit term)")
for f, fn in FREQS:
    pkA = max(p_[3].max() for p_ in smear_profile(TS0, f, fn, 0.0)); oB = timingB(f, fn, AMP)
    for lab, pk in (("timing A", pkA), ("timing B", oB["pk"])):
        for tf in TOLS:
            w_need = pk / tf; dv = 2 * math.degrees(math.atan(max(w_need - 0.075, 0) / (2 * D)))
            print(f"[C] {fn}, {lab}: peak smear {pk:.2f} m at 50 m -> spot >= {w_need:.2f} m for tol {tf:.2f} -> full divergence >= {dv:.1f} deg")
print("-- timing B vs amplitude (DMX amplitude moves A all the time)")
for f, fn in FREQS:
    w0 = 2 * pi * f; need = TS0 + T_SET + 2 * J_VCA
    a_min = (PHI0 / 2) / math.sin((pi - w0 * need) / 2)
    pr("C", f"{fn}: smallest amplitude where the two centre crossings are far enough apart for a {need*1e3:.1f} ms step", a_min / deg, "deg")
    for a_deg in (18, 14, 11, 9.5):
        o = timingB(f, fn, a_deg * deg)
        if o is None: continue
        d3 = o["darks"][(3.0, 0.25)]; d1 = o["darks"][(1.0, 0.25)]
        print(f"[C] {fn}, A {a_deg} deg: spacing {o['gaps'][0]*1e3:.1f} ms ({'OK' if o['ok'] else 'too close, fall back to timing A'}), peak smear {o['pk']:.2f} m, "
              f"dark {d3/o['Tb']*100:.1f}% (3 deg spot) / {d1/o['Tb']*100:.1f}% (1 deg spot)")
# reaction torque with timing B (8.00 Hz, light carrier, light rig): rough
g_half = S2["run_half"].__globals__
g_half["Tpk"] = res7[(LITE, TS0, "8.00 Hz")]["Thold"]; g_half["T_S"] = TS0
toff8 = math.asin((PHI0 / 2) / AMP) / (2 * pi * f_lo)
Th0_, _ = g_half["run_half"](0.0, None)
ThA, AhA = g_half["run_half"](-TS0 / 2, 0.05)
ThB1, AhB1 = g_half["run_half"](+toff8 - TS0 / 2, 0.05)
g_half["Tpk"] = -res7[(LITE, TS0, "8.00 Hz")]["Thold"]
ThB2, AhB2 = g_half["run_half"](-toff8 - TS0 / 2, 0.05)
g_half["Tpk"] = res7[(LITE, TS0, "8.00 Hz")]["Thold"]
sens = D / math.cos(PHI0 + 2 * AMP)**2 * 2 * deg
print(f"[C] reaction torque, 8.00 Hz, light carrier, light rig 0.05 kg m2 [T], rough (half-period model from item 7): "
      f"timing A one-beat shift {(ThA-Th0_)*1e3:+.3f} ms, amplitude change {(AhA-AMP)/deg*1e3:+.1f} mdeg; "
      f"timing B beats {(ThB1-Th0_)*1e3:+.3f} / {(ThB2-Th0_)*1e3:+.3f} ms, amplitude change {(AhB1-AMP)/deg*1e3:+.1f} / {(AhB2-AMP)/deg*1e3:+.1f} mdeg "
      f"(~{max(abs(AhB1-AMP),abs(AhB2-AMP))/deg*sens*1e3:.0f} mm radial at 50 m)")
print("[C] timing B costs: uneven step spacing means the arm cannot run at constant speed (cock would alternate); it needs a speed profile "
      "at the balance frequency. Reflected motor inertia at 186:1 is J x 186^2:")
pr("C", "  reflected rotor inertia at the arm", DCX["J"] * 186**2, "kg m2")
for f, fn in FREQS:
    Om = STEP * 2 * f; Tb = 1 / (2 * f); toff = math.asin((PHI0 / 2) / AMP) / (2 * pi * f)
    dth = Om * 2 * toff                      # extra arm angle needed in the long gap vs the short gap, split half each way
    # sinusoidal speed modulation at the balance frequency delivering +/- dth/2 over a half period
    dw = (dth / 2) * (pi / Tb) / 2; alpha = dw * 2 * pi * f
    Tacc = DCX["J"] * 186**2 * alpha
    print(f"[C]   {fn}: arm must gain/lose {dth/deg/2:.1f} deg per beat vs constant speed -> speed swing ~{dw:.2f} rad/s, "
          f"peak accel {alpha:.0f} rad/s2 -> {Tacc:.2f} N m at the arm from rotor inertia alone ({Tacc/(186*GPX3['eta'])*1e3:.1f} mN m at the motor) [C rough]")

# ================================================================== 3 option metrics
hdr("3 options: modulation, Pst LM, SVM, IEEE 1789, camera")
OPT = {}
for f, fn in FREQS:
    Tb = base[fn]["Tb"]; d0 = base[fn]["dark"]
    print(f"-- {fn}")
    OPT[("baseline", fn)] = metrics(f"O0 baseline hard blank {d0*1e3:.1f} ms", Tb, [(0, d0)], ramp=1e-6)
    OPT[("fade", fn)] = metrics(f"O1a same dark window + 0.5 ms raised-cosine fades outside it", Tb, [(0, d0)], ramp=0.5e-3)
    for dv in (1.0, 3.0, 7.0):
        dk = part[(fn, dv, 0.25)]["dark"]
        OPT[(f"partial{dv:.0f}", fn)] = metrics(f"O1b smear-tolerant blank, spot {dv:.0f} deg, tol 0.25 spot: dark {dk*1e3:.1f} ms", Tb, [(0, dk)] if dk > 0 else [], ramp=0.5e-3)
    dk = part[(fn, 3.0, 0.25)]["dark"]
    for fl in (0.1, 0.3, 0.6, 0.9):
        OPT[(f"dip{fl}", fn)] = metrics(f"O7 dip to {fl*100:.0f}% (not off) over the O1b 3-deg window {dk*1e3:.1f} ms", Tb, [(0, dk)] if dk > 0 else [], floor=fl)
    OPT[("noblank", fn)] = metrics("O4 no blanking (steady LED, streak visible)", Tb, [], ramp=0.5e-3)
    for dv in (1.0, 3.0):
        dk = partB[(fn, dv, 0.25)]
        OPT[(f"B{dv:.0f}", fn)] = metrics(f"O1c timing B (step at pattern centre), spot {dv:.0f} deg, tol 0.25: dark {dk*1e3:.1f} ms", Tb, [(0, dk)] if dk > 0 else [], ramp=0.5e-3)
    wl = partB[(fn, 1.0, 0.25, "split")]
    t0 = min(a for a, b in wl); wl0 = [(a - t0, b - t0) for a, b in wl]
    OPT[("B1split", fn)] = metrics(f"O1c timing B, 1 deg spot, split blanks {', '.join(f'{(b-a)*1e3:.1f}' for a, b in wl0)} ms", Tb, wl0, ramp=0.5e-3)
    dk = partB[(fn, 1.0, 0.25)]
    OPT[("B1dip", fn)] = metrics(f"O1c + O7 timing B, 1 deg spot, dip to 60% over {dk*1e3:.1f} ms", Tb, [(0, dk)], floor=0.6)
    p90 = OPT[("dip0.9", fn)]["pst"]
    print(f"[C] {fn}: with timing A and the 3-deg window, Pst LM scales with (1 - dip level); Pst 1 needs the dip to stay above "
          f"~{(1 - 0.1 / p90)*100:.1f}% of full light, i.e. the step streak would be almost fully visible")

# ================================================================== 4 faster step
hdr("4 faster step on the light carrier: 15 / 10 / 7 / 5 ms (same item-7 design rule)")
g_motor = S2["motor_case"].__globals__; g_half = S2["run_half"].__globals__
for ts in (7e-3, 5e-3):
    k = design_k(I_lite, ts)
    for f, fn in FREQS:
        Om = STEP * 2 * f; r0 = find_r0(I_lite, k, Om, DRAG[1])
        t_hi, _, _, rel_end = swing(I_lite, k, Om, r0, DRAG[1])
        _, _, v_lo, _ = swing(I_lite, k, Om, r0, DRAG[0]); _, _, v_pll, _ = swing(I_lite, k, Om, r0 + PLL_ERR, DRAG[0])
        d = dict(k=k, r0=r0, Thold=k * r0, t_step=t_hi, rel_end=rel_end, Eres=0.5 * I_lite * v_lo**2,
                 Epll=0.5 * I_lite * v_pll**2, v_pll=v_pll, Esw=0.5 * k * r0**2, I=I_lite, Om=Om)
        EXTRA[(ts, fn)] = d; g_motor["res"][(LITE, ts, fn)] = d
fast = {}
Th0, _ = g_half["run_half"](0.0, None)
for ts in (15e-3, 10e-3, 7e-3, 5e-3):
    rows = {}
    for f, fn in FREQS:
        r = res7[(LITE, ts, fn)] if (LITE, ts, fn) in res7 else EXTRA[(ts, fn)]
        rows[fn] = r
    k = rows["8.00 Hz"]["k"]; Thold = max(rows[x]["Thold"] for x in rows); F = Thold / R_LOCK
    Esw = max(rows[x]["Esw"] for x in rows); Epll = max(rows[x]["Epll"] for x in rows)
    E_miss = 0.5 * I_lite * (pi / ts * TH_C) ** 2
    th_max = max(max(abs(rows[x]["r0"]), abs(rows[x]["rel_end"])) for x in rows) + PLL_ERR + 1 * deg
    t_sp = 2.0e-3; L_sp = E_STEEL * t_sp * th_max / (2 * SIG_REV); b_sp = 12 * k * L_sp / (E_STEEL * t_sp**3)
    # latch: rolling main sear at 1.0 A, as item 7
    Fv = VCA["kf"] * 1.0; Ffr = MU_ROLL * F; Fnet = Fv - Ffr - F_retsp
    if Fnet > 0:
        tm = math.sqrt(2 * s_pawl * (VCA["m"] + m_pawl) / Fnet) + 3 * VCA["tau_e"]
        heat = 1.0**2 * VCA["R"] * tm * 2 * f_hi; latch = f"open {tm*1e3:.2f} ms, coil {heat:.2f} W at 11.46 Hz vs 0.40 W rating"
    else:
        latch = "coil cannot trip it at 1.0 A"
    Ffr1 = MU_SLIDE * MU_ROLL * F * SF / G
    g_motor["T_S"] = ts
    mot = [g_motor["motor_case"](LITE, f, 186) for f, _ in FREQS]
    g_half["Tpk"] = rows["8.00 Hz"]["Thold"]; g_half["T_S"] = ts
    Th, Ah = g_half["run_half"](-ts / 2, 0.05)
    be = 2 * abs(Th - Th0)
    darks = [(rows[fn]["t_step"] + T_SET + 2 * J_VCA) / (1 / (2 * f)) for f, fn in FREQS]
    fast[ts] = dict(darks=darks, k=k, Thold=Thold, F=F, mot=mot, be=be)
    print(f"[C] {ts*1e3:.0f} ms: dark {darks[0]*100:.1f}% (8.00 Hz) / {darks[1]*100:.1f}% (11.46 Hz); k {k:.1f} N m/rad; cocked torque {Thold:.2f} N m; "
          f"latch load {F:.0f} N; spring energy {Esw*1e3:.0f} mJ; catch residual {Epll*1e3:.1f} mJ; missed-catch hit {E_miss*1e3:.0f} mJ")
    print(f"[C]   spring (carbon steel, t 2.0 mm, 500 MPa reversed [T]): L {L_sp*1e3:.1f} mm, b {b_sp*1e3:.1f} mm; "
          f"voice coil on rolling sear: sear friction {Ffr:.2f} N, {latch}; via 1 cascade stage friction {Ffr1:.3f} N")
    for (f, fn), m in zip(FREQS, mot):
        ok = []
        if m["Tm_rms"] > DCX["Mnom"]: ok.append("motor rms over nominal")
        if m["Trms"] > GPX3["Mcont"]: ok.append("gearhead rms over 3.3 N m")
        if m["Tpk"] > GPX3["Mcont"]: ok.append("gearhead peak over 3.3 N m continuous")
        print(f"[C]   {fn}, DCX 22 S + GPX 22 HP 186:1: arm peak {m['Tpk']:.2f} / rms {m['Trms']:.2f} N m, motor rms {m['Tm_rms']*1e3:.1f} mN m, "
              f"power {m['P']:.1f} W -> {'OK' if not ok else ', '.join(ok)}")
    print(f"[C]   reaction torque, light rig 0.05 kg m2 [T], step centred: frame accel {rows['8.00 Hz']['Thold']/0.05:.0f} rad/s2, "
          f"beat error {be*1e3:.3f} ms (Gemini target 0.15 ms [S MAN])")
for ts in (10e-3, 7e-3, 5e-3):
    Tb = 1 / (2 * f_hi); dk = fast[ts]["darks"][1] * Tb
    metrics(f"O3 {ts*1e3:.0f} ms step hard blank, 11.46 Hz", Tb, [(0, dk)], ramp=1e-6)

# ================================================================== 5 dual optical path
hdr("5 dual optical path (two prisms, alternate beats)")
print("[T] each path holds its star position for one beat while the other path is lit, then steps two positions (24 deg mech) in the next beat")
for f, fn in FREQS:
    Tb = 1 / (2 * f); t_av = Tb - T_SET - 1e-3 - 2 * J_VCA      # [T] 1 ms switch margin
    kk = I_lite * (pi / t_av) ** 2; Tq = kk * STEP              # stationary-arm half-swing of 24 deg cocks 12 deg
    print(f"[C] {fn}: time for a path to step {t_av*1e3:.1f} ms; spring-swing k ~{kk:.2f} N m/rad, cocked torque ~{Tq:.2f} N m "
          f"(scaling estimate, light carrier; item 7 15 ms: 1.03 N m)")
for nm, od in (("SKF 61813 housing [step 1]", 0.093), ("Kaydon KA025 housing [step 1]", 0.0842)):
    print(f"[C] two parallel carriers, {nm} {od*1e3:.1f} mm OD each: side by side need >= {2*od*1e3:.0f} mm inside the tube vs 102 mm [S MAN]: does not fit")
print("[C] coaxial in series does not work: two Dove prisms in series rotate the image by 2(theta2 - theta1), so any step of either moves the "
      "image; a bypass around prism 2 would have to pass through the 10 mm corner gap and its rotating mount")
thr = {"NPBS split + NPBS recombine (output always from one path)": 0.25,
       "PBS split + PBS recombine with co-rotating half-wave plates, one path blanked (output from one path)": 0.5 * 0.9 * 0.9,
       "polarization conversion + fast FLC switch + PBS router (all light into the lit path)": 0.75 * 0.88 * 0.9}
for k_, v in thr.items():
    print(f"[C/T] {k_}: about {v*100:.0f}% of the light that reaches the prism, continuous (coating losses [T])")
print("[S] Padgett & Lesso 1999, J. Mod. Opt. 46(2): a Dove prism rotates polarization with the image and adds TIR retardance; "
      "a PBS recombine therefore needs a co-rotating half-wave plate per carrier or the output swings with star position")
# path mismatch: alternating beats -> square modulation at f (balance frequency)
for f, fn in FREQS:
    t = np.arange(0, 120, 1 / FS)
    E = 1 + 0.01 / 2 * np.sign(np.sin(2 * pi * f * t))       # 1% p-p
    p1 = pst_lm(E)
    print(f"[C] {fn}: two paths 1% different in brightness flicker at {f:.2f} Hz with Pst LM {p1:.2f}; Pst 1 at about "
          f"{1/p1:.2f}% mismatch (Pst is linear in modulation)")
for dv, w in SPOTS:
    print(f"[C] pattern co-registration of the two paths to 0.25 spot at 50 m ({dv:.0f} deg): {0.25*w/D*1e3:.1f} mrad, held through touring")

# ================================================================== 6 LED drive
hdr("6 LED drive: high-frequency PWM and lit-period current boost")
print("[S] Gemini BOM: Mean Well LRS-200-24 (24 V constant-voltage PSU) and a DRV8833 (motor driver) on the controller; no constant-current "
      "LED driver part is named; the manual refers to an 'LED driver PCB' and its current limit")
print("[S] TI SNVA605 / TIDA-01415 (LM3409 + shunt FET): shunt-FET PWM dimming above 30 kHz with sub-microsecond edges; TPS92641 shunt drive delay 29-100 ns")
print("[S] IEEE 1789: no restriction above 3 kHz (NOEL) / 1.25 kHz (low risk). Flickermeter band ends ~35-80 Hz; SVM threshold defined to 2 kHz")
print("[C] PWM at >= 25 kHz inside lit periods adds nothing the metrics or the eye see, and keeps cameras clean at short shutters. "
      "It does NOT touch the beat-rate chop: the 16-23 Hz envelope is unchanged by definition.")
CLU_IMAX = 4.14; VF = 53.0           # [S Citizen max DC 4.14 A; typ Vf 52 V at 1.62 A]; [T] ~53 V at the 150 W point
I_nom = 150 / VF
pr("C", "COB current at 150 W", I_nom, "A")
pr("C", "max lit-period boost ratio by the DC current rating", CLU_IMAX / I_nom)
for f, fn in FREQS:
    for lab, dk in (("baseline", base[fn]["dark"]), ("O1b 3 deg", part[(fn, 3.0, 0.25)]["dark"])):
        dfr = dk / (1 / (2 * f)); boost = min(1 / (1 - dfr), CLU_IMAX / I_nom)
        lum = boost ** 0.9                  # [T] droop: flux ~ I^0.9 in this range (not from datasheet)
        print(f"[C] {fn}, {lab}: dark {dfr*100:.1f}%; hold mean electrical power at 150 W -> lit current x{boost:.2f}; "
              f"time-average light {(1-dfr)*100:.0f}% -> ~{(1-dfr)*lum*100:.0f}% of continuous [T droop]")
print("[C] boost raises lit brightness but also raises the on/off contrast, so it does not lower Mod%, Pst or camera banding")

# ================================================================== 7 continuous rotation + strobe
hdr("7 continuous prism rotation plus a short strobe (step-1 option 3)")
R0 = D * math.tan(PHI0)
for f, fn in FREQS:
    Tb = 1 / (2 * f)
    for dv, w in SPOTS:
        tol = 0.25 * w; g = math.asin(min(1.0, tol / R0)) / (2 * STEP) * 1.0   # fraction of beat for <= tol arc at rest radius
        g = min(g, 1.0)
        ph_span = 2 * 2 * AMP * math.sin(pi * g / 2) / deg     # radial angle covered while gate centred on zero crossing
        m = metrics(f"O6 {fn}, spot {dv:.0f} deg: gate {g*Tb*1e3:.1f} ms ({g*100:.1f}% of beat)", Tb, [(g * Tb, Tb)], ramp=0.2e-3, verbose=False)
        print(f"[C] O6 {fn}, spot {w:.2f} m: gate {g*Tb*1e3:.1f} ms = {g*100:.1f}% lit, dark {(1-g)*100:.1f}%, spoke drawn over "
              f"{ph_span:.0f} of 72 deg radial; Mod {m['mod']:.0f}%, Pst LM {m['pst']:.1f}, SVM {m['svm']:.2f}, mean light {m['mean']*100:.0f}%")
print("[C] O6 needs no indexer, spring or latch, but crisp spokes need >80% dark and the spokes shrink to short dashes; long gates draw spirals")

# ================================================================== 8 streak visibility (no blank or dip)
hdr("8 how bright is the step streak if it is not blanked")
print("[C] exposure per metre of wall = 1 / beam speed. A spoke is crossed twice per beat by the radial sweep; the streak once.")
for f, fn in FREQS:
    prof = smear_profile(TS0, f, fn, 0.0)
    w0 = 2 * pi * f
    for (T, C, R, d), sg in zip(prof, ("+", "-")):
        trel = T - T[-1] / 2
        th = (1 if sg == "+" else -1) * AMP * np.sin(w0 * trel)
        x = R * np.cos(2 * C); y = R * np.sin(2 * C)
        v = np.hypot(np.gradient(x, T), np.gradient(y, T))
        ph = np.arctan(R / D); thp = (ph - PHI0) / 2
        thd = w0 * np.sqrt(np.maximum(AMP**2 - thp**2, 1e-12))
        vr = D / np.cos(ph)**2 * 2 * thd
        ratio = (1 / v) / (2 / vr)
        mask = (d > 0.25 * SPOTS[1][1])           # only where it is visibly off-spoke (3 deg spot)
        if mask.any():
            print(f"[C] {fn}, swing {sg}: where the streak is off-spoke (>0.25 x 2.69 m), its exposure is {np.median(ratio[mask])*100:.0f}% "
                  f"(median) / {ratio[mask].min()*100:.0f}-{ratio[mask].max()*100:.0f}% of the spoke at the same radius")
print("[S] Stevens brightness power law, exponent ~0.33 for a target in the dark: a streak at 40% luminance looks ~74% as bright; at 4% ~35%")
for lv in (0.4, 0.1, 0.04, 0.01):
    print(f"[C] relative luminance {lv*100:.0f}% -> apparent brightness ~{lv**0.33*100:.0f}%")

# ================================================================== 9 summary table
hdr("9 summary (11.46 Hz worst case, 3 deg spot, tol 0.25 spot)")
fn = "11.46 Hz"
rows = [("O0 baseline 15 ms hard blank", OPT[("baseline", fn)]),
        ("O1a + fades", OPT[("fade", fn)]),
        ("O1b smear-tolerant blank (3 deg spot)", OPT[("partial3", fn)]),
        ("O7 O1b + dip to 30%", OPT[("dip0.3", fn)]),
        ("O7 O1b + dip to 60%", OPT[("dip0.6", fn)]),
        ("O7 O1b + dip to 90%", OPT[("dip0.9", fn)]),
        ("O4 no blank", OPT[("noblank", fn)]),
        ("O1c timing B, 3 deg spot", OPT[("B3", fn)]),
        ("O1c timing B, 1 deg spot", OPT[("B1", fn)]),
        ("O1c timing B, 1 deg spot, split blanks", OPT[("B1split", fn)]),
        ("O1c+O7 timing B, 1 deg spot, dip 60%", OPT[("B1dip", fn)])]
for nm, m in rows:
    print(f"[C] {nm}: full-dark {m['dark']*100:.1f}%, mean {m['mean']*100:.0f}%, Mod {m['mod']:.0f}%, Pst LM {m['pst']:.2f}, SVM {m['svm']:.2f}, "
          f"1/48 s band {m['cams'][0][1]*100:.0f}%, 1/1000 s band {m['cams'][3][1]*100:.0f}%")
