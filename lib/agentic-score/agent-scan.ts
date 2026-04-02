import Anthropic from "@anthropic-ai/sdk";
import { lookup } from "dns/promises";
import type { EvidenceMap } from "./rubric";
import { SCORING_RUBRIC } from "./rubric";
import { rubricToPromptText } from "./scoring-engine";
import type { PageFetch, AgenticScanResult, EvidenceCitation, SignalKey } from "./types";
import type { VendorSector } from "@/lib/procurement-skills/taxonomy/sectors";
import type { BrandTier } from "@/lib/procurement-skills/taxonomy/tiers";

const MODEL = "claude-sonnet-4-6-20260320";
const MAX_PAGES = 8;
const MAX_TURNS = 20;
const MAX_HTML_PER_PAGE = 120_000;
const FETCH_TIMEOUT_MS = 12_000;
const AGENT_TIMEOUT_MS = 90_000;

interface EvidenceKeyMeta {
  pillar: "clarity" | "discoverability" | "reliability";
  signal: SignalKey;
  signalLabel: string;
  criterion: string;
}

const VALID_EVIDENCE_KEYS = new Set<string>();
const EVIDENCE_KEY_META = new Map<string, EvidenceKeyMeta>();
for (const pillar of SCORING_RUBRIC.pillars) {
  for (const signal of pillar.signals) {
    for (const criterion of signal.criteria) {
      VALID_EVIDENCE_KEYS.add(criterion.evidence);
      EVIDENCE_KEY_META.set(criterion.evidence, {
        pillar: pillar.id,
        signal: signal.id,
        signalLabel: signal.label,
        criterion: criterion.condition,
      });
    }
  }
}

function coerceEvidenceValue(value: unknown): boolean | number | string | null {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }
  return null;
}

const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "169.254.169.254",
];

const VALID_SECTORS: VendorSector[] = [
  "retail", "office", "fashion", "health", "beauty", "saas", "home",
  "construction", "automotive", "electronics", "food", "sports",
  "industrial", "specialty", "luxury", "travel", "entertainment",
  "education", "pets", "garden",
];

const VALID_TIERS: BrandTier[] = [
  "ultra_luxury", "luxury", "premium", "mid_range", "value", "budget", "commodity",
];

const VALID_CAPABILITIES = [
  "price_lookup", "stock_check", "programmatic_checkout", "business_invoicing",
  "bulk_pricing", "tax_exemption", "account_creation", "order_tracking", "returns", "po_numbers",
];

function isIpPrivate(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1" || ip === "::") return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^fc00:|^fd[0-9a-f]{2}:|^fe80:/i.test(ip)) return true;
  if (/^::ffff:(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.)/i.test(ip)) return true;
  return false;
}

function isUrlSafe(url: string, allowedDomain: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.replace(/^www\./, "");
    const allowed = allowedDomain.replace(/^www\./, "");
    if (hostname !== allowed && !hostname.endsWith(`.${allowed}`)) return false;
    if (BLOCKED_HOSTS.some(h => hostname === h)) return false;
    if (isIpPrivate(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function resolveAndValidate(url: string, domain: string): Promise<boolean> {
  try {
    if (!isUrlSafe(url, domain)) return false;
    const hostname = new URL(url).hostname;
    const { address } = await lookup(hostname);
    return !isIpPrivate(address);
  } catch {
    return false;
  }
}

const MAX_REDIRECTS = 5;

async function safeFetchWithRedirects(url: string, domain: string, depth: number = 0): Promise<Response> {
  if (depth > MAX_REDIRECTS) throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);

  const safe = await resolveAndValidate(url, domain);
  if (!safe) throw new Error(`URL not allowed: must be on ${domain}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CreditClaw-ASXScanner/1.0 (+https://creditclaw.com/asx)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`Redirect ${res.status} without Location header`);
      const redirectUrl = new URL(location, url).toString();
      return safeFetchWithRedirects(redirectUrl, domain, depth + 1);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function agentFetchPage(url: string, domain: string): Promise<{ html: string; statusCode: number; loadTimeMs: number }> {
  const safe = await resolveAndValidate(url, domain);
  if (!safe) throw new Error(`URL not allowed: must be on ${domain}`);

  const start = Date.now();

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;
      const app = new FirecrawlApp({ apiKey: firecrawlKey });
      const result = await Promise.race([
        app.scrapeUrl(url, { formats: ["html"] }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firecrawl timeout")), FETCH_TIMEOUT_MS)),
      ]);
      if (result && "html" in result && typeof result.html === "string" && result.html.length > 100) {
        return {
          html: result.html.slice(0, MAX_HTML_PER_PAGE),
          statusCode: 200,
          loadTimeMs: Date.now() - start,
        };
      }
    } catch {
      // fall through to raw fetch
    }
  }

  const res = await safeFetchWithRedirects(url, domain);
  const text = await res.text();
  return {
    html: text.slice(0, MAX_HTML_PER_PAGE),
    statusCode: res.status,
    loadTimeMs: Date.now() - start,
  };
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "fetch_page",
    description: "Fetch a page from the target domain. Returns the HTML content. Only URLs on the scanned domain are allowed. Use this to visit product pages, checkout pages, search pages, etc. to gather evidence for the rubric.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Full HTTPS URL on the target domain to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "record_evidence",
    description: "Record one or more evidence keys from the scoring rubric. Each key maps to a criterion in the rubric. Set to true/false/number/string based on what you observed. Only use evidence keys defined in the rubric. Always include a source_url and a short snippet showing where you found the evidence.",
    input_schema: {
      type: "object" as const,
      properties: {
        evidence: {
          type: "object",
          description: "Map of evidence key → value (boolean, number, or string). Keys must match the rubric evidence keys.",
          additionalProperties: true,
        },
        source_url: {
          type: "string",
          description: "The URL of the page where you found this evidence (e.g. https://example.com/checkout).",
        },
        snippet: {
          type: "string",
          description: "A short excerpt (1-2 sentences or an HTML tag) from the page that proves the evidence. Keep it under 200 characters.",
        },
      },
      required: ["evidence", "source_url", "snippet"],
    },
  },
  {
    name: "record_findings",
    description: "Record structured findings about the vendor for SKILL.md generation. Include vendor name, sector, capabilities, checkout details, tips, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Vendor/store name" },
        sector: { type: "string", description: `One of: ${VALID_SECTORS.join(", ")}` },
        subSectors: { type: "array", items: { type: "string" }, description: "Specific categories" },
        tier: { type: "string", description: `One of: ${VALID_TIERS.join(", ")}` },
        guestCheckout: { type: "boolean" },
        taxExemptField: { type: "boolean" },
        poNumberField: { type: "boolean" },
        searchUrlTemplate: { type: "string", description: "URL template for search using {q}" },
        searchPattern: { type: "string" },
        productIdFormat: { type: "string" },
        freeShippingThreshold: { type: "number" },
        estimatedDeliveryDays: { type: "string" },
        businessShipping: { type: "boolean" },
        capabilities: { type: "array", items: { type: "string" }, description: `From: ${VALID_CAPABILITIES.join(", ")}` },
        tips: { type: "array", items: { type: "string" }, description: "3-5 practical tips for AI shopping" },
        checkoutProviders: { type: "array", items: { type: "string" } },
        paymentMethods: { type: "array", items: { type: "string" } },
        hasApi: { type: "boolean" },
        hasMcp: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "complete_scan",
    description: "Signal that the scan is complete. Call this when you have gathered sufficient evidence from all accessible pages. Include a brief summary of your findings.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Brief summary of key findings" },
      },
      required: ["summary"],
    },
  },
];

function buildSystemPrompt(domain: string): string {
  const rubricText = rubricToPromptText(SCORING_RUBRIC);
  return `You are an ASX (Agent Shopping Experience) scanner analyzing the website at https://${domain}.

Your job is to evaluate how well this website supports AI agent-based shopping by gathering evidence for the scoring rubric below.

## SCORING RUBRIC
${rubricText}

## INSTRUCTIONS

1. You have already been given the homepage HTML. Analyze it first for evidence.
2. Use fetch_page to visit additional pages (product pages, checkout, search, cart, etc.) to gather more evidence. Visit at most ${MAX_PAGES} pages total.
3. For each piece of evidence you find, use record_evidence to set the corresponding rubric evidence key. Always include source_url (the page you found it on) and snippet (a short excerpt proving the evidence — an HTML tag, button text, or 1-sentence quote, under 200 chars).
4. Use record_findings to capture structured vendor info for SKILL.md generation (name, sector, capabilities, tips, etc.).
5. Call complete_scan when done.

## RULES
- Only fetch pages on ${domain} (subdomains allowed).
- Focus on evidence keys marked with 🔍 (agent-only) or 🔍? (agent can confirm/override) — these are your highest-value contributions since regex detectors handle the rest.
- Be efficient: if you can determine evidence from the homepage, don't fetch extra pages unnecessarily.
- Set evidence values accurately: true/false for boolean checks, numbers for counts.
- When you see a checkout page, look for guest checkout, payment methods, discount fields, shipping options.
- When you see product pages, look for variant selectors, add-to-cart buttons, quantity inputs, structured data.`;
}

export async function agenticScan(
  domain: string,
  homepageHtml: string,
): Promise<AgenticScanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      evidence: {},
      citations: [],
      findings: {},
      pagesFetched: [],
      turnCount: 0,
      model: MODEL,
      durationMs: 0,
      error: "ANTHROPIC_API_KEY not set",
    };
  }

  const startTime = Date.now();
  const anthropic = new Anthropic({ apiKey });
  const evidence: EvidenceMap = {};
  const citations: EvidenceCitation[] = [];
  const findings: Record<string, unknown> = {};
  const pagesFetched: PageFetch[] = [];
  let turnCount = 0;
  let completed = false;

  const strippedHomepage = homepageHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .slice(0, 60_000);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Here is the homepage HTML for https://${domain}:\n\n${strippedHomepage}\n\nAnalyze this page and explore the site to gather evidence for the scoring rubric. Start by analyzing the homepage, then fetch additional pages as needed.`,
    },
  ];

  try {
    while (turnCount < MAX_TURNS && !completed) {
      if (Date.now() - startTime > AGENT_TIMEOUT_MS) {
        break;
      }

      turnCount++;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: buildSystemPrompt(domain),
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === "end_turn" && !response.content.some(b => b.type === "tool_use")) {
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
          b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        let result: string;

        try {
          switch (toolUse.name) {
            case "fetch_page": {
              if (pagesFetched.length >= MAX_PAGES) {
                result = `Page budget exhausted (${MAX_PAGES} pages). Use the data you have.`;
                break;
              }
              const url = toolUse.input.url as string;
              const fetched = await agentFetchPage(url, domain);
              const stripped = fetched.html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<!--[\s\S]*?-->/g, "")
                .slice(0, 40_000);
              pagesFetched.push({
                url,
                html: fetched.html,
                statusCode: fetched.statusCode,
                loadTimeMs: fetched.loadTimeMs,
              });
              result = `Page fetched (${fetched.statusCode}, ${fetched.loadTimeMs}ms, ${stripped.length} chars). HTML:\n\n${stripped}`;
              break;
            }

            case "record_evidence": {
              const ev = toolUse.input.evidence as Record<string, unknown>;
              const sourceUrl = (toolUse.input.source_url as string) ?? `https://${domain}`;
              const snippet = ((toolUse.input.snippet as string) ?? "").slice(0, 200);
              const accepted: string[] = [];
              const rejected: string[] = [];
              for (const [key, value] of Object.entries(ev)) {
                if (!VALID_EVIDENCE_KEYS.has(key)) {
                  rejected.push(key);
                  continue;
                }
                const coerced = coerceEvidenceValue(value);
                const meta = EVIDENCE_KEY_META.get(key);
                if (coerced !== null && meta) {
                  evidence[key] = coerced;
                  accepted.push(key);
                  citations.push({
                    key,
                    value: coerced,
                    sourceUrl,
                    snippet,
                    pillar: meta.pillar,
                    signal: meta.signal,
                    signalLabel: meta.signalLabel,
                    criterion: meta.criterion,
                  });
                }
              }
              result = `Recorded ${accepted.length} evidence keys: ${accepted.join(", ")}`;
              if (rejected.length > 0) {
                result += `. Rejected ${rejected.length} unknown keys: ${rejected.join(", ")}`;
              }
              break;
            }

            case "record_findings": {
              const input = toolUse.input as Record<string, unknown>;
              for (const [key, value] of Object.entries(input)) {
                if (value !== undefined && value !== null) {
                  findings[key] = value;
                }
              }
              if (typeof input.sector === "string" && !VALID_SECTORS.includes(input.sector as VendorSector)) {
                findings.sector = "specialty";
              }
              if (typeof input.tier === "string" && !VALID_TIERS.includes(input.tier as BrandTier)) {
                delete findings.tier;
              }
              if (Array.isArray(input.capabilities)) {
                findings.capabilities = (input.capabilities as string[]).filter(c => VALID_CAPABILITIES.includes(c));
              }
              result = `Recorded findings: ${Object.keys(input).join(", ")}`;
              break;
            }

            case "complete_scan": {
              completed = true;
              result = "Scan marked complete.";
              break;
            }

            default:
              result = `Unknown tool: ${toolUse.name}`;
          }
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    return {
      evidence,
      citations,
      findings,
      pagesFetched,
      turnCount,
      model: MODEL,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    evidence,
    citations,
    findings,
    pagesFetched,
    turnCount,
    model: MODEL,
    durationMs: Date.now() - startTime,
  };
}
