import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { FileText } from "lucide-react";

export default function TermsPage() {
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
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm mb-6 animate-fade-in-up">
                <FileText size={14} />
                <span>Legal</span>
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-terms"
              >
                Terms of Service
              </h1>
              <p
                className="text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                Please read these Terms of Service carefully before using the CreditClaw platform. By accessing or using our services, you agree to be bound by these terms.
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-neutral-400 font-semibold uppercase tracking-wider mb-12" data-testid="text-last-updated">
                Last Updated: February 24, 2026
              </p>

              <div className="space-y-16">

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-acceptance">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">1. Acceptance of Terms</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      By accessing, browsing, or using the CreditClaw platform, website, application programming interfaces (APIs), or any related services (collectively, the &ldquo;Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;), as well as our Privacy Policy, which is incorporated herein by reference. If you do not agree to these Terms in their entirety, you must immediately cease all use of the Service.
                    </p>
                    <p>
                      These Terms constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and CreditClaw Inc. (&ldquo;CreditClaw,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a Delaware corporation. You represent and warrant that you are at least eighteen (18) years of age, or the age of legal majority in your jurisdiction, whichever is greater, and that you have the legal capacity to enter into this agreement.
                    </p>
                    <p>
                      If you are accessing or using the Service on behalf of a company, organization, or other legal entity, you represent and warrant that you have the authority to bind such entity to these Terms. In such cases, &ldquo;you&rdquo; and &ldquo;your&rdquo; shall refer to both the individual and the entity. If you do not have such authority, or if you do not agree with these Terms, you may not use the Service.
                    </p>
                    <p>
                      Your continued use of the Service following the posting of any changes to these Terms constitutes your acceptance of those changes. We reserve the right to update, modify, or replace any part of these Terms at our sole discretion and without prior notice.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-description">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">2. Description of Service</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      CreditClaw is a technology platform that provides prepaid spending controls for autonomous AI agents (&ldquo;bots&rdquo;). The Service enables account holders (&ldquo;Owners&rdquo;) to fund digital wallets using credit cards, debit cards, or other supported payment methods, and to configure spending limits, category restrictions, and approval workflows that govern how their registered bots may transact.
                    </p>
                    <p>
                      <strong className="text-neutral-900">CreditClaw is NOT a bank, financial institution, money services business, money transmitter, or payment processor.</strong> We do not hold deposits, issue credit, extend loans, or provide any banking services. We are a software platform that facilitates the configuration and enforcement of spending controls on prepaid balances. All payment processing is handled by third-party providers, including but not limited to Stripe, Inc.
                    </p>
                    <p>
                      The Service includes, but is not limited to: wallet creation and management; bot registration and pairing; spending limit configuration (per-transaction, daily, and monthly caps); category-based merchant blocking; approval workflows for transactions above configurable thresholds; webhook notifications; API access for bot integrations; self-hosted card management via split-knowledge encryption; sub-agent card provisioning; and procurement skill management.
                    </p>
                    <p>
                      CreditClaw does not guarantee the availability, accuracy, completeness, or reliability of the Service. The Service is provided on a best-effort basis, and we make no representations regarding uptime, latency, or the successful execution of any transaction or spending control. Features may be added, modified, or removed at any time without notice.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-account">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">3. Account Registration &amp; Security</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      To use the Service, you must create an account using our authentication provider, Firebase Authentication (a Google service). You are solely responsible for maintaining the confidentiality of your account credentials, including your email address, password, and any linked OAuth provider credentials. You agree to immediately notify CreditClaw of any unauthorized use of your account or any other breach of security.
                    </p>
                    <p>
                      You are fully responsible for all activities that occur under your account, whether or not authorized by you. CreditClaw shall not be liable for any loss or damage arising from your failure to safeguard your account credentials. You agree not to share your account credentials with any third party, and you acknowledge that CreditClaw will never ask you for your password.
                    </p>
                    <p>
                      When you register bots on the platform, each bot is assigned a unique API key. You are solely responsible for the security of these API keys. API keys grant programmatic access to your wallets and spending capabilities, and any transaction executed using a valid API key will be treated as authorized by the account holder. CreditClaw is not responsible for any unauthorized use of your API keys, including but not limited to transactions initiated by compromised bots, leaked keys, or misconfigured integrations.
                    </p>
                    <p>
                      You agree to provide accurate, current, and complete information during registration and to update such information as necessary. CreditClaw reserves the right to suspend or terminate accounts that contain false or misleading information, or that are used in violation of these Terms.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-wallets">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">4. Prepaid Wallets &amp; Funding</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      All funds loaded into CreditClaw wallets are prepaid and non-refundable unless otherwise required by applicable law. When you fund a wallet, you authorize CreditClaw to charge your designated payment method for the specified amount. All payment processing is performed by Stripe, Inc. or other third-party payment processors integrated with the Service.
                    </p>
                    <p>
                      CreditClaw is not responsible for any failures, errors, delays, or disruptions in payment processing caused by Stripe or any other third-party payment processor. This includes, but is not limited to, declined transactions, duplicate charges, processing delays, currency conversion errors, or chargebacks. Any disputes regarding payment processing must be resolved directly with the applicable payment processor or your card-issuing bank.
                    </p>
                    <p>
                      Wallet balances do not accrue interest. CreditClaw is not a depository institution and does not pay interest on any balances held within the platform. Wallet balances are not insured by the Federal Deposit Insurance Corporation (FDIC), the Securities Investor Protection Corporation (SIPC), or any other governmental or quasi-governmental agency.
                    </p>
                    <p>
                      You acknowledge that wallet balances represent prepaid credits for use within the CreditClaw platform and do not constitute deposits, stored value, or electronic money within the meaning of any applicable financial regulation. CreditClaw reserves the right to impose minimum and maximum funding limits, and to restrict or suspend wallet funding at any time for any reason, including but not limited to suspected fraud, regulatory compliance, or technical issues.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-bot-transactions">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">5. Bot Transactions &amp; Spending Controls</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      You are solely responsible for configuring spending limits, category restrictions, approval thresholds, and all other spending controls for your registered bots. CreditClaw enforces these controls on a <strong className="text-neutral-900">best-effort basis only</strong>. While we strive to enforce all configured rules accurately and in real time, we do not and cannot guarantee that spending controls will prevent every unauthorized, unintended, or excessive transaction.
                    </p>
                    <p>
                      Due to the nature of distributed systems, network latency, race conditions, concurrent transaction processing, and third-party API response times, it is possible for transactions to be processed that exceed configured spending limits. This may occur when multiple transactions are initiated simultaneously, when third-party services experience delays, or due to other technical factors beyond our reasonable control. You acknowledge and accept this inherent risk.
                    </p>
                    <p>
                      <strong className="text-neutral-900">CreditClaw is NOT liable for any actions taken by your bots</strong>, including but not limited to: unauthorized purchases, purchases from prohibited merchants, purchases that exceed spending limits, fraudulent transactions, errors in bot logic or configuration, purchases of prohibited or illegal goods or services, or any other bot behavior that results in financial loss, legal liability, or harm to you or any third party.
                    </p>
                    <p>
                      You assume all risk associated with granting autonomous AI agents access to payment methods and spending capabilities through the CreditClaw platform. You are responsible for monitoring bot activity, reviewing transaction logs, and taking appropriate action (including freezing wallets) when you observe unauthorized or unexpected behavior. CreditClaw provides tools for monitoring and control, but the responsibility for using those tools lies solely with you.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-red-50 border border-red-200" data-testid="section-liability">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">6. Limitation of Liability</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p className="text-neutral-900 font-bold uppercase text-sm tracking-wide">
                      PLEASE READ THIS SECTION CAREFULLY AS IT LIMITS CREDITCLAW&rsquo;S LIABILITY TO YOU.
                    </p>
                    <p>
                      THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ACCURACY. CREDITCLAW DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, OR THAT ANY DEFECTS WILL BE CORRECTED.
                    </p>
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CREDITCLAW, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, FUNDS, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE), EVEN IF CREDITCLAW HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                    </p>
                    <p>
                      WITHOUT LIMITING THE FOREGOING, CREDITCLAW SHALL NOT BE LIABLE FOR: (A) ANY LOSS OF FUNDS, WHETHER DUE TO UNAUTHORIZED TRANSACTIONS, BOT ERRORS, SYSTEM FAILURES, OR ANY OTHER CAUSE; (B) ANY UNAUTHORIZED ACCESS TO OR USE OF YOUR ACCOUNT, API KEYS, OR WALLET BALANCES; (C) ANY FRAUDULENT TRANSACTIONS PROCESSED THROUGH THE SERVICE; (D) ANY ERRORS, BUGS, OR INACCURACIES IN SPENDING CONTROL ENFORCEMENT; (E) ANY FAILURES, DELAYS, OR ERRORS IN API RESPONSES OR WEBHOOK DELIVERIES; (F) ANY ACTIONS OR OMISSIONS OF YOUR BOTS, INCLUDING UNAUTHORIZED PURCHASES OR SPENDING BEYOND CONFIGURED LIMITS; (G) ANY LOSS OR DAMAGE RESULTING FROM BOT BEHAVIOR, INCLUDING PURCHASES OF PROHIBITED, RESTRICTED, OR ILLEGAL GOODS OR SERVICES.
                    </p>
                    <p>
                      CREDITCLAW SHALL NOT BE LIABLE FOR ANY FAILURES, DISRUPTIONS, OR ERRORS CAUSED BY THIRD-PARTY SERVICES, INCLUDING BUT NOT LIMITED TO STRIPE, FIREBASE, PRIVY, CROSSMINT, BLOCKCHAIN NETWORKS, CARD NETWORKS, ISSUING BANKS, ACQUIRING BANKS, MERCHANT PROCESSORS, EMAIL DELIVERY SERVICES, CLOUD INFRASTRUCTURE PROVIDERS, OR ANY OTHER THIRD-PARTY VENDOR OR SERVICE PROVIDER INTEGRATED WITH OR RELIED UPON BY THE SERVICE. YOU ACKNOWLEDGE THAT THE SERVICE DEPENDS ON NUMEROUS THIRD-PARTY SYSTEMS AND THAT CREDITCLAW HAS NO CONTROL OVER THE AVAILABILITY, PERFORMANCE, OR RELIABILITY OF SUCH SYSTEMS.
                    </p>
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CREDITCLAW&rsquo;S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE LESSER OF: (I) ONE HUNDRED UNITED STATES DOLLARS (US $100.00); OR (II) THE TOTAL FEES PAID BY YOU TO CREDITCLAW DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. THIS LIMITATION APPLIES REGARDLESS OF THE FORM OF ACTION, WHETHER IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE.
                    </p>
                    <p>
                      YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT YOU ASSUME ALL RISK ARISING FROM YOUR USE OF THE SERVICE FOR FINANCIAL TRANSACTIONS, INCLUDING BUT NOT LIMITED TO THE RISK OF LOSS OF FUNDS, UNAUTHORIZED TRANSACTIONS, AND FRAUD. YOU FURTHER ACKNOWLEDGE AND AGREE THAT YOU ASSUME ALL RISK ASSOCIATED WITH GRANTING AUTONOMOUS AI AGENTS ACCESS TO PAYMENT METHODS, WALLET BALANCES, AND SPENDING CAPABILITIES THROUGH THE PLATFORM. CREDITCLAW IS A TECHNOLOGY PLATFORM, NOT A FIDUCIARY, AND OWES NO DUTY OF CARE WITH RESPECT TO YOUR FINANCIAL ASSETS OR TRANSACTIONS BEYOND WHAT IS EXPRESSLY STATED IN THESE TERMS.
                    </p>
                    <p>
                      SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR DAMAGES. IN SUCH JURISDICTIONS, CREDITCLAW&rsquo;S LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-indemnification">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">7. Indemnification</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      You agree to indemnify, defend, and hold harmless CreditClaw, its officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all claims, liabilities, damages, losses, costs, expenses, and fees (including reasonable attorneys&rsquo; fees) arising out of or relating to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; (d) any actions or omissions of your bots, sub-agents, or any autonomous agents operating under your account; (e) any dispute between you and any third party arising from your use of the Service; (f) any unauthorized use of your account or API keys; and (g) any claim that your use of the Service infringes or violates the intellectual property rights, privacy rights, or other rights of any third party.
                    </p>
                    <p>
                      This indemnification obligation shall survive the termination of your account and these Terms. CreditClaw reserves the right, at its own expense, to assume the exclusive defense and control of any matter subject to indemnification by you, in which event you will cooperate with CreditClaw in asserting any available defenses.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-self-hosted">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">8. Self-Hosted Cards (Split-Knowledge Model)</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      CreditClaw offers a self-hosted card feature that utilizes a split-knowledge encryption model. Under this model, you are responsible for encrypting your card data (including card numbers, expiration dates, CVVs, and billing information) on your own device before transmitting any data to CreditClaw. CreditClaw stores only the decryption keys necessary to facilitate authorized transactions, while the encrypted card data itself is stored separately.
                    </p>
                    <p>
                      <strong className="text-neutral-900">You are solely responsible for the security, accuracy, and integrity of the card data you encrypt and store.</strong> CreditClaw does not have access to your plaintext card data and cannot verify its accuracy, validity, or authorization status. You represent and warrant that you are authorized to use any payment card whose data you provide to the Service, and that your use of such card data complies with all applicable laws, regulations, and card network rules.
                    </p>
                    <p>
                      CreditClaw shall not be liable for any card misuse, fraud, unauthorized access, data breaches, or financial loss arising from the self-hosted card feature. This includes, but is not limited to, losses resulting from: compromised encryption keys, weak encryption practices, unauthorized access to your encrypted card files, interception of card data during transmission, misuse of card data by bots or sub-agents, or any third-party access to your card information. You acknowledge that by using the self-hosted card feature, you accept all risks associated with managing and securing your own payment card data.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-sub-agent">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">9. Sub-Agent Cards</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      CreditClaw may offer the ability to provision ephemeral sub-agent cards, which allow secondary autonomous agents (sub-agents) to access encrypted card data for the purpose of executing transactions. You are solely responsible for all encrypted card files associated with sub-agent cards, including their creation, storage, distribution, and revocation.
                    </p>
                    <p>
                      You acknowledge that sub-agents operate autonomously and that CreditClaw has no control over the behavior, logic, or actions of any sub-agent. CreditClaw shall not be liable for any exposure of decryption keys, unauthorized use of sub-agent cards, transactions executed by sub-agents, data breaches resulting from sub-agent activity, or any other loss, damage, or liability arising from the use of sub-agent cards.
                    </p>
                    <p>
                      You are responsible for implementing appropriate security measures to protect decryption keys and encrypted card data from unauthorized access by sub-agents or any other party. You agree to immediately revoke sub-agent access and notify CreditClaw if you suspect any unauthorized use of sub-agent cards or exposure of decryption keys. CreditClaw reserves the right to disable sub-agent card functionality at any time without notice.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-webhooks">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">10. Webhooks &amp; API</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      CreditClaw provides webhook notifications and API access as part of the Service. You acknowledge and agree that CreditClaw makes no guarantee regarding the delivery, timing, accuracy, completeness, or ordering of webhook notifications. Webhooks may be delayed, duplicated, delivered out of order, or not delivered at all due to network conditions, server load, third-party service issues, or other technical factors.
                    </p>
                    <p>
                      You are solely responsible for securing your webhook endpoints, including implementing proper authentication, HTTPS encryption, and input validation. CreditClaw shall not be liable for any loss, damage, or unauthorized access resulting from insecure webhook endpoints, misconfigured integrations, or your failure to properly validate incoming webhook payloads.
                    </p>
                    <p>
                      API access is provided subject to rate limits and usage policies that CreditClaw may establish and modify at any time. CreditClaw does not guarantee the availability, latency, or uptime of the API. You are responsible for implementing appropriate error handling, retry logic, and fallback mechanisms in your integrations. CreditClaw shall not be liable for any loss or damage resulting from API downtime, rate limiting, breaking changes, deprecation of endpoints, or errors in API responses.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-ip">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">11. Intellectual Property</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      The Service, including all software, code, algorithms, user interfaces, designs, trademarks, logos, trade names, documentation, and other intellectual property associated with CreditClaw, are the exclusive property of CreditClaw Inc. and are protected by copyright, trademark, patent, trade secret, and other intellectual property laws. Nothing in these Terms grants you any right, title, or interest in the CreditClaw intellectual property, except for the limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms.
                    </p>
                    <p>
                      You may not copy, modify, distribute, sell, license, reverse engineer, decompile, disassemble, or create derivative works of the Service or any portion thereof without the prior written consent of CreditClaw. You agree not to remove, alter, or obscure any copyright notices, trademark notices, or other proprietary rights notices contained in or on the Service. Any feedback, suggestions, or ideas you provide to CreditClaw regarding the Service shall become the exclusive property of CreditClaw, and CreditClaw shall have no obligation to compensate you for such contributions.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-termination">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">12. Termination</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      CreditClaw reserves the right to suspend or terminate your account and access to the Service at any time, for any reason or no reason, with or without notice, and without liability to you. Reasons for termination may include, but are not limited to: violation of these Terms, suspected fraud or illegal activity, failure to pay applicable fees, regulatory requirements, or discontinuation of the Service.
                    </p>
                    <p>
                      Upon termination, your right to use the Service will immediately cease. Any remaining wallet balances at the time of termination will be handled in accordance with CreditClaw&rsquo;s refund policy then in effect, if any. CreditClaw is under no obligation to refund any prepaid balances upon termination, except as required by applicable law. CreditClaw shall not be liable for any loss or damage resulting from the termination of your account, including the loss of any data, configurations, bot registrations, or wallet balances.
                    </p>
                    <p>
                      The following sections shall survive termination of these Terms: Limitation of Liability, Indemnification, Dispute Resolution, Intellectual Property, and any other provisions that by their nature should survive termination.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-disputes">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">13. Dispute Resolution</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      <strong className="text-neutral-900">Mandatory Arbitration.</strong> Any dispute, controversy, or claim arising out of or relating to these Terms or the Service, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by binding arbitration administered by the American Arbitration Association (&ldquo;AAA&rdquo;) in accordance with its Commercial Arbitration Rules. The arbitration shall be conducted by a single arbitrator and shall take place in Wilmington, Delaware. The arbitrator&rsquo;s decision shall be final and binding, and judgment on the award may be entered in any court having jurisdiction thereof.
                    </p>
                    <p>
                      <strong className="text-neutral-900">Class Action Waiver.</strong> YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. YOU EXPRESSLY WAIVE YOUR RIGHT TO PARTICIPATE IN OR BRING A CLASS ACTION LAWSUIT, CLASS-WIDE ARBITRATION, OR ANY OTHER REPRESENTATIVE PROCEEDING AGAINST CREDITCLAW. If any court or arbitrator determines that the class action waiver set forth in this paragraph is void or unenforceable for any reason, or that an arbitration can proceed on a class basis, then the arbitration provision set forth above shall be deemed null and void, and the parties shall be deemed to have not agreed to arbitrate disputes.
                    </p>
                    <p>
                      <strong className="text-neutral-900">Governing Law.</strong> These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. You consent to the exclusive jurisdiction of the state and federal courts located in the State of Delaware for any actions not subject to arbitration.
                    </p>
                    <p>
                      <strong className="text-neutral-900">Time Limitation.</strong> You agree that any claim or cause of action arising out of or related to the Service or these Terms must be filed within one (1) year after such claim or cause of action arose, or be forever barred. This limitation period applies regardless of whether you knew or should have known of the claim.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-modifications">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">14. Modifications to Terms</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      CreditClaw reserves the right to modify, amend, or replace these Terms at any time, at its sole discretion, without prior notice to you. Any changes to these Terms will be effective immediately upon posting the revised Terms on the CreditClaw website or within the Service. The &ldquo;Last Updated&rdquo; date at the top of these Terms will be revised to reflect the date of the most recent changes.
                    </p>
                    <p>
                      Your continued use of the Service after any modifications to these Terms constitutes your acceptance of and agreement to the modified Terms. If you do not agree to the modified Terms, your sole remedy is to discontinue your use of the Service and close your account. It is your responsibility to review these Terms periodically for changes. CreditClaw may, but is not obligated to, provide notice of material changes via email or in-app notification.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-severability">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">15. Severability &amp; Entire Agreement</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other provision of these Terms. The remaining provisions shall continue in full force and effect, and the invalid, illegal, or unenforceable provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable while preserving the original intent of the parties.
                    </p>
                    <p>
                      These Terms, together with the Privacy Policy and any other agreements or policies referenced herein, constitute the entire agreement between you and CreditClaw with respect to the subject matter hereof and supersede all prior or contemporaneous communications, representations, or agreements, whether oral or written, regarding such subject matter. No waiver of any provision of these Terms shall be deemed a further or continuing waiver of such provision or any other provision. CreditClaw&rsquo;s failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-neutral-50 border border-neutral-100" data-testid="section-contact">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-6">16. Contact Information</h2>
                  <div className="space-y-4 text-neutral-600 font-medium leading-relaxed">
                    <p>
                      If you have any questions, concerns, or inquiries regarding these Terms of Service, please contact us at:
                    </p>
                    <div className="p-6 rounded-2xl bg-white border border-neutral-200">
                      <p className="font-bold text-neutral-900">CreditClaw Inc.</p>
                      <p>Email: <a href="mailto:legal@creditclaw.com" className="text-primary hover:underline font-semibold" data-testid="link-legal-email">legal@creditclaw.com</a></p>
                      <p className="mt-2 text-sm text-neutral-500">For legal notices, service of process, and formal correspondence.</p>
                    </div>
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