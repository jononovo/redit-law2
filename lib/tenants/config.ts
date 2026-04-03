import fs from "fs";
import path from "path";
import type { TenantConfig } from "./types";

const cache = new Map<string, TenantConfig>();

export function getTenantConfig(tenantId: string): TenantConfig {
  if (cache.has(tenantId)) return cache.get(tenantId)!;

  const configPath = path.join(
    process.cwd(),
    "public",
    "tenants",
    tenantId,
    "config.json"
  );

  try {
    const config: TenantConfig = JSON.parse(
      fs.readFileSync(configPath, "utf-8")
    );
    cache.set(tenantId, config);
    return config;
  } catch {
    if (tenantId !== "creditclaw") {
      return getTenantConfig("creditclaw");
    }
    throw new Error(`Failed to load tenant config for "${tenantId}"`);
  }
}

const DEFAULT_TENANT = "creditclaw";

export function resolveTenantId(hostname: string): string {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");

  const tenantDirs = getTenantDirs();
  for (const tenantId of tenantDirs) {
    const config = getTenantConfig(tenantId);
    for (const domain of config.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
      if (
        normalizedHost === normalizedDomain ||
        normalizedHost.endsWith("." + normalizedDomain)
      ) {
        return tenantId;
      }
    }
  }

  return DEFAULT_TENANT;
}

let tenantDirsCache: string[] | null = null;

function getTenantDirs(): string[] {
  if (tenantDirsCache) return tenantDirsCache;

  const tenantsDir = path.join(process.cwd(), "public", "tenants");
  try {
    tenantDirsCache = fs.readdirSync(tenantsDir).filter((entry) => {
      const entryPath = path.join(tenantsDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
  } catch {
    tenantDirsCache = [DEFAULT_TENANT];
  }
  return tenantDirsCache;
}
