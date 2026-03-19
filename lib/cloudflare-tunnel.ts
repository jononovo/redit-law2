const CF_API_BASE = "https://api.cloudflare.com/client/v4";
const WEBHOOK_DOMAIN = "nortonbot.com";
const DEFAULT_OPENCLAW_PORT = 18789;
const DEFAULT_OTHER_PORT = 8080;

function getConfig() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !accountId || !zoneId) {
    return null;
  }

  return { apiToken, accountId, zoneId };
}

function headers(apiToken: string) {
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

export interface TunnelProvisionResult {
  tunnelId: string;
  tunnelToken: string;
  webhookUrl: string;
}

export function resolveLocalPort(localPort?: number, botType?: string): number {
  if (localPort) return localPort;
  if (!botType || botType === "openclaw") return DEFAULT_OPENCLAW_PORT;
  return DEFAULT_OTHER_PORT;
}

export async function provisionBotTunnel(botId: string, localPort: number): Promise<TunnelProvisionResult | null> {
  const config = getConfig();
  if (!config) {
    console.warn("[cloudflare-tunnel] Missing Cloudflare config, skipping tunnel provisioning");
    return null;
  }

  const tunnelName = `bot-${botId}`;
  const hostname = `${tunnelName}.${WEBHOOK_DOMAIN}`;

  const createRes = await fetch(
    `${CF_API_BASE}/accounts/${config.accountId}/cfd_tunnel`,
    {
      method: "POST",
      headers: headers(config.apiToken),
      body: JSON.stringify({
        name: tunnelName,
        config_src: "cloudflare",
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("[cloudflare-tunnel] Failed to create tunnel:", err);
    return null;
  }

  const createData = await createRes.json() as { result: { id: string; token: string } };
  const tunnelId = createData.result.id;
  const tunnelToken = createData.result.token;

  const configRes = await fetch(
    `${CF_API_BASE}/accounts/${config.accountId}/cfd_tunnel/${tunnelId}/configurations`,
    {
      method: "PUT",
      headers: headers(config.apiToken),
      body: JSON.stringify({
        config: {
          ingress: [
            { hostname, service: `http://localhost:${localPort}` },
            { service: "http_status:404" },
          ],
        },
      }),
    }
  );

  if (!configRes.ok) {
    const err = await configRes.text();
    console.error("[cloudflare-tunnel] Failed to configure tunnel ingress:", err);
  }

  const dnsRes = await fetch(
    `${CF_API_BASE}/zones/${config.zoneId}/dns_records`,
    {
      method: "POST",
      headers: headers(config.apiToken),
      body: JSON.stringify({
        type: "CNAME",
        name: tunnelName,
        content: `${tunnelId}.cfargotunnel.com`,
        proxied: true,
      }),
    }
  );

  if (!dnsRes.ok) {
    const err = await dnsRes.text();
    console.error("[cloudflare-tunnel] Failed to create DNS record:", err);
  }

  return {
    tunnelId,
    tunnelToken,
    webhookUrl: `https://${hostname}`,
  };
}

export async function deleteBotTunnel(tunnelId: string, botId: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const tunnelName = `bot-${botId}`;

  const dnsListRes = await fetch(
    `${CF_API_BASE}/zones/${config.zoneId}/dns_records?name=${tunnelName}.${WEBHOOK_DOMAIN}&type=CNAME`,
    {
      method: "GET",
      headers: headers(config.apiToken),
    }
  );

  if (dnsListRes.ok) {
    const dnsData = await dnsListRes.json() as { result: Array<{ id: string }> };
    for (const record of dnsData.result) {
      await fetch(
        `${CF_API_BASE}/zones/${config.zoneId}/dns_records/${record.id}`,
        {
          method: "DELETE",
          headers: headers(config.apiToken),
        }
      );
    }
  }

  const deleteRes = await fetch(
    `${CF_API_BASE}/accounts/${config.accountId}/cfd_tunnel/${tunnelId}`,
    {
      method: "DELETE",
      headers: headers(config.apiToken),
      body: JSON.stringify({ cascade: true }),
    }
  );

  if (!deleteRes.ok) {
    const err = await deleteRes.text();
    console.error("[cloudflare-tunnel] Failed to delete tunnel:", err);
    return false;
  }

  return true;
}

export async function getTunnelToken(tunnelId: string): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const res = await fetch(
    `${CF_API_BASE}/accounts/${config.accountId}/cfd_tunnel/${tunnelId}/token`,
    {
      method: "GET",
      headers: headers(config.apiToken),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[cloudflare-tunnel] Failed to get tunnel token:", err);
    return null;
  }

  const data = await res.json() as { result: string };
  return data.result;
}
