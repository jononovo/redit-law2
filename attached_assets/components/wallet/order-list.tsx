"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Package, DollarSign, Truck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "./status-badge";

export interface OrderRow {
  id: number;
  rail: string;
  botName: string | null;
  vendor: string | null;
  vendorDetails?: { url?: string; category?: string; vendorSlug?: string } | null;
  productName: string | null;
  productImageUrl: string | null;
  productUrl: string | null;
  status: string;
  quantity: number;
  priceCents: number | null;
  priceCurrency: string;
  taxesCents?: number | null;
  shippingPriceCents?: number | null;
  shippingAddress: Record<string, any> | null;
  trackingInfo: Record<string, any> | null;
  externalOrderId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface OrderListProps {
  orders: OrderRow[];
  testIdPrefix?: string;
}

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
  const map: Record<string, number> = { pending: 0, quote: 0, confirmed: 1, processing: 1, shipped: 2, delivered: 3, completed: 3 };
  return map[status] ?? 0;
}

export function OrderTimeline({ status }: { status: string | null }) {
  const isFailed = status && ["failed", "payment_failed", "delivery_failed", "cancelled"].includes(status);
  const currentIdx = getTimelineIndex(status);

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 rounded-lg border border-red-200" data-testid="order-timeline-failed">
        <XCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-red-700">{(status || "").replace(/_/g, " ")}</span>
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

function formatPrice(cents: number | null, currency: string): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)} ${currency}`;
}

export function OrderList({ orders, testIdPrefix = "order" }: OrderListProps) {
  const router = useRouter();

  const handleOpenDetail = (order: OrderRow) => {
    router.push(`/app/orders/${order.id}`);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid={`text-no-${testIdPrefix}s`}>
        <Package className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
        <h3 className="text-lg font-semibold text-neutral-700">No orders yet</h3>
        <p className="text-sm text-neutral-500 mt-1">Orders will appear here when your bots make purchases</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-xl border border-neutral-100 p-4 cursor-pointer hover:border-violet-200 hover:shadow-sm transition-all"
          onClick={() => handleOpenDetail(order)}
          data-testid={`${testIdPrefix}-card-${order.id}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {order.productImageUrl ? (
                <img
                  src={order.productImageUrl}
                  alt={order.productName || "Product"}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50">
                  <ShoppingCart className="w-4 h-4 text-violet-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {order.productName || order.vendor || "Order"}
                </p>
                <p className="text-xs text-neutral-400">
                  {new Date(order.createdAt).toLocaleString()}
                  {order.vendor && order.productName && (
                    <span className="ml-1">· {order.vendor}</span>
                  )}
                  {order.vendorDetails?.category && (
                    <span className="ml-1">· {order.vendorDetails.category}</span>
                  )}
                  {order.botName && (
                    <span className="ml-1">· {order.botName}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              <div className="text-right">
                <span className="font-semibold text-sm" data-testid={`text-amount-${order.id}`}>
                  {formatPrice(order.priceCents, order.priceCurrency)}
                </span>
                {order.quantity > 1 && (
                  <p className="text-xs text-neutral-400">qty: {order.quantity}</p>
                )}
              </div>
            </div>
          </div>
          {order.trackingInfo && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <Truck className="w-3 h-3" />
              {order.trackingInfo.carrier && <span>{order.trackingInfo.carrier}</span>}
              {order.trackingInfo.tracking_number && <span className="font-mono">{order.trackingInfo.tracking_number}</span>}
              {!order.trackingInfo.carrier && !order.trackingInfo.tracking_number && <span>Tracking info available</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
