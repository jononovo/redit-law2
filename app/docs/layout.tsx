"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { PanelLeft, Book, Code } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  sections,
  getSectionsByAudience,
  getAudienceFromSlug,
  type Audience,
  type DocSection,
} from "@/docs/content/sections";

function Sidebar({
  audience,
  currentPath,
  onNavigate,
}: {
  audience: Audience;
  currentPath: string;
  onNavigate?: () => void;
}) {
  const filteredSections = getSectionsByAudience(audience);
  const userFirstPage = getSectionsByAudience("user")[0];
  const devFirstPage = getSectionsByAudience("developer")[0];
  const userHref = userFirstPage ? `/docs/${userFirstPage.slug}/${userFirstPage.pages[0].slug}` : "/docs";
  const devHref = devFirstPage ? `/docs/${devFirstPage.slug}/${devFirstPage.pages[0].slug}` : "/docs";

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={onNavigate}
            data-testid="link-home"
          >
            <Image src="/images/logo-claw-chip.png" alt="CreditClaw" width={28} height={28} className="object-contain" />
            <span className="text-base font-bold text-neutral-900">CreditClaw</span>
          </Link>
          <Link
            href="/docs"
            className="text-base font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
            onClick={onNavigate}
            data-testid="link-docs-home"
          >
            Docs
          </Link>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <Link
            href={userHref}
            onClick={onNavigate}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              audience === "user"
                ? "text-neutral-900"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
            data-testid="link-audience-user"
          >
            <Book className="w-3.5 h-3.5" />
            User Guide
          </Link>
          <Link
            href={devHref}
            onClick={onNavigate}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              audience === "developer"
                ? "text-neutral-900"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
            data-testid="link-audience-developer"
          >
            <Code className="w-3.5 h-3.5" />
            Developers
          </Link>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-5" data-testid="docs-sidebar-nav">
        {filteredSections.map((section) => (
          <SidebarSection
            key={section.slug}
            section={section}
            currentPath={currentPath}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}

function SidebarSection({
  section,
  currentPath,
  onNavigate,
}: {
  section: DocSection;
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
        {section.title}
      </h3>
      <ul className="space-y-0.5">
        {section.pages.map((page) => {
          const href = `/docs/${section.slug}/${page.slug}`;
          const isActive = currentPath === href;
          return (
            <li key={page.slug}>
              <Link
                href={href}
                onClick={onNavigate}
                className={`block text-sm py-1.5 px-3 rounded-md transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white font-medium"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
                data-testid={`link-doc-${section.slug}-${page.slug}`}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const slugParts = pathname.replace("/docs/", "").replace("/docs", "").split("/").filter(Boolean);
  const audience: Audience = slugParts.length > 0 ? getAudienceFromSlug(slugParts) : "user";

  return (
    <div className="min-h-screen bg-white flex" data-testid="docs-layout">
      <aside className="hidden lg:flex flex-col w-72 border-r border-neutral-200 sticky top-0 h-screen shrink-0">
        <Sidebar
          audience={audience}
          currentPath={pathname}
        />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home-mobile">
          <Image src="/images/logo-claw-chip.png" alt="CreditClaw" width={28} height={28} className="object-contain" />
          <span className="text-base font-bold text-neutral-900">CreditClaw</span>
        </Link>
        <Link
          href="/docs"
          className="text-base font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
          data-testid="link-docs-home-mobile"
        >
          Docs
        </Link>
        <div className="ml-auto">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
            data-testid="button-mobile-menu"
          >
            <PanelLeft className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="p-0 max-w-[80%] w-72">
          <SheetTitle className="sr-only">Documentation navigation</SheetTitle>
          <Sidebar
            audience={audience}
            currentPath={pathname}
            onNavigate={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 lg:py-0 pt-14">
        {children}
      </main>
    </div>
  );
}
