import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" data-testid="footer-logo-link">
              <Image src="/images/logo-claw-chip.png" alt="CreditClaw Logo" width={32} height={32} className="object-contain" />
              <span className="font-bold text-lg tracking-tight">CreditClaw</span>
            </Link>
            <p className="text-sm text-neutral-400 font-medium leading-relaxed">
              Prepaid spending controls for AI agents. Your card, your rules, your bot&apos;s wallet.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-300 mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link href="/how-it-works" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-how-it-works">How It Works</Link></li>
              <li><Link href="/allowance" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-allowance">Allowance</Link></li>
              <li><Link href="/safety" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-safety">Safety</Link></li>
              <li><Link href="/skills" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-skills">Vendor Skills</Link></li>
              <li><Link href="/onboarding" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-onboarding">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-300 mb-4">Dashboard</h4>
            <ul className="space-y-3">
              <li><Link href="/overview" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-overview">Overview</Link></li>
              <li><Link href="/cards" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-cards">Cards</Link></li>
              <li><Link href="/transactions" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-transactions">Transactions</Link></li>
              <li><Link href="/settings" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-settings">Settings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-300 mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><Link href="/docs" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-documentation">Documentation</Link></li>
              <li><Link href="/docs/api/introduction" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-developer">Developer</Link></li>
              <li><Link href="/newsroom" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-newsroom">Newsroom</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-300 mb-4">Connect</h4>
            <ul className="space-y-3">
              <li><a href="https://x.com/creditclawapp" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-twitter">Twitter</a></li>
              <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-instagram">Instagram</a></li>
              <li><a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors font-medium" data-testid="footer-link-tiktok">TikTok</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500 font-medium gap-4">
          <span>&copy; 2026 CreditClaw Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors" data-testid="footer-link-privacy">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors" data-testid="footer-link-terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
