"use client";

import Image from "next/image";
import Link from "next/link";
import { useTenant } from "@/lib/tenants/tenant-context";

const DEFAULT_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Vendor Skills", href: "/skills" },
      { label: "Score Scanner", href: "/agentic-shopping-score" },
    ],
  },
];

const DEFAULT_SOCIALS = [
  { label: "Twitter", href: "#" },
];

export function Footer() {
  const tenant = useTenant();
  const year = new Date().getFullYear();

  const columns = tenant.navigation?.footer?.columns ?? DEFAULT_COLUMNS;
  const socials = tenant.navigation?.footer?.socials ?? DEFAULT_SOCIALS;

  return (
    <footer className="bg-neutral-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" data-testid="footer-logo-link">
              <Image src={tenant.branding.logo} alt={`${tenant.branding.name} Logo`} width={32} height={32} className="object-contain" />
              <span className="font-bold text-lg tracking-tight">{tenant.branding.name}</span>
            </Link>
            <p className="text-sm text-neutral-400 font-medium leading-relaxed">
              {tenant.branding.tagline}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-300 mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-neutral-400 hover:text-white transition-colors font-medium"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-neutral-400 hover:text-white transition-colors font-medium"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {socials.length > 0 && (
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-300 mb-4">Connect</h4>
              <ul className="space-y-3">
                {socials.map((s) => (
                  <li key={s.href + s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-400 hover:text-white transition-colors font-medium"
                      data-testid={`footer-link-${s.label.toLowerCase()}`}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500 font-medium gap-4">
          <span>&copy; {year} {tenant.branding.name}. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors" data-testid="footer-link-terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
