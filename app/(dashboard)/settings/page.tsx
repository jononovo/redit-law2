"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PaymentSetup } from "@/components/dashboard/payment-setup";
import { ShippingAddressManager } from "@/components/dashboard/shipping-address-manager";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, TrendingUp, Zap, CreditCard, Smartphone, Bot, ChevronDown } from "lucide-react";

interface Preferences {
  transaction_alerts: boolean;
  budget_warnings: boolean;
  weekly_summary: boolean;
  purchase_over_threshold_usd: number;
  balance_low_usd: number;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

interface MasterGuardrailsData {
  config: {
    max_per_tx_usdc: number;
    daily_budget_usdc: number;
    monthly_budget_usdc: number;
    enabled: boolean;
  } | null;
  spend: {
    daily: { rail1_usd: number; rail2_usd: number; rail4_usd: number; total_usd: number };
    monthly: { rail1_usd: number; rail2_usd: number; rail4_usd: number; total_usd: number };
  };
}

function SpendProgressBar({ spent, budget, label }: { spent: number; budget: number; label: string }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isWarning = pct >= 80;
  const isDanger = pct >= 95;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className={`font-medium ${isDanger ? "text-red-600" : isWarning ? "text-amber-600" : "text-neutral-900"}`}>
          ${spent.toFixed(2)} / ${budget.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RailBreakdown({ daily, monthly }: MasterGuardrailsData["spend"]) {
  const rails = [
    { name: "Stripe Wallet", icon: Zap, daily: daily.rail1_usd, monthly: monthly.rail1_usd, color: "text-blue-600" },
    { name: "Card Wallet", icon: CreditCard, daily: daily.rail2_usd, monthly: monthly.rail2_usd, color: "text-violet-600" },
    { name: "Self-Hosted", icon: Smartphone, daily: daily.rail4_usd, monthly: monthly.rail4_usd, color: "text-orange-600" },
  ];

  const hasAnySpend = rails.some(r => r.daily > 0 || r.monthly > 0);
  if (!hasAnySpend) return null;

  return (
    <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Per-Rail Breakdown</p>
      <div className="grid grid-cols-3 gap-3">
        {rails.map((r) => (
          <div key={r.name} className="space-y-1">
            <div className={`flex items-center gap-1.5 ${r.color}`}>
              <r.icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{r.name}</span>
            </div>
            <p className="text-sm font-semibold text-neutral-900">${r.daily.toFixed(2)} <span className="text-xs text-neutral-400 font-normal">today</span></p>
            <p className="text-xs text-neutral-500">${r.monthly.toFixed(2)} this month</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MasterBudgetSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MasterGuardrailsData>({
    queryKey: ["master-guardrails"],
    queryFn: async () => {
      const res = await fetch("/api/v1/master-guardrails");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (update: Record<string, unknown>) => {
      const res = await fetch("/api/v1/master-guardrails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-guardrails"] });
    },
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ max_per_tx_usdc: 500, daily_budget_usdc: 2000, monthly_budget_usdc: 10000 });

  const config = data?.config;
  const spend = data?.spend;
  const enabled = config?.enabled ?? false;

  const startEditing = () => {
    if (config) {
      setForm({
        max_per_tx_usdc: config.max_per_tx_usdc,
        daily_budget_usdc: config.daily_budget_usdc,
        monthly_budget_usdc: config.monthly_budget_usdc,
      });
    }
    setEditing(true);
  };

  const save = () => {
    mutation.mutate({ ...form, enabled: true });
    setEditing(false);
  };

  const toggleEnabled = (val: boolean) => {
    if (val && !config) {
      mutation.mutate({ ...form, enabled: true });
    } else {
      mutation.mutate({ enabled: val });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading master budget...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-md font-bold text-neutral-900">Master Budget</h3>
            <p className="text-xs text-neutral-500">Combined spending cap across all payment rails</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggleEnabled}
          data-testid="switch-master-budget-enabled"
        />
      </div>

      {enabled && config && spend && (
        <div className="space-y-5 pl-7">
          <div className="space-y-3">
            <SpendProgressBar
              spent={spend.daily.total_usd}
              budget={config.daily_budget_usdc}
              label="Today"
            />
            <SpendProgressBar
              spent={spend.monthly.total_usd}
              budget={config.monthly_budget_usdc}
              label="This Month"
            />
          </div>

          <RailBreakdown daily={spend.daily} monthly={spend.monthly} />

          {editing ? (
            <div className="space-y-3 bg-white border border-neutral-200 rounded-xl p-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Max per transaction (USDC)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_per_tx_usdc}
                  onChange={(e) => setForm(f => ({ ...f, max_per_tx_usdc: parseInt(e.target.value) || 1 }))}
                  className="max-w-40"
                  data-testid="input-master-max-per-tx"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Daily budget (USDC)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.daily_budget_usdc}
                  onChange={(e) => setForm(f => ({ ...f, daily_budget_usdc: parseInt(e.target.value) || 1 }))}
                  className="max-w-40"
                  data-testid="input-master-daily-budget"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Monthly budget (USDC)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.monthly_budget_usdc}
                  onChange={(e) => setForm(f => ({ ...f, monthly_budget_usdc: parseInt(e.target.value) || 1 }))}
                  className="max-w-40"
                  data-testid="input-master-monthly-budget"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={save} disabled={mutation.isPending} data-testid="button-master-save">
                  {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} data-testid="button-master-cancel">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4 text-sm flex-1">
                <div>
                  <p className="text-neutral-500 text-xs">Per Transaction</p>
                  <p className="font-semibold text-neutral-900">${config.max_per_tx_usdc.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Daily Limit</p>
                  <p className="font-semibold text-neutral-900">${config.daily_budget_usdc.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Monthly Limit</p>
                  <p className="font-semibold text-neutral-900">${config.monthly_budget_usdc.toLocaleString()}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={startEditing} data-testid="button-master-edit">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RailInfo {
  status: string;
  balance_usd?: number;
  card_count?: number;
}

interface BotWithRails {
  bot_id: string;
  bot_name: string;
  wallet_status: string;
  default_rail: string | null;
  active_rails: string[];
  rails: Record<string, RailInfo>;
}

const RAIL_META: Record<string, { label: string; shortLabel: string; icon: typeof CreditCard; bg: string; text: string; border: string }> = {
  card_wallet: { label: "Prepaid Wallet", shortLabel: "Prepaid", icon: CreditCard, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  stripe_wallet: { label: "Stripe Wallet", shortLabel: "Stripe", icon: Zap, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  shopping_wallet: { label: "Shopping Wallet", shortLabel: "Shopping", icon: CreditCard, bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  self_hosted_cards: { label: "Self-Hosted Cards", shortLabel: "Self-Hosted", icon: Smartphone, bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  sub_agent_cards: { label: "Sub-Agent Cards", shortLabel: "Sub-Agent", icon: Shield, bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
};

function RailBadge({ railKey, rail }: { railKey: string; rail: RailInfo }) {
  const meta = RAIL_META[railKey];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${meta.bg} ${meta.border}`} data-testid={`badge-rail-${railKey}`}>
      <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
      <span className={`text-xs font-medium ${meta.text}`}>{meta.shortLabel}</span>
      {rail.balance_usd !== undefined && (
        <span className={`text-xs ${meta.text} opacity-75`}>${rail.balance_usd.toFixed(2)}</span>
      )}
      {rail.card_count !== undefined && (
        <span className={`text-xs ${meta.text} opacity-75`}>{rail.card_count} card{rail.card_count !== 1 ? "s" : ""}</span>
      )}
    </div>
  );
}

function BotRailManagement() {
  const queryClient = useQueryClient();

  const { data: botsData, isLoading } = useQuery<{ bots: BotWithRails[] }>({
    queryKey: ["bots-rails"],
    queryFn: async () => {
      const res = await fetch("/api/v1/bots/rails");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ bot_id, default_rail }: { bot_id: string; default_rail: string | null }) => {
      const res = await fetch("/api/v1/bots/default-rail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id, default_rail }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots-rails"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading bots...
      </div>
    );
  }

  const bots = botsData?.bots || [];
  if (bots.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-emerald-600" />
        <div>
          <h3 className="text-md font-bold text-neutral-900">Bot Payment Rails</h3>
          <p className="text-xs text-neutral-500">View connected rails and set preferred payment method per bot</p>
        </div>
      </div>

      <div className="space-y-3 pl-7">
        {bots.map((bot) => (
          <div key={bot.bot_id} className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3" data-testid={`row-bot-rail-${bot.bot_id}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{bot.bot_name}</p>
                <p className="text-xs text-neutral-400 font-mono">{bot.bot_id}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                bot.wallet_status === "active" ? "bg-emerald-50 text-emerald-700" :
                bot.wallet_status === "frozen" ? "bg-red-50 text-red-700" :
                "bg-neutral-100 text-neutral-500"
              }`} data-testid={`status-bot-${bot.bot_id}`}>
                {bot.wallet_status}
              </span>
            </div>

            {bot.active_rails.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {bot.active_rails.map(railKey => (
                  <RailBadge key={railKey} railKey={railKey} rail={bot.rails[railKey]} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No payment rails connected</p>
            )}

            <div className="flex items-center gap-3 pt-1 border-t border-neutral-100">
              <span className="text-xs text-neutral-500 whitespace-nowrap">Default rail:</span>
              <div className="relative flex-1 max-w-xs">
                <select
                  value={bot.default_rail || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    mutation.mutate({ bot_id: bot.bot_id, default_rail: val });
                  }}
                  className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-neutral-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={mutation.isPending}
                  data-testid={`select-default-rail-${bot.bot_id}`}
                >
                  <option value="">Auto (no preference)</option>
                  {Object.entries(RAIL_META).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ preferences: Preferences }>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications/preferences");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (update: Partial<Record<string, unknown>>) => {
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["notification-preferences"], result);
    },
  });

  const prefs = data?.preferences;

  const toggle = (key: string, value: boolean) => {
    mutation.mutate({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up max-w-2xl">
      
      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-1">Account Settings</h2>
        <p className="text-neutral-500 text-sm">Manage your account preferences and billing.</p>
      </div>

      <Separator />

      <MasterBudgetSection />

      <Separator />

      <BotRailManagement />

      <Separator />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <Input id="display-name" defaultValue={user?.displayName || ""} className="max-w-sm" data-testid="input-display-name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue={user?.email || ""} className="max-w-sm" disabled data-testid="input-email" />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-md font-bold text-neutral-900 mb-1">Payment Method</h3>
        <p className="text-sm text-neutral-500 mb-4">Add a card to fund your bot&apos;s wallet.</p>
        <PaymentSetup />
      </div>

      <Separator />

      <ShippingAddressManager />

      <Separator />

      <div>
        <h3 className="text-md font-bold text-neutral-900 mb-4">Notifications</h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading preferences...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between max-w-sm">
              <div>
                <p className="text-sm font-medium text-neutral-900">In-App Notifications</p>
                <p className="text-xs text-neutral-500">Show notifications in the bell menu</p>
              </div>
              <Switch
                checked={prefs?.in_app_enabled ?? true}
                onCheckedChange={(v) => toggle("in_app_enabled", v)}
                data-testid="switch-in-app-enabled"
              />
            </div>
            <div className="flex items-center justify-between max-w-sm">
              <div>
                <p className="text-sm font-medium text-neutral-900">Email Notifications</p>
                <p className="text-xs text-neutral-500">Receive alerts via email</p>
              </div>
              <Switch
                checked={prefs?.email_enabled ?? true}
                onCheckedChange={(v) => toggle("email_enabled", v)}
                data-testid="switch-email-enabled"
              />
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between max-w-sm">
              <div>
                <p className="text-sm font-medium text-neutral-900">Transaction Alerts</p>
                <p className="text-xs text-neutral-500">Get notified for every transaction</p>
              </div>
              <Switch
                checked={prefs?.transaction_alerts ?? true}
                onCheckedChange={(v) => toggle("transaction_alerts", v)}
                data-testid="switch-transaction-alerts"
              />
            </div>
            <div className="flex items-center justify-between max-w-sm">
              <div>
                <p className="text-sm font-medium text-neutral-900">Budget Warnings</p>
                <p className="text-xs text-neutral-500">Alert when balance drops below threshold</p>
              </div>
              <Switch
                checked={prefs?.budget_warnings ?? true}
                onCheckedChange={(v) => toggle("budget_warnings", v)}
                data-testid="switch-budget-warnings"
              />
            </div>
            <div className="flex items-center justify-between max-w-sm">
              <div>
                <p className="text-sm font-medium text-neutral-900">Weekly Summary</p>
                <p className="text-xs text-neutral-500">Receive a weekly spending report</p>
              </div>
              <Switch
                checked={prefs?.weekly_summary ?? false}
                onCheckedChange={(v) => toggle("weekly_summary", v)}
                data-testid="switch-weekly-summary"
              />
            </div>

            <Separator className="my-2" />

            <div className="space-y-3 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="threshold" className="text-sm font-medium">Email alert for purchases over ($)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={prefs?.purchase_over_threshold_usd ?? 50}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      mutation.mutate({ purchase_over_threshold_usd: val });
                    }
                  }}
                  className="max-w-32"
                  data-testid="input-purchase-threshold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="low-balance" className="text-sm font-medium">Low balance warning at ($)</Label>
                <Input
                  id="low-balance"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={prefs?.balance_low_usd ?? 5}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      mutation.mutate({ balance_low_usd: val });
                    }
                  }}
                  className="max-w-32"
                  data-testid="input-balance-low"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
