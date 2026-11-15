# ED-IBS

Escapement-driven isochronous beam splitter: simulator, hardware, firmware, docs.

Local-first simulator and designer studio for the Escapement-Driven Isochronous Beam Splitter. This is a reduced single-degree-of-freedom prototype. It is not a hardware twin, not a validated flexure, and not a manufacturing package. Targets in the simulator are not validated hardware results.

## Layout

- `sim/` is the Vite, React, TypeScript, and Three.js app. `package.json`, the lockfile, `src`, `tests`, `scripts`, `index.html`, and the app configs live here. Run install, tests, typecheck, and the dev server from this directory.
- `docs/` holds the original user specification, the preimplementation audit, the requirements matrix, decisions and deviations, the verification report, `historical/`, and the already imported Gemini hardening records (`gemini-hardening/conversation.md`, `gemini-revision-deviations.md`, `hardware-docs-review.md`).
- `hardware/source-documents/` holds Caleb's Gemini-hardened design revision PDFs. They are design documents under review. See `hardware/README.md`.
- `firmware/` is reserved for future controller design notes. Nothing in this repo drives real DMX, lasers, or actuators. See `firmware/README.md`.

The original specification is `docs/user-specification.md` (SHA-256 `995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a`). The preimplementation audit is `docs/spec-audit.md`. Current decisions are `docs/decisions-and-deviations.md`. The requirement tracker is `docs/requirements-matrix.md`. Known conflicts in the hardware PDFs are tracked in `docs/gemini-revision-deviations.md` and `docs/hardware-docs-review.md`.

## Run the simulator

From `sim/`:

```bash
npm ci
npm test
npm run typecheck
npm run dev
```

The dev server binds to port `43117`. Open the URL printed by Vite. It is on your machine, usually `http://localhost:43117/`. There is no account and no required network call after install. Use the Stage tab for the room view and Engineering for the four panes. Your previous control values stay in the browser under `ed-ibs-prototype-settings-v1` until you choose Restore defaults.

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

`sim/src/physics/EscapementSolver.ts` uses RK4 at `dt = 0.00025 s`. Units are SI and radians. Rendering only requests whole steps. The original curb law is `K = 0.1104 * (0.018 / L)`. At the reference inertia that is about 8.001 Hz to 11.644 Hz. The 4 to 20 Hz band is a target. Prescribed-frequency mode is labeled as an assumption and does not rewrite the original coefficients.

The escapement torque is the assumption `directional-lift-zone-drive`. It is not the source's zero-velocity conjunction and not a contact model.

## Tests

From `sim/`:

```bash
npx vitest run
npx tsc --noEmit
```

Covered checks include inertia and frequency endpoints, undamped energy, viscous decay, RK4 convergence, partition invariance, one beat per valid crossing, blanking duration, power-cut policy, tempo reachability, projection counts, and dimensional propagation in the SCAD/DXF text. The document tests read `../docs` and check the real specification files.

With the dev server running and Chrome available, from `sim/`:

```bash
node scripts/browser-verify.mjs
```

That script uses `puppeteer-core` and a local Chrome binary. It does not download a browser.

## Not claimed

No experimental validation. Targets are not validated hardware results. No 0.25 mm gravity-shift result. No endurance certificate at 510 MPa. No dead-center pinspot. No exact musical tempo when the required frequency is outside the active band. Frame rate is unmeasured until a browser session reports it. The hardware PDFs are not machine-ready, validated, or certified.
