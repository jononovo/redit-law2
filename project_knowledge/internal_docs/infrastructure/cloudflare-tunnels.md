# Managed Cloudflare Tunnels

Bots without a `callback_url` get a managed Cloudflare tunnel provisioned at registration. The tunnel routes through Cloudflare on the **`nortonbot.com`** domain (configured directly in Cloudflare, separate from the main app domains).

## Architecture

Two-layer separation:

### Webhook Tunnel Module (`lib/webhook-tunnel/`)

Self-contained module for Cloudflare tunnel provisioning.

- **`cloudflare.ts`** — Low-level Cloudflare API calls only. `provisionBotTunnel(botId, localPort)`, `deleteBotTunnel(tunnelId, botId)`, `getTunnelToken(tunnelId)`, `resolveLocalPort(localPort?, botType?)`, `resolveWebhookPath(webhookPath?, botType?)`. Uses plain `fetch` against Cloudflare API. No business logic, no DB access.
- **`provisioning.ts`** — Orchestration layer between Cloudflare API and registration route. `provisionTunnelForBot(botId, botType?, localPort?, webhookPath?)` resolves defaults, calls Cloudflare, generates webhook secret, and returns a structured `TunnelProvisionOutput` containing both `dbFields` (for DB insert) and `responseData` (for API response including `tunnel_setup` object). `cleanupTunnel(tunnelId, botId)` wraps error cleanup. The `tunnel_setup` response structure (steps, headers, retry policy) is defined in one place via `buildTunnelSetupResponse()` — no duplication across registration paths.
- **`index.ts`** — Barrel re-exports the public API from both files. Consumers import from `@/lib/webhook-tunnel`.

### Schema

`bots` table has `botType`, `tunnelId`, `tunnelToken`, `tunnelStatus`, `tunnelLocalPort`, `openclawHooksToken` columns (migrations `drizzle/0004_low_morph.sql`, `drizzle/0005_melted_the_fury.sql`, `drizzle/0006_fast_frog_thor.sql`).

### Registration Fields

- `bot_type` (optional, defaults to `"openclaw"`)
- `local_port` (optional integer 1–65535)
- `webhook_path` (optional string starting with `/`, max 200 chars)

## Port & Path Resolution

- **Port:** If `local_port` is provided → use it. Else if `bot_type` is `"openclaw"` → 18789. Else → 8080. Stored in `tunnelLocalPort`.
- **Path:** If `webhook_path` is provided → use it. Else if `bot_type` is `"openclaw"` → `/hooks/creditclaw`. Else → `/webhook`. Appended to tunnel URL to form the full `callbackUrl` (e.g. `https://bot-abc123.nortonbot.com/hooks/creditclaw`).

## Registration Flow

Registration calls `provisionTunnelForBot()` → spreads `dbFields` into DB insert → attaches `responseData` to API response. Bot runs `cloudflared tunnel run --token <token>` and starts local listener on the resolved port.

## OpenClaw Gateway Auth

For OpenClaw bots, `provisionTunnelForBot()` also generates an `openclawHooksToken` (stored on the bot record). The registration response includes it as `openclaw_hooks_token` with instructions to set it as `CREDITCLAW_HOOKS_TOKEN` env var. The `openclaw_gateway_config` snippet uses `${CREDITCLAW_HOOKS_TOKEN}` (OpenClaw env var substitution). On outbound webhook delivery, `attemptDelivery()` in `lib/webhooks/delivery.ts` sends `Authorization: Bearer <token>` alongside `X-CreditClaw-Signature` when the bot has a hooks token stored. All delivery paths (direct, retry, Rail 5 deliver-to-bot) pass the hooks token through.

## Webhook Status

Tunnel-provisioned bots start with `webhookStatus: "pending"` (not `"active"`) until the tunnel connects.

## Cleanup

If registration fails after tunnel provisioning, `cleanupTunnel(tunnelId, botId)` is called to clean up both DNS and tunnel.

## Dashboard

Bot settings dialog shows tunnel URL as read-only with a `TunnelStatusIndicator` when a tunnel is provisioned.

## Required Secrets

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` (not yet added — provisioning is best-effort, registration still succeeds without them).
