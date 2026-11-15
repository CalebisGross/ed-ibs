# SYSTEM SPECIFICATION: ED-IBS Opto-Mechanical Horological Simulator & Designer Studio

## 1. Role & Project Overview
You are a Lead Opto-Mechanical Systems Engineer and Graphics Developer. Build a full-featured, local-first interactive web application (React + TypeScript + Three.js / WebGL + HTML5 Canvas + Tailwind CSS) that serves as a **Digital Twin, Horological Physics Simulator, and Projection Visualizer** for the **Escapement-Driven Isochronous Beam Splitter (ED-IBS)**—an original theatrical lighting engine that replaces stepper-driven mirrors with a scaled-up Swiss lever escapement, coaxial Dove prism, and a monolithic crossed-flexure titanium balance cage.

The application must run at a smooth 60–120 FPS using an explicit Runge-Kutta (RK4) physics solver decoupled from the rendering frame rate, allowing the user to design, tune, stress-test, and play the fixture via virtual DMX512 faders.

---

## 2. Core Physics & Mathematical Engine (RK4 Solver at dt = 0.25 ms)

Implement a deterministic physics engine in `src/physics/EscapementSolver.ts` that models the coupled dynamics of the balance mirror cage, pallet fork, and 15-tooth escape wheel:

### A. Compliant Crossed-Flexure Balance Oscillator
1. **Moment of Inertia ($I$):**
   $$I = \frac{1}{2} m \left(R_{\text{outer}}^2 + R_{\text{inner}}^2\right)$$
   - Default values: $m = 0.042\text{ kg}$, $R_{\text{outer}} = 0.036\text{ m}$, $R_{\text{inner}} = 0.028\text{ m}$ ($I \approx 4.37 \times 10^{-5}\text{ kg}\cdot\text{m}^2$).
2. **Variable Torsional Stiffness ($K_\theta$) via Curb Pin Regulator:**
   The balance cage is suspended by $N = 4$ crossed-flexure leaf springs of Young's modulus $E = 114\text{ GPa}$ (Ti-6Al-4V), width $b$, thickness $t$, and active unclamped length $L_{\text{eff}}$ (controlled by DMX Channel 2 from $18.0\text{ mm}$ down to $8.5\text{ mm}$):
   $$K_\theta(L_{\text{eff}}) = K_{\text{base}} \cdot \left(\frac{L_0}{L_{\text{eff}}}\right)$$
   where $K_{\text{base}} = 0.1104\text{ N}\cdot\text{m/rad}$ at $L_0 = 18.0\text{ mm}$ (giving a base natural frequency $f_0 = \frac{1}{2\pi}\sqrt{K_\theta / I} = 8.0\text{ Hz}$, or $16\text{ beats/sec}$).
3. **Equation of Motion:**
   $$I \ddot{\theta} + \left(c_0 + c_{\text{eddy}}\right) \dot{\theta} + K_\theta(L_{\text{eff}}) \theta = \tau_{\text{escapement}}(\theta, \dot{\theta})$$
   - $c_0$: Baseline structural/air damping (set for high mechanical $Q \approx 350$).
   - $c_{\text{eddy}}$: Lorentz eddy-current damping coefficient controlled by DMX Channel 3 (N52 magnet yoke position over the copper balance rim).
   - $\tau_{\text{escapement}}$: Impulse torque injected only when $|\theta| \le 3.5^\circ$ (the lift zone) and $\dot{\theta}$ crosses zero in the unlocking direction, scaled by DMX Channel 1 (Remontoire Mainspring Barrel Torque).

### B. Discrete Escapement & Dove Prism Indexing
1. **Beat Detection & Step Indexing:**
   - Every time the balance angle $\theta(t)$ crosses $\theta = 0$ with sufficient velocity to overcome the unlocking resistance ($|\theta_{\text{max}}| > 3.5^\circ$), increment the beat counter $n = (n + 1) \pmod{30}$.
   - **Mechanical Escape Wheel Angle:** Advances by $\Delta\theta_{\text{mech}} = 12.0^\circ$ per beat ($Z_e = 15$ club-foot teeth, 2 beats per tooth).
   - **Optical Dove Prism Rotation:** Because a Dove prism rotates an optical image at **twice** its physical angular velocity, the optical field advances by $\Delta\theta_{\text{opt}} = 2 \cdot \Delta\theta_{\text{mech}} = 24.0^\circ$ per beat (completing a 15-spoke star every 15 beats).
2. **Synchronous 4th-Wheel Optical Chopper Blanking:**
   - Calculate the pallet unlock/impulse window: whenever $|\theta(t)| \le 2.1^\circ$ during zero-crossing ($\approx 2.2\text{ ms}$ duration), set `beamBlanked = true` (simulating the 15-vane Acktar-coated chopper wheel blocking the focal waist so the audience never sees the prism transition smearing). Include a UI toggle to disable the chopper so the user can visually compare "Raw Smear" vs. "Horological Synchronous Blanking".

### C. Live Engineering & Fatigue Telemetry
Compute and display in real time:
- **Peak Flexure Bending Stress ($\sigma_{\text{max}}$):**
  $$\sigma_{\text{max}} = \frac{E \cdot t \cdot \theta_{\text{max}}}{2 \cdot L_{\text{eff}}}$$
- Flag a visual warning in the UI if $\sigma_{\text{max}} > 510\text{ MPa}$ (the infinite-life endurance limit of Ti-6Al-4V Grade 5).
- **Q-Factor, Beat Error (ms), Amplitude (deg), and Effective BPM / vph.**

---

## 3. Optical Ray-Tracing & Projection Equations

Render both a **3D Volumetric Haze View** and a **High-Resolution 2D Cyclorama Wall Projection Canvas** (with a decaying phosphor/retinal persistence shader, adjustable from $20\text{ ms}$ to $2000\text{ ms}$):

1. **Dichroic 3-Sub-Beam Split:**
   Each primary beam splits inside the Dove prism into 3 chromatic channels:
   - **Channel A (Cyan - $488\text{ nm}$)**
   - **Channel B (Magenta - $638\text{ nm} + 450\text{ nm}$)**
   - **Channel C (Gold - $577\text{ nm}$)**
2. **Parametric Wall Coordinates $(X_{n,k}(t), Y_{n,k}(t))$:**
   For mirror facet $k \in \{0, 1, 2\}$ ($120^\circ$ apart, tilted at facet angle $\Phi_0 = 15^\circ$) and current escapement beat index $n \in \{0..14\}$ at throw distance $D$:
   $$\theta_{\text{az}}(n, k) = 24^\circ \cdot n + 120^\circ \cdot k + \delta_{\text{chromatic}}$$
   $$\phi_{\text{radial}}(t) = \Phi_0 + 2 \cdot \theta(t)$$
   $$X_{n,k}(t) = D \cdot \tan\left(\phi_{\text{radial}}(t)\right) \cdot \cos\left(\theta_{\text{az}}(n, k)\right)$$
   $$Y_{n,k}(t) = D \cdot \tan\left(\phi_{\text{radial}}(t)\right) \cdot \sin\left(\theta_{\text{az}}(n, k)\right)$$

---

## 4. Application Layout & Interactive Modules (4-Pane Workbench)

Design a dark, industrial-grade UI (inspired by Teenage Engineering, oscilloscope interfaces, and precision CAD workstations, using monospace telemetry readouts):

### Pane 1: Coaxial Mechanical & 3D Volumetric Viewport (Top-Left)
- Interactive Three.js / WebGL view of the coaxial assembly:
  - **15-Tooth Silicon Nitride ($\text{Si}_3\text{N}_4$) Escape Wheel** stepping $12^\circ$ per beat.
  - **Central Trapezoidal Dove Prism** rotating inside the bore.
  - **Titanium Pallet Fork** with synthetic ruby jewels locking and impulsing.
  - **Crossed-Flexure Balance Ring** oscillating harmonically with visible leaf deflection.
  - **Volumetric Aerial Beam Cones** slicing through simulated stage haze, showing the 45-beam geometric cathedral lattice in 3D space.
- Camera presets: `Coaxial Front Bore`, `Isometric Cutaway`, `Escapement Macro (Pallet Jewel Lock/Drop)`, and `Stage Rig Perspective`.

### Pane 2: Cyclorama Projection & Retinal Persistence Canvas (Top-Right)
- High-speed 2D HTML5 Canvas / WebGL shader simulating the beam hitting a dark stage wall at throw distance $D$ ($5\text{ m}$ – $50\text{ m}$).
- Controls for:
  - **Persistence of Vision (POV) Decay Slider:** Switch between real-time human eye integration ($60\text{ ms}$), high-speed camera shutter ($1/1000\text{ s}$ showing zero PWM banding), and long-exposure hypotrochoid rosette trace.
  - **Chopper Wheel Toggle:** Turn the 4th-wheel mechanical blanking ON/OFF to demonstrate how the $2.2\text{ ms}$ blanking interval eliminates transitional beam smear.

### Pane 3: Horological Timegrapher & Phase-Space Oscilloscope (Bottom-Left)
- **Phase-Space Portrait ($\theta$ vs. $\dot{\theta}$):** Live limit-cycle plot showing the harmonic orbit, highlighting the $\pm 3.5^\circ$ pallet impulse kick zone at peak velocity and the logarithmic spiral collapse when the eddy-current brake is engaged or power is cut.
- **Acoustic / Mechanical Timegrapher Strip:** Plots beat ticks, lift angle ($44^\circ$), unlock window ($2.1\text{ ms}$), and instantaneous frequency stability.

### Pane 4: DMX512 Console, CAD Parametric Designer & Export (Bottom-Right)
- **Live 4-Channel DMX512 Fader Bank:**
  - `DMX Ch 1`: **Remontoire Barrel Torque** ($0\% - 100\%$, governs sweep amplitude $\theta_{\text{max}}$ from $0^\circ$ to $\pm 18^\circ$ without altering beat frequency).
  - `DMX Ch 2`: **Curb Pin Linear Actuator** (slides active flexure length $L_{\text{eff}}$ from $18.0\text{ mm}$ to $8.5\text{ mm}$, bending resonant frequency from $4\text{ Hz}$ to $20\text{ Hz}$).
  - `DMX Ch 3`: **Eddy-Current Phase Brake** (translates N52 magnet yoke to apply smooth Lorentz damping $F_d = -\gamma v$).
  - `DMX Ch 4`: **Phosphor-Laser Source Intensity** ($0\% - 100\%$).
  - **Emergency Power-Cut Button ("Fail-Safe Kinetic Decay Test"):** Simulates cutting mains power and DMX mid-show so the user can watch the remontoire spring unwind over 15 seconds as the aerial rosette organically spirals down into a dead-center pinspot.
- **Parametric Mechanical Tweaker & CAD Exporter:**
  - Sliders to modify Escape Wheel Tooth Count ($Z_e \in [12..24]$), Flexure Leaf Thickness ($t \in [0.25..1.60\text{ mm}]$), Material Preset (`Ti-6Al-4V Grade 5`, `17-4 PH Stainless`, `SLA Tough Resin / PETG Prototype`), and Mirror Facet Count ($1 - 6$).
  - **"Export Parametric OpenSCAD (.scad) & DXF"** button that dynamically injects the user's current slider dimensions into downloadable `.scad` and 2D wire-EDM `.dxf` files.

---

## 5. Implementation Deliverables & Engineering Standards
1. Scaffold a clean, modular Vite + React + TypeScript project.
2. Provide full working code with zero placeholders or `// TODO` stubs.
3. Include a built-in **"BPM Tap / Tempo Sync"** calculator that automatically computes the exact Curb Pin actuator position ($L_{\text{eff}}$ in mm) required to lock the mechanical beat rate to any musical tempo ($60 - 240\text{ BPM}$).
