"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { PanelLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  sections,
  type DocSection,
} from "@/app/docs/content/sections";
import { getTenantIdFromCookie } from "@/features/platform-management/tenants/tenant-context";

const TENANT_BRANDING: Record<string, { name: string; logo: string }> = {
  creditclaw: { name: "CreditClaw", logo: "/assets/images/logo-claw-chip.png" },
  shopy: { name: "shopy.sh", logo: "/assets/images/logo-claw-chip.png" },
  brands: { name: "brands.sh", logo: "/tenants/brands/images/logo.png" },
};

function Sidebar({
  currentPath,
  onNavigate,
  tenant,
}: {
  currentPath: string;
  onNavigate?: () => void;
  tenant: string;
}) {
  const branding = TENANT_BRANDING[tenant] || TENANT_BRANDING.creditclaw;

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
            <Image src={branding.logo} alt={branding.name} width={28} height={28} className="object-contain" />
            <span className="text-base font-bold text-neutral-900">{branding.name}</span>
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
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-5" data-testid="docs-sidebar-nav">
        {sections.map((section) => (
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
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        {section.title}
        {section.tag && (
          <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded normal-case tracking-normal">
            {section.tag}
          </span>
        )}
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

  const cookieTenant = getTenantIdFromCookie();
  const tenant = cookieTenant || "creditclaw";
  const branding = TENANT_BRANDING[tenant] || TENANT_BRANDING.creditclaw;

  return (
    <div className="min-h-screen bg-white flex" data-testid="docs-layout">
      <aside className="hidden lg:flex flex-col w-72 border-r border-neutral-200 sticky top-0 h-screen shrink-0">
        <Sidebar
          currentPath={pathname}
          tenant={tenant}
        />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home-mobile">
          <Image src={branding.logo} alt={branding.name} width={28} height={28} className="object-contain" />
          <span className="text-base font-bold text-neutral-900">{branding.name}</span>
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
            currentPath={pathname}
            onNavigate={() => setDrawerOpen(false)}
            tenant={tenant}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 lg:py-0 pt-14">
        {children}
      </main>
    </div>
  );
}
