import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import {
  ShieldCheck,
  Hash,
  Layers,
  KeyRound,
  Eraser,
  Lock,
  Eye,
  Download,
  Link2,
  MousePointerClick,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "SecureFill — Fill fields without exposing them to the assistant",
  description:
    "SecureFill is a browser extension that fills form fields from an opaque reference, keeping the values out of the calling assistant's context — including inside cross-origin embedded frames.",
};

const steps = [
  {
    icon: Hash,
    color: "bg-blue-500/20 text-blue-400",
    title: "Pass a reference",
    description:
      "The assistant asks SecureFill to fill a set of fields by passing a single opaque reference — never the values themselves.",
  },
  {
    icon: KeyRound,
    color: "bg-purple-500/20 text-purple-400",
    title: "Resolve out of context",
    description:
      "The extension's service worker resolves the reference against your configured backend (or decrypts a locally held source) — entirely outside the page the assistant sees.",
  },
  {
    icon: Layers,
    color: "bg-orange-500/20 text-orange-400",
    title: "Fill the right frame",
    description:
      "Each value is routed only to the frame that needs it — including cross-origin embedded frames — and written with framework-compatible events.",
  },
  {
    icon: Eraser,
    color: "bg-green-500/20 text-green-400",
    title: "Return only a status",
    description:
      "The assistant receives a fill status and nothing more. Resolved values are cleared from memory after the fill.",
  },
];

const boundary = [
  {
    icon: ShieldCheck,
    tone: "good",
    title: "Strong for cross-origin embedded fields",
    description:
      "Sensitive fields commonly render inside cross-origin embedded frames. Page JavaScript — where the assistant runs — cannot read across that origin boundary, so values filled there stay out of the assistant's reach. This is the primary case.",
  },
  {
    icon: Eye,
    tone: "warn",
    title: "Weaker for same-origin fields",
    description:
      "If a field lives in the top page, page JavaScript can read its value after the fill. The isolated world keeps the credential, the key, and the resolution logic out of the page — but it cannot hide a value already typed into a same-origin input.",
  },
  {
    icon: Lock,
    tone: "good",
    title: "Fills require an approved reference",
    description:
      "A fill request carries only an opaque reference, resolved against an authenticated, single-use, approval-gated endpoint. A malicious page cannot extract data by faking a fill request — it has no valid reference.",
  },
  {
    icon: Eraser,
    tone: "warn",
    title: "Memory wipe is best-effort",
    description:
      "Resolved values are overwritten and dropped after the fill, but JavaScript gives no hard zeroization guarantee. Values are short-lived but not provably erased.",
  },
];

const install = [
  {
    icon: Download,
    label: "Install the extension",
    desc: "Add SecureFill from the Chrome Web Store, or load it unpacked during development.",
  },
  {
    icon: Link2,
    label: "Pair it to your backend",
    desc: "Open the setup page and enter your connection credential. Pairing stores it on your device only.",
  },
  {
    icon: MousePointerClick,
    label: "Let the assistant fill by reference",
    desc: "Your assistant sends a reference; SecureFill resolves it, fills the page, and returns a status.",
  },
];

export default function SecureFillPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <AnnouncementBar />
      <Nav />

      <main>
        <section className="pt-40 pb-24 bg-neutral-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('/assets/noise.svg')] opacity-20" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm mb-6 animate-fade-in-up">
                <ShieldCheck size={14} />
                <span>The official CreditClaw extension</span>
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-securefill"
              >
                Fill fields. Not the AI&apos;s context.
              </h1>
              <p
                className="text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                SecureFill lets an assistant fill form fields by passing a single opaque reference. The extension
                resolves the values itself and writes them into the page — so they never enter the assistant&apos;s
                reasoning, logs, or tool calls.
              </p>
            </div>

            <div
              className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 bg-white/5 animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <Image
                src="/assets/securefill/explainer.png"
                alt="An assistant passes a reference; SecureFill fills the form field while the assistant only ever sees a token."
                width={1280}
                height={800}
                className="w-full h-auto"
                data-testid="img-securefill-explainer"
                priority
              />
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-neutral-900 mb-4 animate-fade-in-up">
                How it <span className="text-primary">works</span>.
              </h2>
              <p className="text-lg text-neutral-500 font-medium animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                Four steps, and the value never touches the assistant.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="p-6 rounded-3xl bg-neutral-50 border border-neutral-100 hover:shadow-xl hover:bg-white transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.08}s` }}
                  data-testid={`securefill-step-${index}`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center mb-4`}>
                    <step.icon size={24} />
                  </div>
                  <h3 className="text-lg font-extrabold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('/assets/noise.svg')] opacity-20" />
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight mb-4 animate-fade-in-up">
                What it guarantees — and what it doesn&apos;t.
              </h2>
              <p className="text-lg text-neutral-400 font-medium animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                Straight about the security boundary, so you know exactly what you&apos;re relying on.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {boundary.map((item, index) => (
                <div
                  key={index}
                  className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.08}s` }}
                  data-testid={`securefill-boundary-${index}`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                      item.tone === "good" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    <item.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-[#FDFBF7] border-y border-neutral-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-4 text-center animate-fade-in-up">
                Get started
              </h2>
              <p
                className="text-neutral-500 font-medium text-center mb-12 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                Three steps from install to first fill.
              </p>

              <div className="space-y-4">
                {install.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-neutral-100 shadow-sm animate-fade-in-up"
                    style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                    data-testid={`securefill-install-${i}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <item.icon size={20} className="text-neutral-600" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-neutral-900">{item.label}</span>
                      <span className="text-neutral-400 mx-2">—</span>
                      <span className="text-neutral-500 font-medium">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <Link
                  href="/securefill/privacy"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-colors"
                  data-testid="link-securefill-privacy"
                >
                  <ShieldCheck size={16} />
                  Read the privacy policy
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
