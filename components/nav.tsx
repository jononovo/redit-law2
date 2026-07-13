"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { AuthDrawer } from "@/components/auth-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenant } from "@/features/platform-management/tenants/tenant-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DEFAULT_LINKS = [
  { label: "Score Scanner", href: "/agentic-shopping-score" },
  { label: "Shopping Skills", href: "/skills" },
  { label: "AXS", href: "/axs" },
];

export function Nav() {
  const { user, loading } = useAuth();
  const tenant = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);

  const headerConfig = tenant.navigation?.header;
  const isDark = (headerConfig?.variant ?? "light") === "dark";
  const showLogo = headerConfig?.showLogo !== false;
  const links = headerConfig?.links ?? DEFAULT_LINKS;

  const openAuthFromMobileMenu = () => {
    setMobileMenuOpen(false);
    setTimeout(() => setAuthDrawerOpen(true), 150);
  };

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

        <div className="flex items-center gap-2 md:gap-4">
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
              {tenant.id !== "creditclaw" && (
                <AuthDrawer redirectTo={tenant.routes.authLanding}>
                  <Button className={`hidden md:flex h-9 px-5 font-bold cursor-pointer text-sm ${isDark ? "rounded-none bg-white text-neutral-900 hover:bg-neutral-200" : "rounded-full bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"}`} data-testid="button-signup">
                    Sign Up
                  </Button>
                </AuthDrawer>
              )}
            </>
          )}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden ${isDark ? "text-neutral-300 hover:bg-neutral-800" : "text-neutral-600 hover:bg-neutral-50"}`}
                data-testid="button-mobile-menu"
              >
                <Menu className="w-5 h-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={`w-72 flex flex-col ${isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white"}`}
            >
              <SheetHeader className="text-left">
                <SheetTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-neutral-900"}`}>
                  {showLogo && (
                    <Image src={tenant.branding.logo} alt={`${tenant.branding.name} Logo`} width={24} height={24} className="object-contain" />
                  )}
                  {tenant.branding.name}
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 mt-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-3 rounded-xl text-base font-semibold transition-colors ${isDark ? "text-neutral-300 hover:bg-neutral-900 hover:text-white" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"}`}
                    data-testid={`mobile-nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className={`mt-auto pt-4 border-t ${isDark ? "border-neutral-800" : "border-neutral-100"}`}>
                {user ? (
                  <Link href={tenant.routes.authLanding} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full h-12 rounded-full font-bold" data-testid="button-mobile-dashboard">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={openAuthFromMobileMenu}
                      className={`w-full h-12 font-bold ${isDark ? "rounded-none bg-white text-neutral-900 hover:bg-neutral-200" : "rounded-full bg-primary text-white hover:bg-primary/90"}`}
                      data-testid="button-mobile-signup"
                    >
                      Sign Up
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={openAuthFromMobileMenu}
                      className={`w-full h-12 font-bold ${isDark ? "text-neutral-300 hover:bg-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}
                      data-testid="button-mobile-login"
                    >
                      Log in
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <AuthDrawer
            open={authDrawerOpen}
            onOpenChange={setAuthDrawerOpen}
            redirectTo={tenant.routes.authLanding}
          />
        </div>
      </div>
    </nav>
  );
}
