#!/usr/bin/env bash
# Run TLC on the ED-IBS hold-only statechart models.
# Downloads a pinned tla2tools.jar when needed. Needs Java 11+.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

JAR_VERSION="1.7.4"
JAR_URL="https://github.com/tlaplus/tlaplus/releases/download/v${JAR_VERSION}/tla2tools.jar"
JAR_SHA256="936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88"
CACHE_DIR="${ED_IBS_TLA_CACHE:-$HOME/.cache/ed-ibs}"
JAR_PATH="${TLA2TOOLS:-$CACHE_DIR/tla2tools-${JAR_VERSION}.jar}"
JAVA_BIN="${JAVA:-java}"
META_DIR="${TMPDIR:-/tmp}/ed-ibs-tlc-$$"
EXPECTED_ESCAPEMENT_STATES=74
EXPECTED_SIMRUN_STATES=320

if ! command -v "$JAVA_BIN" >/dev/null 2>&1; then
  echo "check-statecharts: need a java binary (Java 11+). Set JAVA=... if needed." >&2
  exit 1
fi

mkdir -p "$(dirname "$JAR_PATH")"
if [[ ! -f "$JAR_PATH" ]]; then
  echo "check-statecharts: downloading pinned tla2tools ${JAR_VERSION}"
  curl -fsSL -o "$JAR_PATH.partial" "$JAR_URL"
  mv "$JAR_PATH.partial" "$JAR_PATH"
fi

actual="$(sha256sum "$JAR_PATH" | awk '{print $1}')"
if [[ "$actual" != "$JAR_SHA256" ]]; then
  echo "check-statecharts: jar sha256 is $actual, expected $JAR_SHA256" >&2
  exit 1
fi

cleanup() {
  rm -rf "$META_DIR"
}
trap cleanup EXIT
mkdir -p "$META_DIR/escapement" "$META_DIR/simrun"

run_one() {
  local name="$1"
  local tla="$ROOT/docs/statecharts/${name}.tla"
  local cfg="$ROOT/docs/statecharts/${name}.hold.cfg"
  local expected="$2"
  local out="$META_DIR/${name}.out"

  echo "check-statecharts: TLC ${name} (hold invariants)"
  set +e
  "$JAVA_BIN" -XX:+UseParallelGC -jar "$JAR_PATH" \
    -config "$cfg" \
    -workers 1 \
    -metadir "$META_DIR/${name}" \
    "$tla" >"$out" 2>&1
  local status=$?
  set -e

  if [[ "$status" -ne 0 ]]; then
    cat "$out" >&2
    echo "check-statecharts: TLC ${name} exited $status" >&2
    exit "$status"
  fi

  if ! grep -q "Model checking completed. No error has been found." "$out"; then
    cat "$out" >&2
    echo "check-statecharts: TLC ${name} did not report a clean finish" >&2
    exit 1
  fi

  local found
  found="$(sed -n 's/.* \([0-9][0-9]*\) distinct states found.*/\1/p' "$out" | head -1)"
  if [[ "$found" != "$expected" ]]; then
    cat "$out" >&2
    echo "check-statecharts: ${name} found $found distinct states, expected $expected" >&2
    exit 1
  fi

  echo "check-statecharts: ${name} ok ($found distinct states)"
}

run_one escapement "$EXPECTED_ESCAPEMENT_STATES"
run_one simrun "$EXPECTED_SIMRUN_STATES"
echo "check-statecharts: ok"
