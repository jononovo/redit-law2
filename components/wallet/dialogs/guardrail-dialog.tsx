"use client";

import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CryptoGuardrailForm {
  max_per_tx_usdc: number;
  daily_budget_usdc: number;
  monthly_budget_usdc: number;
  require_approval_above: number | null;
}

interface CardGuardrailForm extends CryptoGuardrailForm {
  require_approval_above: number;
  allowlisted_merchants: string;
  blocklisted_merchants: string;
  auto_pause_on_zero: boolean;
}

type GuardrailForm = CryptoGuardrailForm | CardGuardrailForm;

function isCardForm(form: GuardrailForm): form is CardGuardrailForm {
  return "allowlisted_merchants" in form;
}

interface GuardrailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: GuardrailForm;
  onFormChange: (form: GuardrailForm) => void;
  saving: boolean;
  onSave: () => void;
  variant: "crypto" | "card";
  walletName?: string;
}

export function GuardrailDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  saving,
  onSave,
  variant,
  walletName,
}: GuardrailDialogProps) {
  const description = variant === "crypto"
    ? "Set limits to control how your bot spends USDC via x402."
    : `Configure spending limits and merchant controls${walletName ? ` for ${walletName}` : ""}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={variant === "card" ? "max-w-lg" : "sm:max-w-md"}>
        <DialogTitle>Spending Guardrails</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="space-y-4 mt-4">
          {variant === "crypto" ? (
            <>
              <div>
                <Label>Max per transaction (USD)</Label>
                <Input
                  type="number"
                  value={form.max_per_tx_usdc}
                  onChange={(e) => onFormChange({ ...form, max_per_tx_usdc: Number(e.target.value) })}
                  data-testid="input-max-per-tx"
                />
              </div>
              <div>
                <Label>Daily budget (USD)</Label>
                <Input
                  type="number"
                  value={form.daily_budget_usdc}
                  onChange={(e) => onFormChange({ ...form, daily_budget_usdc: Number(e.target.value) })}
                  data-testid="input-daily-budget"
                />
              </div>
              <div>
                <Label>Monthly budget (USD)</Label>
                <Input
                  type="number"
                  value={form.monthly_budget_usdc}
                  onChange={(e) => onFormChange({ ...form, monthly_budget_usdc: Number(e.target.value) })}
                  data-testid="input-monthly-budget"
                />
              </div>
              <div>
                <Label>Require approval above (USD, optional)</Label>
                <Input
                  type="number"
                  value={form.require_approval_above ?? ""}
                  onChange={(e) => onFormChange({ ...form, require_approval_above: e.target.value ? Number(e.target.value) : null })}
                  placeholder="No threshold"
                  data-testid="input-approval-threshold"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-guardrails">
                  Cancel
                </Button>
                <Button
                  onClick={onSave}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-save-guardrails"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save
                </Button>
              </div>
            </>
          ) : isCardForm(form) ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Max per Transaction ($)</Label>
                  <Input
                    type="number"
                    value={form.max_per_tx_usdc}
                    onChange={(e) => onFormChange({ ...form, max_per_tx_usdc: Number(e.target.value) })}
                    data-testid="input-max-per-tx"
                  />
                </div>
                <div>
                  <Label className="text-xs">Daily Budget ($)</Label>
                  <Input
                    type="number"
                    value={form.daily_budget_usdc}
                    onChange={(e) => onFormChange({ ...form, daily_budget_usdc: Number(e.target.value) })}
                    data-testid="input-daily-budget"
                  />
                </div>
                <div>
                  <Label className="text-xs">Monthly Budget ($)</Label>
                  <Input
                    type="number"
                    value={form.monthly_budget_usdc}
                    onChange={(e) => onFormChange({ ...form, monthly_budget_usdc: Number(e.target.value) })}
                    data-testid="input-monthly-budget"
                  />
                </div>
                <div>
                  <Label className="text-xs">Require Approval Above ($)</Label>
                  <Input
                    type="number"
                    value={form.require_approval_above}
                    onChange={(e) => onFormChange({ ...form, require_approval_above: Number(e.target.value) })}
                    data-testid="input-require-approval"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Allowlisted Merchants (comma-separated)</Label>
                <Input
                  value={form.allowlisted_merchants}
                  onChange={(e) => onFormChange({ ...form, allowlisted_merchants: e.target.value })}
                  placeholder="amazon, shopify"
                  data-testid="input-allowlisted-merchants"
                />
                <p className="text-xs text-neutral-400 mt-1">Leave empty to allow all merchants</p>
              </div>

              <div>
                <Label className="text-xs">Blocklisted Merchants (comma-separated)</Label>
                <Input
                  value={form.blocklisted_merchants}
                  onChange={(e) => onFormChange({ ...form, blocklisted_merchants: e.target.value })}
                  placeholder="ebay"
                  data-testid="input-blocklisted-merchants"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto-pause wallet when balance reaches $0</Label>
                <Switch
                  checked={form.auto_pause_on_zero}
                  onCheckedChange={(checked) => onFormChange({ ...form, auto_pause_on_zero: checked })}
                  data-testid="switch-auto-pause"
                />
              </div>

              <Button
                onClick={onSave}
                disabled={saving}
                className="w-full"
                data-testid="button-save-guardrails"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Save Guardrails
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { CryptoGuardrailForm, CardGuardrailForm, GuardrailForm };
