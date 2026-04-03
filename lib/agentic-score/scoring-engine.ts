import type {
  ScoringRubric,
  EvidenceMap,
} from "./rubric";
import type {
  ASXScoreResult,
  ASXScoreBreakdown,
  PillarScore,
  SignalScore,
  ScoreLabel,
  ASXRecommendation,
  SignalKey,
} from "./types";

function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === 0 || value === "") return false;
  return true;
}

function getLabel(score: number): ScoreLabel {
  if (score <= 20) return "Poor";
  if (score <= 40) return "Needs Work";
  if (score <= 60) return "Fair";
  if (score <= 80) return "Good";
  return "Excellent";
}

export function computeScoreFromRubric(
  rubric: ScoringRubric,
  evidence: EvidenceMap,
): ASXScoreResult {
  const pillarResults: Record<string, PillarScore> = {};
  let overallScore = 0;
  const allSignals: SignalScore[] = [];

  for (const pillar of rubric.pillars) {
    const signals: SignalScore[] = [];

    for (const signal of pillar.signals) {
      let signalScore = 0;
      const details: string[] = [];
      let overridden = false;

      for (const criterion of signal.criteria) {
        if (criterion.override && isTruthy(evidence[criterion.evidence])) {
          signalScore = signal.max;
          details.length = 0;
          details.push(criterion.condition);
          overridden = true;
          break;
        }
      }

      if (!overridden) {
        const groupBest = new Map<string, { points: number; condition: string }>();

        for (const criterion of signal.criteria) {
          if (criterion.override) continue;
          if (criterion.excludedBy && isTruthy(evidence[criterion.excludedBy])) continue;

          const val = evidence[criterion.evidence];
          if (!isTruthy(val)) continue;

          if (criterion.group) {
            const existing = groupBest.get(criterion.group);
            if (!existing || criterion.points > existing.points) {
              groupBest.set(criterion.group, { points: criterion.points, condition: criterion.condition });
            }
          } else {
            signalScore += criterion.points;
            details.push(criterion.condition);
          }
        }

        for (const [, best] of groupBest) {
          signalScore += best.points;
          details.push(best.condition);
        }
      }

      signalScore = Math.max(0, Math.min(signalScore, signal.max));

      const signalResult: SignalScore = {
        key: signal.id,
        label: signal.label,
        score: signalScore,
        max: signal.max,
        detail: details.length > 0 ? details.join(". ") : `No evidence found for ${signal.label.toLowerCase()}`,
      };

      signals.push(signalResult);
      allSignals.push(signalResult);
      overallScore += signalScore;
    }

    const pillarScore = signals.reduce((sum, s) => sum + s.score, 0);
    pillarResults[pillar.id] = {
      score: pillarScore,
      max: pillar.max,
      signals,
    };
  }

  const breakdown: ASXScoreBreakdown = {
    clarity: pillarResults["clarity"] ?? { score: 0, max: 35, signals: [] },
    discoverability: pillarResults["discoverability"] ?? { score: 0, max: 30, signals: [] },
    reliability: pillarResults["reliability"] ?? { score: 0, max: 35, signals: [] },
  };

  const recommendations = generateRecommendationsFromRubric(allSignals);

  return {
    overallScore,
    breakdown,
    recommendations,
    label: getLabel(overallScore),
  };
}

interface RecommendationTemplate {
  signal: SignalKey;
  impact: "high" | "medium" | "low";
  title: string;
  description: string;
}

const RECOMMENDATION_TEMPLATES: Record<string, RecommendationTemplate> = {
  json_ld: {
    signal: "json_ld",
    impact: "high",
    title: "Add JSON-LD structured data",
    description: "Implement Schema.org Product markup using JSON-LD on your product pages. This is the single highest-impact improvement — it lets AI agents read product names, prices, and availability directly without rendering the page.",
  },
  product_feed: {
    signal: "product_feed",
    impact: "medium",
    title: "Publish a sitemap with product URLs",
    description: "Create or improve your sitemap.xml to include product page URLs. Reference it in robots.txt. This helps AI agents discover your full catalog efficiently.",
  },
  clean_html: {
    signal: "clean_html",
    impact: "medium",
    title: "Improve HTML semantic structure",
    description: "Use semantic HTML5 elements (header, nav, main, article, footer) and proper heading hierarchy. Add alt text to images and ARIA labels to interactive elements. This makes your site parseable even without structured data.",
  },
  search_api: {
    signal: "search_api",
    impact: "high",
    title: "Expose a search API or MCP endpoint",
    description: "Provide a programmatic search endpoint that AI agents can query directly. Consider implementing MCP (Model Context Protocol) to let agents interact with your catalog natively. This eliminates the need for browser-based navigation entirely.",
  },
  site_search: {
    signal: "site_search",
    impact: "medium",
    title: "Make site search discoverable",
    description: "Ensure your site search form is accessible on the homepage with a clear action URL. Add an OpenSearch description file so agents can discover your search template automatically.",
  },
  page_load: {
    signal: "page_load",
    impact: "low",
    title: "Improve page load performance",
    description: "Optimize your homepage load time to under 2 seconds. Faster pages mean agents can interact with your site more efficiently, reducing timeout failures and retry costs.",
  },
  access_auth: {
    signal: "access_auth",
    impact: "high",
    title: "Enable guest checkout",
    description: "Allow purchases without mandatory account creation. Guest checkout is critical for AI agents — most cannot complete registration flows, verify email addresses, or handle phone verification steps.",
  },
  order_management: {
    signal: "order_management",
    impact: "high",
    title: "Simplify product selection and cart management",
    description: "Use clear, predictable URL patterns for cart and product pages. Make variant selectors (size, color, quantity) easily identifiable with standard HTML form elements. Ensure add-to-cart actions are straightforward.",
  },
  checkout_flow: {
    signal: "checkout_flow",
    impact: "medium",
    title: "Clarify checkout options",
    description: "Clearly label payment methods, shipping options, and discount/promo code fields. Use descriptive text that an AI agent can parse to understand the differences between options (e.g., 'Standard Shipping - 5-7 business days - $5.99').",
  },
  bot_tolerance: {
    signal: "bot_tolerance",
    impact: "medium",
    title: "Reduce bot-blocking measures",
    description: "Review your robots.txt to allow AI agent crawling. Avoid aggressive CAPTCHAs on landing and product pages. Consider whitelisting known AI agent user-agents to enable automated shopping.",
  },
  product_page: {
    signal: "product_page",
    impact: "high",
    title: "Improve product page agent-readability",
    description: "Make product pages easy for AI agents to parse: include machine-readable pricing (JSON-LD Offer or clearly tagged price elements), use standard HTML form elements for variant selection (size, color), ensure add-to-cart is a single clear action, and include product identifiers in URLs for direct navigation.",
  },
};

function generateRecommendationsFromRubric(signals: SignalScore[]): ASXRecommendation[] {
  const sorted = [...signals].sort((a, b) => (b.max - b.score) - (a.max - a.score));
  const recommendations: ASXRecommendation[] = [];

  for (const signal of sorted) {
    const gap = signal.max - signal.score;
    if (gap <= 0) continue;

    const template = RECOMMENDATION_TEMPLATES[signal.key];
    if (!template) continue;

    recommendations.push({
      ...template,
      potentialGain: gap,
    });
  }

  return recommendations;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rubricToCsv(rubric: ScoringRubric): string {
  const rows: string[] = [
    "pillar,pillar_label,pillar_max,signal,signal_label,signal_max,criterion_id,points,evidence_key,source,group,override,excluded_by,condition",
  ];

  for (const pillar of rubric.pillars) {
    for (const signal of pillar.signals) {
      for (const c of signal.criteria) {
        const row = [
          pillar.id,
          csvEscape(pillar.label),
          String(pillar.max),
          signal.id,
          csvEscape(signal.label),
          String(signal.max),
          c.id,
          String(c.points),
          c.evidence,
          c.source,
          c.group ?? "",
          c.override ? "yes" : "",
          c.excludedBy ?? "",
          csvEscape(c.condition),
        ].join(",");
        rows.push(row);
      }
    }
  }

  return rows.join("\n");
}

export function rubricToPromptText(rubric: ScoringRubric): string {
  const lines: string[] = [
    `ASX Scoring Rubric v${rubric.version} — ${rubric.totalPoints} points total`,
    "",
  ];

  for (const pillar of rubric.pillars) {
    lines.push(`## ${pillar.label} (${pillar.max} points)`);
    lines.push("");

    for (const signal of pillar.signals) {
      lines.push(`### ${signal.label} (max ${signal.max})`);

      for (const c of signal.criteria) {
        const groupNote = c.group ? ` [group: ${c.group}]` : "";
        const overrideNote = c.override ? " [OVERRIDE — awards max, skips others]" : "";
        const excludedNote = c.excludedBy ? ` [excluded if ${c.excludedBy}]` : "";
        const sourceNote = c.source === "agent" ? " 🔍" : c.source === "either" ? " 🔍?" : "";
        lines.push(`  - ${c.points > 0 ? "+" : ""}${c.points} pts: ${c.condition}${groupNote}${overrideNote}${excludedNote}${sourceNote}`);
        lines.push(`    evidence: ${c.evidence}`);
      }
      lines.push("");
    }
  }

  lines.push("Legend: 🔍 = agent must verify  🔍? = regex gives preliminary, agent can confirm/override");

  return lines.join("\n");
}
