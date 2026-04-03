import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSectionsByAudience, normalizeTenantId } from "@/docs/content/sections";

export default async function DocsIndexPage() {
  const cookieStore = await cookies();
  const tenantId = normalizeTenantId(cookieStore.get("tenant-id")?.value);

  const userSections = getSectionsByAudience("user", tenantId);
  const devSections = getSectionsByAudience("developer", tenantId);
  const firstSection = userSections[0] || devSections[0];
  const firstPage = firstSection?.pages[0];

  if (firstSection && firstPage) {
    redirect(`/docs/${firstSection.slug}/${firstPage.slug}`);
  }
  redirect("/");
}
