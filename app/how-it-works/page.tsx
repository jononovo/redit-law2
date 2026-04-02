import { headers } from "next/headers";
import { getTenantConfig } from "@/lib/tenants/config";

const howItWorksComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  creditclaw: () => import("@/components/tenants/creditclaw/how-it-works"),
  shopy: () => import("@/components/tenants/shopy/how-it-works"),
  brands: () => import("@/components/tenants/brands/how-it-works"),
};

export default async function HowItWorksPage() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  const loader = howItWorksComponents[tenant.id];
  const HowItWorksComponent = loader
    ? (await loader()).default
    : (await import("@/components/tenants/creditclaw/how-it-works")).default;

  return <HowItWorksComponent />;
}
