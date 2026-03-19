import { provisionBotTunnel, deleteBotTunnel, resolveLocalPort, resolveWebhookPath } from "@/lib/cloudflare-tunnel";
import { generateWebhookSecret } from "@/lib/agent-management/crypto";

export interface TunnelDbFields {
  callbackUrl: string;
  webhookSecret: string;
  webhookStatus: "pending";
  botType: string;
  tunnelId: string;
  tunnelToken: string;
  tunnelStatus: "provisioned";
  tunnelLocalPort: number;
}

export interface TunnelSetupResponse {
  webhook_url: string;
  tunnel_token: string;
  cloudflared_command: string;
  local_port: number;
  webhook_path: string;
  steps: string[];
  webhook_headers: Record<string, string>;
  retry_policy: string;
}

export interface TunnelProvisionOutput {
  dbFields: TunnelDbFields;
  responseData: {
    webhook_url: string;
    tunnel_token: string;
    tunnel_setup: TunnelSetupResponse;
  };
}

function buildTunnelSetupResponse(
  webhookUrl: string,
  tunnelToken: string,
  localPort: number,
  webhookPath: string,
): TunnelSetupResponse {
  return {
    webhook_url: webhookUrl,
    tunnel_token: tunnelToken,
    cloudflared_command: `cloudflared tunnel run --token ${tunnelToken}`,
    local_port: localPort,
    webhook_path: webhookPath,
    steps: [
      "1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
      `2. Run: cloudflared tunnel run --token ${tunnelToken}`,
      `3. Start your webhook server on port ${localPort}, listening for POST requests at ${webhookPath}`,
      "4. CreditClaw sends JSON with headers X-CreditClaw-Signature (sha256 HMAC) and X-CreditClaw-Event (event type)",
      "5. Use your webhook_secret to verify the X-CreditClaw-Signature header on incoming payloads",
    ],
    webhook_headers: {
      "X-CreditClaw-Signature": "sha256=<hmac of payload using your webhook_secret>",
      "X-CreditClaw-Event": "<event_type e.g. wallet.activated, transaction.completed>",
    },
    retry_policy: "Failed deliveries are retried up to 3 times with exponential backoff.",
  };
}

export async function provisionTunnelForBot(
  botId: string,
  botType?: string,
  localPort?: number,
  webhookPath?: string,
): Promise<TunnelProvisionOutput | null> {
  const effectiveBotType = botType || "openclaw";
  const resolvedPort = resolveLocalPort(localPort, effectiveBotType);
  const resolvedPath = resolveWebhookPath(webhookPath, effectiveBotType);

  try {
    const tunnelResult = await provisionBotTunnel(botId, resolvedPort);
    if (!tunnelResult) return null;

    const callbackUrl = `${tunnelResult.webhookUrl}${resolvedPath}`;
    const webhookSecret = generateWebhookSecret();

    return {
      dbFields: {
        callbackUrl,
        webhookSecret,
        webhookStatus: "pending",
        botType: effectiveBotType,
        tunnelId: tunnelResult.tunnelId,
        tunnelToken: tunnelResult.tunnelToken,
        tunnelStatus: "provisioned",
        tunnelLocalPort: resolvedPort,
      },
      responseData: {
        webhook_url: callbackUrl,
        tunnel_token: tunnelResult.tunnelToken,
        tunnel_setup: buildTunnelSetupResponse(callbackUrl, tunnelResult.tunnelToken, resolvedPort, resolvedPath),
      },
    };
  } catch (err) {
    console.error("[tunnel-provisioning] Provisioning failed (non-blocking):", err);
    return null;
  }
}

export function cleanupTunnel(tunnelId: string, botId: string): void {
  deleteBotTunnel(tunnelId, botId).catch((e) =>
    console.error("[tunnel-provisioning] Tunnel cleanup failed:", e)
  );
}
