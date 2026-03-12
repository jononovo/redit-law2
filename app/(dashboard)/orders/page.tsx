"use client";

import { OrdersPanel } from "@/components/wallet/orders-panel";

export default function OrdersPage() {
  return (
    <div className="space-y-6" data-testid="orders-page">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-orders-title">Orders</h1>
        <p className="text-sm text-neutral-500 mt-1">All purchases across every rail</p>
      </div>

      <OrdersPanel />
    </div>
  );
}
