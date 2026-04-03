import { lookup } from "dns/promises";
import type { PageContent } from "./types";

const FETCH_TIMEOUT = 10000;
const MAX_HTML_LENGTH = 50000;

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "169.254.169.254",
];

function isIpPrivate(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1" || ip === "::") return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^fc00:|^fd[0-9a-f]{2}:|^fe80:/i.test(ip)) return true;
  if (/^::ffff:(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/i.test(ip)) return true;
  return false;
}

function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (BLOCKED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) return false;
    if (isIpPrivate(parsed.hostname)) return false;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function resolveAndValidate(url: string): Promise<boolean> {
  if (!isUrlSafe(url)) return false;

  try {
    const hostname = new URL(url).hostname;
    const { address } = await lookup(hostname);
    if (isIpPrivate(address)) return false;
    return true;
  } catch {
    return false;
  }
}

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/\s{2,}/g, " ");
}

export async function fetchPage(url: string): Promise<PageContent | null> {
  const safe = await resolveAndValidate(url);
  if (!safe) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "CreditClaw-SkillBuilder/1.0 (vendor-analysis)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const redirectUrl = new URL(location, url).toString();
        const redirectSafe = await resolveAndValidate(redirectUrl);
        if (!redirectSafe) return null;
        return fetchPage(redirectUrl);
      }
      return null;
    }

    let html = await response.text();
    html = stripScriptsAndStyles(html);

    if (html.length > MAX_HTML_LENGTH) {
      html = html.substring(0, MAX_HTML_LENGTH) + "\n[TRUNCATED]";
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

    return {
      url,
      html,
      title: titleMatch?.[1]?.trim(),
      statusCode: response.status,
    };
  } catch {
    return null;
  }
}

export async function fetchPages(urls: string[]): Promise<PageContent[]> {
  const results = await Promise.allSettled(
    urls.map(url => fetchPage(url))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PageContent | null> => r.status === "fulfilled")
    .map(r => r.value)
    .filter((p): p is PageContent => p !== null && p.statusCode < 400);
}

export async function probeUrl(url: string): Promise<{ status: number; headers: Record<string, string> } | null> {
  const safe = await resolveAndValidate(url);
  if (!safe) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const redirectUrl = new URL(location, url).toString();
        const redirectSafe = await resolveAndValidate(redirectUrl);
        if (!redirectSafe) return null;
        return probeUrl(redirectUrl);
      }
      return null;
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return { status: response.status, headers };
  } catch {
    return null;
  }
}
