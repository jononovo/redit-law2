"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, Truck, Clock, CheckCircle2, XCircle,
  ExternalLink, MapPin, ShoppingCart, Tag, Bot, CreditCard,
  DollarSign, Loader2, Hash, Layers, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

const ORDER_TIMELINE_STEPS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getTimelineIndex(status: string | null): number {
  if (!status) return 0;
  const failed = ["failed", "payment_failed", "delivery_failed", "cancelled"];
  if (failed.includes(status)) return -1;
  const map: Record<string, number> = {
    pending: 0, quote: 0, confirmed: 1, processing: 1,
    shipped: 2, delivered: 3, completed: 3,
  };
  return map[status] ?? 0;
}

function OrderTimeline({ status }: { status: string }) {
  const isFailed = ["failed", "payment_failed", "delivery_failed", "cancelled"].includes(status);
  const currentIdx = getTimelineIndex(status);

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-lg border border-red-200" data-testid="order-timeline-failed">
        <XCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-red-700">{status.replace(/_/g, " ")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3" data-testid="order-timeline">
      {ORDER_TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {idx > 0 && (
              <div className={`absolute top-4 -left-1/2 w-full h-0.5 ${idx <= currentIdx ? "bg-violet-400" : "bg-neutral-200"}`} style={{ zIndex: 0 }} />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 ${
                isCurrent ? "bg-violet-600 text-white ring-2 ring-violet-200" :
                isCompleted ? "bg-violet-100 text-violet-600" :
                "bg-neutral-100 text-neutral-400"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className={`text-xs mt-1 ${isCurrent ? "font-semibold text-violet-700" : isCompleted ? "text-violet-600" : "text-neutral-400"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatCents(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

const RAIL_LABELS: Record<string, string> = {
  rail1: "Rail 1 — Stripe Wallet",
  rail2: "Rail 2 — Card Wallet",
  rail4: "Rail 4 — Self-Hosted Card",
  rail5: "Rail 5 — Sub-Agent Card",
};

interface ShippingAddressData {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
}

interface TrackingInfoData {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  status?: string;
  last_updated?: string;
}

interface VendorDetailsData {
  url?: string;
  category?: string;
  vendorSlug?: string;
  vendorOrderUrl?: string;
  vendorCustomerId?: string;
  notes?: string;
}

interface OrderData {
  id: number;
  ownerUid: string;
  rail: string;
  botId: string | null;
  botName: string | null;
  walletId: number | null;
  cardId: string | null;
  transactionId: number | null;
  externalOrderId: string | null;
  status: string;
  vendor: string | null;
  vendorId: number | null;
  vendorDetails: VendorDetailsData | null;
  productName: string | null;
  productImageUrl: string | null;
  productUrl: string | null;
  productShortDescription: string | null;
  sku: string | null;
  quantity: number;
  priceCents: number | null;
  priceCurrency: string;
  taxesCents: number | null;
  shippingPriceCents: number | null;
  shippingType: string | null;
  shippingNote: string | null;
  shippingAddress: ShippingAddressData | null;
  trackingInfo: TrackingInfoData | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

function formatShippingAddress(addr: ShippingAddressData): string[] {
  const lines: string[] = [];
  if (addr.name) lines.push(addr.name);
  if (addr.line1) lines.push(addr.line1);
  if (addr.line2) lines.push(addr.line2);
  const cityStateParts: string[] = [];
  if (addr.city) cityStateParts.push(addr.city);
  if (addr.state) cityStateParts.push(addr.state);
  const postalCode = addr.postalCode || addr.zip;
  if (postalCode) cityStateParts.push(postalCode);
  if (cityStateParts.length > 0) lines.push(cityStateParts.join(", "));
  if (addr.country && addr.country !== "US") lines.push(addr.country);
  return lines;
}

export default function OrderDetailPage() {
  const { order_id } = useParams<{ order_id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/orders/${order_id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load order");
        return;
      }
      const data = await res.json();
      setOrder(data.order);
    } catch {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [order_id]);

  useEffect(() => {
    if (user && order_id) fetchOrder();
  }, [user, order_id, fetchOrder]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
    toast({ title: "Order refreshed" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid="text-order-error">
          <Package className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700">{error || "Order not found"}</h3>
        </div>
      </div>
    );
  }

  const subtotalCents = (order.priceCents || 0) * (order.quantity || 1);
  const totalCents = subtotalCents + (order.taxesCents || 0) + (order.shippingPriceCents || 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="order-detail-page">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1" data-testid="button-refresh-order">
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6 space-y-6">
        <div className="flex items-start gap-4">
          {order.productImageUrl ? (
            <img
              src={order.productImageUrl}
              alt={order.productName || "Product"}
              className="w-20 h-20 rounded-lg object-cover border border-neutral-100"
              data-testid="img-product"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-violet-50 flex items-center justify-center border border-violet-100">
              <ShoppingCart className="w-8 h-8 text-violet-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900" data-testid="text-product-name">
                {order.productName || "Order"}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            {order.productShortDescription && (
              <p className="text-sm text-neutral-500 mt-1" data-testid="text-product-description">{order.productShortDescription}</p>
            )}
            {order.productUrl && (
              <a
                href={order.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 mt-1"
                data-testid="link-product-url"
              >
                <ExternalLink className="w-3 h-3" /> View Product
              </a>
            )}
          </div>
        </div>

        {order.vendor && (
          <div className="flex items-center gap-2 text-sm" data-testid="text-vendor">
            <Tag className="w-4 h-4 text-neutral-400" />
            <span className="font-medium text-neutral-700">{order.vendor}</span>
            {order.vendorDetails?.url && (
              <a
                href={order.vendorDetails.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-800"
                data-testid="link-vendor-url"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {order.vendorDetails?.category && (
              <span className="text-neutral-400">• {order.vendorDetails.category}</span>
            )}
            {order.vendorDetails?.vendorSlug && (
              <span className="text-neutral-400 font-mono text-xs">({order.vendorDetails.vendorSlug})</span>
            )}
          </div>
        )}

        <OrderTimeline status={order.status} />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Unit Price</p>
            <p className="text-sm font-semibold text-neutral-900" data-testid="text-price">{formatCents(order.priceCents, order.priceCurrency)}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Subtotal{order.quantity > 1 ? ` (×${order.quantity})` : ""}</p>
            <p className="text-sm font-semibold text-neutral-900" data-testid="text-subtotal">{formatCents(subtotalCents, order.priceCurrency)}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Shipping</p>
            <p className="text-sm font-semibold text-neutral-900" data-testid="text-shipping-price">{formatCents(order.shippingPriceCents, order.priceCurrency)}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <p className="text-xs text-neutral-500">Taxes</p>
            <p className="text-sm font-semibold text-neutral-900" data-testid="text-taxes">{formatCents(order.taxesCents, order.priceCurrency)}</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
            <p className="text-xs text-violet-600">Total</p>
            <p className="text-sm font-bold text-violet-900" data-testid="text-total">{formatCents(totalCents, order.priceCurrency)}</p>
          </div>
        </div>

        {order.trackingInfo && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4" data-testid="tracking-info-section">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-semibold text-indigo-800">Tracking Information</h4>
            </div>
            <div className="space-y-1.5">
              {order.trackingInfo.carrier && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-600">Carrier</span>
                  <span className="font-medium text-indigo-900" data-testid="text-tracking-carrier">{order.trackingInfo.carrier}</span>
                </div>
              )}
              {order.trackingInfo.tracking_number && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-600">Tracking #</span>
                  <span className="font-mono text-indigo-900" data-testid="text-tracking-number">{order.trackingInfo.tracking_number}</span>
                </div>
              )}
              {order.trackingInfo.estimated_delivery && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-600">Est. Delivery</span>
                  <span className="text-indigo-900" data-testid="text-estimated-delivery">{order.trackingInfo.estimated_delivery}</span>
                </div>
              )}
              {order.trackingInfo.tracking_url && (
                <a
                  href={order.trackingInfo.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-indigo-700 hover:text-indigo-900"
                  data-testid="link-tracking-url"
                >
                  <ExternalLink className="w-3 h-3" /> Track Package
                </a>
              )}
            </div>
          </div>
        )}

        {order.shippingAddress && (
          <div className="bg-neutral-50 rounded-lg p-4" data-testid="shipping-address-section">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <h4 className="text-sm font-semibold text-neutral-700">Shipping Address</h4>
              {order.shippingType && (
                <span className="text-xs text-neutral-400 ml-auto" data-testid="text-shipping-type">{order.shippingType}</span>
              )}
            </div>
            <div className="text-sm text-neutral-600 space-y-0.5" data-testid="text-shipping-address">
              {formatShippingAddress(order.shippingAddress).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {order.shippingAddress.phone && (
              <p className="text-xs text-neutral-400 mt-1.5">Phone: {order.shippingAddress.phone}</p>
            )}
            {order.shippingAddress.email && (
              <p className="text-xs text-neutral-400 mt-0.5">Email: {order.shippingAddress.email}</p>
            )}
            {order.shippingNote && (
              <p className="text-xs text-neutral-400 mt-1" data-testid="text-shipping-note">{order.shippingNote}</p>
            )}
          </div>
        )}

        <div className="border-t border-neutral-100 pt-4">
          <h4 className="text-sm font-semibold text-neutral-700 mb-3">Order Metadata</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-500">Rail</span>
              <span className="font-medium text-neutral-700" data-testid="text-rail">{RAIL_LABELS[order.rail] || order.rail}</span>
            </div>
            {order.botName && (
              <div className="flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">Bot</span>
                <span className="font-medium text-neutral-700" data-testid="text-bot-name">{order.botName}</span>
              </div>
            )}
            {order.walletId && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">Wallet</span>
                <span className="font-medium text-neutral-700" data-testid="text-wallet-id">#{order.walletId}</span>
              </div>
            )}
            {order.cardId && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">Card</span>
                <span className="font-medium text-neutral-700" data-testid="text-card-id">{order.cardId}</span>
              </div>
            )}
            {order.sku && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">SKU</span>
                <span className="font-mono text-neutral-700" data-testid="text-sku">{order.sku}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-500">Quantity</span>
              <span className="font-medium text-neutral-700" data-testid="text-quantity">{order.quantity}</span>
            </div>
            {order.externalOrderId && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <DollarSign className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">External ID</span>
                <code className="font-mono text-xs text-neutral-600" data-testid="text-external-order-id">{order.externalOrderId}</code>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-100 pt-3">
          <span data-testid="text-order-id">Order #{order.id}</span>
          <span data-testid="text-created-at">{new Date(order.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
