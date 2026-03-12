"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthDrawer } from "@/components/auth-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Nav() {
  const { user, loading } = useAuth();

  return (
    <nav className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="group cursor-pointer flex items-center gap-2">
          <Image src="/images/logo-claw-chip.png" alt="CreditClaw Logo" width={40} height={40} className="object-contain" />
          <span className="font-sans font-bold text-xl tracking-tight text-neutral-900">
            CreditClaw
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-500">
          <Link href="/how-it-works" className="hover:text-primary transition-colors" data-testid="nav-link-how-it-works">How it Works</Link>
          <Link href="/allowance" className="hover:text-primary transition-colors" data-testid="nav-link-allowance">Allowance</Link>
          <Link href="/skills" className="hover:text-primary transition-colors" data-testid="nav-link-skills">Skills</Link>
          <Link href="/safety" className="hover:text-primary transition-colors" data-testid="nav-link-safety">Safety</Link>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-20 h-10" />
          ) : user ? (
            <Link href="/overview" className="flex items-center gap-3">
              <Avatar className="w-9 h-9" data-testid="avatar-user">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" className="hidden md:flex font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <AuthDrawer>
                <Button variant="ghost" className="hidden md:flex font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer" data-testid="button-login">
                  Log in
                </Button>
              </AuthDrawer>
              <AuthDrawer>
                <Button className="rounded-full h-10 px-6 bg-primary text-white hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 cursor-pointer" data-testid="button-signup">
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
