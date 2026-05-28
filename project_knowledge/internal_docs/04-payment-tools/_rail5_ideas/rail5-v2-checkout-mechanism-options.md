---
name: Rail 5 v2 — Checkout Mechanism Options
description: Direction-setting doc for the Rail 5 rebuild. The sub-agent model is being retired because spawn_payload only works for Claude-Code-class hosts; this doc evaluates the three viable replacements (agent-platform plugins, a CreditClaw browser extension, browser-use sensitive_data) against the broader 2026 agentic-payments landscape (Visa ICC / Mastercard Agent Pay / Stripe SPT / OpenAI ACP / Google UCP / AP2), with a wild-ideas section at the end.
status: idea — frames the Rail 5 v2 plan; no code yet
created: 2026-05-28
last_updated: 2026-05-28
---

# Rail 5 v2 — Checkout Mechanism Options

## 1. Why Rail 5 is being rebuilt

### What Rail 5 v1 does today

Rail 5 is the "self-hosted encrypted real card" rail. The owner encrypts a real Visa/Mastercard client-side (AES-256-GCM); CreditClaw stores only the decryption key. At checkout, an agent gets the ciphertext, asks our API for the key, decrypts in-memory, fills the PAN + CVV into the merchant's DOM, and wipes the buffer. Two delivery modes today:

- **`spawn_payload`** — the host agent spawns an ephemeral sub-agent in a fresh context, hands it the ciphertext + a one-shot key fetch, the sub-agent fills the sensitive fields and dies. This is the "double security" pattern: the main agent never sees the PAN even in conversation history.
- **`checkout_steps`** — a plain list of instructions the main agent follows itself. The PAN passes through the main agent's context.

### Why the sub-agent path can't continue

`spawn_payload` was designed for **Claude Code**, which can spawn sub-agents as a first-class affordance. Almost no other agent runtime can:

- **OpenClaw** can't spawn isolated sub-agents.
- **OpenAI Operator / CUA** is a single-agent computer-use loop with no sub-agent primitive.
- **Anthropic Computer Use API** runs one model + one tool loop per request — sub-agents would need to be modeled by the caller (us) explicitly.
- **Perplexity Comet** runs as a Chromium browser with one agent driving it.
- **Browser-use / Stagehand / Skyvern** are single-agent frameworks; spawning a child means a whole new framework process, not a context isolation primitive.

So in practice `spawn_payload` is a Claude-Code-only path, and `checkout_steps` is the only mode that ever fires for everyone else — which is exactly the leak we were trying to avoid. The split-knowledge premise of v1 is no longer holding.

### What the rebuild needs to deliver

1. **Host-agnostic secret isolation.** The PAN/CVV must not enter the host LLM's context regardless of which agent is driving the checkout.
2. **A consistent surface across in-house and external agents.** We can't ship three completely different integrations for Claude / OpenClaw / Operator and pretend that's maintainable.
3. **Survives the agentic-payments network shift** described in §2. Whatever we pick must compose with (or be replaceable by) network-level agent tokens when those become real for our users.
4. **Stays compatible with the existing encrypted-card-file primitive.** The owner-side encryption story is a CreditClaw differentiator — we don't want to throw it away.

---

## 2. The 2026 agentic-payments landscape — context for the choice

Rail 5's whole reason for existing is that there was no clean way for an agent to pay a merchant. **That's changing fast in 2026**, and the choice of checkout mechanism should be made with the network-level shift in mind, not as if it's still 2024.

### Network-level: agent-bound payment tokens

Three converging stacks, all betting that the right answer is **a scoped, agent-bound token at the network**, not a real PAN typed into a form:

| Stack | Primitive | Status (May 2026) |
|---|---|---|
| **Stripe Shared Payment Token (SPT)** | Single-use, merchant-scoped, amount-bounded token from Stripe Link or saved PM. Powers OpenAI's "Buy in ChatGPT". Stripe Radar attached. | Live with Etsy, Instacart, Shopify (~1M merchants onboarding); SPTs extended to Mastercard Agent Pay + Visa ICC + Affirm in March 2026. |
| **Mastercard Agent Pay (Agentic Tokens)** | MDES token bound to a specific agent + merchant scope + consent policy. "Know Your Agent" (KYA) layer for agent identity. Verifiable Intent open-sourced. Real-time revocation via issuer app. | Launched Apr 2025; Microsoft/IBM/Braintree partners; live integration with Copilot Checkout in development. |
| **Visa Intelligent Commerce + ICC** | Multi-protocol on-ramp (ACP/MPP/UCP/TAP) via Visa Acceptance Platform. Token-vault-agnostic. Trusted Agent Protocol signs agent identity into HTTP headers (Cloudflare + Akamai support). | ICC launched Apr 8, 2026; TAP since Oct 14, 2025. |

The pattern is unambiguous: **the agent never holds raw card data**. The network/issuer mints a scoped token, the agent presents the token, and the merchant authorizes through their normal acquirer. This is *exactly* the problem Rail 5 was invented to solve, being solved at the rail one layer down from us.

### Protocol-level: how agents and merchants talk

| Protocol | Owner | Slice |
|---|---|---|
| **ACP** (Agentic Commerce Protocol) | OpenAI + Stripe, Apache 2.0, github.com/agentic-commerce-protocol | Checkout + cart + feed + SPT handoff. Spec versions Sep 2025 → Apr 2026. |
| **UCP** (Universal Commerce Protocol) | Google + Shopify + 20 partners (Adyen, AmEx, Mastercard, Stripe, Visa, Zalando, Walmart, …) | Capability discovery + checkout state machine (`incomplete` / `requires_escalation` / `ready_for_complete`). |
| **AP2** (Agent Payments Protocol) | Google + 60 partners → donated to FIDO Alliance | Cryptographic mandate chain: Intent Mandate → Cart Mandate → Payment Mandate. Hardware-key signed VDCs. Payment-method agnostic. |
| **TAP** (Trusted Agent Protocol) | Visa + Cloudflare + Akamai | Agent identity headers signed on HTTP requests so merchants can let agents in without blanket bot-blocking. |
| **MCP** | Anthropic | Agent-to-API layer. Used by PayPal/Stripe agent toolkits. |

Reality check: **OpenAI's Instant Checkout shipped to fewer than 30 of millions of Shopify merchants and was reportedly killed in March 2026**. So while the protocols are real, end-to-end merchant adoption is much slower than the press releases suggest. Browser-driving agents remain the dominant production reality for the next 12–24 months.

### Browser-agent layer: what's actually winning in production

Four mature browser-driving frameworks, all of which are real candidates for being either *the host* or *the integration target* for our checkout mechanism:

| Framework | Model | Notable for Rail 5 |
|---|---|---|
| **browser-use** (v0.12.9, May 26 2026) | Open-source Python, 79k★. LLM-agnostic. | Built-in `sensitive_data` placeholder system — LLM only ever sees `x_pan`, real values substituted at action time. Hard safety gate: requires `allowed_domains` or the Agent refuses to construct. |
| **Stagehand + Browserbase** | TypeScript SDK + hosted browser infra | Four primitives: `act/extract/observe/agent`. Auto-caching + self-healing on DOM changes. Production pattern is `agent` for exploration, atomic acts for critical paths (e.g. PAN fill). |
| **Skyvern 2.0** | Open-source, vision-first (screenshot + Vision-LLM, ignores DOM) | Planner/Actor/Validator architecture; specifically markets a "purchasing agent" for procurement. Engine-pluggable: can drive Claude Computer Use or OpenAI CUA underneath. |
| **Claude Computer Use** (`computer-use-2025-11-24` beta) | Anthropic-hosted, screenshot+coordinate | 72.5% on OSWorld in 2026, down to 50–60% on flaky UIs. Bills as image+token through normal API. Important for the June 15 2026 Agent SDK credit split. |

And the elephant: **Amazon vs. Perplexity Comet** (preliminary injunction Mar 2026, 9th Circuit stay pending appeal) is the precedent that will decide whether agents-as-users on real merchant sites is legally durable. This applies to *every* browser-driving option below.

### What this means for Rail 5 v2

- **The day Stripe SPT + Visa ICC + Mastercard Agent Pay are universally available** for our users' actual cards (probably 2027–2028), browser-fill becomes obsolete and Rail 5 collapses into an issuer-bridge.
- **Between now and then**, browser-driving agents on long-tail merchants is where the real volume is. Rail 5 v2 needs to be the best-in-class secret-handoff *for that window*, while being structured so we can swap in token-issuance underneath without a rewrite.
- **Rail 3 (Crossmint Card Permissions) is already a partial bet on the token path** — vault the real card once, issue scoped virtual cards per spend. Rail 5 v2 should be positioned as the *complement*: works on any owner card, no Crossmint vault, no merchant onboarding required.

---

## 3. The three replacement options

### Option A — Agent-platform plugins (the OpenClaw / Claude-plugin pattern)

**What it is.** A plugin that runs *inside* the host agent's runtime, exposing a single tool (`creditclaw_fill_card`) that takes a card-file path, fetches the one-shot key, decrypts in-memory, fills the fields, wipes the buffer. We already have this for OpenClaw (`public/Plugins/OpenClaw/`).

**How it isolates secrets.** The agent's tool call only carries the encrypted-blob path and a checkout ID. The plugin's process never returns the PAN to the model — it just returns success/failure. Memory wipe is enforced inside the plugin (already implemented as `wipeCardData` / `wipeBuffer`).

**Pros**
- Already works. The OpenClaw plugin is shipped.
- Strongest possible secret isolation — the plugin runs in a process the model can't introspect.
- Tightest UX inside each supported host (one-tool, one-call).

**Cons**
- **One plugin per agent platform.** Claude needs a Claude plugin, OpenAI Operator needs an Operator integration, Perplexity Comet needs a Comet extension, Cursor/Cline need their own MCP. Linear maintenance cost.
- Doesn't cover agents that can't load plugins (most computer-use agents, browser-use scripts, custom in-house builds).
- DOM-targeting logic (label heuristics, iframe patterns for Stripe/Braintree/Adyen) has to be re-implemented per host runtime.

**Coverage:** ~30–40% of agent volume in 2026 (Claude Code + OpenClaw + whatever next Anthropic-ecosystem plugin we build). Won't cover OpenAI/Perplexity/in-house headless agents.

**Build cost:** Marginal per new platform — each plugin is small. Total cost scales with how many platforms we choose to support.

---

### Option B — CreditClaw Chrome extension

**What it is.** A browser extension that registers a single content-script handler. The agent (whatever runtime it is, as long as it's driving a real Chromium) navigates to the checkout, then triggers our extension via a known signal — a custom DOM event, a postMessage to a known origin, or a click on a CreditClaw-injected "Fill with CreditClaw" button. The extension fetches the one-shot key, decrypts, fills the fields, wipes.

**How it isolates secrets.** The PAN exists only inside the extension's content-script context, which the host agent's process can't observe. The agent's job is reduced to "navigate to checkout, click the trigger" — no card data ever crosses the agent boundary.

**Pros**
- **Host-agnostic.** Works the same for Claude Computer Use, OpenAI Operator, Perplexity Comet, Stagehand, Skyvern, browser-use, raw Playwright — anything driving Chromium.
- Single codebase to maintain. DOM-targeting logic, iframe handling (Stripe/Braintree/Adyen/Checkout.com/Square), retry logic — all in one place.
- Visible install/uninstall + per-site permissions → cleaner consent story than embedding a card filler in someone else's plugin.
- Composes cleanly with B + C: a browser-use agent can be told "navigate to checkout, then click `[data-creditclaw=trigger]`" — `sensitive_data` isn't even needed because the PAN never enters the agent's loop.

**Cons**
- Owner has to install the extension. One-time, but a real onboarding step.
- **Headless / cloud-hosted browsers don't load consumer extensions easily.** Browserbase + Stagehand can load unpacked extensions per session, but it's per-session setup; not all hosted browser providers support it. Worth confirming for each.
- Chrome Web Store review can be slow and is opinionated about payment-handling extensions.
- Doesn't help if the agent is in a true sandboxed VM (Anthropic's recommended posture for Computer Use). For that case, A or C wins.

**Coverage:** ~70–80% of agent volume if we ship it well — every agent driving a real Chromium with the extension installed. Misses sandboxed-VM Computer Use, headless-only setups without extension support.

**Build cost:** Medium. ~2–4 weeks for a solid v1 — content script + background worker + onboarding flow + 1Password-style site recipes for the top 50 merchants' checkouts. Ongoing maintenance for new merchant checkout layouts is real.

---

### Option C — Browser-Use library `sensitive_data` integration

**What it is.** When the user is running a browser-use-based agent, we hand the agent (or instruct the agent to construct) a `sensitive_data` dict where the **keys are our placeholder names** (`x_pan`, `x_cvv`, `x_exp_month`, `x_exp_year`) and the **values are the decrypted real card numbers**, only at the moment the agent is about to drive checkout. The browser-use runtime substitutes values into the DOM at action-execution time; the LLM only ever sees the placeholder names.

The clever twist from the attached sketch: instead of decrypting on our server and shipping the plaintext to the agent process, **we ship the encrypted blob with placeholder-keyed values**, the agent's process decrypts locally (using the one-shot key fetched from our API), and constructs the `sensitive_data` dict. Browser-use's existing filter does the rest.

```python
# server hands the agent:
encrypted_card_data = {
  "x_pan":       "<aes-gcm ciphertext>",
  "x_cvv":       "<aes-gcm ciphertext>",
  "x_exp_month": "<aes-gcm ciphertext>",
  "x_exp_year":  "<aes-gcm ciphertext>",
}

# agent fetches one-shot key, decrypts in-process:
sensitive_data = decrypt_with_one_shot_key(encrypted_card_data, key_hex, iv_hex, tag_hex)
# {"x_pan": "4111...", "x_cvv": "123", ...}

agent = Agent(
    task="On the checkout page, fill the card number with x_pan, CVV with x_cvv, "
         "expiry month with x_exp_month, expiry year with x_exp_year, then submit.",
    sensitive_data=sensitive_data,
    use_vision=False,                            # critical — screenshots could leak PAN
    allowed_domains=["https://merchant.com"],    # required by v0.12.9 safety gate
    llm=ChatOpenAI(model="gpt-4.1-mini"),
)
await agent.run()
```

**How it isolates secrets.** Browser-use filters the `sensitive_data` values out of every LLM input — task prompt, observation, history. The LLM provider literally never receives the real PAN, only the placeholder keys. `use_vision=False` is mandatory because the substituted values *do* appear in screenshots. `allowed_domains` is the hard gate that prevents the substituted values from being typed on any other origin (browser-use ≥0.11 raises `InsecureSensitiveDataError` if you provide `sensitive_data` without `allowed_domains`).

**Pros**
- **Zero custom code on the browser side** — browser-use already implements the placeholder filter, log masking, domain scoping.
- The placeholder dict pattern is symmetric with our existing encrypted-card-file model. Our key-server API doesn't change; only what the agent does with the key changes.
- Inherits browser-use's hard safety gate (won't run without `allowed_domains`) — that gate is *better* than what Rail 5 v1 enforces today.
- Works inside sandboxed VMs (where extensions can't run), since browser-use brings its own Chromium.

**Cons**
- **Only covers agents using browser-use.** Doesn't help Claude Computer Use, OpenAI Operator (different framework), Perplexity Comet, Skyvern, Stagehand. We could replicate the pattern inside our own Stagehand/Skyvern wrappers, but that's "build A again, three times".
- The LLM provider still sees the agent's *reasoning* about the checkout page (DOM tree, current focus). If the model decides to verbalize "now I'll type the card number 4111..." after substitution happens — it can't, because substitution is post-LLM — but the page DOM after fill *will* show the PAN, and `use_vision=False` is the only thing keeping it out of vision-model input.
- Browser-use's `sensitive_data` is text-substitution-based; PAN fields that are inside cross-origin iframes (Stripe Elements, Braintree Hosted Fields) may not be reachable from the parent frame's content. Needs validation per processor.

**Coverage:** Whatever fraction of our users build agents on browser-use. Probably high for in-house and Python-shop in-house builds; near-zero for off-the-shelf Claude/OpenAI/Comet users.

**Build cost:** Low. Mostly documentation + a thin SDK wrapper that takes our encrypted card file + key fetch and returns a ready-to-use `sensitive_data` dict. Maybe a week.

---

## 4. Coverage matrix

| Host runtime | A. Plugin | B. Extension | C. browser-use |
|---|---|---|---|
| Claude Code (sub-agent capable) | ✅ (Claude plugin) | ✅ | ⚠️ wrapper needed |
| OpenClaw | ✅ (current) | ✅ | ⚠️ wrapper needed |
| Claude Computer Use API (sandbox VM) | — (no plugin host) | ⚠️ if VM has extension | ⚠️ wrapper needed |
| OpenAI Operator / CUA | — | ✅ | — |
| Perplexity Comet | ⚠️ Comet extension? | ✅ | — |
| Stagehand + Browserbase | — | ✅ per-session unpacked | ⚠️ different framework |
| Skyvern | — | ✅ if browser allows | ⚠️ different framework |
| **browser-use** scripts (in-house Python) | — | — | ✅ (native) |
| Raw Playwright / Puppeteer | — | ✅ | — |

**Read:** B covers the most surfaces. C is the cleanest for the browser-use-native slice. A is irreplaceable for hosts where the agent itself is a sandboxed first-class plugin host.

---

## 5. Recommended direction

**Ship B + C as the production v2 of Rail 5. Keep A alive for the OpenClaw/Claude-plugin slice we already serve.**

- **B (extension)** is the universal fallback — works for every browser-driving agent on a Chromium our extension can attach to. This is the surface we point external builders at first.
- **C (browser-use sensitive_data)** is the in-house standard for our own agents and for advanced users on browser-use. It's near-free to ship because browser-use does the heavy lifting; it gives us a clean Python story.
- **A (plugins)** stays as the deep integration for environments where plugin-style isolation is meaningfully stronger than extension or framework-level (Claude Code, OpenClaw). We don't expand the A footprint to new platforms — we let B and C cover them.

Sub-agent / `spawn_payload` is **removed** in v2. `checkout_steps` is removed as a user-visible mode (any "agent fills it directly" path is exactly the kind of leak the rebuild is supposed to eliminate). The encrypted-card-file primitive stays — it's what backs A, B, and C uniformly.

### Open architectural question

When B and C exist side-by-side, which one does the *agent* choose? Two reasonable models:

- **Owner-driven:** the owner picks "I use OpenAI Operator → use the extension" or "I'm a developer running browser-use → use the SDK" at setup, and the dashboard hands the agent the right shape.
- **Capability-detected:** the agent advertises its runtime in the checkout-start API call, and our server hands back the right payload (extension trigger token vs. `sensitive_data` ciphertext + decrypt instructions).

Capability-detected is more elegant but probably premature optimization. Start owner-driven.

---

## 6. Quickstart / validation before committing

The attached idea — *"build a quickstart prototype in Claude Code first, encrypt the placeholders, see if I can extract them correctly once decrypted"* — is the right call. Before building any of B/C as a real feature, validate the riskiest unknowns:

1. **Placeholder-decrypt round-trip in browser-use.** Spin up a vanilla browser-use script, hand it `encrypted_card_data` with placeholder keys, decrypt locally, pass to `Agent(sensitive_data=…)`, point it at a Stripe test page, confirm the test PAN actually lands in the iframe field and the LLM transcript shows only `x_pan`. This is a 1-day spike.
2. **Cross-origin iframe reachability.** Test the same flow against (a) Stripe Elements, (b) Braintree Hosted Fields, (c) Adyen Drop-in. If browser-use can't substitute into a Stripe Elements iframe via parent-frame text substitution, we need to know that *before* committing to C as a standalone path.
3. **Extension trigger in Browserbase.** Confirm we can load an unpacked Chrome extension into a Browserbase session and the extension fires on a content-script signal. This unlocks B for the entire Stagehand ecosystem.
4. **Plugin parity check.** Run the existing OpenClaw plugin against the same three checkouts as #2, document where the label-heuristic + iframe-pattern detection succeeds/fails. That diff tells us how much of the OpenClaw fill code is portable to the extension content script.

---

## 7. Wild ideas / alternative options

These are deliberately further out — direction-setting, not next-quarter work. Some of them would replace Rail 5 entirely; some compose with it.

### 7.1 Become an ACP / UCP merchant adapter ourselves

Instead of (or in addition to) helping agents pay our owners' cards on *other* merchants, **we become the checkout endpoint** for ACP/UCP-compliant agents. Owners' cards on file → CreditClaw issues SPT-equivalent tokens → agents call our `/checkout` and we charge the owner's card through a standard processor. This is a totally different posture (we become an issuer-ish thing, not a card-filler), but it puts us on the same standards layer as Stripe and PayPal for the agentic-commerce wave.

### 7.2 Issue Visa Intelligent Commerce tokens directly (Rail 3 → Rail 5 collapse)

Rail 3 already vaults the real card and issues scoped Crossmint OrderIntents per spend. If Visa ICC opens its tokenization APIs to non-issuers (currently it's behind acquirer relationships), we could **mint our own agent-bound Visa Agentic Tokens** without Crossmint in the middle, on any card the owner provides. That collapses Rail 3 and Rail 5 into a single "scoped network token per checkout" rail.

### 7.3 Hosted browser-session-as-a-service

CreditClaw runs the Chromium. Owner's external agent (Claude, GPT-4, whatever) connects via Chrome DevTools Protocol over WSS, drives our browser, and the **extension is pre-installed**, the **decryption happens inside our browser process**, and the **agent never sees the card at all** because the only thing reaching it is screenshots of the post-fill page (with the PAN masked by the extension before screenshot). This is Browserbase-shaped but with payments as the core differentiator. Heavy build, but it's the cleanest secret-isolation story possible.

### 7.4 AP2 mandate chain as the consent layer

Instead of (or alongside) our existing per-checkout-approval UX, the **owner signs an AP2 Intent Mandate** with a hardware-backed key (Touch ID, YubiKey, passkey) describing the scope ("buy up to $200 of office supplies from staples.com today"). Agent constructs a Cart Mandate and a Payment Mandate, signs the chain, presents it at our `/checkout`. We verify the cryptographic chain and only then release the card. Gives us a real-world consent artifact instead of a database row, and slots us into AP2's emerging cross-ecosystem trust layer (FIDO-governed since 2026).

### 7.5 Skyvern-style hosted purchase agent ("CreditClaw Shop Runner")

For owners who don't have an agent at all, we *are* the agent. Owner says "buy SKU-12345 from supplier.example.com, qty 50, charge my saved card". We spin up a Skyvern-engine purchase agent in our infra, run the Planner/Actor/Validator loop, fill via the extension, return the order confirmation. This is essentially us competing with Skyvern's purchasing agent directly, but with payments wired in natively. Big scope-creep — but it's the most direct way to capture procurement budget (Zip orchestrates $500B/yr, Skyvern is positioning into the same TAM).

### 7.6 Verifiable Intent attestations (Mastercard-compatible)

Reuse Mastercard's open-sourced Verifiable Intent spec (verifiableintent.dev) as our consent-receipt format. Every Rail 5 checkout produces a signed Verifiable Intent attestation that the owner can later verify, share with their bank for disputes, or feed into Mastercard's network if they ever need to make a claim. Costs us almost nothing to emit; gives us standards-aligned receipts for free.

### 7.7 Voice / phone-push step-up for high-value carts

Above an owner-configured threshold (say $250), the checkout pauses, sends a phone-push or a one-second voice-confirm prompt to the owner ("approve $312 at staples.com?"), and only releases the card on tap-confirm. Composes with all of A/B/C. Adds a real human-in-the-loop checkpoint where it matters and zero friction below threshold.

### 7.8 TAP-style HTTP identity headers for our outbound agent requests

If we end up running hosted agents (7.3 or 7.5), we should adopt Visa's Trusted Agent Protocol — sign agent identity into the HTTP headers of every outbound request, register the signing keys with Visa's directory. Merchants on Cloudflare/Akamai already verify these headers; we'd be a recognized "good bot" rather than getting bot-blocked. Free legitimacy.

### 7.9 Issuer-side card-on-file enrollment (skip the user-typed PAN entirely)

For owners who hold a Visa/Mastercard from a bank that supports Click to Pay or push provisioning, **enroll the card on the owner's behalf through the issuer's "card on file" API** — never asking the owner to type a PAN at all. Card details arrive at CreditClaw already tokenized; we never see the real PAN. Combines with Rail 3's "vault once, mint per-spend" model but pushes the vault one step closer to the issuer.

### 7.10 The legal-compliance hedge

Watch Amazon vs. Perplexity carefully. If the 9th Circuit upholds the injunction, every browser-driving option (B and C, and Comet/Operator wholesale) gets harder for retail merchants. The hedge is to make sure the **extension surface (B)** can be repositioned as "the owner is in the browser, the extension fills their saved card on the merchant's checkout" — which is functionally equivalent to a 1Password autofill and has 20+ years of legal precedent on its side. That framing might matter more than any technical choice we make.

---

## 8. Out of scope for this doc

- **Concrete v2 build plan.** Once a direction is locked, that lives in its own doc under `currently_building/rail5-v2/` (not in `_rail5_ideas/`).
- **Migration of existing Rail 5 v1 cards.** The encryption format doesn't change; only the checkout-time delivery does. Migration is a deployment concern, not a design one.
- **Pricing / fee structure** for any of the wild ideas (especially 7.1 / 7.3 / 7.5). Those become real questions only if we commit to one.
- **Rail 3 (Crossmint Virtual Cards) re-scoping.** Touched only in §7.2; the actual reshaping conversation happens in the Rail 3 docs once Rail 5 v2 direction is set.

---

## 9. References

- Rail 5 v1 operational doc: `rail5-overview_260309.md` (sibling folder).
- OpenClaw plugin source: `Plugins/OpenClaw/` (the canonical reference for A).
- Sub-agent v1 internal design: `_payment_build_ideas/260309-Double-security-Sub-agent-temp-encrypt.md`.
- browser-use sensitive_data docs: <https://docs.browser-use.com/examples/templates/sensitive-data>
- Anthropic Computer Use: <https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool>
- Stripe ACP + SPT: <https://www.agenticcommerce.dev/> · <https://github.com/agentic-commerce-protocol/agentic-commerce-protocol>
- Visa Intelligent Commerce + TAP: <https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22276.html>
- Mastercard Agent Pay + Verifiable Intent: <https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay.html> · <https://verifiableintent.dev/>
- Google UCP + AP2: <https://ap2-protocol.org/>
- Skyvern: <https://www.skyvern.com/>
- Stagehand: <https://www.browserbase.com/stagehand>
- Amazon vs. Perplexity: <https://www.pymnts.com/legal/2026/perplexity-asks-federal-court-to-lift-amazon-shopping-agent-ban/>
