import { cookies } from "next/headers";
import { getTenantConfig } from "@/features/platform-management/tenants/config";

export const dynamic = "force-dynamic";

const howItWorksComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  creditclaw: () => import("@/components/tenants/creditclaw/how-it-works"),
  shopy: () => import("@/components/tenants/shopy/how-it-works"),
  brands: () => import("@/components/tenants/brands/how-it-works"),
};

export default async function HowItWorksPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  const loader = howItWorksComponents[tenant.id];
  const HowItWorksComponent = loader
    ? (await loader()).default
    : (await import("@/components/tenants/creditclaw/how-it-works")).default;

  return <HowItWorksComponent />;
}
