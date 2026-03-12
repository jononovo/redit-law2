import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { findPage, sitePages } from "@/docs/content/sections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;

  if (slug.length === 1) {
    const sitePage = sitePages.find((p) => p.slug === slug[0]);
    if (sitePage) {
      const mdPath = path.join(process.cwd(), "docs", "content", sitePage.file);
      let content = "";
      try {
        content = fs.readFileSync(mdPath, "utf-8");
      } catch {
        content = `# ${sitePage.title}\n\nContent not available.`;
      }
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  const found = findPage(slug);

  if (!found) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { section, page } = found;
  const mdPath = path.join(process.cwd(), "docs", "content", ...section.slug.split("/"), `${page.slug}.md`);

  let content = "";
  try {
    content = fs.readFileSync(mdPath, "utf-8");
  } catch {
    content = `# ${page.title}\n\nThis page is coming soon.`;
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
