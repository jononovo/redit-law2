"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ShoppingCart, Filter, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/wallet/status-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import type { Order } from "@/shared/schema";

interface BotOption {
  botId: string;
  botName: string;
}

interface OrdersPanelProps {
  onConfigureGuardrails?: () => void;
}

export function OrdersPanel({ onConfigureGuardrails }: OrdersPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<BotOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [railFilter, setRailFilter] = useState("all");
  const [botFilter, setBotFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchBots = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/bots/mine");
      if (res.ok) {
        const data = await res.json();
        setBots((data.bots || []).map((b: any) => ({ botId: b.botId || b.bot_id, botName: b.botName || b.bot_name })));
      }
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (railFilter !== "all") params.set("rail", railFilter);
      if (botFilter !== "all") params.set("bot_id", botFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await authFetch(`/api/v1/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [railFilter, botFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (user) {
      fetchBots();
    }
  }, [user, fetchBots]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchOrders();
    }
  }, [user, fetchOrders]);

  const railLabel = (rail: string) => {
    const labels: Record<string, string> = {
      rail1: "Stripe Wallet",
      rail2: "Card Wallet",
      rail4: "My Card (Split)",
      rail5: "My Card (Encrypted)",
    };
    return labels[rail] || rail;
  };

  const railColor = (rail: string) => {
    const colors: Record<string, string> = {
      rail1: "bg-blue-50 text-blue-700",
      rail2: "bg-purple-50 text-purple-700",
      rail4: "bg-amber-50 text-amber-700",
      rail5: "bg-emerald-50 text-emerald-700",
    };
    return colors[rail] || "bg-neutral-50 text-neutral-700";
  };

  const formatPrice = (cents: number | null, currency: string) => {
    if (cents == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orders-panel">
      <div className="bg-white rounded-xl border border-neutral-100 p-4" data-testid="orders-filters">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700">Filters</span>
          </div>
          {onConfigureGuardrails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigureGuardrails}
              data-testid="button-configure-guardrails"
            >
              <Settings2 className="w-4 h-4 mr-1.5" />
              Configure Ordering Guardrails
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-neutral-500">Rail</Label>
            <Select value={railFilter} onValueChange={setRailFilter}>
              <SelectTrigger data-testid="select-rail-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rails</SelectItem>
                <SelectItem value="rail1">Stripe Wallet</SelectItem>
                <SelectItem value="rail2">Card Wallet</SelectItem>
                <SelectItem value="rail4">My Card (Split)</SelectItem>
                <SelectItem value="rail5">My Card (Encrypted)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Bot</Label>
            <Select value={botFilter} onValueChange={setBotFilter}>
              <SelectTrigger data-testid="select-bot-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bots</SelectItem>
                {bots.map((b) => (
                  <SelectItem key={b.botId} value={b.botId}>{b.botName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-neutral-500">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="input-date-from"
            />
          </div>

          <div>
            <Label className="text-xs text-neutral-500">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="input-date-to"
            />
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100" data-testid="text-no-orders">
          <Package className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700">No orders found</h3>
          <p className="text-sm text-neutral-500 mt-1">Orders will appear here when your bots make purchases</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="orders-list">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-neutral-100 p-4 cursor-pointer hover:border-violet-200 hover:shadow-sm transition-all"
              onClick={() => router.push(`/app/orders/${order.id}`)}
              data-testid={`order-card-${order.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-neutral-900" data-testid={`text-order-product-${order.id}`}>
                      {order.productName || "Order"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {order.vendor && (
                        <span className="text-xs text-neutral-500" data-testid={`text-order-vendor-${order.id}`}>
                          {order.vendor}
                        </span>
                      )}
                      {(order as any).vendorDetails?.category && (
                        <span className="text-xs text-neutral-400" data-testid={`text-order-category-${order.id}`}>
                          • {(order as any).vendorDetails.category}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${railColor(order.rail)}`} data-testid={`badge-order-rail-${order.id}`}>
                        {railLabel(order.rail)}
                      </span>
                      {order.botName && (
                        <span className="text-xs text-neutral-400">
                          via {order.botName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <div className="text-right">
                    <span className="font-semibold text-sm" data-testid={`text-order-price-${order.id}`}>
                      {formatPrice(order.priceCents, order.priceCurrency)}
                    </span>
                    <p className="text-xs text-neutral-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
