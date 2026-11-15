# Agent notes

ED-IBS is a theoretical opto-mechanical lighting fixture. The simulator in `sim/` is a reduced prototype. Numbers in the docs are targets, calculations, or cited sources. They are not hardware measurements. Do not claim validation or safety.

`docs/user-specification.md` and `docs/spec-audit.md` are byte-locked. Do not edit them.

## Cursor Cloud specific instructions

`.cursor/environment.json` runs `scripts/cloud-install.sh`. The script is idempotent. Run it yourself when dependencies are missing:

```bash
bash scripts/cloud-install.sh
```

The install does two things.

1. `cd sim && npm ci`
2. Installs `numpy` and `scipy` for the Python scripts in `docs/analysis/`.

On the Cursor cloud Ubuntu image, `python3 -m venv` often fails until the `python3-venv` package is installed, and system pip may refuse installs under PEP 668. The script creates a virtual environment at `$HOME/.local/share/ed-ibs/analysis-venv`. Override that path with `ED_IBS_ANALYSIS_VENV`. If `ensurepip` is missing and passwordless `sudo` works, the script installs `python3-venv` and retries. If a venv still cannot be created, it falls back to `python3 -m pip install --user numpy scipy`, then to the same command with `--break-system-packages`.

Run analysis scripts with that interpreter. `flicker-study.py` imports `numpy` and `scipy.signal`. The other three scripts use the standard library. The same interpreter runs all of them. Each script prints to stdout. The `*-results.txt` files are earlier captures.

```bash
"$HOME/.local/share/ed-ibs/analysis-venv/bin/python" docs/analysis/2026-11-15/working-revision-step1.py
"$HOME/.local/share/ed-ibs/analysis-venv/bin/python" docs/analysis/2026-11-15/tourbillon-feasibility.py
"$HOME/.local/share/ed-ibs/analysis-venv/bin/python" docs/analysis/2026-11-15/item7-blend-sizing.py
"$HOME/.local/share/ed-ibs/analysis-venv/bin/python" docs/analysis/2026-11-15/flicker-study.py
```

If the fallback path installed packages with `pip --user` instead of a venv, run the same scripts with `python3`.

Simulator commands run from `sim/`:

```bash
npm run typecheck
npm test
npm run build
npm run dev
```

`npm run dev` binds port 43117 (`vite --host 0.0.0.0 --port 43117 --strictPort`).

## Docs sync

One decision change is one pull request. Update the decision log `docs/gemini-revision-deviations.md`, `docs/requirements-matrix.md`, `docs/decisions-and-deviations.md`, and any affected file under `docs/analysis/`. The Decision index in those three docs must show the same ID and the same status. Run `node scripts/check-docs.mjs` before opening the pull request. Do not edit `docs/user-specification.md`. Caleb merges.
