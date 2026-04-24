import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sections } from "@/app/docs/content/sections";
import { getTenantConfig } from "@/features/platform-management/tenants/config";

export default async function DocsIndexPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("tenant-id")?.value || "creditclaw";
  const tenantConfig = getTenantConfig(tenantId);

  if (tenantConfig.docsEntrySlug) {
    redirect(`/docs/${tenantConfig.docsEntrySlug}`);
  }

  const firstSection = sections[0];
  const firstPage = firstSection?.pages[0];

  if (firstSection && firstPage) {
    redirect(`/docs/${firstSection.slug}/${firstPage.slug}`);
  }
  redirect("/");
}
