import { describe, it, expect } from "vitest";
import { resolveMaturity } from "@/lib/brand-engine/agentic-score/scan-utils";

describe("resolveMaturity", () => {
  it("promotes draft to community when all signals present", () => {
    expect(resolveMaturity("draft", true, true, true)).toBe("community");
  });

  it("promotes null maturity to community when all signals present", () => {
    expect(resolveMaturity(null, true, true, true)).toBe("community");
  });

  it("stays draft when score is missing", () => {
    expect(resolveMaturity("draft", false, true, true)).toBe("draft");
  });

  it("stays draft when skillMd is missing", () => {
    expect(resolveMaturity("draft", true, false, true)).toBe("draft");
  });

  it("stays draft when brandData is missing", () => {
    expect(resolveMaturity("draft", true, true, false)).toBe("draft");
  });

  it("stays draft when all signals are missing", () => {
    expect(resolveMaturity("draft", false, false, false)).toBe("draft");
  });

  it("never demotes community", () => {
    expect(resolveMaturity("community", false, false, false)).toBe("community");
  });

  it("never demotes beta", () => {
    expect(resolveMaturity("beta", false, false, false)).toBe("beta");
  });

  it("never demotes verified", () => {
    expect(resolveMaturity("verified", false, false, false)).toBe("verified");
  });

  it("never demotes official", () => {
    expect(resolveMaturity("official", false, false, false)).toBe("official");
  });

  it("preserves verified even when all signals present", () => {
    expect(resolveMaturity("verified", true, true, true)).toBe("verified");
  });

  it("preserves official even when all signals present", () => {
    expect(resolveMaturity("official", true, true, true)).toBe("official");
  });
});
