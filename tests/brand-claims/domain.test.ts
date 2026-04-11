import { describe, it, expect } from "vitest";
import {
  extractEmailDomain,
  domainsMatch,
  isFreeEmailProvider,
  canAutoVerifyClaim,
} from "@/features/brand-engine/brand-claims/domain";

describe("extractEmailDomain", () => {
  it("extracts domain from standard email", () => {
    expect(extractEmailDomain("alice@staples.com")).toBe("staples.com");
  });

  it("lowercases the domain", () => {
    expect(extractEmailDomain("Bob@Nike.COM")).toBe("nike.com");
  });

  it("returns empty string for malformed email", () => {
    expect(extractEmailDomain("no-at-sign")).toBe("");
  });

  it("handles email with subdomain", () => {
    expect(extractEmailDomain("team@shop.nike.com")).toBe("shop.nike.com");
  });
});

describe("domainsMatch", () => {
  it("matches exact domains", () => {
    expect(domainsMatch("staples.com", "staples.com")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(domainsMatch("Staples.COM", "staples.com")).toBe(true);
  });

  it("matches email subdomain of brand", () => {
    expect(domainsMatch("shop.nike.com", "nike.com")).toBe(true);
  });

  it("matches brand subdomain of email domain", () => {
    expect(domainsMatch("staples.com", "shop.staples.com")).toBe(true);
  });

  it("rejects completely unrelated domains", () => {
    expect(domainsMatch("gmail.com", "nike.com")).toBe(false);
  });

  it("rejects partial name overlap without subdomain relationship", () => {
    expect(domainsMatch("notstaples.com", "staples.com")).toBe(false);
  });
});

describe("isFreeEmailProvider", () => {
  it("blocks gmail.com", () => {
    expect(isFreeEmailProvider("gmail.com")).toBe(true);
  });

  it("blocks yahoo.com", () => {
    expect(isFreeEmailProvider("yahoo.com")).toBe(true);
  });

  it("blocks outlook.com", () => {
    expect(isFreeEmailProvider("outlook.com")).toBe(true);
  });

  it("blocks protonmail.com", () => {
    expect(isFreeEmailProvider("protonmail.com")).toBe(true);
  });

  it("allows corporate domain", () => {
    expect(isFreeEmailProvider("staples.com")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isFreeEmailProvider("Gmail.Com")).toBe(true);
  });
});

describe("canAutoVerifyClaim", () => {
  it("auto-verifies when email domain matches brand domain", () => {
    expect(canAutoVerifyClaim("ceo@staples.com", "staples.com")).toBe("auto_verify");
  });

  it("auto-verifies with subdomain email", () => {
    expect(canAutoVerifyClaim("team@shop.nike.com", "nike.com")).toBe("auto_verify");
  });

  it("returns manual_review when domains don't match", () => {
    expect(canAutoVerifyClaim("someone@othercorp.com", "staples.com")).toBe("manual_review");
  });

  it("returns manual_review when brand has no domain", () => {
    expect(canAutoVerifyClaim("ceo@staples.com", null)).toBe("manual_review");
  });

  it("blocks free email providers", () => {
    expect(canAutoVerifyClaim("user@gmail.com", "staples.com")).toBe("blocked");
  });

  it("blocks empty email domain", () => {
    expect(canAutoVerifyClaim("no-at-sign", "staples.com")).toBe("blocked");
  });

  it("blocks yahoo even if brand domain is null", () => {
    expect(canAutoVerifyClaim("user@yahoo.com", null)).toBe("blocked");
  });
});
