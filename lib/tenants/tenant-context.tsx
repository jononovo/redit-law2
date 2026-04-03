"use client";

import { createContext, useContext } from "react";
import type { TenantConfig } from "./types";

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantConfig {
  const context = useContext(TenantContext);
  if (!context)
    throw new Error("useTenant must be used within TenantProvider");
  return context;
}

export function getTenantIdFromCookie(): string {
  if (typeof document === "undefined") return "creditclaw";
  const match = document.cookie.match(/tenant-id=([^;]+)/);
  return match?.[1] || "creditclaw";
}
