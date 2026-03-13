import type { SkillJson, SkillMdFrontmatter } from "./types";

const DEFAULT_BASE_URL = "https://creditclaw.com";

function getBaseUrl(): string {
  return process.env.TEST_BASE_URL || DEFAULT_BASE_URL;
}

export async function fetchSkillJson(): Promise<{ status: number; data: SkillJson | null }> {
  const url = `${getBaseUrl()}/skill.json`;
  const res = await fetch(url);
  if (!res.ok) return { status: res.status, data: null };
  const data = (await res.json()) as SkillJson;
  return { status: res.status, data };
}

export async function fetchSkillMd(): Promise<{ status: number; content: string | null; frontmatter: SkillMdFrontmatter | null }> {
  const url = `${getBaseUrl()}/skill.md`;
  const res = await fetch(url);
  if (!res.ok) return { status: res.status, content: null, frontmatter: null };
  const content = await res.text();
  const frontmatter = parseFrontmatter(content);
  return { status: res.status, content, frontmatter };
}

function parseFrontmatter(md: string): SkillMdFrontmatter | null {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const result: SkillMdFrontmatter = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

export function validateSkillJson(data: SkillJson): string[] {
  const errors: string[] = [];
  if (!data.name) errors.push("missing 'name'");
  if (!data.version) errors.push("missing 'version'");
  if (!data.description) errors.push("missing 'description'");
  return errors;
}
