import fs from "fs";
import path from "path";
import Link from "next/link";
import { BookOpen, ChevronRight, ArrowRight, List } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTenantConfig } from "@/lib/platform-management/tenants/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);
  const brandName = tenant.branding.name;

  return {
    title: `Agentic Commerce Standard | ${brandName}`,
    description:
      "The canonical definition of the agentic procurement metadata standard and the ASX Score & AXS Rating system. A vendor-neutral, platform-agnostic specification for AI agent commerce.",
    openGraph: {
      title: `Agentic Commerce Standard | ${brandName}`,
      description:
        "The open standard for agentic commerce — metadata, scoring, and rating framework for AI shopping agents.",
      type: "website",
    },
  };
}

function extractHeadings(markdown: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      headings.push({ id, text, level });
    }
  }

  return headings;
}

function MarkdownRenderer({ content }: { content: string }) {
  const sections = content.split(/^(?=# )/m);

  return (
    <div className="space-y-0">
      {sections.map((section, i) => {
        if (!section.trim()) return null;
        return <MarkdownSection key={i} content={section} />;
      })}
    </div>
  );
}

function MarkdownSection({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      const lang = line.trim().replace("```", "");
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-neutral-950 text-neutral-300 font-mono text-sm p-6 overflow-x-auto my-6 border border-neutral-800">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("# ") && !line.startsWith("## ")) {
      const text = line.replace(/^# /, "").replace(/\*\*/g, "");
      const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      elements.push(
        <h1 key={`h1-${elements.length}`} id={id} className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 mt-16 mb-6 first:mt-0 scroll-mt-24">
          {text}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.replace(/^## /, "").replace(/\*\*/g, "");
      const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      elements.push(
        <h2 key={`h2-${elements.length}`} id={id} className="text-2xl font-extrabold tracking-tight text-neutral-900 mt-12 mb-4 scroll-mt-24">
          {text}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      const text = line.replace(/^### /, "").replace(/\*\*/g, "");
      const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      elements.push(
        <h3 key={`h3-${elements.length}`} id={id} className="text-xl font-bold text-neutral-900 mt-8 mb-3 scroll-mt-24">
          {text}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${elements.length}`} lines={tableLines} />);
      continue;
    }

    if (line.startsWith("---")) {
      elements.push(<hr key={`hr-${elements.length}`} className="my-8 border-neutral-200" />);
      i++;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* ") || lines[i].startsWith("  "))) {
        listItems.push(lines[i]);
        i++;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-4 space-y-2">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-sm text-neutral-600 leading-relaxed font-medium">
              <span className="text-neutral-400 mt-0.5 font-mono text-xs shrink-0">&rarr;</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item.replace(/^[-*]\s+/, "").replace(/^\s+/, "")) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && (/^\d+\.\s/.test(lines[i]) || lines[i].startsWith("   "))) {
        listItems.push(lines[i]);
        i++;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-4 space-y-2">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-sm text-neutral-600 leading-relaxed font-medium">
              <span className="text-neutral-400 mt-0.5 font-mono text-xs shrink-0">{String(j + 1).padStart(2, "0")}</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item.replace(/^\d+\.\s+/, "")) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote key={`bq-${elements.length}`} className="border-l-2 border-neutral-300 pl-6 my-6 text-sm text-neutral-500 italic leading-relaxed">
          {quoteLines.join(" ")}
        </blockquote>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    elements.push(
      <p key={`p-${elements.length}`} className="text-sm text-neutral-600 leading-relaxed font-medium my-4" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
    );
    i++;
  }

  return <>{elements}</>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-neutral-900 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-neutral-100 text-neutral-800 font-mono text-xs px-1.5 py-0.5">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-colors">$1</a>');
}

function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line.split("|").slice(1, -1).map((cell) => cell.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border border-neutral-200 text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 text-xs font-bold text-neutral-400 uppercase tracking-wider" dangerouslySetInnerHTML={{ __html: formatInline(h) }} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-neutral-600 font-medium" dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StandardPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  const mdPath = path.join(process.cwd(), "content", "agentic-commerce-standard.md");
  let content = "";
  try {
    content = fs.readFileSync(mdPath, "utf-8");
  } catch {
    content = "# Agentic Commerce Standard\n\nContent coming soon.";
  }

  const headings = extractHeadings(content);
  const tocHeadings = headings.filter((h) => h.level <= 2);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      <div className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium" aria-label="Breadcrumb" data-testid="breadcrumb">
            <Link href="/" className="hover:text-neutral-600 transition-colors" data-testid="breadcrumb-home">
              {tenant.branding.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-neutral-600" data-testid="breadcrumb-standard">Standard</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-12">
          <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto py-8 border-r border-neutral-200 pr-6" data-testid="toc-sidebar">
            <div className="flex items-center gap-2 mb-6">
              <List className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Contents</span>
            </div>
            <nav className="space-y-1">
              {tocHeadings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`block text-sm transition-colors hover:text-neutral-900 ${
                    heading.level === 1
                      ? "font-semibold text-neutral-700 py-1.5"
                      : "text-neutral-500 font-medium py-1 pl-3 border-l border-neutral-200"
                  }`}
                  data-testid={`toc-${heading.id}`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 py-8 max-w-4xl">
            <div className="border border-neutral-200 p-8 mb-10 flex items-start gap-6" data-testid="card-non-dev-callout">
              <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-neutral-700" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">Not a developer?</h3>
                <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-3">
                  This is the technical specification. For a plain-language explanation of what agentic commerce means for your brand, read the guide.
                </p>
                <Link
                  href="/guide"
                  className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                  data-testid="link-guide-callout"
                >
                  Read the merchant guide <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <article data-testid="standard-content">
              <MarkdownRenderer content={content} />
            </article>

            <div className="mt-16 pt-8 border-t border-neutral-200">
              <div className="flex flex-col sm:flex-row gap-6">
                <Link
                  href="/guide"
                  className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                  data-testid="link-guide-footer"
                >
                  Merchant guide <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/agentic-shopping-score"
                  className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                  data-testid="link-scanner-footer"
                >
                  Check your ASX Score <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/skills"
                  className="text-sm font-semibold text-neutral-900 hover:underline underline-offset-4 flex items-center gap-1.5"
                  data-testid="link-catalog-footer"
                >
                  Browse the catalog <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
