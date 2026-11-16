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

## Statechart check

Date: 2026-11-15. Same machine. Node v22.23.4. Vite 6.4.5. Google Chrome 157.0.8103.50, user agent HeadlessChrome/157.0.0.0.

Simulator tree for these commands: `68aefeb4a5c398f79924d321c9962e99543d4d70`. This section is a docs update on that commit. `sim/` was not modified again. `docs/user-specification.md` was not modified. Its SHA-256 is still `995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a`. `docs/spec-audit.md` is still `b8c6461663685241b43d66af4f76894340a80cc7b194643fe4c771cdbcabaa72`.

The earlier session in this file stays the record of `06b1789110c5344bd720ac4c778eea5b5b0a2ef3`. This section is the later run. This run did not OCR the still headers, so the 55, 56, 55, 56, 54, and 51 FPS readings stay with that earlier session.

From `sim/`, after the statechart commit and with the dev server already up:

```bash
npm run typecheck
npm test
npm run build
node scripts/browser-verify.mjs
```

`npm ci` was not repeated. `npm run dev` was already serving `http://127.0.0.1:43117/`.

Results:

- `npm run typecheck` (`tsc --noEmit`) exited 0.
- `npm test` (`vitest run`, Vitest v2.1.9) exited 0. 5 files, 45 tests, all passed: `tests/stage.test.ts` 6, `tests/model.test.ts` 10, `tests/solver.test.ts` 12, `tests/documents.test.ts` 2, `tests/statechart.test.ts` 15.
- `npm run build` (`tsc --noEmit && vite build`) exited 0. Vite 6.4.5 wrote `dist/index.html` (0.67 kB), `dist/assets/index-CYcU2Sjx.css` (9.95 kB), and `dist/assets/index-8Dg7w6Vb.js` (830.64 kB). Vite warned that the JavaScript chunk is larger than 500 kB after minification. `dist/` is gitignored.
- `node scripts/browser-verify.mjs` exited 0. Chrome binary: `/usr/bin/google-chrome`. `consoleErrors` was empty. `pageErrors` was empty.

Script fields from this run:

- Audience status: `9 live rays, source 85%, gate open, running, throw 12.0 m`. Canvas host 1098x655.
- After the throw slider: `9 live rays, source 85%, gate open, running, throw 22.0 m`.
- Pause held `step 19332`, then `step 19332` again after the script's 0.5 s wait.
- Power cut status, read immediately before the source-off still: `0 live rays, source off, gate open, running, throw 22.0 m`.
- Engineering pane titles: `Pane 1 · Mechanical`, `Pane 2 · Cyclorama`, `Pane 3 · Phase and timegrapher`, `Pane 4 · DMX, status, export`.
- Before the curb move: frequency `derived 8.0014 Hz`, amplitude `13.72 deg`, `step 25398`, state `running`, WebGL `WebGL viewport ready`.
- After curb: `derived 11.6437 Hz`. After thickness: `derived 11.6437 Hz`.
- Brake: amplitude `10.33 deg`, then `1.43 deg` after the script's 1.2 s wait.
- Engineering pause: `step 31331`. Reset: `step 0`. Chopper button text: `Chopper off`.
- Mobile canvas host 388x574.
- Final `readout-fps` text: `60 FPS this session`.

Screenshots and `/opt/cursor/artifacts/browser-verify.json` are from this run. They are not committed.

TLC, copied from the committed reports:

- `docs/statecharts/escapement/report.md`: TLC reached 74 states and 218 steps. The chart draws 17 states and 21 arrows. The view hides 74 steps.
- `docs/statecharts/simrun/report.md`: TLC reached 320 states and 2464 steps. The chart draws 17 states and 20 arrows. The view hides 320 steps.

`statechart.test.ts` replays the broken rules in those reports. The rules stay open. Rows 2.9, 2.11, 2.15, 4.9, and A.5 cite the reports and stay open.

## Viewer integration, 2026-11-15

This section is a later session on branch `viewer/cinematic-stage`. It does not replace the numbers above. The stage look, the post-quality pass, the see-why panels, and the replay scrubber were merged here and wired into the existing workbench. The solver, `settings.ts`, and the byte-locked specification files were not edited. Decision index IDs and statuses were not moved. Nothing in this section is a hardware measurement.

Inputs that were already on the remote: post `e41f4ef`, panels `5e90410`, replay `e742c99`, stage look `10f27cd`, main `641913b`.

Commands, run on the working tree this section describes:

```bash
cd sim && npm run typecheck
cd sim && npm test
node scripts/check-docs.mjs
bash scripts/check-statecharts.sh
cd sim && node scripts/browser-verify.mjs
```

`npm run dev` was already serving `http://127.0.0.1:43117/`.

Results:

- `npm run typecheck` (`tsc --noEmit`) exited 0.
- `npm test` (`vitest run`, Vitest v2.1.9) exited 0. Start 22:15:10, duration 1.97 s. 10 files, 90 tests, all passed: `post.test.ts` 11, `statechart.test.ts` 15, `replay.test.ts` 9, `model.test.ts` 10, `solver.test.ts` 13, `panels.test.ts` 14, `stage.test.ts` 6, `stage-look.test.ts` 7, `provenance.test.ts` 3, `documents.test.ts` 2.
- `node scripts/check-docs.mjs` printed `ok` and exited 0.
- `bash scripts/check-statecharts.sh` printed `escapement ok (74 distinct states)`, `simrun ok (320 distinct states)`, and `check-statecharts: ok`.
- `node scripts/browser-verify.mjs` exited 0. Headless Chrome 157.0.8103.50. `consoleErrors` was empty. `pageErrors` was empty. Console lines were the Vite connect notices and the React DevTools notice.

Script fields from this run:

- Audience status: `9 live rays, source 85%, gate open, running, throw 12.0 m`. Canvas host 1098x346.
- After the throw slider: `9 live rays, source 85%, gate open, running, throw 22.0 m`.
- Pause held `step 31397`, then `step 31397` again after the script's 0.5 s wait.
- Power cut status: `0 live rays, source off, gate open, running, throw 22.0 m`.
- Engineering pane titles matched the four pane headings.
- Before the curb move: frequency `derived 8.0014 Hz`, amplitude `14.18 deg`, `step 46395`, state `running`, WebGL `WebGL viewport ready`.
- After curb: `derived 11.6437 Hz`. After thickness: `derived 11.6437 Hz`.
- Brake: amplitude `10.00 deg`, then `2.25 deg` after the script's 1.2 s wait.
- Engineering pause: `step 59593`. Reset: `step 0`. Chopper button text: `Chopper off`.
- Mobile canvas host 403x597.
- Final `readout-fps` text: `27 FPS this session`. That string is the in-app session counter, not the frame-time sample below.

The browser script waits for `load`, then for Puppeteer's in-flight request count to stay at zero for 500 ms. Chrome 157 does not emit the networkIdle lifecycle event for this document. The later solver checks are unchanged.

Frame times, measured after that browser run, on the same dev server. Method: 35 `requestAnimationFrame` gaps after a 400 ms settle. Viewport 1440x900. Stage samples use the audience camera. The macro sample uses Engineering, Escapement macro, high tier. GPU string: `ANGLE (Mesa, llvmpipe (LLVM 20.1.2 256 bits), OpenGL 4.5)`. CPU from `/proc/cpuinfo`: `Intel(R) Xeon(R) Processor`, 4 processors. These gaps include the solver and the render call. They are not a GPU fence, and they are not `lastFrameMs` from the post pipeline.

- Low, audience: median 33.3 ms, mean 40.48 ms, min 16.5 ms, max 116.7 ms.
- Medium, audience: median 49.9 ms, mean 43.81 ms, min 16.6 ms, max 133.4 ms.
- High, audience: median 49.9 ms, mean 51.90 ms, min 16.6 ms, max 116.7 ms.
- High, escapement macro: median 99.9 ms, mean 94.76 ms, min 66.6 ms, max 149.9 ms.

Stills from the same session are under `/opt/cursor/artifacts/`. They are not committed. The room uses one synthesized neutral studio HDRI (`sim/src/stage/assets/studio-neutral.hdr`), not a photograph. Ghosted envelopes stay semi-transparent and the legend says they are illustrative. Depth of field is on only for the close cameras, and only in the high tier.

## Look pass, 2026-11-15

Same branch, after the review of the first stills. The solver was not edited. Decision index IDs and statuses were not moved. This is still a simulator presentation, not a hardware measurement.

What changed in the picture: see-why panels sit in their own grid row and scroll inside that row. The browser check fails if those panels intersect the engineering panes, the stage rail, or each other, at 1440x900 and at 1280x800. Beams are thin and near-white, with a faint sheath, and no end spheres. Close mechanism views scale that beam down. The mechanical cameras frame the ring and the escapement contact. Ghost meshes stay faint, without edge wires, and carry a Ghost label. Depth of field is only the escapement macro in the mechanical view, and only the push-in and impulse views on the stage. Panel captions are one or two lines, with the rest behind a disclosure.

Commands, run on this tree:

```bash
cd sim && npm run typecheck
cd sim && npm test
node scripts/check-docs.mjs
bash scripts/check-statecharts.sh
cd sim && node scripts/browser-verify.mjs
```

Results:

- `npm run typecheck` (`tsc --noEmit`) exited 0.
- `npm test` (`vitest run`, Vitest v2.1.9) exited 0. Start 22:40:53, duration 1.88 s. 10 files, 90 tests, all passed.
- `node scripts/check-docs.mjs` printed `ok` and exited 0.
- `bash scripts/check-statecharts.sh` printed `escapement ok (74 distinct states)`, `simrun ok (320 distinct states)`, and `check-statecharts: ok`.
- `node scripts/browser-verify.mjs` exited 0. Headless Chrome 157.0.8103.50. `consoleErrors` was empty. `pageErrors` was empty.

Script fields from this run:

- Audience status: `0 live rays, source 85%, chopper blanked, running, throw 12.0 m`. Canvas host 1098x410. The chopper was on and the sample was inside the blank.
- After the throw slider: `9 live rays, source 85%, gate open, running, throw 22.0 m`.
- Pause held `step 16733`, then `step 16733` again.
- Power cut status: `0 live rays, source off, chopper blanked, running, throw 22.0 m`.
- Engineering pane titles matched the four pane headings. The new overlap check passed at 1440x900 and at 1280x800.
- Before the curb move: frequency `derived 8.0014 Hz`, amplitude `13.55 deg`, `step 26400`, state `running`, WebGL `WebGL viewport ready`.
- After curb: `derived 11.6437 Hz`. After thickness: `derived 11.6437 Hz`.
- Brake: amplitude `10.24 deg`, then `3.99 deg`.
- Engineering pause: `step 30067`. Reset: `step 0`. Chopper button text: `Chopper off`.
- Mobile canvas host 388x574.
- Final `readout-fps` text: `35 FPS this session`. That string is the in-app session counter on this software GPU. It is not the frame-time sample below.

Frame times, measured on the same dev server after the look pass. Method: 35 `requestAnimationFrame` gaps after a 400 ms settle. Viewport 1440x900. Stage samples use the audience camera. The macro sample uses Engineering, Escapement macro, high tier. GPU string: `ANGLE (Mesa, llvmpipe (LLVM 20.1.2 256 bits), OpenGL 4.5)`. CPU from `/proc/cpuinfo`: `Intel(R) Xeon(R) Processor`, 4 processors. These gaps include the solver and the render call. They are not a GPU fence, and they are not `lastFrameMs`.

- Low, audience: median 116.7 ms, mean 112.38 ms, min 16.6 ms, max 183.3 ms.
- Medium, audience: median 116.7 ms, mean 118.57 ms, min 83.4 ms, max 150 ms.
- High, audience: median 133.4 ms, mean 136.18 ms, min 100 ms, max 183.3 ms.
- High, escapement macro: median 149.9 ms, mean 140.47 ms, min 16.7 ms, max 183.2 ms.

Replacement stills, not the rejected set, are the `review-*.png` files under `/opt/cursor/artifacts/`. They are not committed.

## Frame-time pass, 2026-11-15

Same branch, after the look-pass frame times above. The solver was not edited. Decision index IDs and statuses were not moved. This is still a simulator presentation, not a hardware measurement.

Low now skips the shadow map, the haze volume, SSAO, and depth of field. It also skips the room shell and the environment map, which the closer framing had made expensive on the software GPU. Medium and high keep the shell, the environment map, shadows, and haze. Depth of field stays on the escapement macro preset only, with a smaller aperture so the contact stays readable. The phase legend sits under the plot. The axes are angle in rad and rad/s. The blank window draws one line through the RK4 samples. No drawn part is brass. A Gemini prototype note lists brass as an alternate for the escape wheel beside silicon nitride. The wheel in this view stays the silicon nitride ghost.

Frame times, one session, same method as the rows above: 35 `requestAnimationFrame` gaps after a 400 ms settle, viewport 1440x900. Audience rows use the audience camera. The last row is Engineering, Escapement macro, high tier. GPU string: `ANGLE (Mesa, llvmpipe (LLVM 20.1.2 256 bits), OpenGL 4.5)`. CPU from `/proc/cpuinfo`: `Intel(R) Xeon(R) Processor`, 4 processors. The gaps include the solver and the render. They are not a GPU fence.

- Low, audience: median 33.3 ms, mean 34.76 ms, min 16.6 ms, max 50.1 ms.
- Medium, audience: median 66.7 ms, mean 65.71 ms, min 49.9 ms, max 83.5 ms.
- High, audience: median 83.4 ms, mean 84.28 ms, min 50.0 ms, max 116.6 ms.
- High, escapement macro: median 83.3 ms, mean 83.80 ms, min 33.3 ms, max 100.1 ms.

Three earlier low-tier samples, same method and same GPU, had medians 33.3 ms, 33.4 ms, and 33.4 ms. Stills from after the layout fix are the `pass3-*.png` files under `/opt/cursor/artifacts/`. They are not committed.

## Round 4 look pass, 2026-11-15

Same branch, after the frame-time pass above. The solver was not edited. Decision index IDs and statuses were not moved. This is still a simulator presentation, not a hardware measurement.

The see-why strip keeps four cards on screen and scrolls sideways for the fifth. Chart notes that do not fit the short row sit in a closed disclosure. Plot captions sit in HTML, off the canvas. The audience camera stays downstage of the aperture. Beam cores are hairlines with a faint sheath. The escapement macro keeps a small depth of field on the pallet contact, and the Ghost tag sits on the wheel. See-why plots commit about every 150 ms so the software GPU can keep the low-tier median. Low still skips the shadow map, the haze volume, SSAO, depth of field, the room shell, and the environment map.

Gates, one session:

- `npm test` (`vitest run`, Vitest v2.1.9) exited 0. Start 23:57:14, duration 1.85 s. 10 files, 91 tests, all passed.
- `npm run typecheck` (`tsc --noEmit`) exited 0.
- `node scripts/check-docs.mjs` printed `ok` and exited 0.
- `bash scripts/check-statecharts.sh` printed `escapement ok (74 distinct states)`, `simrun ok (320 distinct states)`, and `check-statecharts: ok`.
- `node scripts/browser-verify.mjs` exited 0. Headless Chrome 157. `consoleErrors` was empty. `pageErrors` was empty. The readable-copy check, including text buried outside a vertical clip, passed at 1440x900 and at 1280x800.

Frame times, one unloaded session after those gates, same method: 35 `requestAnimationFrame` gaps after a 400 ms settle, viewport 1440x900. Audience rows use the audience camera. The last row is Engineering, Escapement macro, high tier. GPU string: `ANGLE (Mesa, llvmpipe (LLVM 20.1.2 256 bits), OpenGL 4.5)`. CPU from `/proc/cpuinfo`: `Intel(R) Xeon(R) Processor`, 4 processors. The gaps include the solver and the render. They are not a GPU fence.

- Low, audience: median 33.3 ms, mean 40.47 ms, min 16.5 ms, max 100 ms. The frame-time pass above was median 33.3 ms, mean 34.76 ms, min 16.6 ms, max 50.1 ms.
- Medium, audience: median 50 ms, mean 62.86 ms, min 33.3 ms, max 116.7 ms. The frame-time pass above was median 66.7 ms, mean 65.71 ms, min 49.9 ms, max 83.5 ms.
- High, audience: median 66.7 ms, mean 88.57 ms, min 49.9 ms, max 150 ms. The frame-time pass above was median 83.4 ms, mean 84.28 ms, min 50.0 ms, max 116.6 ms.
- High, escapement macro: median 83.4 ms, mean 100 ms, min 50 ms, max 150 ms. The frame-time pass above was median 83.3 ms, mean 83.80 ms, min 33.3 ms, max 100.1 ms.

Stills from this pass are the `round4-*.png` files under `/opt/cursor/artifacts/`. They are not committed.

## Round 5 layout pass, 2026-11-16

Same branch, after the round 4 look pass above. The solver was not edited. `docs/user-specification.md` and `docs/spec-audit.md` were not edited. Decision index IDs and statuses were not moved. This is still a simulator presentation, not a hardware measurement.

Engineering scrolls with the page. Stage stays a fixed viewport: the workbench row for the see-why strip is still `minmax(420px, 46vh)`, and the browser gate measured the stage host at 1098 by 258. Replay is one row, 34 px tall. In Engineering the see-why strip is a disclosure, closed until opened. At 1440x900 with that disclosure closed, the mechanical viewport host is 714 by 357, the cyclorama wall is 280 px tall with its caption under the plot, the timegrapher pane is 546 px with plot hosts of 200 px and 180 px, and the console pane is 2909 px with overflow visible. The 75.0% and 0.0% fader readouts sit inside that pane. At 1280x800 the mechanical viewport host is 317 px, the wall is 280 px, and the plot hosts stay 200 px and 180 px. Nothing in those panes is clipped by overflow.

The readable-copy check still flags overlapping ink, text on a plot, and ticks under 9 px. It now also flags bench text whose ink runs more than 2 px past an overflow ancestor, bench text buried outside a vertical clip, and a `.bench .viewport-host` under 200 px tall. The sideways scroll of the fifth see-why card is still allowed.

Depth of field stays on only for the escapement macro preset. The aperture is 0.00018 and the max blur is 0.00008. The Ghost tag is 1.5 mm and sits off the pallet. Low still skips the shadow map, the haze volume, SSAO, depth of field, the room shell, and the environment map. That cost path was not edited.

Gates, one session:

- `npm test` (`vitest run`, Vitest v2.1.9) exited 0. Start 00:10:26, duration 1.80 s. 10 files, 91 tests, all passed.
- `npm run typecheck` (`tsc --noEmit`) exited 0.
- `node scripts/check-docs.mjs` printed `ok` and exited 0.
- `bash scripts/check-statecharts.sh` printed `escapement ok (74 distinct states)`, `simrun ok (320 distinct states)`, and `check-statecharts: ok`.
- `node scripts/browser-verify.mjs` exited 0. Headless Chrome 157. `consoleErrors` was empty. `pageErrors` was empty. The readable-copy check passed at stage 1440x900, stage 1280x800, engineering 1440x900, and engineering 1280x800. `stageHost` was `{ "width": 1098, "height": 258 }`.

Frame times, one unloaded session, same method: 35 `requestAnimationFrame` gaps after a 400 ms settle, viewport 1440x900. Audience rows use the audience camera. The last row is Engineering, Escapement macro, high tier. GPU string: `ANGLE (Mesa, llvmpipe (LLVM 20.1.2 256 bits), OpenGL 4.5)`. CPU from `/proc/cpuinfo`: `Intel(R) Xeon(R) Processor`, 4 processors. The gaps include the solver and the render. They are not a GPU fence.

- Low, audience: median 33.3 ms, mean 47.14 ms, min 16.6 ms, max 133.3 ms. Round 4 was median 33.3 ms, mean 40.47 ms, min 16.5 ms, max 100 ms.
- Medium, audience: median 66.7 ms, mean 89.52 ms, min 33.3 ms, max 150 ms. Round 4 was median 50 ms, mean 62.86 ms, min 33.3 ms, max 116.7 ms.
- High, audience: median 83.4 ms, mean 101.9 ms, min 16.7 ms, max 183.3 ms. Round 4 was median 66.7 ms, mean 88.57 ms, min 49.9 ms, max 150 ms.
- High, escapement macro: median 133.3 ms, mean 128.57 ms, min 16.7 ms, max 283.3 ms. Round 4 was median 83.4 ms, mean 100 ms, min 50 ms, max 150 ms. The mechanical view is 357 px tall on this pass, and depth of field runs on that view.

Stills from this pass are the `round5-*.png` files under `/opt/cursor/artifacts/`. They are not committed.
