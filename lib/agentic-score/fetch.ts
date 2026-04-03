import { lookup } from "dns/promises";
import type { ScoreInput, PageContent } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT = 15000;
const PROBE_TIMEOUT = 10000;
const MAX_RAW_HTML_LENGTH = 200000;
const MAX_STRIPPED_HTML_LENGTH = 50000;
const MAX_REDIRECTS = 5;

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "169.254.169.254",
];

// ---------------------------------------------------------------------------
// SSRF protection (single source of truth)
// ---------------------------------------------------------------------------

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
  try {
    if (!isUrlSafe(url)) return false;
    const hostname = new URL(url).hostname;
    const { address } = await lookup(hostname);
    return !isIpPrivate(address);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HTML processing
// ---------------------------------------------------------------------------

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/\s{2,}/g, " ");
}

// ---------------------------------------------------------------------------
// Domain normalization
// ---------------------------------------------------------------------------

export function normalizeDomain(input: string): string {
  if (!input || typeof input !== "string") {
    throw new Error("Domain is required");
  }
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/\/.*$/, "");
  domain = domain.replace(/^www\./, "");
  if (!domain || domain.length < 3 || !domain.includes(".")) {
    throw new Error(`Invalid domain: ${input}`);
  }
  return domain;
}

// ---------------------------------------------------------------------------
// Core fetch with SSRF protection and redirect handling
// ---------------------------------------------------------------------------

async function safeFetch(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT,
  depth: number = 0,
): Promise<Response> {
  if (depth > MAX_REDIRECTS) {
    throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
  }

  const safe = await resolveAndValidate(url);
  if (!safe) {
    throw new Error(`Unsafe URL: ${url}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CreditClaw-ASXScanner/1.0 (+https://creditclaw.com/axs)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`Redirect ${res.status} without Location header`);
      const redirectUrl = new URL(location, url).toString();
      return safeFetch(redirectUrl, timeoutMs, depth + 1);
    }

    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// fetchScanInputs — raw HTML (scripts intact) for ASX score signals
// ---------------------------------------------------------------------------

export async function fetchScanInputs(rawDomain: string): Promise<ScoreInput> {
  const domain = normalizeDomain(rawDomain);
  const baseUrl = `https://${domain}`;

  const startTime = Date.now();

  const [homepageResult, sitemapResult, robotsResult] = await Promise.allSettled([
    safeFetch(baseUrl).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return text.slice(0, MAX_RAW_HTML_LENGTH);
    }),
    safeFetch(`${baseUrl}/sitemap.xml`, 8000).then(async (res) => {
      if (!res.ok) return null;
      const text = await res.text();
      if (!text.includes("<") || text.length < 50) return null;
      return text.slice(0, MAX_RAW_HTML_LENGTH);
    }),
    safeFetch(`${baseUrl}/robots.txt`, 8000).then(async (res) => {
      if (!res.ok) return null;
      const text = await res.text();
      if (text.length < 10 || text.includes("<html")) return null;
      return text.slice(0, 50000);
    }),
  ]);

  const pageLoadTimeMs = Date.now() - startTime;

  if (homepageResult.status === "rejected") {
    throw new Error(`Failed to fetch homepage for ${domain}: ${homepageResult.reason}`);
  }

  return {
    domain,
    homepageHtml: homepageResult.value,
    sitemapContent: sitemapResult.status === "fulfilled" ? sitemapResult.value : null,
    robotsTxtContent: robotsResult.status === "fulfilled" ? robotsResult.value : null,
    pageLoadTimeMs,
  };
}

// ---------------------------------------------------------------------------
// fetchPage — stripped HTML for LLM analysis (lower token cost)
// ---------------------------------------------------------------------------

export async function fetchPage(url: string): Promise<PageContent | null> {
  const safe = await resolveAndValidate(url);
  if (!safe) return null;

  try {
    const res = await safeFetch(url, PROBE_TIMEOUT);

    let html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    html = stripScriptsAndStyles(html);

    if (html.length > MAX_STRIPPED_HTML_LENGTH) {
      html = html.substring(0, MAX_STRIPPED_HTML_LENGTH) + "\n[TRUNCATED]";
    }

    return {
      url,
      html,
      title: titleMatch?.[1]?.trim(),
      statusCode: res.status,
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

// ---------------------------------------------------------------------------
// probeUrl — HEAD request for protocol/feature detection
// ---------------------------------------------------------------------------

export async function probeUrl(url: string): Promise<{ status: number; headers: Record<string, string> } | null> {
  const safe = await resolveAndValidate(url);
  if (!safe) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

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
