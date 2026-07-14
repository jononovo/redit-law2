// Crossmint environment config — single source of truth.
//
// Two Crossmint projects are in play, split on purpose:
//   - Rail 2 ("Shop Wallet") + Worldstore procurement  → STAGING (dormant/exploration).
//   - Rail 3 (virtual cards)                            → PRODUCTION.
//
// Why split instead of one global switch: there is a single CROSSMINT_WEBHOOK_SECRET,
// consumed by the Worldstore card-wallet webhook. Rail 3 has NO webhook dependency, so
// moving Rail 3 to prod must not drag Worldstore/Rail 2 (and their webhook secret,
// wallets, and orders) along with it.
//
// Staging keys = …_STAGING; production keys = … (no suffix).
// Docs: https://docs.crossmint.com/introduction/platform/staging-vs-production

// --- Shared: Rail 2 + Worldstore (staging) ---
export const CROSSMINT_HOST = "https://staging.crossmint.com";
export const CROSSMINT_SERVER_API_KEY = process.env.CROSSMINT_SERVER_API_KEY_STAGING;
export const CROSSMINT_CLIENT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY_STAGING;

// --- Rail 3 virtual cards (production) ---
// The prod client key is origin-locked: every client-key call — the server-side helper
// (crossmintCardsFetch / agentic-enrollment) AND the browser SDK — must present this
// origin, and it must match the domain the browser SDK / passkey ceremony runs on
// (creditclaw.com). Requests from other origins (e.g. the workspace preview) are rejected.
export const RAIL3_CROSSMINT_HOST = "https://www.crossmint.com";
export const RAIL3_CROSSMINT_SERVER_API_KEY = process.env.CROSSMINT_SERVER_API_KEY;
export const RAIL3_CROSSMINT_CLIENT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY;
export const RAIL3_CROSSMINT_CLIENT_ORIGIN = "https://creditclaw.com";

// --- Agent Checkouts (production; in-house agent) ---
// Client-scoped key with agent-checkouts + buyer-profiles scopes, used
// SERVER-SIDE only (no NEXT_PUBLIC_) with the same origin lock as Rail 3.
export const AGENT_CHECKOUT_CROSSMINT_CLIENT_KEY = process.env.CROSSMINT_AGENT_CHECKOUT_CLIENT_KEY;
