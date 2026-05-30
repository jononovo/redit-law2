import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "SecureFill — Privacy Policy",
  description:
    "How the SecureFill browser extension stores, transmits, and protects data. The extension talks only to your configured backend and never sends field values to the assistant or any third party.",
};

export default function SecureFillPrivacyPage() {
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
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm mb-6 animate-fade-in-up">
                <ShieldCheck size={14} />
                <span>Your data stays yours</span>
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-securefill-privacy"
              >
                SecureFill Privacy Policy
              </h1>
              <p
                className="text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                SecureFill helps an assistant fill form fields without exposing the field values to the assistant.
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-neutral-500 font-semibold mb-12" data-testid="text-last-updated">
                Last Updated: May 30, 2026
              </p>

              <div className="space-y-16">
                <div data-testid="section-overview">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">1. Overview</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      SecureFill is a browser extension that fills form fields from a referenced source while keeping
                      the actual field values out of the calling assistant&apos;s context. An assistant requests a fill by
                      passing a single opaque reference; the extension resolves the values itself, writes them into the
                      page, and returns only a status. This Policy explains what data the extension stores, what it
                      transmits, and what it never does.
                    </p>
                  </div>
                </div>

                <div data-testid="section-what-it-stores">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">2. What It Stores</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      The extension stores the following on your device only, via the browser&apos;s extension storage:
                    </p>
                    <p>
                      <strong className="text-neutral-800">Connection credential:</strong> set during pairing, used to
                      authenticate to your configured backend.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Optional encrypted source:</strong> an encrypted blob set
                      during pairing, used only by the client-held resolution mode.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Local configuration:</strong> a local connection id and
                      related settings.
                    </p>
                    <p>
                      Nothing is stored on any SecureFill-operated server. The extension has no analytics and no
                      third-party trackers.
                    </p>
                  </div>
                </div>

                <div data-testid="section-what-it-transmits">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">3. What It Transmits</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      When asked to fill, the extension sends the supplied reference and its stored credential to your
                      own configured backend over HTTPS, and receives the field values (or a one-time key to decrypt the
                      locally stored encrypted source). Values are written into the current page and then cleared from
                      memory.
                    </p>
                    <p>
                      The extension transmits data only to your configured backend. It never sends data to any other
                      destination.
                    </p>
                  </div>
                </div>

                <div data-testid="section-what-it-does-not-do">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">4. What It Does Not Do</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>It does not sell or share user data.</p>
                    <p>It does not transmit field values to the assistant or to any third party.</p>
                    <p>It does not collect browsing history or analytics.</p>
                  </div>
                </div>

                <div data-testid="section-permissions">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">5. Permissions</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      <strong className="text-neutral-800">storage</strong> — keep the pairing credential and
                      configuration on the device.
                    </p>
                    <p>
                      <strong className="text-neutral-800">webNavigation</strong> — find the active tab&apos;s frames so
                      values reach the correct field, including inside embedded frames.
                    </p>
                    <p>
                      <strong className="text-neutral-800">host access to the configured backend</strong> — fetch
                      referenced values or one-time keys.
                    </p>
                    <p>
                      <strong className="text-neutral-800">content scripts on web pages</strong> — fill fields on the
                      page in use.
                    </p>
                  </div>
                </div>

                <div data-testid="section-contact">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">6. Contact</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      For privacy questions, contact the operator of the configured backend, or email{" "}
                      <a href="mailto:privacy@creditclaw.com" className="text-primary hover:underline">
                        privacy@creditclaw.com
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
