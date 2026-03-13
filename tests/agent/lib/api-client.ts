import type { RegistrationResponse, BotStatusResponse } from "./types";

const DEFAULT_BASE_URL = "https://creditclaw.com";

function getBaseUrl(): string {
  return process.env.TEST_BASE_URL || DEFAULT_BASE_URL;
}

export async function registerBot(opts: {
  botName: string;
  ownerEmail: string;
  description?: string;
}): Promise<{ status: number; data: RegistrationResponse | null; error?: string }> {
  const url = `${getBaseUrl()}/api/v1/bots/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_name: opts.botName,
      owner_email: opts.ownerEmail,
      description: opts.description || `Agent test bot: ${opts.botName}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { status: res.status, data: null, error: body };
  }

  const data = (await res.json()) as RegistrationResponse;
  return { status: res.status, data };
}

export async function getBotStatus(apiKey: string): Promise<{ status: number; data: BotStatusResponse | null; error?: string }> {
  const url = `${getBaseUrl()}/api/v1/bot/status`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    return { status: res.status, data: null, error: body };
  }

  const data = (await res.json()) as BotStatusResponse;
  return { status: res.status, data };
}

export async function duplicateRegisterBot(opts: {
  botName: string;
  ownerEmail: string;
}): Promise<{ status: number; error?: string }> {
  const url = `${getBaseUrl()}/api/v1/bots/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_name: opts.botName,
      owner_email: opts.ownerEmail,
    }),
  });

  const body = await res.text();
  return { status: res.status, error: body };
}
