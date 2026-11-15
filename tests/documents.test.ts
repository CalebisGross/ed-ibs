import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROVENANCE } from "../src/physics/constants";

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("preserved source documents", () => {
  it("keeps the user specification byte for byte", () => {
    const path = "docs/user-specification.md";
    const text = readFileSync(path, "utf8");
    expect(sha256(path)).toBe(PROVENANCE.userSpecificationSha256);
    expect(text.startsWith("# SYSTEM SPECIFICATION: ED-IBS Opto-Mechanical Horological Simulator & Designer Studio")).toBe(
      true,
    );
    expect(text).toContain("src/physics/EscapementSolver.ts");
    expect(text).toContain("K_{\\text{base}} = 0.1104");
  });

  it("keeps the preimplementation audit byte for byte", () => {
    const path = "docs/spec-audit.md";
    expect(sha256(path)).toBe(PROVENANCE.specAuditSha256);
    expect(readFileSync(path, "utf8").startsWith("# ED-IBS initial specification audit")).toBe(true);
  });
});
