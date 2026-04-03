export interface TenantConfig {
  id: string;
  domains: string[];

  branding: {
    name: string;
    tagline: string;
    logo: string;
    logoEmoji: string;
    favicon: string;
    supportEmail: string;
    mascot: string;
  };

  meta: {
    title: string;
    description: string;
    ogImage: string;
    twitterImage: string;
    url: string;
  };

  theme: {
    primaryColor: string;
    primaryForeground: string;
    accentColor: string;
    secondaryColor: string;
  };

  routes: {
    guestLanding: string;
    authLanding: string;
  };

  features: Record<string, boolean>;

  navigation?: {
    header?: {
      variant?: "light" | "dark";
      showLogo?: boolean;
      links?: { label: string; href: string }[];
    };
    footer: {
      showLogo?: boolean;
      columns: {
        title: string;
        links: { label: string; href: string; external?: boolean }[];
      }[];
      socials?: { label: string; href: string }[];
    };
  };

  tracking?: {
    gaId: string;
  };

  pricing?: {
    headline: string;
    subheadline: string;
    creditsLabel: string;
    creditsExplanation?: {
      title: string;
      subtitle: string;
      items: { value: string; label: string }[];
    };
    ctaSection?: {
      title: string;
      subtitle: string;
      buttonText: string;
      buttonLink: string;
    };
    plans: {
      id: string;
      name: string;
      credits: number;
      bonus: number;
      price: number;
      description: string;
      features: string[];
      highlight: boolean;
      cta: string;
      comingSoon?: boolean;
    }[];
  };
}
