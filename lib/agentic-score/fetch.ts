import { lookup } from "dns/promises";
import type { ScoreInput } from "./types";

const FETCH_TIMEOUT = 15000;
const FIRECRAWL_TIMEOUT = 30000;
const MAX_HTML_LENGTH = 200000;
const MAX_REDIRECTS = 5;

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
  try {
    if (!isUrlSafe(url)) return false;
    const hostname = new URL(url).hostname;
    const { address } = await lookup(hostname);
    return !isIpPrivate(address);
  } catch {
    return false;
  }
}

async function safeFetch(url: string, timeoutMs: number = FETCH_TIMEOUT, depth: number = 0): Promise<Response> {
  if (depth > MAX_REDIRECTS) {
    throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
  }

  const safe = await resolveAndValidate(url);
  if (!safe) {
    throw new Error(`Unsafe URL after redirect: ${url}`);
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

async function fetchWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  const safe = await resolveAndValidate(url);
  if (!safe) return null;

  try {
    const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;
    const app = new FirecrawlApp({ apiKey });

    const result = await Promise.race([
      app.scrapeUrl(url, { formats: ["html"] }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firecrawl timeout")), FIRECRAWL_TIMEOUT)
      ),
    ]);

    if (result && "html" in result && typeof result.html === "string" && result.html.length > 100) {
      return result.html.slice(0, MAX_HTML_LENGTH);
    }

    return null;
  } catch (err) {
    console.warn("Firecrawl fallback to raw fetch:", err instanceof Error ? err.message : err);
    return null;
  }
}

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

export { domainToSlug } from "./domain-utils";

export async function fetchScanInputs(rawDomain: string): Promise<ScoreInput> {
  const domain = normalizeDomain(rawDomain);
  const baseUrl = `https://${domain}`;

  const startTime = Date.now();

  const [homepageResult, sitemapResult, robotsResult] = await Promise.allSettled([
    (async () => {
      const firecrawlHtml = await fetchWithFirecrawl(baseUrl);
      if (firecrawlHtml) return firecrawlHtml;

      const res = await safeFetch(baseUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return text.slice(0, MAX_HTML_LENGTH);
    })(),
    safeFetch(`${baseUrl}/sitemap.xml`, 8000).then(async (res) => {
      if (!res.ok) return null;
      const text = await res.text();
      if (!text.includes("<") || text.length < 50) return null;
      return text.slice(0, MAX_HTML_LENGTH);
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
