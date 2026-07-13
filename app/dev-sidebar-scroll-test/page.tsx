"use client";

import { AppSidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function DevSidebarScrollTestPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-neutral-50">
        <div className="p-8">Sidebar scroll test page</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
