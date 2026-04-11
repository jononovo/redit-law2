import { getCurrentUser } from "@/features/platform-management/auth/session";
import { notFound } from "next/navigation";
import { AdminLayoutShell } from "./admin-layout-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !user.flags?.includes("admin")) {
    notFound();
  }
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
