#!/usr/bin/env node
/**
 * Docs drift check for ED-IBS. Node 22. No dependencies.
 *
 * Fails when any of these are true:
 *
 * 1. docs/user-specification.md sha256 is not
 *    995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a.
 *    That file is byte-locked. Do not edit it to satisfy this check.
 *
 * 2. A tracked .md, .ts, .tsx, .js, or .mjs file, or any tracked file
 *    under firmware/, contains an em dash (Unicode U+2014).
 *    Exemption: docs/user-specification.md. It is the hash-locked source
 *    and already contains one em dash. The hash check above guards it.
 *
 * 3. The Decision index in docs/gemini-revision-deviations.md, the
 *    decision log, disagrees with the Decision index in
 *    docs/requirements-matrix.md or docs/decisions-and-deviations.md.
 *    Each index is the first markdown table under a heading line
 *    "## Decision index". The checker reads only the first table under that
 *    heading. Columns are ID and Status. IDs look like D-01.
 *    Status is one token: WORKING, OPEN, RESOLVED, SUPERSEDED,
 *    OUT_OF_SCOPE, or DROPPED. Every ID in the log must appear once in
 *    the other two files, with the same status. An extra ID fails too.
 *
 * 4. A quantity in docs/requirements-matrix.md, docs/decisions-and-deviations.md,
 *    or docs/analysis/**.md has no [T], [C], or [S] tag in its scope.
 *    [T] is a target or chosen assumption. [C] is a calculated prediction
 *    or a solver result. [S] is a cited spec, catalog, or other source.
 *    A bracket tag counts when it contains T, C, or S as a word, including
 *    [C, S], [S MAN], and [T item 4]. [V] is rejected in those files.
 *    Nothing in this repo is hardware-validated, so do not add [V].
 *
 * Tag scope (a tag anywhere in the scope covers the quantities there):
 * - A list item: the marker line and indented continuation lines.
 * - A paragraph: consecutive non-empty lines that are not a heading,
 *   a list item, or a table row.
 * - A table cell.
 * - A table column whose header cell has a tag.
 * - A whole table, when a caption covers it. The caption is the nearest
 *   preceding heading or line that contains a tag (search skips blank
 *   lines and stops at a heading), or the first non-empty line after the
 *   table when that line contains a tag. One tag is enough, including a
 *   line that names more than one kind ("All [C], with yardsticks [S].").
 *   Put a tag on that caption, or in the header or the cell, when you add
 *   a table.
 *
 * Exemptions, masked before number detection:
 * - Fenced code blocks, and inline code spans.
 * - Entire heading lines. That drops section numbers and units in headings.
 * - Dates: YYYY-MM-DD, "Nov 15", "Nov 15 2026", "Nov 15, 2026",
 *   a bare year 19xx or 20xx, and clock times such as 10:33, 12:10 CT, 5:28pm.
 * - IDs: D-01, ED-04, QEXT-200, N.1, A.1, S.1.
 * - Section refs: §2, §2.A.1.
 * - Phrases: "item 7", "items 8, 9, and 15", "row 2.6", "rows 14-16",
 *   "step 1", "table row 15", "recommendation 14", "recommendation numbers 14-16",
 *   "section 3", "case 1".
 * - UI names: "pane 4", "panes 2 to 4". Channel names: "DMX 1", "DMX 4".
 *   "15-channel" and "8 channels" are counts, so they are not exempt.
 * - Ordered-list markers ("1. Beat frequency").
 * - The first cell of a table row when that cell is only an ID
 *   (1, 2.6, N.1, D-01).
 * - File names ending in .md, .py, .txt, .ts, .tsx, .js, .mjs, .json, .pdf.
 * - Version numbers with three or more dot-separated parts (157.0.8103.50).
 * - "port 43117".
 * - Standard names: IEEE 1789, IEC 61000-4-15, IEC TR 61547-1, ISO 5753-1,
 *   CIE TN 006.
 * - Catalog part tokens: 61812, 61813, KA025 and their suffixes,
 *   Edmund 45-403, 49-429, 45-942, the series marks DCX 22 and GPX 22,
 *   alloy 7075 and 7075-T6, "303 SS", and the Nivaflex grade 45/18.
 * - Channel identifiers: "channel 3", "channels 8-9", "ch 4", and a
 *   table cell that is only a channel list under a Ch, #, or ID header.
 *   A count such as "8 channels" or "15-channel" is not exempt.
 * - Unit powers written with a caret, such as m^2. The caret exponent
 *   is not a separate quantity.
 *
 * A times mark or a dimension join is not a separate quantity, but each
 * side is: "14x" and "65x85x10" are read as the numbers 14, and 65, 85, 10.
 *
 * Exit 0 prints "ok". Exit 1 prints one error per problem. Each line names
 * the file, the line number when there is one, and the fix.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const SPEC_HASH =
  "995efb5790190767d4a5bb53b461882b275b5e584cd09c55849d23b9ed453f4a";
const SPEC_PATH = "docs/user-specification.md";
const LOG_PATH = "docs/gemini-revision-deviations.md";
const MATRIX_PATH = "docs/requirements-matrix.md";
const DECISIONS_PATH = "docs/decisions-and-deviations.md";
const STATUSES = new Set([
  "WORKING",
  "OPEN",
  "RESOLVED",
  "SUPERSEDED",
  "OUT_OF_SCOPE",
  "DROPPED",
]);
const TAG_FILES = [MATRIX_PATH, DECISIONS_PATH];
const EM_DASH = "\u2014";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const errors = [];

function rel(path) {
  return relative(root, path).split("\\").join("/");
}

const dumpPath = process.argv.includes("--dump") ? "/tmp/untagged-scopes.txt" : null;
const dumps = [];

function fail(path, line, message) {
  const where = line ? `${path}:${line}` : path;
  errors.push(`${where}: ${message}`);
}

function dumpScope(path, line, kind, text) {
  if (!dumpPath) return;
  const flat = text.replace(/\s+/g, " ").trim();
  dumps.push(`${path}:${line}\t${kind}\t${flat}`);
}

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  return out.split("\0").filter(Boolean);
}

function sha256(path) {
  const buf = readFileSync(resolve(root, path));
  return createHash("sha256").update(buf).digest("hex");
}

function checkSpecHash() {
  let actual;
  try {
    actual = sha256(SPEC_PATH);
  } catch {
    fail(
      SPEC_PATH,
      null,
      `missing file. Restore the byte-locked specification. Expected sha256 ${SPEC_HASH}.`,
    );
    return;
  }
  if (actual !== SPEC_HASH) {
    fail(
      SPEC_PATH,
      null,
      `sha256 is ${actual}, expected ${SPEC_HASH}. Restore the byte-locked text. Do not edit this file to chase the hash.`,
    );
  }
}

function isScannedForDash(path) {
  if (path === SPEC_PATH) return false;
  if (path.startsWith("firmware/")) return true;
  return /\.(md|ts|tsx|js|mjs)$/.test(path);
}

function checkEmDash() {
  for (const path of trackedFiles()) {
    if (!isScannedForDash(path)) continue;
    let text;
    try {
      text = readFileSync(resolve(root, path), "utf8");
    } catch {
      continue;
    }
    if (!text.includes(EM_DASH)) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(EM_DASH)) {
        fail(
          path,
          i + 1,
          "em dash (U+2014). Replace it with a hyphen, comma, colon, or parentheses.",
        );
      }
    }
  }
}

function splitCells(line) {
  const cells = [];
  let cur = "";
  let code = false;
  for (const ch of line) {
    if (ch === "`") code = !code;
    if (ch === "|" && !code) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map((cell) => cell.trim());
}

function isSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseDecisionIndex(text, path) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## Decision index\s*$/.test(line));
  if (start < 0) {
    fail(
      path,
      null,
      'missing "## Decision index". Add that heading and a table with ID and Status columns. Copy the IDs and statuses from the decision log.',
    );
    return null;
  }
  let header = null;
  let idCol = -1;
  let statusCol = -1;
  let started = false;
  const found = new Map();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break;
    if (!line.trim().startsWith("|")) {
      if (started) break;
      continue;
    }
    started = true;
    const cells = splitCells(line);
    if (isSeparator(cells)) continue;
    if (!header) {
      header = cells.map((cell) => cell.toLowerCase());
      idCol = header.indexOf("id");
      statusCol = header.indexOf("status");
      if (idCol < 0 || statusCol < 0) {
        fail(
          path,
          i + 1,
          "Decision index table needs ID and Status columns. Add them.",
        );
        return null;
      }
      continue;
    }
    const id = cells[idCol] ?? "";
    const status = cells[statusCol] ?? "";
    if (!/^D-\d{2,}$/.test(id)) {
      fail(
        path,
        i + 1,
        `decision id "${id}" is not D-01 style. Use D- plus at least two digits.`,
      );
      continue;
    }
    if (!STATUSES.has(status)) {
      fail(
        path,
        i + 1,
        `status "${status}" for ${id} is not an allowed token. Use one of: ${[...STATUSES].join(", ")}.`,
      );
      continue;
    }
    if (found.has(id)) {
      fail(
        path,
        i + 1,
        `${id} is listed twice (also line ${found.get(id).line}). Keep one row.`,
      );
      continue;
    }
    found.set(id, { status, line: i + 1 });
  }
  if (!header) {
    fail(
      path,
      start + 1,
      "Decision index heading has no table under it. Add the ID and Status table.",
    );
    return null;
  }
  return found;
}

function checkDecisions() {
  let logText;
  let matrixText;
  let decisionsText;
  try {
    logText = readFileSync(resolve(root, LOG_PATH), "utf8");
    matrixText = readFileSync(resolve(root, MATRIX_PATH), "utf8");
    decisionsText = readFileSync(resolve(root, DECISIONS_PATH), "utf8");
  } catch (err) {
    fail("docs", null, `could not read a decision file (${err.message}).`);
    return;
  }
  const log = parseDecisionIndex(logText, LOG_PATH);
  const matrix = parseDecisionIndex(matrixText, MATRIX_PATH);
  const decisions = parseDecisionIndex(decisionsText, DECISIONS_PATH);
  if (!log || !matrix || !decisions) return;

  for (const [id, row] of log) {
    for (const [path, index] of [
      [MATRIX_PATH, matrix],
      [DECISIONS_PATH, decisions],
    ]) {
      if (!index.has(id)) {
        fail(
          path,
          null,
          `${id} is in the decision log as ${row.status} but missing here. Add it to the Decision index with status ${row.status}.`,
        );
        continue;
      }
      const other = index.get(id);
      if (other.status !== row.status) {
        fail(
          path,
          other.line,
          `${id} status is ${other.status}, log status is ${row.status}. Set this status to ${row.status}.`,
        );
      }
    }
  }
  for (const [path, index] of [
    [MATRIX_PATH, matrix],
    [DECISIONS_PATH, decisions],
  ]) {
    for (const [id, row] of index) {
      if (!log.has(id)) {
        fail(
          path,
          row.line,
          `${id} is not in the decision log. Remove it here, or add it to the log Decision index with the same status.`,
        );
      }
    }
  }
}

const TAG_RE = /\[(?=[^\]]*?\b(?:T|C|S)\b)[^\]]+\]/;
const V_RE = /\[V\b[^\]]*\]/;

function tagKinds(text) {
  const kinds = new Set();
  const re = /\[([^\]]+)\]/g;
  let match;
  while ((match = re.exec(text))) {
    for (const part of match[1].split(/[^A-Za-z]+/)) {
      if (part === "T" || part === "C" || part === "S") kinds.add(part);
    }
  }
  return kinds;
}

function maskExempt(text) {
  const rules = [
    /`[^`]*`/g,
    /\b(?:19|20)\d{2}-\d{2}-\d{2}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:(?:,)?\s+\d{4})?\b/g,
    /\b(?:19|20)\d{2}\b/g,
    /\^\d+/g,
    /\b7075(?:-T6)?\b/g,
    /\b30[34]\s+SS\b/g,
    /Nivaflex\s+45\/18/g,
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:CT|UTC|am|pm|AM|PM)?\b/g,
    /\bD-\d+\b/g,
    /\bED-\d+\b/g,
    /\bQEXT-\d+\b/g,
    /\b[NAS]\.\d+\b/g,
    /§\s*[0-9]+(?:\.[0-9A-Za-z]+)*/g,
    /\b(?:table\s+rows?|rows?|items?|sections?|steps?|recommendations?|cases?)\s+\d+(?:\.\d+)?(?:(?:\s*,(?:\s+and)?\s+|\s+and\s+|\s+to\s+|\s*[-–]\s*)\d+(?:\.\d+)?)*/gi,
    /\b(?:recommendation|table)\s+numbers?\s+\d+(?:\s*-\s*\d+)?\b/gi,
    /\bpanes?\s+\d+(?:\s*(?:to|and|-)\s*\d+)?\b/gi,
    /\bDMX\s+\d+\b/g,
    /\b[\w./~+-]+\.(?:md|py|txt|ts|tsx|js|mjs|json|pdf)\b/g,
    /\b\d+(?:\.\d+){2,}\b/g,
    /\bport\s+\d+\b/gi,
    /\bIEEE\s+\d+(?:\.\d+)?\b/g,
    /\bIEC(?:\s+TR)?\s+\d+(?:[-:]\d+)*/g,
    /\bISO\s+\d+(?:-\d+)?\b/g,
    /\bCIE\s+TN\s+\d+\b/g,
    /\b(?:61812|61813)(?:-2R[SZ]1?)?\b/g,
    /\bKA0\d+[A-Z0-9]*\b/g,
    /\b(?:45-403|49-429|45-942)\b/g,
    /\b(?:DCX|GPX)\s*22[A-Z0-9]*/g,
    /\b(?:channels?|ch)\s+\d+(?:\s*-\s*\d+)?\b/gi,
  ];
  let out = text;
  for (const rule of rules) {
    out = out.replace(rule, (chunk) => " ".repeat(chunk.length));
  }
  return out;
}

const NUMBER_RE =
  /(?<![A-WYZa-wyz0-9_])(?:\d+\.\d+|\d+)(?:[eE][+-]?\d+)?(?=x(?:\d|\b)|[^A-Za-z0-9_]|$)/g;

function numbersIn(text) {
  const masked = maskExempt(text);
  const found = [];
  let match;
  while ((match = NUMBER_RE.exec(masked))) {
    found.push(match[0]);
  }
  return found;
}

function lineNo(lines, index) {
  return index + 1;
}

function isHeading(line) {
  return /^#{1,6}\s+/.test(line);
}

function isListMarker(line) {
  return /^\s*(?:[-*+]|\d+\.)\s+/.test(line);
}

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

function checkTagsInFile(path) {
  const text = readFileSync(resolve(root, path), "utf8");
  const lines = text.split(/\r?\n/);
  if (V_RE.test(text)) {
    lines.forEach((line, i) => {
      if (V_RE.test(line)) {
        fail(
          path,
          i + 1,
          "tag [V] is not allowed. Nothing is hardware-validated. Use [T], [C], or [S], or delete the claim.",
        );
      }
    });
  }

  const skipLine = new Array(lines.length).fill(false);
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i].trim())) {
      fence = !fence;
      skipLine[i] = true;
      continue;
    }
    if (fence || isHeading(lines[i])) skipLine[i] = true;
  }

  const consumed = new Array(lines.length).fill(false);

  function report(scopeText, lineIndex, scopeName) {
    if (TAG_RE.test(scopeText)) return;
    const nums = numbersIn(scopeText);
    if (nums.length === 0) return;
    dumpScope(path, lineNo(lines, lineIndex), scopeName, scopeText);
    const shown = [...new Set(nums)].slice(0, 8).join(", ");
    const more = nums.length > 8 ? `, and ${nums.length - 8} more` : "";
    fail(
      path,
      lineNo(lines, lineIndex),
      `number ${shown}${more} has no [T], [C], or [S] tag in this ${scopeName}. Add the tag for what the number is. Do not use [V].`,
    );
  }

  for (let i = 0; i < lines.length; i++) {
    if (skipLine[i] || consumed[i]) continue;
    const line = lines[i];
    if (line.trim() === "" || line.trim() === "---") continue;

    if (line.trim().startsWith("|")) {
      const rows = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        rows.push(j);
        consumed[j] = true;
        j++;
      }
      checkTable(lines, rows, path);
      i = j - 1;
      continue;
    }

    if (isListMarker(line)) {
      const base = indentOf(line);
      const chunk = [i];
      consumed[i] = true;
      let j = i + 1;
      while (j < lines.length && !skipLine[j]) {
        if (lines[j].trim() === "") break;
        if (isListMarker(lines[j]) && indentOf(lines[j]) <= base) break;
        if (lines[j].trim().startsWith("|")) break;
        if (indentOf(lines[j]) > base) {
          chunk.push(j);
          consumed[j] = true;
          j++;
          continue;
        }
        break;
      }
      const marker = lines[i].replace(/^\s*\d+\.\s+/, " ");
      const scope = [marker, ...chunk.slice(1).map((n) => lines[n])].join("\n");
      report(scope, i, "list item");
      i = j - 1;
      continue;
    }

    const chunk = [i];
    consumed[i] = true;
    let j = i + 1;
    while (j < lines.length && !skipLine[j]) {
      if (lines[j].trim() === "") break;
      if (isListMarker(lines[j]) || lines[j].trim().startsWith("|")) break;
      chunk.push(j);
      consumed[j] = true;
      j++;
    }
    report(chunk.map((n) => lines[n]).join("\n"), i, "paragraph");
    i = j - 1;
  }
}

function checkTable(lines, rowIndexes, path) {
  const parsed = rowIndexes.map((index) => ({
    index,
    cells: splitCells(lines[index]),
  }));
  const body = [];
  let header = null;
  for (const row of parsed) {
    if (isSeparator(row.cells)) continue;
    if (!header) {
      header = row;
      continue;
    }
    body.push(row);
  }
  if (!header) return;

  const columnTagged = header.cells.map((cell) => TAG_RE.test(cell));
  const defaultTagged = tableDefaultTag(lines, rowIndexes[0], rowIndexes[rowIndexes.length - 1]);

  body.forEach((row) => {
    row.cells.forEach((cell, col) => {
      if (col === 0 && /^(?:D-\d+|\d+(?:\.\d+)?|[NAS]\.\d+)$/.test(cell.trim())) {
        return;
      }
      const headerName = (header.cells[col] || "").replace(/\s+/g, " ").trim().toLowerCase();
      const bareCell = cell.replace(/[*_`]/g, "").trim();
      if (/^(ch|#|id)$/.test(headerName) && /^[\d\s\-–]+$/.test(bareCell)) {
        return;
      }
      if (TAG_RE.test(cell)) return;
      if (columnTagged[col]) return;
      if (defaultTagged) return;
      const nums = numbersIn(cell);
      if (nums.length === 0) return;
      dumpScope(path, row.index + 1, "cell", cell);
      const shown = [...new Set(nums)].slice(0, 8).join(", ");
      fail(
        path,
        row.index + 1,
        `number ${shown} has no [T], [C], or [S] tag in this table cell. Add the tag in the cell or in that column's header. Do not use [V].`,
      );
    });
  });
}

function tableDefaultTag(lines, first, last) {
  if (captionCovers(lines, first, -1)) return true;
  if (captionCovers(lines, last, 1)) return true;
  return false;
}

function captionCovers(lines, start, step) {
  let seen = 0;
  for (let i = start + step; i >= 0 && i < lines.length && seen < 8; i += step) {
    const line = lines[i];
    if (line.trim() === "") continue;
    seen++;
    if (line.trim().startsWith("|")) break;
    const kinds = tagKinds(line);
    if (kinds.size >= 1) return true;
    if (isHeading(line)) break;
    if (step > 0 && seen === 1 && !isHeading(line)) {
      // Only the first non-empty line after a table can caption it.
      break;
    }
  }
  return false;
}

function analysisFiles() {
  return trackedFiles().filter((path) => /^docs\/analysis\/.*\.md$/.test(path));
}

function checkTags() {
  const files = [...TAG_FILES, ...analysisFiles()];
  for (const path of files) {
    checkTagsInFile(path);
  }
}

function selfTest() {
  const samples = [
    ["date", "On Nov 15 2026 at 12:10 CT the note was filed.", []],
    ["year", "Fisher 2005 is a citation year.", []],
    ["caret", "Inertia is kg m^2 in the formula.", []],
    ["code", "See `4.368e-5` and port 43117.", []],
    ["id", "Row 2.6 and item 7 and D-01 and ED-04 stay put.", []],
    ["bare", "The band is 4 Hz.", ["4"]],
    ["tagged", "The band is 4 Hz [T].", []],
    ["cited", "Backlash is 1.2 deg [S GPX].", []],
    ["times", "Reflected inertia is 14x the ring [C].", []],
    ["by", "Screen 1440x900 and 65x85x10 are sizes.", ["1440", "900", "65", "85", "10"]],
  ];
  let bad = 0;
  for (const [name, text, expect] of samples) {
    const got = TAG_RE.test(text) ? [] : numbersIn(text);
    const same =
      got.length === expect.length && got.every((value, i) => value === expect[i]);
    if (!same) {
      console.error(`self-test ${name}: got ${JSON.stringify(got)} expected ${JSON.stringify(expect)}`);
      bad++;
    }
  }
  if (bad) process.exit(1);
  console.log("self-test ok");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  checkSpecHash();
  checkEmDash();
  checkDecisions();
  checkTags();
  if (dumpPath) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(dumpPath, dumps.join("\n") + "\n");
  }
  if (errors.length) {
    for (const error of errors) console.error(error);
    console.error(`${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log("ok");
}
