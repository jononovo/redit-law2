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
