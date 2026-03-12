"use client";

import { useAuth } from "@/lib/auth/auth-context";
import type { Tier } from "./tiers";

export function useHasAccess(tier: Tier): boolean {
  const { user } = useAuth();
  return user?.flags?.includes(tier) ?? false;
}
