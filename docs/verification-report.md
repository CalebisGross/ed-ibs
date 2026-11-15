# Verification report

Date: 2026-11-08. Machine: this Linux VM. Node v22.23.4. Vite 6.4.5. Headless Chrome 156.0.0.0. No public deployment and no change to any other computer.

## Commands

```bash
npm install
npx tsc --noEmit
npx vitest run
npm run build
npm run dev
node scripts/browser-verify.mjs
```

`npx vitest run`: 4 files, 30 tests, all passed. That includes the original oscillator checks and `tests/stage.test.ts`.

`npm run build` runs `tsc --noEmit` and the Vite production build.

Preserved texts, unchanged:

- `docs/user-specification.md` SHA-256 `995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a`
- `docs/spec-audit.md` SHA-256 `b8c6461663685241b43d66af4f76894340a80cc7b194643fe4c771cdbcabaa72`

## Stage session

Browser: Headless Chrome 156, viewports 1440x900 and 390x844. The page was the Vite server on this machine only (`http://127.0.0.1:43117/`). That address is not the user's computer.

Observed:

- Stage tab opened on the audience camera. Status: `9 live rays, source 85%, gate open, running, throw 12.0 m`. Canvas host 1098x655.
- Persistence was set to 450 ms through the control so the still shows afterglow as well as the live shafts.
- Side and fixture cameras rendered the same room.
- Throw slider to 22 m changed the status to `throw 22.0 m` and kept 9 live rays.
- Pause held step 18999, then 18999 again after 0.5 s.
- Power cut reported `0 live rays, source off`. The dotted afterglow still on screen in that instant is the persistence window, not live shafts.
- Engineering mode still mounts all four panes. Curb travel moved the derived frequency from 8.0014 Hz to 11.6437 Hz. Thickness left that frequency unchanged. Brake dropped amplitude from about 13 deg to about 1.6 deg. Reset returned to step 0. Chopper switched off.
- Mobile stage canvas host 388x574. The viewport stacks above the controls.
- Frame-rate readout in that session: 60 FPS, with nearby header frames at 59. This is Headless Chrome 156 on this VM, not a 60 to 120 FPS certificate.
- Console: Vite connect lines and the React DevTools notice. No console errors. No page errors. No failed responses.

Screenshots:

- `/opt/cursor/artifacts/stage-audience.png`
- `/opt/cursor/artifacts/stage-side.png`
- `/opt/cursor/artifacts/stage-fixture.png`
- `/opt/cursor/artifacts/stage-source-off.png`
- `/opt/cursor/artifacts/stage-mobile.png`
- `/opt/cursor/artifacts/workbench-desktop.png`
- `/opt/cursor/artifacts/browser-verify.json`

## What the pictures are

The audience and side views are the current model: three facet directions, three colors on each path because the offsets are zero, endpoints at throw distance. The cloth, stand, haze, and 1.75 m figure are presentation. Shaft thickness is a display width.

## Solver checks still covered

Inertia `4.368e-5`, original-law endpoints near 8.001 Hz and 11.644 Hz, energy, RK4 order, partition invariance, one beat per valid crossing, amplitude-dependent blanking, Q=350 decay still moving at 15 s, tempo reachability, and illustrative CAD dimensions.
