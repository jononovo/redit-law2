"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/platform-management/auth/auth-context";
import { AuthDrawer } from "@/components/auth-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenant } from "@/lib/platform-management/tenants/tenant-context";

const DEFAULT_LINKS = [
  { label: "Score Scanner", href: "/agentic-shopping-score" },
  { label: "Shopping Skills", href: "/skills" },
  { label: "AXS", href: "/axs" },
];

export function Nav() {
  const { user, loading } = useAuth();
  const tenant = useTenant();

  const headerConfig = tenant.navigation?.header;
  const isDark = (headerConfig?.variant ?? "light") === "dark";
  const showLogo = headerConfig?.showLogo !== false;
  const links = headerConfig?.links ?? DEFAULT_LINKS;

  return (
    <nav className={`sticky top-0 w-full z-50 backdrop-blur-md border-b ${isDark ? "bg-neutral-950/80 border-neutral-800" : "bg-white/80 border-neutral-100"}`}>
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="group cursor-pointer flex items-center gap-2">
          {showLogo && (
            <Image src={tenant.branding.logo} alt={`${tenant.branding.name} Logo`} width={32} height={32} className="object-contain" />
          )}
          <span className={`font-sans font-bold text-lg tracking-tight ${isDark ? "text-white" : "text-neutral-900"}`}>
            {tenant.branding.name}
          </span>
        </Link>

        {links.length > 0 && (
          <div className={`hidden md:flex items-center gap-8 text-sm font-semibold ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-primary"}`}
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-20 h-10" />
          ) : user ? (
            <Link href={tenant.routes.authLanding} className="flex items-center gap-3">
              <Avatar className="w-8 h-8" data-testid="avatar-user">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" className={`hidden md:flex font-bold cursor-pointer text-sm ${isDark ? "text-neutral-300 hover:bg-neutral-800" : "text-neutral-600 hover:bg-neutral-50"}`}>
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <AuthDrawer redirectTo={tenant.routes.authLanding}>
                <Button variant="ghost" className={`hidden md:flex font-bold cursor-pointer text-sm ${isDark ? "text-neutral-300 hover:bg-neutral-800" : "text-neutral-600 hover:bg-neutral-50"}`} data-testid="button-login">
                  Log in
                </Button>
              </AuthDrawer>
              <AuthDrawer redirectTo={tenant.routes.authLanding}>
                <Button className={`h-9 px-5 font-bold cursor-pointer text-sm ${isDark ? "rounded-none bg-white text-neutral-900 hover:bg-neutral-200" : "rounded-full bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"}`} data-testid="button-signup">
                  Sign Up
                </Button>
              </AuthDrawer>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
