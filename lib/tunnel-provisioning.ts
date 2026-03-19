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
  openclawHooksToken: string | null;
}

export interface OpenClawGatewayConfig {
  hooks: {
    enabled: true;
    token: string;
    mappings: Array<{
      match: { path: string };
      action: string;
      name: string;
      agentId: string;
      messageTemplate: string;
      deliver: boolean;
    }>;
  };
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
  openclaw_gateway_config?: OpenClawGatewayConfig;
}

export interface TunnelProvisionOutput {
  dbFields: TunnelDbFields;
  responseData: {
    webhook_url: string;
    tunnel_token: string;
    tunnel_setup: TunnelSetupResponse;
    openclaw_hooks_token?: string;
  };
}

function buildOpenClawGatewayConfig(): OpenClawGatewayConfig {
  return {
    hooks: {
      enabled: true,
      token: "${CREDITCLAW_HOOKS_TOKEN}",
      mappings: [
        {
          match: { path: "creditclaw" },
          action: "agent",
          name: "CreditClaw",
          agentId: "main",
          messageTemplate: "CreditClaw event {{event}}: {{description}}",
          deliver: false,
        },
      ],
    },
  };
}

function buildTunnelSetupResponse(
  webhookUrl: string,
  tunnelToken: string,
  localPort: number,
  webhookPath: string,
  botType: string,
): TunnelSetupResponse {
  const isOpenClaw = botType === "openclaw";

  const steps = [
    "1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    `2. Run: cloudflared tunnel run --token ${tunnelToken}`,
  ];

  if (isOpenClaw) {
    steps.push(
      "3. Set the CREDITCLAW_HOOKS_TOKEN env var in your OpenClaw environment to the openclaw_hooks_token value from this response",
      "4. Add the CreditClaw hook mapping to your ~/.openclaw/openclaw.json (see openclaw_gateway_config below). The config reads the token from your CREDITCLAW_HOOKS_TOKEN env var.",
      `5. The Gateway will accept CreditClaw webhooks at POST /hooks/creditclaw on port ${localPort}`,
      "6. CreditClaw sends JSON with headers X-CreditClaw-Signature (sha256 HMAC), X-CreditClaw-Event (event type), and Authorization (Bearer token for Gateway auth)",
      "7. Use your webhook_secret to verify the X-CreditClaw-Signature header on incoming payloads",
    );
  } else {
    steps.push(
      `3. Start your webhook server on port ${localPort}, listening for POST requests at ${webhookPath}`,
      "4. CreditClaw sends JSON with headers X-CreditClaw-Signature (sha256 HMAC) and X-CreditClaw-Event (event type)",
      "5. Use your webhook_secret to verify the X-CreditClaw-Signature header on incoming payloads",
    );
  }

  const response: TunnelSetupResponse = {
    webhook_url: webhookUrl,
    tunnel_token: tunnelToken,
    cloudflared_command: `cloudflared tunnel run --token ${tunnelToken}`,
    local_port: localPort,
    webhook_path: webhookPath,
    steps,
    webhook_headers: {
      "X-CreditClaw-Signature": "sha256=<hmac of payload using your webhook_secret>",
      "X-CreditClaw-Event": "<event_type e.g. wallet.activated, transaction.completed>",
    },
    retry_policy: "Failed deliveries are retried up to 3 times with exponential backoff.",
  };

  if (isOpenClaw) {
    response.openclaw_gateway_config = buildOpenClawGatewayConfig();
  }

  return response;
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
    const isOpenClaw = effectiveBotType === "openclaw";
    const openclawHooksToken = isOpenClaw ? generateWebhookSecret() : null;

    const responseData: TunnelProvisionOutput["responseData"] = {
      webhook_url: callbackUrl,
      tunnel_token: tunnelResult.tunnelToken,
      tunnel_setup: buildTunnelSetupResponse(callbackUrl, tunnelResult.tunnelToken, resolvedPort, resolvedPath, effectiveBotType),
    };

    if (openclawHooksToken) {
      responseData.openclaw_hooks_token = openclawHooksToken;
    }

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
        openclawHooksToken,
      },
      responseData,
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
