import { redirect } from "next/navigation";
import { sections } from "@/docs/content/sections";

export default function DocsIndexPage() {
  const firstSection = sections[0];
  const firstPage = firstSection?.pages[0];
  if (firstSection && firstPage) {
    redirect(`/docs/${firstSection.slug}/${firstPage.slug}`);
  }
  redirect("/");
}
