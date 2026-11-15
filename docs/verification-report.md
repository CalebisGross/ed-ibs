# Verification report

Date: 2026-11-15. Machine: this Linux VM. Node v22.23.4. Vite 6.4.5. Google Chrome 157.0.8103.50, user agent HeadlessChrome/157.0.0.0. No public deployment and no change to any other computer.

Verified tree: `06b1789110c5344bd720ac4c778eea5b5b0a2ef3` (`main` when these commands ran). `sim/` was not modified. This report is a docs change on top of that commit. The simulator results belong to that tree.

## Commands

From `sim/`:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
node scripts/browser-verify.mjs
```

`npm run dev` was left running so `browser-verify.mjs` had a server. Vite reported ready at `http://localhost:43117/`. The script used `http://127.0.0.1:43117/`. That address is this VM, not another computer.

Results:

- `npm ci` exited 0. It added 204 packages and audited 205. The audit notice reported 6 vulnerabilities (3 moderate, 1 high, 2 critical). The lockfile was not changed, and `npm audit fix` was not run.
- `npm run typecheck` (`tsc --noEmit`) exited 0.
- `npm test` (`vitest run`, Vitest v2.1.9) exited 0. 4 files, 30 tests, all passed: `tests/stage.test.ts` 6, `tests/model.test.ts` 10, `tests/solver.test.ts` 12, `tests/documents.test.ts` 2.
- `npm run build` (`tsc --noEmit && vite build`) exited 0. Vite 6.4.5 wrote `dist/index.html` (0.67 kB), `dist/assets/index-CYcU2Sjx.css` (9.95 kB), and `dist/assets/index-fmqJFiVG.js` (830.34 kB). Vite warned that the JavaScript chunk is larger than 500 kB after minification. `dist/` is gitignored.
- `node scripts/browser-verify.mjs` exited 0. Chrome binary: `/usr/bin/google-chrome`.

Preserved texts, unchanged. `sha256sum` on this date matched the recorded digests:

- `docs/user-specification.md` SHA-256 `995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a`
- `docs/spec-audit.md` SHA-256 `b8c6461663685241b43d66af4f76894340a80cc7b194643fe4c771cdbcabaa72`

## Stage session

Browser: Headless Chrome 157.0.0.0. The script set viewports 1440x900 and 390x844. The page was the Vite server on this machine only (`http://127.0.0.1:43117/`).

The script's recorded fields:

- Audience status, before the throw change: `9 live rays, source 85%, gate open, running, throw 12.0 m`. Canvas host 1098x655.
- After the throw slider: `9 live rays, source 85%, gate open, running, throw 22.0 m`.
- Pause held `step 19932`, then `step 19932` again after the script's 0.5 s wait.
- Power cut status, read immediately before the source-off still: `0 live rays, source off, gate open, running, throw 22.0 m`.
- Engineering pane titles: `Pane 1 · Mechanical`, `Pane 2 · Cyclorama`, `Pane 3 · Phase and timegrapher`, `Pane 4 · DMX, status, export`.
- Before the curb move: frequency `derived 8.0014 Hz`, amplitude `13.71 deg`, `step 24265`, state `running`, WebGL `WebGL viewport ready`. The workbench still was taken at this point, so its header is still the 8.0014 Hz readout.
- After curb: `derived 11.6437 Hz`. After thickness: `derived 11.6437 Hz`.
- Brake: amplitude `13.73 deg`, then `2.02 deg` after the script's 1.2 s wait.
- Engineering pause: `step 30931`. Reset: `step 0`. Chopper button text: `Chopper off`.
- Mobile canvas host 388x574.
- Final `readout-fps` text, taken after the mobile still: `60 FPS this session`.
- Console messages captured: Vite connecting, Vite connected, and the React DevTools notice. `consoleErrors` was empty. `pageErrors` was empty.

The script set persistence to 450 ms before the audience still.

Frame rate is a session readout, not a 60 to 120 FPS certificate. The script's one `fps` field is `60 FPS this session`. Tesseract, read against the six saved stills in capture order, shows the header at those earlier moments as 55, 56, 55, 56, 54, and 51 FPS (`stage-audience`, `stage-side`, `stage-fixture`, `stage-source-off`, `workbench-desktop`, `stage-mobile`). The mobile still's header also shows paused at step 0 with `derived 11.6437 Hz`.

Screenshots and the script's JSON are session artifacts. They are not committed in this repository. The same paths were used by the 2026-11-08 report for an earlier session. The files at these paths now are from this run:

- `/opt/cursor/artifacts/stage-audience.png`
- `/opt/cursor/artifacts/stage-side.png`
- `/opt/cursor/artifacts/stage-fixture.png`
- `/opt/cursor/artifacts/stage-source-off.png`
- `/opt/cursor/artifacts/stage-mobile.png`
- `/opt/cursor/artifacts/workbench-desktop.png`
- `/opt/cursor/artifacts/browser-verify.json`

## What the pictures are

The audience, side, and fixture views are the current model: the stage drawing at throw distance, with the cloth, stand, haze, and 1.75 m figure as presentation. Shaft thickness is a display width. The workbench still is the four panes before the curb, brake, and reset steps. The mobile still is the stage layout at 390x844 after those steps, paused at step 0.

## Solver checks still covered

The passing tests include inertia `4.368e-5`, original-law endpoints `8.001351575 Hz` and `11.643676832 Hz`, lengths for 4 Hz and 20 Hz near 72.024 mm and 2.881 mm, blank duration `0.00465183 s` at 18 deg, Q=350 amplitude ratio `0.340513857` at 15 s, stress checks `248.709 MPa` and `3370.744 MPa`, tempo reachability, and illustrative CAD dimensions. Those figures are the test expectations that passed on this run. They are checks of the stated model. They are not hardware results.
