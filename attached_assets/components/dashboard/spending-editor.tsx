"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Shield, AlertTriangle } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "api_services", label: "API Services & SaaS" },
  { value: "cloud_compute", label: "Cloud Compute & Hosting" },
  { value: "research_data", label: "Research & Data Access" },
  { value: "physical_goods", label: "Physical Goods & Shipping" },
  { value: "advertising", label: "Advertising & Marketing" },
  { value: "donations", label: "Donations & Tips" },
  { value: "entertainment", label: "Entertainment & Media" },
  { value: "other", label: "Other / Uncategorized" },
];

const BLOCKED_CATEGORY_OPTIONS = [
  { value: "gambling", label: "Gambling" },
  { value: "adult_content", label: "Adult Content" },
  { value: "cryptocurrency", label: "Cryptocurrency" },
  { value: "cash_advances", label: "Cash Advances / Money Transfers" },
];

const APPROVAL_MODES = [
  { value: "ask_for_everything", label: "Ask me for everything", desc: "Bot requests approval before any purchase" },
  { value: "auto_approve_under_threshold", label: "Auto-approve under threshold", desc: "Bot spends freely up to the limit below" },
  { value: "auto_approve_by_category", label: "Auto-approve by category", desc: "Bot spends freely on approved categories" },
];

interface SpendingEditorProps {
  botId: string;
  botName: string;
}

interface PermissionsData {
  approval_mode: string;
  per_transaction_usd: number;
  daily_usd: number;
  monthly_usd: number;
  ask_approval_above_usd: number;
  approved_categories: string[];
  blocked_categories: string[];
  recurring_allowed: boolean;
  notes: string | null;
}

export function SpendingEditor({ botId, botName }: SpendingEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionsData>({
    approval_mode: "ask_for_everything",
    per_transaction_usd: 25,
    daily_usd: 50,
    monthly_usd: 500,
    ask_approval_above_usd: 10,
    approved_categories: [],
    blocked_categories: ["gambling", "adult_content", "cryptocurrency", "cash_advances"],
    recurring_allowed: false,
    notes: null,
  });

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/bots/spending?bot_id=${botId}`);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/bots/spending", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: botId, ...permissions }),
      });
      if (res.ok) {
        toast({ title: "Spending rules saved", description: `Updated permissions for ${botName}.` });
      } else {
        const data = await res.json();
        toast({ title: "Failed to save", description: data.error || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save permissions.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function toggleApprovedCategory(cat: string) {
    setPermissions((prev) => ({
      ...prev,
      approved_categories: prev.approved_categories.includes(cat)
        ? prev.approved_categories.filter((c) => c !== cat)
        : [...prev.approved_categories, cat],
    }));
  }

  function toggleBlockedCategory(cat: string) {
    setPermissions((prev) => ({
      ...prev,
      blocked_categories: prev.blocked_categories.includes(cat)
        ? prev.blocked_categories.filter((c) => c !== cat)
        : [...prev.blocked_categories, cat],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-neutral-500" />
          <h3 className="font-bold text-neutral-900">Approval Mode</h3>
        </div>
        <p className="text-sm text-neutral-500 mb-4">How should your bot handle purchases?</p>
        <div className="space-y-3">
          {APPROVAL_MODES.map((mode) => (
            <label
              key={mode.value}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                permissions.approval_mode === mode.value
                  ? "border-primary bg-orange-50/50"
                  : "border-neutral-100 hover:border-neutral-200"
              }`}
              data-testid={`approval-mode-${mode.value}`}
            >
              <input
                type="radio"
                name="approval_mode"
                value={mode.value}
                checked={permissions.approval_mode === mode.value}
                onChange={() => setPermissions((p) => ({ ...p, approval_mode: mode.value }))}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-sm text-neutral-900">{mode.label}</p>
                <p className="text-xs text-neutral-500">{mode.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-bold text-neutral-900 mb-4">Spending Limits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="per-tx">Per Transaction Max ($)</Label>
            <Input
              id="per-tx"
              type="number"
              min={0}
              step={0.01}
              value={permissions.per_transaction_usd}
              onChange={(e) => setPermissions((p) => ({ ...p, per_transaction_usd: parseFloat(e.target.value) || 0 }))}
              data-testid="input-per-transaction"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily">Daily Max ($)</Label>
            <Input
              id="daily"
              type="number"
              min={0}
              step={0.01}
              value={permissions.daily_usd}
              onChange={(e) => setPermissions((p) => ({ ...p, daily_usd: parseFloat(e.target.value) || 0 }))}
              data-testid="input-daily"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly">Monthly Max ($)</Label>
            <Input
              id="monthly"
              type="number"
              min={0}
              step={0.01}
              value={permissions.monthly_usd}
              onChange={(e) => setPermissions((p) => ({ ...p, monthly_usd: parseFloat(e.target.value) || 0 }))}
              data-testid="input-monthly"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ask-above">Ask Approval Above ($)</Label>
            <Input
              id="ask-above"
              type="number"
              min={0}
              step={0.01}
              value={permissions.ask_approval_above_usd}
              onChange={(e) => setPermissions((p) => ({ ...p, ask_approval_above_usd: parseFloat(e.target.value) || 0 }))}
              data-testid="input-ask-above"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-bold text-neutral-900 mb-2">Approved Categories</h3>
        <p className="text-sm text-neutral-500 mb-4">Your bot can auto-approve purchases in these categories (when using category-based approval).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORY_OPTIONS.map((cat) => (
            <label
              key={cat.value}
              className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors"
              data-testid={`category-${cat.value}`}
            >
              <input
                type="checkbox"
                checked={permissions.approved_categories.includes(cat.value)}
                onChange={() => toggleApprovedCategory(cat.value)}
                className="rounded"
              />
              <span className="text-sm text-neutral-700">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="font-bold text-neutral-900">Blocked Categories</h3>
        </div>
        <p className="text-sm text-neutral-500 mb-4">Your bot can never spend on these, regardless of other settings.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BLOCKED_CATEGORY_OPTIONS.map((cat) => (
            <label
              key={cat.value}
              className="flex items-center gap-3 p-3 rounded-lg border border-red-100 bg-red-50/30 cursor-pointer hover:bg-red-50 transition-colors"
              data-testid={`blocked-${cat.value}`}
            >
              <input
                type="checkbox"
                checked={permissions.blocked_categories.includes(cat.value)}
                onChange={() => toggleBlockedCategory(cat.value)}
                className="rounded"
              />
              <span className="text-sm text-neutral-700">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">Recurring Payments</p>
          <p className="text-xs text-neutral-500">Allow your bot to sign up for subscriptions</p>
        </div>
        <Switch
          checked={permissions.recurring_allowed}
          onCheckedChange={(val) => setPermissions((p) => ({ ...p, recurring_allowed: val }))}
          data-testid="switch-recurring"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="notes">Notes to Your Bot</Label>
        <p className="text-xs text-neutral-500">Your bot reads these before every purchase. Write instructions in plain language.</p>
        <textarea
          id="notes"
          className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Example: Prefer free tiers before paying. Always check for discount codes."
          value={permissions.notes || ""}
          onChange={(e) => setPermissions((p) => ({ ...p, notes: e.target.value || null }))}
          data-testid="textarea-notes"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl gap-2"
          data-testid="button-save-permissions"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Spending Rules
        </Button>
      </div>
    </div>
  );
}
