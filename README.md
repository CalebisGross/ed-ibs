# ED-IBS prototype workbench

Local-first simulator and designer studio for the Escapement-Driven Isochronous Beam Splitter. This is a reduced single-degree-of-freedom prototype. It is not a hardware twin, not a validated flexure, and not a manufacturing package.

The original specification is `docs/user-specification.md` (SHA-256 `995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a`). The preimplementation audit is `docs/spec-audit.md`. Current decisions are `docs/decisions-and-deviations.md`. The requirement tracker is `docs/requirements-matrix.md`.

## Upgrade an existing copy

Close the running app. Replace this folder with the new files, keeping the same directory. From that directory:

```bash
npm install
npm run dev
```

Open the address Vite prints. It is on your machine, usually `http://localhost:43117/`. Use the Stage tab for the room view and Engineering for the four panes. Your previous control values stay in the browser under `ed-ibs-prototype-settings-v1` until you choose Restore defaults.

## Run

```bash
npm install
npm test
npm run typecheck
npm run dev
```

The dev server binds to port `43117`. Open the URL printed by Vite. There is no account and no required network call after install.

```bash
npm run build
npm run preview
```

## Stage preview

The Stage tab is a room-scale view of the rays the solver is already drawing. A 1.75 m figure, a floor, a cloth backdrop at the throw distance, and a simple fixture stand are there for scale. Haze, shaft thickness, and brightness are display choices, not a light measurement and not a safety rating. Afterglow is persistence, not extra beams. If the color offsets are zero, the three channels share one path.

## What the four panes do

1. Mechanical view: articulated ring, outer leaves, escape wheel, prism wedge, and pallet pose, plus short beam directions. Camera presets are coaxial bore, isometric cutaway, escapement macro, and stage rig.
2. Cyclorama: wall map at a throw of 5 to 50 m, persistence, and chopper on or off. The dashed path is the geometric transition, not extra light.
3. Phase portrait and timegrapher from the solver samples.
4. Four virtual DMX faders, power cut, tempo reachability, and an illustrative OpenSCAD/DXF download.

Pause, Reset, and the section splitters are live. Settings are stored in `localStorage` under `ed-ibs-prototype-settings-v1`. Restore defaults clears that entry. Space pauses when focus is not in a field. `R` resets.

## Solver

`src/physics/EscapementSolver.ts` uses RK4 at `dt = 0.00025 s`. Units are SI and radians. Rendering only requests whole steps. The original curb law is `K = 0.1104 * (0.018 / L)`. At the reference inertia that is about 8.001 Hz to 11.644 Hz. The 4 to 20 Hz band is a target. Prescribed-frequency mode is labeled as an assumption and does not rewrite the original coefficients.

The escapement torque is the assumption `directional-lift-zone-drive`. It is not the source's zero-velocity conjunction and not a contact model.

## Tests

```bash
npx vitest run
npx tsc --noEmit
```

Covered checks include inertia and frequency endpoints, undamped energy, viscous decay, RK4 convergence, partition invariance, one beat per valid crossing, blanking duration, power-cut policy, tempo reachability, projection counts, and dimensional propagation in the SCAD/DXF text.

With the dev server running and Chrome available:

```bash
node scripts/browser-verify.mjs
```

That script uses `puppeteer-core` and a local Chrome binary. It does not download a browser.

## Not claimed

No experimental validation. No 0.25 mm gravity-shift result. No endurance certificate at 510 MPa. No dead-center pinspot. No exact musical tempo when the required frequency is outside the active band. Frame rate is unmeasured until a browser session reports it.
