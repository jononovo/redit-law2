import type { SignalScore } from "../types";

export function scoreSearchApi(html: string): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  const mcpIndicators = [
    { pattern: /\.well-known\/mcp\.json/i, label: "MCP endpoint reference" },
    { pattern: /\.well-known\/ai-plugin\.json/i, label: "AI plugin manifest" },
    { pattern: /mcp[_-]?server|mcp[_-]?endpoint/i, label: "MCP server reference" },
  ];

  for (const { pattern, label } of mcpIndicators) {
    if (pattern.test(html)) {
      score += 4;
      findings.push(label + " detected");
      break;
    }
  }

  const apiIndicators = [
    { pattern: /\/api\/v[0-9]/i, label: "Versioned API endpoint" },
    { pattern: /openapi|swagger/i, label: "OpenAPI/Swagger documentation" },
    { pattern: /graphql/i, label: "GraphQL endpoint" },
    { pattern: /developer[s]?\.[\w]+\.com|api\.[\w]+\.com/i, label: "Developer/API portal" },
  ];

  for (const { pattern, label } of apiIndicators) {
    if (pattern.test(html)) {
      score += 3;
      findings.push(label + " detected");
      break;
    }
  }

  const protocolIndicators = [
    { pattern: /x-?402|payment-?required/i, label: "x402 payment protocol" },
    { pattern: /agentic[_-]?commerce[_-]?protocol|\.well-known\/acp/i, label: "ACP (Agentic Commerce Protocol)" },
    { pattern: /a2a[_-]?protocol|agent[_-]?to[_-]?agent/i, label: "A2A protocol" },
  ];

  for (const { pattern, label } of protocolIndicators) {
    if (pattern.test(html)) {
      score += 3;
      findings.push(label + " detected");
      break;
    }
  }

  if (findings.length === 0) {
    findings.push("No programmatic API, MCP endpoint, or agentic commerce protocol detected");
  }

  return {
    key: "search_api",
    label: "Search API / MCP",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

export function scoreSiteSearch(html: string): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  const searchForms = html.match(/<form[^>]*(?:search|query|q=)[^>]*>/gi) || [];
  const searchInputs = html.match(/<input[^>]*(?:type\s*=\s*["']search["']|name\s*=\s*["'](?:q|query|search|s|keyword)["'])[^>]*>/gi) || [];

  if (searchForms.length > 0 || searchInputs.length > 0) {
    score += 4;
    findings.push("Search form detected on homepage");
  }

  const searchAction = html.match(/<form[^>]*action\s*=\s*["']([^"']*(?:search|query|find)[^"']*)["'][^>]*>/i);
  if (searchAction) {
    score += 2;
    findings.push(`Search action URL: ${searchAction[1]}`);
  }

  const opensearch = /<link[^>]*type\s*=\s*["']application\/opensearchdescription\+xml["'][^>]*>/i;
  if (opensearch.test(html)) {
    score += 2;
    findings.push("OpenSearch description found");
  }

  const searchLink = /<link[^>]*rel\s*=\s*["']search["'][^>]*>/i;
  if (searchLink.test(html) && !opensearch.test(html)) {
    score += 1;
    findings.push("Search link relation found");
  }

  const searchAutocomplete = /autocomplete|autosuggest|typeahead|instant[_-]?search/i;
  if (searchAutocomplete.test(html)) {
    score += 2;
    findings.push("Search autocomplete/typeahead capability detected");
  }

  if (findings.length === 0) {
    findings.push("No site search functionality detected on homepage");
  }

  return {
    key: "site_search",
    label: "Internal Site Search",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

export function scorePageLoad(pageLoadTimeMs: number | null): SignalScore {
  const MAX = 5;
  let score = 0;
  let detail: string;

  if (pageLoadTimeMs === null) {
    detail = "Page load time could not be measured";
  } else if (pageLoadTimeMs <= 1000) {
    score = 5;
    detail = `Excellent load time: ${pageLoadTimeMs}ms`;
  } else if (pageLoadTimeMs <= 1500) {
    score = 4;
    detail = `Good load time: ${pageLoadTimeMs}ms`;
  } else if (pageLoadTimeMs <= 2000) {
    score = 3;
    detail = `Acceptable load time: ${pageLoadTimeMs}ms`;
  } else if (pageLoadTimeMs <= 3000) {
    score = 2;
    detail = `Slow load time: ${pageLoadTimeMs}ms`;
  } else if (pageLoadTimeMs <= 5000) {
    score = 1;
    detail = `Very slow load time: ${pageLoadTimeMs}ms`;
  } else {
    score = 0;
    detail = `Extremely slow load time: ${pageLoadTimeMs}ms`;
  }

  return {
    key: "page_load",
    label: "Page Load Performance",
    score,
    max: MAX,
    detail,
  };
}
