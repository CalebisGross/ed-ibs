#!/usr/bin/env bash
# Idempotent install for the ED-IBS Cursor cloud environment.
# Safe to run more than once. No interactive prompts.
#
# 1. cd sim && npm ci
# 2. Install numpy and scipy for docs/analysis scripts.
#
# Ubuntu's Python is often PEP 668 externally managed, and python3-venv
# is not always installed, so python3 -m venv can fail. This script
# creates a venv at a fixed path. If ensurepip is missing and passwordless
# sudo works, it installs the python3-venv apt package and retries.
# If a venv still cannot be created, it falls back to
# pip install --user, then to pip install --user --break-system-packages.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${ED_IBS_ANALYSIS_VENV:-$HOME/.local/share/ed-ibs/analysis-venv}"

cd "$ROOT/sim"
npm ci

cd "$ROOT"

have_ensurepip() {
  python3 -c 'import ensurepip' >/dev/null 2>&1
}

if ! have_ensurepip; then
  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv \
      || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3.12-venv
  fi
fi

if [ -x "$VENV/bin/python" ] && "$VENV/bin/python" -c 'import numpy, scipy' >/dev/null 2>&1; then
  echo "analysis venv ready: $VENV"
  exit 0
fi

if have_ensurepip; then
  rm -rf "$VENV"
  python3 -m venv "$VENV"
  "$VENV/bin/python" -m pip install --disable-pip-version-check numpy scipy
  "$VENV/bin/python" -c 'import numpy, scipy; print("numpy", numpy.__version__); print("scipy", scipy.__version__)'
  echo "analysis venv ready: $VENV"
  exit 0
fi

echo "venv unavailable; falling back to pip install --user" >&2
if python3 -m pip install --user --disable-pip-version-check numpy scipy; then
  python3 -c 'import numpy, scipy; print("numpy", numpy.__version__); print("scipy", scipy.__version__)'
  echo "analysis packages installed with pip --user"
  exit 0
fi

echo "pip --user was refused; retrying with --break-system-packages" >&2
python3 -m pip install --user --break-system-packages --disable-pip-version-check numpy scipy
python3 -c 'import numpy, scipy; print("numpy", numpy.__version__); print("scipy", scipy.__version__)'
echo "analysis packages installed with pip --user --break-system-packages"
