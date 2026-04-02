"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthDrawer } from "@/components/auth-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenant } from "@/lib/tenants/tenant-context";

export function Nav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { user, loading } = useAuth();
  const tenant = useTenant();

  const isDark = variant === "dark";

  return (
    <nav className={`sticky top-0 w-full z-50 backdrop-blur-md border-b ${isDark ? "bg-neutral-950/80 border-neutral-800" : "bg-white/80 border-neutral-100"}`}>
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="group cursor-pointer flex items-center gap-2">
          <Image src={tenant.branding.logo} alt={`${tenant.branding.name} Logo`} width={40} height={40} className="object-contain" />
          <span className={`font-sans font-bold text-xl tracking-tight ${isDark ? "text-white" : "text-neutral-900"}`}>
            {tenant.branding.name}
          </span>
        </Link>

        <div className={`hidden md:flex items-center gap-8 text-sm font-semibold ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
          <Link href="/agentic-shopping-score" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-primary"}`} data-testid="nav-link-scanner">Score Scanner</Link>
          <Link href="/skills" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-primary"}`} data-testid="nav-link-skills">Shopping Skills</Link>
          <Link href="/axs" className={`transition-colors ${isDark ? "hover:text-white" : "hover:text-primary"}`} data-testid="nav-link-axs">AXS</Link>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-20 h-10" />
          ) : user ? (
            <Link href={tenant.routes.authLanding} className="flex items-center gap-3">
              <Avatar className="w-9 h-9" data-testid="avatar-user">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" className={`hidden md:flex font-bold cursor-pointer ${isDark ? "text-neutral-300 hover:bg-neutral-800" : "text-neutral-600 hover:bg-neutral-50"}`}>
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <AuthDrawer redirectTo={tenant.routes.authLanding}>
                <Button variant="ghost" className={`hidden md:flex font-bold cursor-pointer ${isDark ? "text-neutral-300 hover:bg-neutral-800" : "text-neutral-600 hover:bg-neutral-50"}`} data-testid="button-login">
                  Log in
                </Button>
              </AuthDrawer>
              <AuthDrawer redirectTo={tenant.routes.authLanding}>
                <Button className={`rounded-full h-10 px-6 font-bold cursor-pointer ${isDark ? "bg-white text-neutral-900 hover:bg-neutral-200 shadow-lg shadow-white/10" : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"}`} data-testid="button-signup">
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
