---
name: cloudflare
description: Stand up a public HTTPS webhook endpoint using a local Node.js server and a Cloudflare Quick Tunnel (cloudflared). No account or DNS config required.
metadata: {"openclaw":{"emoji":"🔗","requires":{"bins":["node","cloudflared"]}}}
---

# SKILL: cloudflare-webhook

## Purpose
Stand up a public HTTPS webhook endpoint using a local Node.js HTTP server + a Cloudflare Quick Tunnel (`cloudflared`), with no account or DNS config required. Useful for receiving callbacks from external services (CreditClaw, Stripe, GitHub, etc.).

---

## Prerequisites
- `node` available (`node --version`)
- Internet access
- Port 3456 (or chosen port) free locally

---

## Step 1 — Install `cloudflared`

Check if already installed:
```bash
which cloudflared && cloudflared --version
```

If missing, download the binary directly (no snap, no apt required):
```bash
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared --version
```

> **Why direct binary?** snap-installed `cloudflared` has path/permission issues in background processes. Direct binary is portable and reliable.

---

## Step 2 — Write the Webhook Handler

Create `webhook-handler.js` in the service directory (e.g., `~/.openclaw/workspace/.creditclaw/`):

```js
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 3456;
const LOG_FILE = path.join(__dirname, 'webhook-events.log');

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Health check
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }));
  }

  // Webhook endpoint
  if (method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const entry = {
        ts:      new Date().toISOString(),
        path:    url,
        headers: req.headers,
        body:    (() => { try { return JSON.parse(body); } catch { return body; } })()
      };
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
      console.log('[webhook]', entry.ts, url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log(`Webhook handler listening on :${PORT}`));
```

---

## Step 3 — Start the Webhook Handler

```bash
cd ~/.openclaw/workspace/.creditclaw   # or your service dir
nohup node webhook-handler.js > webhook.log 2>&1 &
echo $! > webhook-handler.pid
sleep 2
tail -5 webhook.log
```

---

## Step 4 — Start the Cloudflare Quick Tunnel

```bash
nohup cloudflared tunnel --url http://localhost:3456 \
  > ~/.openclaw/workspace/.creditclaw/tunnel.log 2>&1 &
echo $! > ~/.openclaw/workspace/.creditclaw/tunnel.pid
sleep 5
```

Extract the public URL from the log:
```bash
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' \
  ~/.openclaw/workspace/.creditclaw/tunnel.log | tail -1
```

---

## Step 5 — Verify

```bash
# Health check via public URL
curl https://<tunnel-url>/health

# Or local
curl http://localhost:3456/health
```

Expected response: `{"status":"ok","ts":"..."}`

---

## Step 6 — Register the Webhook URL

Pass the full endpoint URL to the target service:
```
https://<tunnel-url>/<your-webhook-path>
# e.g. https://historic-behind-typically-spirituality.trycloudflare.com/creditclaw-webhook
```

Register via the service's dashboard or API.

---

## Viewing Incoming Events

```bash
tail -f ~/.openclaw/workspace/.creditclaw/webhook-events.log
```

Each line is a JSON object: `{ ts, path, headers, body }`.

---

## Stopping the Services

```bash
kill $(cat ~/.openclaw/workspace/.creditclaw/webhook-handler.pid)
kill $(cat ~/.openclaw/workspace/.creditclaw/tunnel.pid)
```

---

## Notes & Gotchas

| Issue | Fix |
|-------|-----|
| snap `cloudflared` not found in nohup | Use direct binary at `/usr/local/bin/cloudflared` |
| Tunnel URL changes on restart | Re-register webhook URL after each restart |
| Port already in use | `lsof -i :3456` → kill occupying process |
| Quick tunnel rate limits | For production, use a named tunnel with a real CF account |
| Handler crashes silently | Check `webhook.log`; add `process.on('uncaughtException')` for resilience |

---

## File Layout

```
./<service-dir>/
  webhook-handler.js       # Node.js HTTP server
  webhook-handler.pid      # PID file for handler process
  webhook.log              # stdout/stderr from handler
  tunnel.log               # cloudflared output (contains public URL)
  tunnel.pid               # PID file for cloudflared process
  webhook-events.log       # All received webhook payloads (JSONL)
```

---

## Quick Reference

```bash
# One-liner to get tunnel URL after start
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log | tail -1
```