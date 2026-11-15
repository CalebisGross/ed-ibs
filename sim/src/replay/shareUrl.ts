import { MATERIALS, type MaterialId } from "../physics/constants";
import type { Settings } from "../sim/settings";

/**
 * Share links are local. Writers put the payload in the URL hash so a reload
 * does not send it to a server. Parsers also accept the same parameter on the
 * query string. Nothing in this module fetches.
 *
 * Version 1 encodes the public Settings object, the solver timestamp from
 * Readout.state.t (seconds), and the replay scrub time (seconds).
 */
export const VIEWER_SCHEMA_VERSION = 1;

export const SHARE_LINK_PARAM = "ed-ibs-view";

export interface ShareLinkState {
  schemaVersion: typeof VIEWER_SCHEMA_VERSION;
  /** Solver timestamp, seconds. Readout.state.t. */
  simTimeSeconds: number;
  /** Replay scrub position, seconds. */
  scrubTimeSeconds: number;
  settings: Settings;
}

export interface ShareLinkPage {
  origin: string;
  pathname: string;
  search: string;
}

export function serializeShareLink(state: ShareLinkState): string {
  const encoded = canonicalShareLink(state);
  return `#${SHARE_LINK_PARAM}=${encodeURIComponent(JSON.stringify(encoded))}`;
}

export function parseShareLink(raw: string): ShareLinkState {
  const payload = extractSharePayload(raw);
  if (payload === null) {
    throw new Error(`Share link is missing ${SHARE_LINK_PARAM}`);
  }
  return decodeSharePayload(payload);
}

/** Missing parameter returns null. A present but invalid payload throws. */
export function readShareLink(raw: string): ShareLinkState | null {
  const payload = extractSharePayload(raw);
  if (payload === null) return null;
  return decodeSharePayload(payload);
}

/** Missing or invalid payload returns null. Use this when reading the address bar on load. */
export function tryReadShareLink(raw: string): ShareLinkState | null {
  try {
    return readShareLink(raw);
  } catch {
    return null;
  }
}

export function shareLinkHref(hash: string, page?: ShareLinkPage): string {
  if (!page) return hash;
  return `${page.origin}${page.pathname}${page.search}${hash}`;
}

export function canonicalShareLink(input: unknown): ShareLinkState {
  const source = readRecord(input, "share link");
  const schemaVersion = readSchemaVersion(required(source, "schemaVersion"));
  const simTimeSeconds = readNonNegative(required(source, "simTimeSeconds"), "simTimeSeconds");
  const scrubTimeSeconds = readNonNegative(required(source, "scrubTimeSeconds"), "scrubTimeSeconds");
  const settings = readSettings(required(source, "settings"));
  return { schemaVersion, simTimeSeconds, scrubTimeSeconds, settings };
}

function decodeSharePayload(payload: string): ShareLinkState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Share link payload is not valid JSON");
  }
  return canonicalShareLink(parsed);
}

function extractSharePayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith("{")) return trimmed;
  const fromHash = paramValue(hashParams(trimmed));
  if (fromHash !== null) return fromHash;
  return paramValue(queryParams(trimmed));
}

function hashParams(raw: string): URLSearchParams {
  const hashIndex = raw.indexOf("#");
  if (hashIndex < 0) return new URLSearchParams();
  return new URLSearchParams(raw.slice(hashIndex + 1));
}

function queryParams(raw: string): URLSearchParams {
  const hashIndex = raw.indexOf("#");
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex >= 0) return new URLSearchParams(withoutHash.slice(queryIndex + 1));
  if (withoutHash.includes("=")) return new URLSearchParams(withoutHash);
  return new URLSearchParams();
}

function paramValue(params: URLSearchParams): string | null {
  const value = params.get(SHARE_LINK_PARAM);
  if (value === null || value.length === 0) return null;
  return value;
}

function readSchemaVersion(value: unknown): typeof VIEWER_SCHEMA_VERSION {
  if (value !== VIEWER_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported viewer schema version ${String(value)}. This build reads version ${VIEWER_SCHEMA_VERSION}.`,
    );
  }
  return VIEWER_SCHEMA_VERSION;
}

function readSettings(value: unknown): Settings {
  const source = readRecord(value, "settings");
  const chromatic = readChromatic(required(source, "chromaticOffsetDeg"));
  return {
    stiffnessMode: readUnion(
      required(source, "stiffnessMode"),
      ["reference-law", "prescribed-frequency"] as const,
      "settings.stiffnessMode",
    ),
    dampingMode: readUnion(
      required(source, "dampingMode"),
      ["hold-q", "fixed-c0-reference"] as const,
      "settings.dampingMode",
    ),
    torqueMapMode: readUnion(
      required(source, "torqueMapMode"),
      ["energy-balance-current-k", "energy-balance-frozen-reference-k"] as const,
      "settings.torqueMapMode",
    ),
    inertiaMode: readUnion(
      required(source, "inertiaMode"),
      ["reference-annulus", "custom"] as const,
      "settings.inertiaMode",
    ),
    customInertia: readFinite(required(source, "customInertia"), "settings.customInertia"),
    dmxTorque: readFinite(required(source, "dmxTorque"), "settings.dmxTorque"),
    dmxCurb: readFinite(required(source, "dmxCurb"), "settings.dmxCurb"),
    dmxBrake: readFinite(required(source, "dmxBrake"), "settings.dmxBrake"),
    dmxIntensity: readFinite(required(source, "dmxIntensity"), "settings.dmxIntensity"),
    toothCount: readFinite(required(source, "toothCount"), "settings.toothCount"),
    facetCount: readFinite(required(source, "facetCount"), "settings.facetCount"),
    thicknessM: readFinite(required(source, "thicknessM"), "settings.thicknessM"),
    leafWidthM: readFinite(required(source, "leafWidthM"), "settings.leafWidthM"),
    materialId: readMaterial(required(source, "materialId")),
    throwM: readFinite(required(source, "throwM"), "settings.throwM"),
    persistenceMs: readFinite(required(source, "persistenceMs"), "settings.persistenceMs"),
    chopperEnabled: readBoolean(required(source, "chopperEnabled"), "settings.chopperEnabled"),
    chromaticOffsetDeg: chromatic,
    qFactor: readFinite(required(source, "qFactor"), "settings.qFactor"),
    brakeQFloor: readFinite(required(source, "brakeQFloor"), "settings.brakeQFloor"),
    amplitudeTargetDeg: readFinite(required(source, "amplitudeTargetDeg"), "settings.amplitudeTargetDeg"),
    liftDeg: readFinite(required(source, "liftDeg"), "settings.liftDeg"),
    blankDeg: readFinite(required(source, "blankDeg"), "settings.blankDeg"),
    unlockDeg: readFinite(required(source, "unlockDeg"), "settings.unlockDeg"),
    torqueScale: readFinite(required(source, "torqueScale"), "settings.torqueScale"),
    prescribedFLow: readFinite(required(source, "prescribedFLow"), "settings.prescribedFLow"),
    prescribedFHigh: readFinite(required(source, "prescribedFHigh"), "settings.prescribedFHigh"),
    theta0Deg: readFinite(required(source, "theta0Deg"), "settings.theta0Deg"),
    omega0: readFinite(required(source, "omega0"), "settings.omega0"),
    unwindSeconds: readFinite(required(source, "unwindSeconds"), "settings.unwindSeconds"),
    subdivision: readFinite(required(source, "subdivision"), "settings.subdivision"),
    targetBpm: readFinite(required(source, "targetBpm"), "settings.targetBpm"),
    leafCountVisual: readFinite(required(source, "leafCountVisual"), "settings.leafCountVisual"),
    powerCutMode: readUnion(
      required(source, "powerCutMode"),
      ["total-source-off", "retained-source-diagnostic"] as const,
      "settings.powerCutMode",
    ),
    omegaEpsilon: readFinite(required(source, "omegaEpsilon"), "settings.omegaEpsilon"),
    ringAxialMm: readFinite(required(source, "ringAxialMm"), "settings.ringAxialMm"),
    viewMode: readUnion(required(source, "viewMode"), ["stage", "engineering"] as const, "settings.viewMode"),
    hazeDisplay: readFinite(required(source, "hazeDisplay"), "settings.hazeDisplay"),
  };
}

function readMaterial(value: unknown): MaterialId {
  const ids = MATERIALS.map((item) => item.id);
  return readUnion(value, ids, "settings.materialId");
}

function readChromatic(value: unknown): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error("Share link field settings.chromaticOffsetDeg must be three numbers");
  }
  return [
    readFinite(value[0], "settings.chromaticOffsetDeg[0]"),
    readFinite(value[1], "settings.chromaticOffsetDeg[1]"),
    readFinite(value[2], "settings.chromaticOffsetDeg[2]"),
  ];
}

function required(source: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(source, key)) {
    throw new Error(`Share link is missing ${key}`);
  }
  return source[key];
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Share link field ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readUnion<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === "string" && allowed.some((item) => item === value)) {
    return value as T;
  }
  throw new Error(`Share link field ${label} is not recognized`);
}

function readFinite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Share link field ${label} must be a finite number`);
  }
  return value;
}

function readNonNegative(value: unknown, label: string): number {
  const number = readFinite(value, label);
  if (number < 0) throw new Error(`Share link field ${label} must be zero or greater`);
  return number;
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Share link field ${label} must be a boolean`);
  return value;
}
