"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { NewCardModal } from "@/components/dashboard/new-card-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, completeMagicLink } = useAuth();
  const router = useRouter();
  const [newCardModalOpen, setNewCardModalOpen] = useState(false);

  useEffect(() => {
    completeMagicLink();
  }, [completeMagicLink]);

  // DEV ONLY: 2-second delay before redirect to prevent false logouts caused by
  // Firebase token refresh race conditions in the Replit dev environment (cross-origin issues).
  // REMOVE THIS IN PRODUCTION — it is not needed when the app runs on its own domain.
  useEffect(() => {
    if (!loading && !user) {
      const timeout = setTimeout(() => router.push("/"), 2000);
      return () => clearTimeout(timeout);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <AppSidebar onNewCard={() => setNewCardModalOpen(true)} />
      <SidebarInset className="min-h-screen bg-neutral-50">
        <Header title="Dashboard" />
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
      <NewCardModal open={newCardModalOpen} onOpenChange={setNewCardModalOpen} />
    </SidebarProvider>
  );
}
