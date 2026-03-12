import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sections, sitePages } from "@/docs/content/sections";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";

  const parts: string[] = [
    "# CreditClaw — Complete Reference",
    "",
  ];

  parts.push("# Site Overview");
  parts.push("");

  for (const page of sitePages) {
    const mdPath = path.join(process.cwd(), "docs", "content", page.file);
    try {
      const content = fs.readFileSync(mdPath, "utf-8");
      parts.push(content);
    } catch {
      parts.push(`## ${page.title}\n\nContent not available.`);
    }
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  parts.push("## Key Pages");
  parts.push("");
  parts.push(`- Dashboard: ${baseUrl}/app`);
  parts.push(`- Claim a bot: ${baseUrl}/claim`);
  parts.push(`- Onboarding: ${baseUrl}/onboarding`);
  parts.push(`- Privacy policy: ${baseUrl}/privacy`);
  parts.push(`- Terms of service: ${baseUrl}/terms`);
  parts.push("");
  parts.push("---");
  parts.push("");

  parts.push("# Documentation");
  parts.push("");
  parts.push(`Browse online: ${baseUrl}/docs`);
  parts.push("");

  for (const section of sections) {
    parts.push(`# ${section.title} (${section.audience === "user" ? "User Guide" : "Developer Docs"})`);
    parts.push("");

    for (const page of section.pages) {
      const mdPath = path.join(process.cwd(), "docs", "content", ...section.slug.split("/"), `${page.slug}.md`);
      try {
        const content = fs.readFileSync(mdPath, "utf-8");
        parts.push(content);
      } catch {
        parts.push(`## ${page.title}\n\nThis page is coming soon.`);
      }
      parts.push("");
      parts.push("---");
      parts.push("");
    }
  }

  const content = parts.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
