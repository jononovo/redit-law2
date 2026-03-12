"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Store, Copy, Check, ExternalLink, Eye, EyeOff, GripVertical, ShoppingBag, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface SellerProfile {
  id: number;
  business_name: string | null;
  logo_url: string | null;
  contact_email: string | null;
  website_url: string | null;
  description: string | null;
  slug: string | null;
  shop_published: boolean;
  shop_banner_url: string | null;
}

interface CheckoutPageItem {
  checkout_page_id: string;
  title: string;
  description: string | null;
  amount_usd: number | null;
  amount_locked: boolean;
  status: string;
  page_type: string;
  shop_visible: boolean;
  shop_order: number;
  image_url: string | null;
  collect_buyer_name: boolean;
  payment_count: number;
}

export default function ShopAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [pages, setPages] = useState<CheckoutPageItem[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [slug, setSlug] = useState("");
  const [shopPublished, setShopPublished] = useState(false);
  const [shopBannerUrl, setShopBannerUrl] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, pagesRes] = await Promise.all([
        authFetch("/api/v1/seller-profile"),
        authFetch("/api/v1/checkout-pages"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.profile) {
          setProfile(data.profile);
          setSlug(data.profile.slug || "");
          setShopPublished(data.profile.shop_published || false);
          setShopBannerUrl(data.profile.shop_banner_url || "");
          setBusinessName(data.profile.business_name || "");
          setLogoUrl(data.profile.logo_url || "");
          setContactEmail(data.profile.contact_email || "");
          setWebsiteUrl(data.profile.website_url || "");
          setDescription(data.profile.description || "");
        }
      }

      if (pagesRes.ok) {
        const data = await pagesRes.json();
        setPages(
          (data.checkout_pages || [])
            .filter((p: any) => p.status === "active")
            .sort((a: any, b: any) => a.shop_order - b.shop_order)
        );
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/seller-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim() || null,
          shop_published: shopPublished,
          shop_banner_url: shopBannerUrl.trim() || null,
          business_name: businessName.trim() || null,
          logo_url: logoUrl.trim() || null,
          contact_email: contactEmail.trim() || null,
          website_url: websiteUrl.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        toast({ title: "Shop settings saved" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleShopVisible = async (checkoutPageId: string, visible: boolean) => {
    try {
      const res = await authFetch(`/api/v1/checkout-pages/${checkoutPageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_visible: visible }),
      });
      if (res.ok) {
        setPages(prev => prev.map(p =>
          p.checkout_page_id === checkoutPageId ? { ...p, shop_visible: visible } : p
        ));
      }
    } catch {}
  };

  const copyShopUrl = async () => {
    if (!profile?.slug) return;
    const url = `${window.location.origin}/s/${profile.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const shopUrl = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${slug}` : null;

  return (
    <div className="space-y-6" data-testid="shop-admin-page">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-shop-admin-title">
          Shop
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage your public storefront where buyers can browse your products and events
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-5" data-testid="shop-settings-form">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-5 h-5 text-neutral-600" />
          <h2 className="text-lg font-semibold text-neutral-900">Shop Settings</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug" className="text-sm font-medium text-neutral-700">
            Shop URL
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400 flex-shrink-0">/s/</span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-shop"
              className="max-w-xs"
              data-testid="input-shop-slug"
            />
          </div>
          <p className="text-xs text-neutral-400">Lowercase letters, numbers, and hyphens only</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bannerUrl" className="text-sm font-medium text-neutral-700">
            Banner Image URL
          </Label>
          <Input
            id="bannerUrl"
            type="url"
            value={shopBannerUrl}
            onChange={(e) => setShopBannerUrl(e.target.value)}
            placeholder="https://example.com/banner.jpg"
            data-testid="input-shop-banner-url"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={shopPublished}
            onCheckedChange={setShopPublished}
            data-testid="switch-shop-published"
          />
          <Label className="text-sm font-medium text-neutral-700">
            {shopPublished ? "Shop is published" : "Shop is unpublished"}
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-shop-settings"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>

          {shopUrl && profile?.shop_published && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyShopUrl} className="gap-1" data-testid="button-copy-shop-url">
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? "Copied" : "Copy URL"}
              </Button>
              <a href={`/s/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700" data-testid="link-view-shop">
                <ExternalLink className="w-3.5 h-3.5" />
                View Shop
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-5" data-testid="seller-details-form">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle className="w-5 h-5 text-neutral-600" />
          <h2 className="text-lg font-semibold text-neutral-900">Your Details</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessName" className="text-sm font-medium text-neutral-700">
            Business Name
          </Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your Company Name"
            className="max-w-md"
            data-testid="input-business-name"
          />
          <p className="text-xs text-neutral-400">Displayed on checkout pages and invoices</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="logoUrl" className="text-sm font-medium text-neutral-700">
            Logo URL
          </Label>
          <Input
            id="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="max-w-md"
            data-testid="input-logo-url"
          />
          <p className="text-xs text-neutral-400">Direct URL to your business logo (square image recommended)</p>
          {logoUrl && (
            <div className="mt-2 p-3 bg-neutral-50 rounded-lg inline-block">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="w-16 h-16 object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                data-testid="img-logo-preview"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contactEmail" className="text-sm font-medium text-neutral-700">
            Contact Email
          </Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={user?.email || "you@example.com"}
            className="max-w-md"
            data-testid="input-contact-email"
          />
          <p className="text-xs text-neutral-400">Shown to buyers on checkout pages</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl" className="text-sm font-medium text-neutral-700">
            Link
          </Label>
          <Input
            id="websiteUrl"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yoursite.com"
            className="max-w-md"
            data-testid="input-website-url"
          />
          <p className="text-xs text-neutral-400">Your website, Instagram, or anywhere people can learn more</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm font-medium text-neutral-700">
            Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of your business..."
            className="max-w-md resize-none"
            rows={3}
            data-testid="input-description"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6" data-testid="shop-products-manager">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-neutral-600" />
          <h2 className="text-lg font-semibold text-neutral-900">Products in Shop</h2>
        </div>
        <p className="text-sm text-neutral-500 mb-4">
          Toggle which checkout pages appear in your shop. Only active pages can be shown.
        </p>

        {pages.length === 0 ? (
          <div className="text-center py-8 text-neutral-400" data-testid="shop-no-products">
            <Store className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm font-medium">No active checkout pages</p>
            <p className="text-xs mt-1">Create a checkout page first to add it to your shop</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="shop-products-list">
            {pages.map((page) => (
              <div
                key={page.checkout_page_id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  page.shop_visible ? "border-blue-200 bg-blue-50/30" : "border-neutral-100 bg-white"
                }`}
                data-testid={`shop-product-row-${page.checkout_page_id}`}
              >
                <GripVertical className="w-4 h-4 text-neutral-300 flex-shrink-0" />

                <Switch
                  checked={page.shop_visible}
                  onCheckedChange={(checked) => toggleShopVisible(page.checkout_page_id, checked)}
                  data-testid={`switch-shop-visible-${page.checkout_page_id}`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900 truncate" data-testid={`text-shop-product-title-${page.checkout_page_id}`}>
                      {page.title}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      page.page_type === "event" ? "bg-purple-100 text-purple-600" : "bg-neutral-100 text-neutral-500"
                    }`}>
                      {page.page_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                    {page.amount_usd && <span>${page.amount_usd.toFixed(2)}</span>}
                    <span>{page.payment_count} sale{page.payment_count !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {page.shop_visible ? (
                  <Eye className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
