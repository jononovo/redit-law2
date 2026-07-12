"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/platform-management/auth/auth-context";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingV1Page() {
  const { completeMagicLink } = useAuth();

  useEffect(() => {
    completeMagicLink();
  }, [completeMagicLink]);

  return <OnboardingWizard />;
}
