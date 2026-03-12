"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Shield,
  TrendingUp,
  Clock,
  Globe,
  Zap,
  CreditCard,
  Monitor,
  Package,
  ShoppingCart,
  Cpu,
  Info,
} from "lucide-react";
import { getVendorBySlug } from "@/lib/procurement-skills/registry";
import { generateVendorSkill } from "@/lib/procurement-skills/generator";
import {
  computeAgentFriendliness,
  CHECKOUT_METHOD_LABELS,
  CHECKOUT_METHOD_COLORS,
  CAPABILITY_LABELS,
  CATEGORY_LABELS,
  CheckoutMethod,
  VendorCapability,
  VendorCategory,
  SkillMaturity,
} from "@/lib/procurement-skills/types";

const MATURITY_CONFIG: Record<SkillMaturity, { label: string; className: string; description: string }> = {
  verified: { label: "Verified", className: "bg-green-100 text-green-700 border-green-200", description: "Tested and confirmed working by the CreditClaw team" },
  beta: { label: "Beta", className: "bg-yellow-100 text-yellow-700 border-yellow-200", description: "Functional but may have edge cases not yet covered" },
  community: { label: "Community", className: "bg-blue-100 text-blue-700 border-blue-200", description: "Submitted by a community member" },
  draft: { label: "Draft", className: "bg-neutral-100 text-neutral-600 border-neutral-200", description: "Initial version, not yet fully tested" },
};

const CATEGORY_ICONS: Record<VendorCategory, React.ReactNode> = {
  retail: <ShoppingCart className="w-5 h-5" />,
  office: <Package className="w-5 h-5" />,
  hardware: <Zap className="w-5 h-5" />,
  electronics: <Cpu className="w-5 h-5" />,
  industrial: <Globe className="w-5 h-5" />,
  specialty: <Star className="w-5 h-5" />,
};

const CHECKOUT_ICONS: Record<CheckoutMethod, React.ReactNode> = {
  native_api: <Zap className="w-4 h-4" />,
  acp: <CreditCard className="w-4 h-4" />,
  x402: <Globe className="w-4 h-4" />,
  crossmint_world: <Globe className="w-4 h-4" />,
  self_hosted_card: <CreditCard className="w-4 h-4" />,
  browser_automation: <Monitor className="w-4 h-4" />,
};

const ALL_CAPABILITIES: VendorCapability[] = [
  "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
  "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
];

export default function VendorDetailPage({ params }: { params: Promise<{ vendor: string }> }) {
  const { vendor: slug } = use(params);
  const vendor = getVendorBySlug(slug);
  const [copied, setCopied] = useState(false);
  const [showSkillPreview, setShowSkillPreview] = useState(false);

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background text-neutral-900 font-sans">
        <Nav />
        <main className="py-32 text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-3">Vendor Not Found</h1>
          <p className="text-neutral-500 font-medium mb-6">
            No procurement skill exists for &quot;{slug}&quot;.
          </p>
          <Link href="/skills">
            <Button className="rounded-full" data-testid="button-back-to-catalog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const friendliness = computeAgentFriendliness(vendor);
  const maturity = MATURITY_CONFIG[vendor.maturity];
  const skillMd = generateVendorSkill(vendor);
  const skillUrl = `https://creditclaw.com/api/v1/bot/skills/${vendor.slug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(skillUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([skillMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vendor.slug}-skill.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main>
        <section className="relative py-12 overflow-hidden">
          <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

          <div className="container mx-auto px-6 relative z-10">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary transition-colors mb-8"
              data-testid="link-back-catalog"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Vendor Catalog
            </Link>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center text-2xl font-bold text-neutral-400">
                    {vendor.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
                        {vendor.name}
                      </h1>
                      <Badge className={`text-xs border ${maturity.className}`} data-testid="badge-maturity">
                        {maturity.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        {CATEGORY_ICONS[vendor.category]}
                        <span className="font-medium">{CATEGORY_LABELS[vendor.category]}</span>
                      </div>
                      <a
                        href={vendor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                        data-testid="link-vendor-url"
                      >
                        {vendor.url} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-1" data-testid="score-agent-friendliness">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < friendliness ? "text-amber-400 fill-amber-400" : "text-neutral-200"
                        }`}
                      />
                    ))}
                    <span className="text-sm font-semibold text-neutral-700 ml-2">
                      Agent Friendliness ({friendliness}/5)
                    </span>
                  </div>
                  {vendor.feedbackStats?.successRate != null && (
                    <div className="flex items-center gap-1.5" data-testid="stat-success-rate">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-bold text-green-700">
                        {Math.round(vendor.feedbackStats.successRate * 100)}% success rate
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Checkout Methods
                    </h3>
                    <div className="space-y-3">
                      {vendor.checkoutMethods.map((method, i) => {
                        const config = vendor.methodConfig[method];
                        return (
                          <div key={method} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CHECKOUT_METHOD_COLORS[method]}`}>
                              {CHECKOUT_ICONS[method]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-neutral-900">
                                  {CHECKOUT_METHOD_LABELS[method]}
                                </span>
                                {i === 0 && (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    PREFERRED
                                  </span>
                                )}
                              </div>
                              {config?.notes && (
                                <p className="text-xs text-neutral-500 mt-0.5">{config.notes}</p>
                              )}
                              {config?.locatorFormat && (
                                <code className="text-[10px] font-mono bg-neutral-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  {config.locatorFormat}
                                </code>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Capabilities
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_CAPABILITIES.map(cap => {
                        const has = vendor.capabilities.includes(cap);
                        return (
                          <div key={cap} className="flex items-center gap-2">
                            {has ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                            )}
                            <span className={`text-xs font-medium ${has ? "text-neutral-900" : "text-neutral-400"}`}>
                              {CAPABILITY_LABELS[cap]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Search</h4>
                    <p className="text-sm text-neutral-700 font-medium">{vendor.search.pattern}</p>
                    {vendor.search.productIdFormat && (
                      <p className="text-xs text-neutral-500 mt-2">
                        ID format: <code className="bg-neutral-100 px-1 rounded">{vendor.search.productIdFormat}</code>
                      </p>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Checkout</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        {vendor.checkout.guestCheckout ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className="font-medium text-neutral-700">Guest checkout</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.checkout.taxExemptField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-neutral-300" />
                        )}
                        <span className="font-medium text-neutral-700">Tax exemption</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vendor.checkout.poNumberField ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-neutral-300" />
                        )}
                        <span className="font-medium text-neutral-700">PO numbers</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Shipping</h4>
                    <div className="space-y-1.5 text-sm text-neutral-700 font-medium">
                      {vendor.shipping.freeThreshold && (
                        <p>Free over ${vendor.shipping.freeThreshold}</p>
                      )}
                      <p>{vendor.shipping.estimatedDays}</p>
                      {vendor.shipping.businessShipping && (
                        <div className="flex items-center gap-1.5 text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Business shipping</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {vendor.tips.length > 0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 mb-8">
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-500" />
                      Tips & Notes
                    </h3>
                    <ul className="space-y-2">
                      {vendor.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 font-medium">
                          <span className="text-amber-500 mt-0.5">-</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                      SKILL.md Preview
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSkillPreview(!showSkillPreview)}
                        className="text-xs font-semibold"
                        data-testid="button-toggle-preview"
                      >
                        {showSkillPreview ? "Hide" : "Show"} Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        className="text-xs font-semibold"
                        data-testid="button-download-skill"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  {showSkillPreview && (
                    <pre className="bg-neutral-50 rounded-xl p-4 text-xs font-mono text-neutral-700 overflow-x-auto max-h-[600px] overflow-y-auto border border-neutral-100" data-testid="preview-skill-md">
                      {skillMd}
                    </pre>
                  )}
                </div>
              </div>

              <aside className="lg:w-72 flex-shrink-0">
                <div className="sticky top-24 space-y-4">
                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-neutral-900 mb-4">Skill URL</h3>
                    <div className="bg-neutral-50 rounded-xl p-3 mb-3">
                      <code className="text-xs font-mono text-neutral-700 break-all">{skillUrl}</code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-xs font-semibold"
                      onClick={handleCopyUrl}
                      data-testid="button-copy-skill-url"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy URL
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-neutral-900 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Security Report
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-neutral-700">URLs verified</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-neutral-700">No executable code</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-neutral-700">No credential harvesting</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">CreditClaw authored</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-neutral-900 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-500" />
                      Metadata
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Version</span>
                        <span className="font-semibold text-neutral-900">{vendor.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Last verified</span>
                        <span className="font-semibold text-neutral-900">{vendor.lastVerified}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Generated by</span>
                        <span className="font-semibold text-neutral-900 capitalize">{vendor.generatedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-medium">Maturity</span>
                        <Badge className={`text-[10px] border ${maturity.className}`}>{maturity.label}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
