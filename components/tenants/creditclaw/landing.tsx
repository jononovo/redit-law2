import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { BotSignup } from "@/components/bot-signup";
import { LiveMetrics } from "@/components/live-metrics";
import { Features } from "@/components/features";
import { EnterpriseCta } from "@/components/enterprise-cta";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Footer } from "@/components/footer";

export default function CreditclawLanding() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans selection:bg-[hsl(var(--accent))] selection:text-black">
      <AnnouncementBar />
      <Nav />
      <main>
        <Hero />
        <BotSignup />
        <LiveMetrics />
        <Features />
        <EnterpriseCta />
      </main>
      <Footer />
    </div>
  );
}
