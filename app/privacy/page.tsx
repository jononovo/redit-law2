import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
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
                <ShieldCheck size={14} />
                <span>Your privacy matters</span>
              </div>
              <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
                data-testid="heading-privacy"
              >
                Privacy Policy
              </h1>
              <p
                className="text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                How CreditClaw collects, uses, and protects your information.
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-neutral-500 font-semibold mb-12" data-testid="text-last-updated">
                Last Updated: February 24, 2026
              </p>

              <div className="space-y-16">

                <div data-testid="section-introduction">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">1. Introduction &amp; Scope</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      This Privacy Policy (&quot;Policy&quot;) describes how CreditClaw Inc. (&quot;CreditClaw,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, discloses, and safeguards your personal information when you access or use the CreditClaw platform, including our website, dashboard, APIs, and any related services (collectively, the &quot;Service&quot;). CreditClaw is a technology platform that provides prepaid spending controls for AI agents. We are not a bank, financial institution, or money services business. Payment processing, card issuance, and related financial services are provided by our third-party partners, including Stripe and CrossMint.
                    </p>
                    <p>
                      This Policy applies to all users of the Service, including bot owners who create accounts and configure AI agent wallets, as well as any individuals who interact with our website or APIs. By accessing or using the Service, you acknowledge that you have read, understood, and agree to the collection and use of your information as described in this Policy. If you do not agree with the terms of this Policy, you must discontinue use of the Service immediately.
                    </p>
                    <p>
                      This Policy is effective as of February 24, 2026, and applies to all information collected on or after that date. We encourage you to review this Policy periodically to stay informed about how we protect your information.
                    </p>
                  </div>
                </div>

                <div data-testid="section-information-collected">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">2. Information We Collect</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      We collect various categories of information to provide, maintain, and improve the Service. The types of information we collect depend on how you interact with our platform.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.1 Account Information</h3>
                    <p>
                      When you create a CreditClaw account, we collect your name, email address, and authentication credentials through Firebase Authentication, which is operated by Google. We may also collect a profile photo URL and display name if provided through your authentication provider. We store your unique user identifier, account creation date, and onboarding status within our systems.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.2 Payment Information</h3>
                    <p>
                      CreditClaw integrates with Stripe for payment processing and wallet funding. When you add a payment method to fund your bot wallets, your credit card number, expiration date, and CVC are transmitted directly to Stripe and are never stored on CreditClaw servers. We retain only the Stripe customer identifier, payment method identifiers, and the last four digits of your card number for display purposes. All payment data handling is governed by Stripe&apos;s PCI-DSS Level 1 compliance standards.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.3 Bot Configuration Data</h3>
                    <p>
                      We collect and store information about the AI agents (&quot;bots&quot;) you register and manage through the platform, including bot names, unique bot identifiers, pairing codes, associated wallet addresses, spending limits (per-transaction, daily, and monthly caps), category restrictions, approval mode settings, approval thresholds, special instructions, and guardrail configurations. This information is necessary to enforce the spending controls you define and to facilitate authorized transactions on behalf of your bots.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.4 Transaction Data</h3>
                    <p>
                      We record detailed transaction data for every purchase, funding event, and wallet operation processed through the Service. This includes transaction amounts, currency, timestamps, merchant names and identifiers, merchant categories, transaction descriptions, approval or denial status, denial reasons, and the specific guardrail or rule that triggered any denial. We also store references to the wallet and bot associated with each transaction.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.5 Self-Hosted Card Metadata</h3>
                    <p>
                      For users who utilize our self-hosted card feature, CreditClaw stores encrypted card references — not the actual card numbers, CVCs, or expiration dates. Card data is encrypted client-side using AES-256-GCM encryption before transmission to our servers, and the encryption key is split so that CreditClaw never possesses the complete decryption key. We store only the encrypted payload, a card identifier, the last four digits of the card for display, and metadata such as the card label and associated bot assignment. The actual card data can only be decrypted by the bot at the time of a purchase using a key fragment that is never stored on our servers in plaintext.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.6 Usage Data</h3>
                    <p>
                      We automatically collect certain information when you access the Service, including your Internet Protocol (IP) address, browser type and version, device type and operating system, referring URL, pages visited within the Service, the date and time of your visit, and the duration of your session. This information is collected through server logs and is used for security monitoring, abuse prevention, and platform improvement.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.7 API Usage Data</h3>
                    <p>
                      For bot owners and developers who interact with the CreditClaw API, we log API endpoint access, HTTP methods, request frequency, response status codes, response times, IP addresses, and bot API key usage (identified by a non-reversible bcrypt-hashed key prefix). This data is used for rate limiting, abuse detection, debugging, and maintaining the integrity of the Service.
                    </p>

                    <h3 className="text-lg font-bold text-neutral-800 mt-6">2.8 Webhook Delivery Records</h3>
                    <p>
                      If you configure webhooks to receive notifications about transactions and wallet events, we store webhook endpoint URLs, delivery timestamps, HTTP response codes from your servers, delivery success or failure status, retry counts, and the payload content of each webhook delivery. This data is retained to enable webhook retry functionality, delivery monitoring, and troubleshooting.
                    </p>
                  </div>
                </div>

                <div data-testid="section-how-we-use">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">3. How We Use Your Information</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      We use the information we collect for the following purposes:
                    </p>
                    <p>
                      <strong className="text-neutral-800">Service Provision and Operation:</strong> To create and manage your account, register and configure your bots, process wallet funding transactions, execute bot purchases, enforce spending limits and guardrails, deliver webhook notifications, and provide customer support.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Spending Control Enforcement:</strong> To evaluate every transaction request against your configured guardrails in real time, including per-transaction limits, daily and monthly caps, category restrictions, merchant allowlists and blocklists, and approval thresholds. All spending controls are enforced server-side to prevent circumvention.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Fraud Monitoring and Security:</strong> To detect and prevent fraudulent activity, unauthorized access, and abuse of the platform. This includes monitoring API usage patterns, tracking IP addresses, enforcing rate limits, and analyzing transaction patterns for anomalies.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Transaction Processing:</strong> To facilitate the movement of funds between your payment method, your bot wallets, and merchants. This includes coordinating with our payment partners (Stripe, CrossMint) to authorize, capture, and settle transactions.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Communication:</strong> To send you transactional notifications about purchases, approvals, denials, balance changes, and security alerts via email (through SendGrid) and in-app notifications. Safety-critical notifications, such as suspicious activity alerts and large transaction notifications, cannot be opted out of.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Platform Improvement:</strong> To analyze usage patterns, identify areas for improvement, develop new features, and optimize the performance and reliability of the Service. We may use aggregated and anonymized data for analytics and benchmarking purposes.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes, including responding to lawful requests from law enforcement and government authorities, enforcing our Terms of Service, and protecting our legal rights and the rights of our users.
                    </p>
                  </div>
                </div>

                <div data-testid="section-sharing">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">4. Information Sharing &amp; Disclosure</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      We do not sell your personal information. We share your information only in the following circumstances and with the following categories of third parties:
                    </p>
                    <p>
                      <strong className="text-neutral-800">Stripe:</strong> We share payment-related information with Stripe, Inc. for the purpose of processing payments, managing payment methods, issuing virtual cards, and facilitating wallet funding. Stripe acts as an independent data controller for the payment data it processes. Stripe&apos;s handling of your data is governed by the <a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Firebase (Google):</strong> We use Firebase Authentication for user authentication and session management. Your email address, display name, and authentication tokens are processed by Firebase. Firebase&apos;s data handling is governed by <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Privy:</strong> We use Privy for server-side wallet infrastructure and blockchain interactions related to certain wallet types. Privy may receive wallet addresses and transaction data necessary to execute blockchain-based operations. Privy&apos;s data practices are governed by their own privacy policy.
                    </p>
                    <p>
                      <strong className="text-neutral-800">CrossMint:</strong> We use CrossMint for smart wallet creation and management, including card issuance for certain wallet configurations. CrossMint may receive user identifiers and transaction data necessary to facilitate wallet operations. CrossMint&apos;s data handling is governed by their own privacy policy.
                    </p>
                    <p>
                      <strong className="text-neutral-800">SendGrid (Twilio):</strong> We use SendGrid for transactional email delivery, including purchase notifications, approval requests, security alerts, and account communications. SendGrid receives recipient email addresses and email content for delivery purposes. SendGrid&apos;s data practices are governed by <a href="https://www.twilio.com/legal/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Twilio&apos;s Privacy Policy</a>.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Anthropic:</strong> We use Anthropic&apos;s AI models for the Skill Builder feature, which analyzes vendor websites to generate procurement skill packages. When you use the Skill Builder, we may send publicly available vendor website content (such as product pages and checkout flows) to Anthropic for analysis. We never send your personal financial data, payment information, transaction history, or account credentials to Anthropic. Anthropic&apos;s data handling is governed by <a href="https://www.anthropic.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Anthropic&apos;s Privacy Policy</a>.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Law Enforcement and Legal Obligations:</strong> We may disclose your information to law enforcement agencies, government authorities, or other third parties when we believe in good faith that disclosure is necessary to: (a) comply with applicable law, regulation, or legal process (such as a subpoena or court order); (b) protect the rights, property, or safety of CreditClaw, our users, or others; (c) detect, prevent, or address fraud, security, or technical issues; or (d) enforce our Terms of Service.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Business Transfers:</strong> In the event that CreditClaw is involved in a merger, acquisition, reorganization, bankruptcy, or sale of all or a portion of its assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on the Service of any change in ownership or uses of your personal information, as well as any choices you may have regarding your personal information.
                    </p>
                  </div>
                </div>

                <div data-testid="section-security">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">5. Data Security</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      We implement industry-standard technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include, but are not limited to:
                    </p>
                    <p>
                      <strong className="text-neutral-800">Encryption in Transit:</strong> All data transmitted between your browser or bot client and our servers is encrypted using TLS (Transport Layer Security). We enforce HTTPS on all endpoints and do not support unencrypted connections.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Encryption at Rest:</strong> Self-hosted card data is encrypted using AES-256-GCM encryption on the client side before being transmitted to and stored on our servers. The encryption key is split between the bot and our servers using a split-knowledge architecture, ensuring that CreditClaw alone cannot decrypt the card data.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Authentication Security:</strong> Session tokens are stored in httpOnly cookies with strict same-site policies to prevent cross-site request forgery (CSRF) attacks. Bot API keys are hashed using bcrypt before storage, and we use a prefix-based lookup system to validate keys without exposing them.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Server-Side Enforcement:</strong> All spending controls, guardrails, and transaction validation are enforced exclusively on the server side. No client-side code can bypass spending limits, approval requirements, or wallet freeze status.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Access Controls:</strong> Access to user data within our organization is restricted to personnel who require it for legitimate business purposes. We employ role-based access controls and audit logging for administrative actions.
                    </p>
                    <p>
                      Despite these measures, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security. You acknowledge that you provide your information at your own risk.
                    </p>
                  </div>
                </div>

                <div data-testid="section-retention">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">6. Data Retention</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      We retain your personal information for as long as your account is active or as needed to provide you with the Service. Transaction records, activity logs, and webhook delivery records are retained for a minimum period necessary to support audit, compliance, and dispute resolution requirements.
                    </p>
                    <p>
                      Upon account termination or deletion, we will delete or anonymize your personal information within a reasonable timeframe, except where we are required to retain certain data to comply with legal obligations (such as tax, accounting, or regulatory requirements), resolve disputes, enforce our agreements, or where deletion is not technically feasible due to backup and archival systems. Retained data will be securely stored and isolated from active processing until deletion is possible.
                    </p>
                    <p>
                      Aggregated or anonymized data that can no longer be associated with an identifiable individual may be retained indefinitely for analytical and statistical purposes.
                    </p>
                  </div>
                </div>

                <div data-testid="section-ccpa">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">7. Your Rights Under the California Consumer Privacy Act (CCPA)</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      If you are a California resident, you have certain rights under the California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act (&quot;CCPA/CPRA&quot;), regarding your personal information:
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Know:</strong> You have the right to request that we disclose the categories and specific pieces of personal information we have collected about you, the categories of sources from which we collected your personal information, the business or commercial purposes for which we collected your personal information, and the categories of third parties with whom we shared your personal information.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Delete:</strong> You have the right to request that we delete any personal information we have collected from you, subject to certain exceptions provided by law (for example, if the information is necessary to complete a transaction, detect security incidents, comply with legal obligations, or for internal uses reasonably aligned with your expectations).
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Opt-Out of Sale or Sharing:</strong> CreditClaw does not sell your personal information to third parties, nor do we share your personal information for cross-context behavioral advertising purposes. Because we do not engage in these practices, there is no need to submit an opt-out request, but we will honor any such request we receive.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Correct:</strong> You have the right to request that we correct inaccurate personal information that we maintain about you.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA rights. We will not deny you goods or services, charge you different prices, provide you a different level or quality of goods or services, or suggest that you may receive a different price or different level or quality of goods or services as a result of exercising your rights.
                    </p>
                    <p>
                      <strong className="text-neutral-800">How to Exercise Your Rights:</strong> To exercise any of the rights described above, please submit a verifiable consumer request to us by emailing <a href="mailto:privacy@creditclaw.com" className="text-primary hover:underline">privacy@creditclaw.com</a>. We will verify your identity before processing your request by matching the information you provide with the information we have on file. We will respond to your request within 45 calendar days of receiving it. If we require additional time (up to an additional 45 days), we will inform you of the reason and extension period in writing.
                    </p>
                    <p>
                      You may also designate an authorized agent to make a request on your behalf. If you use an authorized agent, we may require that you provide the authorized agent with written permission to act on your behalf and verify your own identity directly with us.
                    </p>
                  </div>
                </div>

                <div data-testid="section-gdpr">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">8. Your Rights Under the General Data Protection Regulation (GDPR)</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, you have certain rights under the General Data Protection Regulation (&quot;GDPR&quot;) and applicable local data protection laws regarding the processing of your personal data:
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right of Access:</strong> You have the right to obtain confirmation as to whether or not your personal data is being processed, and where that is the case, to access the personal data and receive a copy of it along with information about the processing.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Rectification:</strong> You have the right to obtain the rectification of inaccurate personal data concerning you. You also have the right to have incomplete personal data completed, including by means of providing a supplementary statement.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Erasure (&quot;Right to Be Forgotten&quot;):</strong> You have the right to request the deletion of your personal data when it is no longer necessary for the purposes for which it was collected, when you withdraw your consent (where processing is based on consent), when you object to the processing and there are no overriding legitimate grounds, or when the data has been unlawfully processed.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Data Portability:</strong> You have the right to receive the personal data concerning you, which you have provided to us, in a structured, commonly used, and machine-readable format, and you have the right to transmit that data to another controller without hindrance from us.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Object:</strong> You have the right to object at any time to the processing of your personal data for direct marketing purposes. You also have the right to object to processing based on legitimate interests, on grounds relating to your particular situation.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Restrict Processing:</strong> You have the right to obtain the restriction of processing in certain circumstances, such as when you contest the accuracy of the data or when the processing is unlawful.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Withdraw Consent:</strong> Where processing of your personal data is based on your consent, you have the right to withdraw that consent at any time. The withdrawal of consent shall not affect the lawfulness of processing based on consent before its withdrawal.
                    </p>
                    <p>
                      <strong className="text-neutral-800">Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with a supervisory authority in the EU member state of your habitual residence, place of work, or place of the alleged infringement if you consider that the processing of your personal data infringes the GDPR.
                    </p>
                    <p>
                      To exercise any of these rights, please contact our Data Protection Officer at <a href="mailto:privacy@creditclaw.com" className="text-primary hover:underline">privacy@creditclaw.com</a>. We will respond to your request within 30 days, as required by the GDPR. The legal bases for our processing of your personal data include: performance of a contract (to provide the Service), legitimate interests (fraud prevention, security, and platform improvement), compliance with legal obligations, and your consent where applicable.
                    </p>
                  </div>
                </div>

                <div data-testid="section-cookies">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">9. Cookies &amp; Tracking Technologies</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      CreditClaw uses cookies and similar technologies to authenticate users, maintain session state, and ensure the security of the Service. Specifically, we use httpOnly session cookies to manage your authenticated session after login. These cookies are essential for the operation of the Service and cannot be disabled without losing access to authenticated features.
                    </p>
                    <p>
                      We do not use third-party advertising cookies or tracking pixels. We do not engage in cross-site tracking or behavioral advertising. We do not allow third-party advertising networks to place cookies on our Service.
                    </p>
                    <p>
                      We may use minimal analytics tools to understand aggregate usage patterns, such as page views, feature adoption, and error rates. Any analytics data collected is used solely for platform improvement and is not shared with third-party advertisers. You can control cookie behavior through your browser settings, but disabling essential cookies may prevent you from using the Service.
                    </p>
                  </div>
                </div>

                <div data-testid="section-children">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">10. Children&apos;s Privacy</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      The Service is not directed to individuals under the age of 18. CreditClaw does not knowingly collect personal information from children under 18 years of age. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information from our records promptly. If you are a parent or guardian and you believe that your child under 18 has provided personal information to CreditClaw, please contact us at <a href="mailto:privacy@creditclaw.com" className="text-primary hover:underline">privacy@creditclaw.com</a> so that we can take appropriate action.
                    </p>
                    <p>
                      Because CreditClaw involves the management of financial instruments and spending controls, all users must be of legal age to enter into binding agreements and to hold payment accounts in their jurisdiction. We reserve the right to terminate accounts that we determine to be held by individuals under the age of 18.
                    </p>
                  </div>
                </div>

                <div data-testid="section-international">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">11. International Data Transfers</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      CreditClaw is headquartered in the United States, and the information we collect is primarily processed and stored in the United States. If you are accessing the Service from outside the United States, including from the European Economic Area, the United Kingdom, or other jurisdictions with data protection laws that may differ from U.S. law, please be aware that your information will be transferred to, stored, and processed in the United States.
                    </p>
                    <p>
                      By using the Service, you consent to the transfer of your information to the United States and other jurisdictions where CreditClaw or its service providers operate. We take steps to ensure that your data receives an adequate level of protection in the jurisdictions in which we process it, including through the use of standard contractual clauses approved by the European Commission, data processing agreements with our service providers, and other appropriate safeguards as required by applicable law.
                    </p>
                  </div>
                </div>

                <div data-testid="section-third-party-links">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">12. Third-Party Links &amp; Services</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      The Service may contain links to third-party websites, services, or applications that are not operated by CreditClaw, including vendor websites accessed through procurement skills, payment processor interfaces, and authentication provider pages. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
                    </p>
                    <p>
                      We strongly advise you to review the privacy policy of every site or service you interact with. CreditClaw shall not be liable for any damages or losses arising from your interaction with third-party websites or services, including any personal information you provide directly to such third parties.
                    </p>
                  </div>
                </div>

                <div data-testid="section-changes">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">13. Changes to This Policy</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      We reserve the right to update or modify this Privacy Policy at any time at our sole discretion. When we make changes, we will update the &quot;Last Updated&quot; date at the top of this Policy. If we make material changes that significantly affect how we collect, use, or share your personal information, we will provide notice through the Service (such as a banner or notification within the dashboard) or via email to the address associated with your account.
                    </p>
                    <p>
                      Your continued use of the Service following the posting of any changes to this Policy constitutes your acceptance of those changes. If you do not agree with the revised Policy, you must stop using the Service and may request deletion of your account and personal information by contacting us at the email address provided below.
                    </p>
                  </div>
                </div>

                <div data-testid="section-contact">
                  <h2 className="text-2xl font-extrabold text-neutral-900 mb-4">14. Contact Us</h2>
                  <div className="space-y-4 text-neutral-600 leading-relaxed">
                    <p>
                      If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
                    </p>
                    <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100">
                      <p className="font-bold text-neutral-900">CreditClaw Inc.</p>
                      <p>
                        Email: <a href="mailto:privacy@creditclaw.com" className="text-primary hover:underline">privacy@creditclaw.com</a>
                      </p>
                    </div>
                    <p>
                      For GDPR-related inquiries, you may contact our Data Protection Officer at the same email address. We will endeavor to respond to all legitimate inquiries within a reasonable timeframe and no later than 30 days for GDPR requests or 45 days for CCPA requests.
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