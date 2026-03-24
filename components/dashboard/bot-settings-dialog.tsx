"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle, Copy, Check, AlertTriangle } from "lucide-react";

interface BotSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId: string;
  botName: string;
  callbackUrl?: string | null;
  webhookStatus?: string;
  tunnelStatus?: string;
  description?: string | null;
  onUpdated: () => void;
}

function WebhookStatusIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    active: { color: "bg-green-500", label: "Active" },
    pending: { color: "bg-blue-500", label: "Awaiting connection" },
    degraded: { color: "bg-amber-500", label: "Degraded" },
    unreachable: { color: "bg-red-500", label: "Unreachable" },
    none: { color: "bg-neutral-300", label: "Not configured" },
  };
  const { color, label } = config[status] || config.none;

  return (
    <div className="flex items-center gap-2" data-testid="status-webhook">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm text-neutral-600">{label}</span>
    </div>
  );
}

function TunnelStatusIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    provisioned: { color: "bg-blue-500", label: "Provisioned" },
    connected: { color: "bg-green-500", label: "Connected" },
    disconnected: { color: "bg-amber-500", label: "Disconnected" },
    error: { color: "bg-red-500", label: "Error" },
    none: { color: "bg-neutral-300", label: "None" },
  };
  const { color, label } = config[status] || config.none;

  return (
    <div className="flex items-center gap-2" data-testid="status-tunnel">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm text-neutral-600">{label}</span>
    </div>
  );
}

export function BotSettingsDialog({
  open,
  onOpenChange,
  botId,
  botName: initialBotName,
  callbackUrl: initialCallbackUrl,
  webhookStatus: initialWebhookStatus,
  tunnelStatus: initialTunnelStatus,
  description: initialDescription,
  onUpdated,
}: BotSettingsDialogProps) {
  const [name, setName] = useState(initialBotName);
  const [desc, setDesc] = useState(initialDescription || "");
  const [webhookUrl, setWebhookUrl] = useState(initialCallbackUrl || "");
  const [webhookStatus, setWebhookStatus] = useState(initialWebhookStatus || "none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialBotName);
      setDesc(initialDescription || "");
      setWebhookUrl(initialCallbackUrl || "");
      setWebhookStatus(initialWebhookStatus || "none");
      setError(null);
      setNewSecret(null);
      setCopied(false);
    }
  }, [open, initialBotName, initialDescription, initialCallbackUrl, initialWebhookStatus]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {};
      if (name !== initialBotName) body.bot_name = name;
      if (desc !== (initialDescription || "")) body.description = desc || null;
      if (webhookUrl !== (initialCallbackUrl || "")) body.callback_url = webhookUrl;

      if (Object.keys(body).length === 0) {
        onOpenChange(false);
        return;
      }

      const res = await fetch(`/api/v1/bots/${botId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Failed to save settings.");
        return;
      }

      if (data.webhook_secret) {
        setNewSecret(data.webhook_secret);
        setWebhookStatus(data.webhook_status || "active");
      } else {
        onUpdated();
        onOpenChange(false);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCopySecret() {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleSecretDismiss() {
    setNewSecret(null);
    onUpdated();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!newSecret) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold" data-testid="title-bot-settings">Bot Settings</DialogTitle>
          <DialogDescription>Manage your bot&apos;s profile and webhook configuration.</DialogDescription>
        </DialogHeader>

        {newSecret ? (
          <div className="space-y-4 py-2" data-testid="section-webhook-secret">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Webhook Secret Generated</p>
                <p className="text-xs text-amber-700 mt-1">
                  Save this secret now — it will not be shown again. Use it to verify HMAC signatures on incoming webhook payloads.
                </p>
              </div>
            </div>

            <div className="relative">
              <Input
                readOnly
                value={newSecret}
                className="pr-10 font-mono text-sm rounded-xl"
                data-testid="input-webhook-secret"
              />
              <button
                onClick={handleCopySecret}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
                data-testid="button-copy-secret"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-neutral-400" />}
              </button>
            </div>

            <Button onClick={handleSecretDismiss} className="w-full rounded-xl" data-testid="button-secret-done">
              I&apos;ve saved it — Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Bot Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="rounded-xl"
                data-testid="input-bot-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                data-testid="input-bot-description"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-neutral-700">Webhook URL</label>
                <WebhookStatusIndicator status={webhookStatus} />
              </div>
              {initialTunnelStatus && initialTunnelStatus !== "none" ? (
                <div className="space-y-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="rounded-xl bg-neutral-50 text-neutral-600 font-mono text-sm"
                    data-testid="input-webhook-url"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Managed tunnel</span>
                    <TunnelStatusIndicator status={initialTunnelStatus} />
                  </div>
                </div>
              ) : (
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="rounded-xl"
                  data-testid="input-webhook-url"
                />
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2" data-testid="settings-error">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="border-t border-neutral-100 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full rounded-xl gap-2"
                data-testid="button-save-settings"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
