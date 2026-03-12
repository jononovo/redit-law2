import type { ProbeResult, AnalysisEvidence } from "./types";
import { probeUrl, fetchPage } from "./fetch";
import type { CheckoutMethod } from "../types";

export async function probeForAPIs(baseUrl: string): Promise<{
  methods: CheckoutMethod[];
  evidence: AnalysisEvidence[];
}> {
  const domain = new URL(baseUrl).hostname;
  const methods: CheckoutMethod[] = [];
  const evidence: AnalysisEvidence[] = [];

  const probes = await Promise.allSettled([
    probeX402(baseUrl),
    probeACP(baseUrl),
    probePublicAPI(baseUrl),
  ]);

  for (const result of probes) {
    if (result.status === "fulfilled" && result.value) {
      for (const probe of result.value) {
        if (probe.found && !methods.includes(probe.protocol)) {
          methods.push(probe.protocol);
          evidence.push({
            field: "checkoutMethods",
            source: "api_probe",
            url: probe.url || baseUrl,
            snippet: probe.details || `${probe.protocol} detected`,
          });
        }
      }
    }
  }

  if (methods.length === 0) {
    methods.push("self_hosted_card");
    methods.push("browser_automation");
    evidence.push({
      field: "checkoutMethods",
      source: "api_probe",
      url: baseUrl,
      snippet: "No programmatic checkout detected; defaulting to self_hosted_card + browser_automation",
    });
  }

  return { methods, evidence };
}

async function probeX402(baseUrl: string): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  for (const path of ["/api/health", "/", "/api"]) {
    const probe = await probeUrl(`${baseUrl}${path}`);
    if (probe) {
      const found = probe.status === 402 || !!probe.headers["x-402-receipt"] || !!probe.headers["x-402-payment"];
      if (found) {
        results.push({
          protocol: "x402",
          found: true,
          url: `${baseUrl}${path}`,
          details: `HTTP ${probe.status}, x402 headers detected`,
        });
      }
    }
  }

  return results;
}

async function probeACP(baseUrl: string): Promise<ProbeResult[]> {
  const page = await fetchPage(`${baseUrl}/.well-known/acp.json`);
  if (page && page.statusCode === 200) {
    try {
      JSON.parse(page.html);
      return [{
        protocol: "acp",
        found: true,
        url: `${baseUrl}/.well-known/acp.json`,
        details: "ACP manifest found",
      }];
    } catch {
      // invalid JSON
    }
  }
  return [];
}

async function probePublicAPI(baseUrl: string): Promise<ProbeResult[]> {
  const apiPaths = ["/developers", "/api-docs", "/developer/api", "/partner-api", "/api/v1", "/api/v2"];
  const results: ProbeResult[] = [];

  for (const path of apiPaths) {
    const probe = await probeUrl(`${baseUrl}${path}`);
    if (probe && probe.status >= 200 && probe.status < 400) {
      const contentType = probe.headers["content-type"] || "";
      if (contentType.includes("text/html") || contentType.includes("application/json")) {
        results.push({
          protocol: "native_api",
          found: true,
          url: `${baseUrl}${path}`,
          details: `Public API endpoint found at ${path} (HTTP ${probe.status})`,
        });
        break;
      }
    }
  }

  return results;
}

export async function detectBusinessFeatures(baseUrl: string): Promise<{
  capabilities: string[];
  evidence: AnalysisEvidence[];
}> {
  const capabilities: string[] = [];
  const evidence: AnalysisEvidence[] = [];

  const businessPaths: Record<string, string[]> = {
    "/business": ["business_invoicing", "bulk_pricing"],
    "/b2b": ["business_invoicing", "bulk_pricing"],
    "/enterprise": ["business_invoicing", "bulk_pricing"],
    "/tax-exempt": ["tax_exemption"],
    "/tax-exemption": ["tax_exemption"],
    "/purchase-orders": ["po_numbers"],
    "/bulk-orders": ["bulk_pricing"],
    "/net-terms": ["business_invoicing"],
    "/returns": ["returns"],
    "/return-policy": ["returns"],
    "/order-status": ["order_tracking"],
    "/track-order": ["order_tracking"],
    "/create-account": ["account_creation"],
    "/register": ["account_creation"],
  };

  const probeResults = await Promise.allSettled(
    Object.entries(businessPaths).map(async ([path, caps]) => {
      const probe = await probeUrl(`${baseUrl}${path}`);
      if (probe && probe.status >= 200 && probe.status < 400) {
        return { path, caps, found: true };
      }
      return { path, caps, found: false };
    })
  );

  for (const result of probeResults) {
    if (result.status === "fulfilled" && result.value.found) {
      for (const cap of result.value.caps) {
        if (!capabilities.includes(cap)) {
          capabilities.push(cap);
          evidence.push({
            field: "capabilities",
            source: "api_probe",
            url: `${baseUrl}${result.value.path}`,
            snippet: `Business feature page found: ${result.value.path} → ${cap}`,
          });
        }
      }
    }
  }

  return { capabilities, evidence };
}

export async function checkProtocolSupport(
  baseUrl: string,
  detectedMethods: string[]
): Promise<{
  methodConfig: Record<string, { requiresAuth: boolean; notes: string }>;
  evidence: AnalysisEvidence[];
}> {
  const methodConfig: Record<string, { requiresAuth: boolean; notes: string }> = {};
  const evidence: AnalysisEvidence[] = [];

  if (detectedMethods.includes("acp")) {
    const page = await fetchPage(`${baseUrl}/.well-known/acp.json`);
    if (page) {
      try {
        const manifest = JSON.parse(page.html);
        methodConfig["acp"] = {
          requiresAuth: false,
          notes: `ACP manifest with ${Object.keys(manifest).length} configured operations`,
        };
        evidence.push({
          field: "methodConfig.acp",
          source: "api_probe",
          url: `${baseUrl}/.well-known/acp.json`,
          snippet: `ACP operations: ${JSON.stringify(Object.keys(manifest)).slice(0, 200)}`,
        });
      } catch {
        // ignore
      }
    }
  }

  if (detectedMethods.includes("x402")) {
    methodConfig["x402"] = {
      requiresAuth: false,
      notes: "x402 payment protocol supported — content gated behind 402 responses",
    };
  }

  if (detectedMethods.includes("native_api")) {
    methodConfig["native_api"] = {
      requiresAuth: true,
      notes: "Public API documentation found — may require API key registration",
    };
  }

  if (detectedMethods.includes("self_hosted_card")) {
    methodConfig["self_hosted_card"] = {
      requiresAuth: true,
      notes: "Standard web checkout using CreditClaw split-knowledge card",
    };
  }

  if (detectedMethods.includes("browser_automation")) {
    methodConfig["browser_automation"] = {
      requiresAuth: true,
      notes: "Requires full browser interaction for checkout",
    };
  }

  return { methodConfig, evidence };
}
