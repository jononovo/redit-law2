import { headers } from "next/headers";
import { getTenantConfig } from "./config";
import type { TenantConfig } from "./types";

export async function getRequestTenant(): Promise<TenantConfig> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") || "creditclaw";
  return getTenantConfig(tenantId);
}

export async function getRequestTenantId(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-tenant-id") || "creditclaw";
}
