"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { Rail5SetupWizardContent } from "@/components/onboarding/rail5-wizard";

export default function Rail5SetupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleDone = () => {
    router.push("/overview");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Rail5SetupWizardContent
      inline
      onComplete={handleDone}
      onClose={handleDone}
    />
  );
}
