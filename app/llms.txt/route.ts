import { NextResponse } from "next/server";
import { sections, sitePages, getSectionsByAudience } from "@/docs/content/sections";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://creditclaw.com";
  const userSections = getSectionsByAudience("user");
  const devSections = getSectionsByAudience("developer");

  const lines: string[] = [
    "# CreditClaw",
    "",
    "> CreditClaw is a financial infrastructure platform that gives AI agents the ability to spend money on your behalf — safely, with limits you control. Think of it as giving your bot a debit card with strict guardrails: spending caps, category restrictions, and approval workflows that keep you in the loop.",
    "",
    "## About",
    "",
    "CreditClaw provides prepaid wallets, multi-rail payment support (Stripe, crypto, self-hosted cards), spending controls, and a bot-facing API for autonomous purchases, invoicing, checkout pages, and sales. It is built for anyone who operates AI agents that need to make purchases or payments as part of their workflow.",
    "",
    `- Main site: ${baseUrl}`,
    `- Dashboard: ${baseUrl}/app`,
    `- Documentation: ${baseUrl}/docs`,
    `- API base URL: ${baseUrl}/api/v1/`,
    "",
    `- [Full documentation (all pages, single file)](${baseUrl}/llms-full.txt)`,
    "",
    "## Site Pages",
    "",
  ];

  for (const page of sitePages) {
    lines.push(`- [${page.title}](${baseUrl}/api/docs/${page.slug}): ${page.url}`);
  }

  lines.push("");
  lines.push("## User Guide");
  lines.push("");

  for (const section of userSections) {
    for (const page of section.pages) {
      lines.push(`- [${page.title}](${baseUrl}/api/docs/${section.slug}/${page.slug}): ${section.title}`);
    }
  }

  lines.push("");
  lines.push("## Developer Documentation");
  lines.push("");

  for (const section of devSections) {
    for (const page of section.pages) {
      lines.push(`- [${page.title}](${baseUrl}/api/docs/${section.slug}/${page.slug}): ${section.title}`);
    }
  }

  lines.push("");

  const content = lines.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
