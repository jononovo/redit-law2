import { headers } from "next/headers";
import { getTenantConfig } from "@/lib/tenants/config";

const landingComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "/creditclaw": () => import("@/components/landings/creditclaw-landing"),
  "/shopy": () => import("@/components/landings/shopy-landing"),
};

export default async function RootPage() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  const loader = landingComponents[tenant.routes.guestLanding];
  const LandingComponent = loader
    ? (await loader()).default
    : (await import("@/components/landings/creditclaw-landing")).default;

  return <LandingComponent />;
}
