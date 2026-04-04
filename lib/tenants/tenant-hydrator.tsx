"use client";

import { useEffect, useState } from "react";
import { TenantProvider } from "./tenant-context";
import { getStaticTenantConfig } from "./tenant-configs";
import type { TenantConfig } from "./types";

function readTenantIdFromCookie(): string {
  if (typeof document === "undefined") return "creditclaw";
  const match = document.cookie.match(/tenant-id=([^;]+)/);
  return match?.[1] || "creditclaw";
}

export function TenantHydrator({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig>(() =>
    getStaticTenantConfig(readTenantIdFromCookie())
  );

  useEffect(() => {
    const id = readTenantIdFromCookie();
    const config = getStaticTenantConfig(id);
    setTenant(config);

    if (config.branding.favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.branding.favicon;
    }
  }, []);

  return <TenantProvider tenant={tenant}>{children}</TenantProvider>;
}
