import { cookies } from "next/headers";
import { getTenantConfig } from "@/lib/platform-management/tenants/config";

export const dynamic = "force-dynamic";

const landingComponents: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "/creditclaw": () => import("@/components/tenants/creditclaw/landing"),
  "/shopy": () => import("@/components/tenants/shopy/landing"),
  "/brands": () => import("@/components/tenants/brands/landing"),
};

export default async function RootPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenant = getTenantConfig(tenantId);

  const loader = landingComponents[tenant.routes.guestLanding];
  const LandingComponent = loader
    ? (await loader()).default
    : (await import("@/components/tenants/creditclaw/landing")).default;

  return <LandingComponent />;
}
