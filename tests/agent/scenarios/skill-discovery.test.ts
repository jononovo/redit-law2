import { describe, it, expect } from "vitest";
import { fetchSkillJson, fetchSkillMd, validateSkillJson } from "../lib/skill-parser";

describe("Skill Discovery", () => {
  it("skill.json is accessible and returns 200", async () => {
    const { status, data } = await fetchSkillJson();
    expect(status).toBe(200);
    expect(data).not.toBeNull();
  });

  it("skill.json has required fields", async () => {
    const { data } = await fetchSkillJson();
    expect(data).not.toBeNull();
    const errors = validateSkillJson(data!);
    expect(errors).toEqual([]);
  });

  it("skill.md is accessible and returns 200", async () => {
    const { status, content } = await fetchSkillMd();
    expect(status).toBe(200);
    expect(content).toBeTruthy();
  });

  it("skill.md has parseable frontmatter", async () => {
    const { frontmatter } = await fetchSkillMd();
    expect(frontmatter).not.toBeNull();
  });

  it("skill.json and skill.md versions match", async () => {
    const [json, md] = await Promise.all([fetchSkillJson(), fetchSkillMd()]);
    if (!json.data?.version || !md.frontmatter?.version) {
      console.warn("Skipping version match — one or both versions missing");
      return;
    }
    expect(json.data.version).toBe(md.frontmatter.version);
  });

  it("skill.json and skill.md api_base match", async () => {
    const [json, md] = await Promise.all([fetchSkillJson(), fetchSkillMd()]);
    if (!json.data?.api_base || !md.frontmatter?.api_base) {
      console.warn("Skipping api_base match — one or both api_base values missing");
      return;
    }
    expect(json.data.api_base).toBe(md.frontmatter.api_base);
  });
});
