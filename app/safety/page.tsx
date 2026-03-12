import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Lock, ShieldCheck, SlidersHorizontal, Snowflake, FileText, Bell, CreditCard, Eye, Clock } from "lucide-react";
import Image from "next/image";

const safetyFeatures = [
  {
    icon: Lock,
    color: "bg-blue-500/20 text-blue-400",
    title: "Stripe-Powered Payments",
    description: "All payments processed through Stripe — PCI-DSS Level 1 certified. Your card details are stored by Stripe, never on our servers. Tokenized for every transaction.",
  },
  {
    icon: ShieldCheck,
    color: "bg-green-500/20 text-green-400",
    title: "Encrypted Everything",
    description: "256-bit TLS encryption on every request. Session cookies are httpOnly with strict same-site policies. API keys are bcrypt-hashed with prefix-based lookup.",
  },
  {
    icon: SlidersHorizontal,
    color: "bg-orange-500/20 text-orange-400",
    title: "Spending Guardrails",
    description: "Per-transaction, daily, and monthly caps enforced server-side on every purchase. Category blocking, approval workflows, and threshold-based auto-approve.",
  },
  {
    icon: Snowflake,
    color: "bg-purple-500/20 text-purple-400",
    title: "Instant Freeze",
    description: "One click to pause all bot spending. Instantly. No calls, no support tickets. Unfreeze just as fast when you're ready.",
  },
  {
    icon: FileText,
    color: "bg-yellow-500/20 text-yellow-400",
    title: "Full Audit Trail",
    description: "Every transaction, every API call, every webhook delivery — logged and visible in your dashboard. Access logs capture endpoint, method, status, IP, and response time.",
  },
  {
    icon: Bell,
    color: "bg-pink-500/20 text-pink-400",
    title: "Real-Time Alerts",
    description: "Notifications for every purchase, decline, and balance change. Email + in-app. Suspicious activity alerts are always sent — no opt-out for safety-critical events.",
  },
];

const partners = [
  { name: "Stripe", role: "Payment Processing", desc: "PCI-DSS Level 1, fraud detection, tokenized storage", logo: "/logos/partners/stripe.svg" },
  { name: "Google Cloud", role: "Partner Authentication", desc: "Google-grade auth, session management, OAuth providers", logo: "/logos/partners/googlecloud.svg" },
  { name: "Privy", role: "Wallet Infrastructure", desc: "Server wallets, embedded auth, Base chain integration", logo: "/logos/partners/privy.png" },
  { name: "Crossmint", role: "Smart Wallets", desc: "NFT commerce, smart contract wallets, Amazon integration", logo: "/logos/partners/crossmint.png" },
  { name: "Bridge", role: "Crypto Transfers", desc: "Stablecoin payments, fiat-to-crypto rails, cross-border transfers", logo: "/logos/partners/bridge.png" },
  { name: "Circle", role: "Stablecoin Infrastructure", desc: "USDC issuance, programmable wallets, compliance", logo: "/logos/partners/circle.svg" },
  { name: "Stytch", role: "Authentication", desc: "Passwordless auth, session management, fraud prevention", logo: "/logos/partners/stytch.png" },
];

const pendingIntegrations = [
  { name: "Intuit / QuickBooks", role: "Invoice Reconciliation", desc: "Automated invoice matching, expense categorization, financial reporting", logo: "/logos/partners/quickbooks.svg" },
  { name: "Plaid", role: "Payment Reconciliation", desc: "Bank account verification, transaction matching, balance checks", logo: "/logos/partners/plaid.png" },
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main>
        <section className="pt-40 pb-24 bg-neutral-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm mb-6 animate-fade-in-up">
                <ShieldCheck size={14} />
                <span>Enterprise-grade security</span>
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-safety"
              >
                Bank-grade security. Bot-grade flexibility.
              </h1>
              <p
                className="text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                Your money is protected by the same infrastructure that powers millions of businesses. Every layer is built for safety.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {safetyFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${0.3 + index * 0.08}s` }}
                  data-testid={`safety-feature-${index}`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4 animate-fade-in-up">
                Built on trusted <span className="text-primary">partners</span>.
              </h2>
              <p className="text-lg text-neutral-500 font-medium animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                We don&apos;t reinvent security. We build on the best.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
              {partners.map((partner, index) => (
                <div
                  key={index}
                  className="p-6 rounded-3xl bg-neutral-50 border border-neutral-100 hover:shadow-xl hover:bg-white transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.06}s` }}
                  data-testid={`partner-${index}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center mb-4 p-2">
                    <Image
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      width={40}
                      height={40}
                      className="object-contain"
                      data-testid={`partner-logo-${index}`}
                    />
                  </div>
                  <h3 className="text-lg font-extrabold text-neutral-900 mb-1">{partner.name}</h3>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">{partner.role}</p>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">{partner.desc}</p>
                </div>
              ))}
            </div>

            <div className="max-w-6xl mx-auto mt-16">
              <div className="flex items-center gap-3 mb-8 justify-center animate-fade-in-up">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900">Integrations Pending</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {pendingIntegrations.map((integration, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-3xl bg-neutral-50/50 border-2 border-dashed border-neutral-200 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${0.3 + index * 0.08}s` }}
                    data-testid={`pending-integration-${index}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center p-1.5 opacity-70">
                        <Image
                          src={integration.logo}
                          alt={`${integration.name} logo`}
                          width={32}
                          height={32}
                          className="object-contain grayscale"
                          data-testid={`pending-logo-${index}`}
                        />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">Coming Soon</span>
                    </div>
                    <h3 className="text-lg font-extrabold text-neutral-700 mb-1">{integration.name}</h3>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">{integration.role}</p>
                    <p className="text-sm text-neutral-400 font-medium leading-relaxed">{integration.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#FDFBF7] border-y border-neutral-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-4 text-center animate-fade-in-up">
                How we protect every transaction
              </h2>
              <p className="text-neutral-500 font-medium text-center mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                Every purchase request passes through these checks before money moves.
              </p>

              <div className="space-y-4">
                {[
                  { icon: ShieldCheck, label: "Bot authentication", desc: "API key validated via bcrypt hash + prefix lookup" },
                  { icon: Eye, label: "Rate limiting", desc: "Per-bot, per-endpoint rate limits prevent abuse" },
                  { icon: SlidersHorizontal, label: "Spending rules check", desc: "Per-transaction, daily, monthly limits enforced server-side" },
                  { icon: Snowflake, label: "Freeze check", desc: "Frozen wallets reject all purchases instantly" },
                  { icon: CreditCard, label: "Balance verification", desc: "Atomic debit ensures sufficient funds — no overdraft" },
                  { icon: Bell, label: "Notification dispatch", desc: "Owner notified via webhook, email, and in-app alert" },
                  { icon: FileText, label: "Audit logging", desc: "Full access log recorded: endpoint, status, IP, response time" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm animate-fade-in-up"
                    style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                    data-testid={`protection-step-${i}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <item.icon size={20} className="text-neutral-600" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-neutral-900">{item.label}</span>
                      <span className="text-neutral-400 mx-2">—</span>
                      <span className="text-neutral-500 font-medium">{item.desc}</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
