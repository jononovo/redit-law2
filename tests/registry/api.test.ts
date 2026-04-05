import { describe, it, expect } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

describe("registry API", () => {
  describe("GET /api/v1/registry", () => {
    it("returns paginated skill list", async () => {
      const res = await fetch(`${BASE}/api/v1/registry?limit=3`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBeGreaterThan(0);
      expect(data.skills).toBeDefined();
    });

    it("excludes draft brands by default", async () => {
      const res = await fetch(`${BASE}/api/v1/registry?limit=100`);
      const data = await res.json();
      const maturities = data.skills?.map((b: { maturity: string }) => b.maturity) ?? [];
      expect(maturities).not.toContain("draft");
    });
  });

  describe("GET /api/v1/registry/search", () => {
    it("finds brands by name", async () => {
      const res = await fetch(`${BASE}/api/v1/registry/search?q=nike`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBeGreaterThanOrEqual(1);
    });

    it("returns empty for nonsense query", async () => {
      const res = await fetch(`${BASE}/api/v1/registry/search?q=zzzzzznotabrand`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(0);
    });
  });

  describe("GET /api/v1/registry/[vendor]/skill-json", () => {
    it("returns skill.json for existing brand", async () => {
      const res = await fetch(`${BASE}/api/v1/registry/nike/skill-json`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.taxonomy?.sector).toBeDefined();
    });

    it("returns 404 for nonexistent brand", async () => {
      const res = await fetch(`${BASE}/api/v1/registry/nonexistent-brand-xyz/skill-json`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/registry/[vendor]/skill-md", () => {
    it("returns markdown for existing brand", async () => {
      const res = await fetch(`${BASE}/api/v1/registry/nike/skill-md`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(100);
    });

    it("returns 404 for nonexistent brand", async () => {
      const res = await fetch(`${BASE}/api/v1/registry/nonexistent-brand-xyz/skill-md`);
      expect(res.status).toBe(404);
    });
  });
});

describe("brands API", () => {
  describe("GET /api/v1/brands", () => {
    it("returns paginated results", async () => {
      const res = await fetch(`${BASE}/api/v1/brands?limit=5&lite=true`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBeGreaterThan(0);
      expect(data.brands.length).toBeLessThanOrEqual(5);
    });

    it("supports offset pagination with different results per page", async () => {
      const page1 = await (await fetch(`${BASE}/api/v1/brands?limit=10&offset=0&lite=true`)).json();
      const page2 = await (await fetch(`${BASE}/api/v1/brands?limit=10&offset=10&lite=true`)).json();
      expect(page1.total).toBe(page2.total);
      expect(page1.brands.length).toBe(10);
      expect(page2.brands.length).toBeGreaterThan(0);
      expect(page2.brands.length).toBeLessThanOrEqual(10);
    });

    it("supports search via q param", async () => {
      const res = await fetch(`${BASE}/api/v1/brands?q=nike&lite=true`);
      const data = await res.json();
      expect(data.total).toBeGreaterThanOrEqual(1);
      expect(data.brands[0].name.toLowerCase()).toContain("nike");
    });

    it("supports sector filter", async () => {
      const res = await fetch(`${BASE}/api/v1/brands?sector=apparel-accessories&lite=true`);
      const data = await res.json();
      expect(data.total).toBeGreaterThan(0);
      data.brands.forEach((b: { sector: string }) => {
        expect(b.sector).toBe("apparel-accessories");
      });
    });
  });
});

describe("sector pages", () => {
  it("/c/apparel-accessories returns 200", async () => {
    const res = await fetch(`${BASE}/c/apparel-accessories`);
    expect(res.status).toBe(200);
  });

  it("/c/electronics returns 200", async () => {
    const res = await fetch(`${BASE}/c/electronics`);
    expect(res.status).toBe(200);
  });

  it("/c/nonexistent-sector returns 404", async () => {
    const res = await fetch(`${BASE}/c/nonexistent-sector`);
    expect(res.status).toBe(404);
  });
});

describe("brand detail pages", () => {
  it("/skills/nike returns 200", async () => {
    const res = await fetch(`${BASE}/skills/nike`);
    expect(res.status).toBe(200);
  });

  it("/skills/nonexistent returns 404", async () => {
    const res = await fetch(`${BASE}/skills/nonexistent-brand-xyz`);
    expect(res.status).toBe(404);
  });
});
