# Technical Summary: Agentic Shopping & Secure Checkout Patterns

**Date Range:** March 17 - April 11, 2026  
**Context:** Research and design for CreditClaw's agentic shopping solution with secure credit card handling

---

## 1. Browser Automation Skills

### 1.1 Cloudflare Webhook Skill
**Context:** Initial research into webhook capabilities for receiving payment confirmations and external service callbacks.

**Key Findings:**
- Single-file skill documentation (SKILL.md only)
- Creates public HTTPS endpoints via Cloudflare Quick Tunnel
- No account or DNS configuration required
- Useful for receiving async payment confirmations from Stripe, CreditClaw, etc.

**Benefits:**
- Zero-config public URLs
- Automatic HTTPS
- Good for webhook endpoints that don't exist yet

**Downsides:**
- URL changes on restart (requires re-registration)
- Not for production (use named tunnels for prod)
- Single file = no pre-built implementation, just instructions

### 1.2 Agent Browser (agent-browser-clawdbot)
**Context:** Installed as primary browser automation tool for AI agents with accessibility tree snapshots.

**Key Capabilities:**
- Accessibility tree snapshots with ref-based element selection (@e1, @e2)
- Deterministic element targeting vs. flaky CSS selectors
- Session isolation for multi-user testing
- State persistence (save/load cookies, localStorage)
- Network control (block/mock requests)

**Benefits:**
- Fast performance for multi-step workflows
- Precise element selection via refs
- Good for complex SPAs and anti-bot sites
- Session isolation for parallel testing

**Downsides:**
- Requires separate installation from built-in browser tool
- Overkill for simple screenshot tasks
- Learning curve for ref-based workflow

### 1.3 Browser-Use (browser-use-pro)
**Context:** Installed as AI-powered browser automation for complex multi-step workflows.

**Key Capabilities:**
- Natural language task descriptions
- LLM-driven step-by-step browser control
- `sensitive_data` parameter for credential security
- Vision capabilities (screenshots for AI analysis)
- Real Chrome CDP mode for anti-bot sites

**Benefits:**
- Natural language task descriptions
- Handles complex 5+ step sequences
- Good for anti-bot sites with real Chrome
- Built-in credential handling via `sensitive_data`

**Downsides:**
- **CRITICAL:** `sensitive_data` does NOT keep values out of agent context
- Values are still in Python code/memory
- Only prevents LLM from seeing values in task descriptions
- Costs money (LLM calls per step)
- Slower than deterministic tools

---

## 2. Sub-Agent Patterns & Session Management

### 2.1 Sessions vs Sub-Agents
**Context:** Clarifying the difference between sessions (conversation containers) and sub-agents (separate AI instances).

**Key Distinction:**
- **Sessions:** Conversation threads/workspaces (can contain main agent OR sub-agents)
- **Sub-agents:** Separate AI instances with own memory, context, decision-making
- **Sessions are agent-specific:** Cannot transfer session context to sub-agents

**Benefits:**
- Clear separation of concerns
- Parallel execution possible
- Isolated failure domains

**Downsides:**
- No direct session handoff
- Context must be explicitly passed via messages/files
- Communication is asynchronous

### 2.2 The Reverse Pattern (Main Agent Analysis → Sub-Agent Execution)
**Context:** Designed for CreditClaw's secure checkout flow where main agent handles complexity, sub-agent handles sensitive data.

**Pattern:**
```
Main Agent (Complexity Handler):
├── Explores checkout page
├── Identifies all form fields
├── Maps element refs (@e5, @e7)
├── Fills non-sensitive fields (name, address, expiry)
├── Tests field interactions
├── Documents methodology
└── Creates precise instructions for sub-agent

Sub-Agent (Secure Executor):
├── Receives encrypted card data file
├── Requests decryption key from secure endpoint
├── Decrypts temporarily
├── Fills only sensitive fields (PAN, CVV)
├── Clears decrypted data from memory
└── Reports success/failure
```

**Benefits:**
- **Main agent never sees card data** - only handles UI complexity
- **Sub-agent is dumb executor** - no exploration, just precise actions
- **Predictable results** - exact instructions = exact outcomes
- **Faster execution** - no exploration overhead
- **Easier debugging** - if fails, specific instruction failed
- **Compromise isolation** - if sub-agent compromised, main agent credentials safe

**Downsides:**
- Requires two agent instances
- Context transfer overhead (messages/files)
- More complex orchestration
- Need secure key management for decryption

**CreditClaw Application:**
- Main agent: "I've identified the CVV field at ref @e7. Here's your mission..."
- Sub-agent: Receives encrypted file + key endpoint, fills @e7, reports success

---

## 3. Secure Credential Management

### 3.1 OpenClaw SecretRefs
**Context:** Research into OpenClaw's built-in secrets management for API keys and credentials.

**What It Actually Is:**
- Reference-based system (not encryption)
- Secrets resolved at runtime from providers
- In-memory only after resolution

**Three Provider Types:**
1. **Environment Variables:** `{"ref": "env:API_KEY"}`
2. **File-based:** JSON file with permission validation
3. **External Exec:** Calls vaults (HashiCorp, AWS Secrets Manager)

**Benefits:**
- No plaintext in config files
- Automatic resolution at startup
- Fail-fast if secrets unavailable
- Audit logging (access, not values)

**Downsides:**
- **NOT encrypted** - relies on provider security
- Values still loaded into agent memory
- File permissions only protection for file provider
- Not suitable for card numbers (still in context)

**Verdict for CreditClaw:** Good for API keys, NOT for card numbers.

### 3.2 The Real Security Problem
**Context:** Realization that `sensitive_data` and SecretRefs don't solve the core issue.

**The Issue:**
```python
# This is NOT secure:
agent = Agent(
    task="Fill card with card_placeholder",
    sensitive_data={"card_placeholder": "1234567890123456"}  # VISIBLE IN CODE!
)
```

**What `sensitive_data` Actually Does:**
- ✅ LLM only sees placeholder in task description
- ❌ Value is STILL in Python code
- ❌ Value is STILL in memory
- ❌ Value can be logged on errors

**True Requirements for Card Data:**
1. **Encrypted at rest** - never stored plaintext
2. **Out of LLM context** - never in prompts
3. **Out of agent context** - main agent never sees values
4. **Temporary decryption** - only during execution
5. **Automatic cleanup** - memory cleared after use

### 3.3 CreditClaw's Ephemeral Decryption System
**Context:** Leveraging CreditClaw's existing secure infrastructure for card data.

**How It Works:**
```
1. Card details encrypted in browser (user enters, client-side encryption)
2. Encrypted file sent to agent (agent never sees plaintext)
3. Agent stores encrypted file (safe to store, can't decrypt alone)
4. At checkout: Agent requests decryption key from CreditClaw API
   - Key is single-use, time-limited (5 min max)
   - Requires owner approval
   - Server-side validation of transaction
5. Agent decrypts temporarily, fills fields, clears memory
6. Key invalidated automatically
```

**Benefits:**
- Agent never has decryption key permanently
- Key only issued per approved transaction
- Time-bounded access (expires automatically)
- Server-side audit trail
- Compromised agent file = useless (encrypted data only)

**Downsides:**
- Requires CreditClaw API availability
- Network latency for key retrieval
- Need robust error handling for key failures

---

## 4. Vision Security Patterns

### 4.1 Vision Toggle for Sensitive Data Entry
**Context:** Preventing screenshots of card numbers during browser automation.

**Pattern:**
```python
# Phase 1: Sensitive entry (vision OFF)
agent_sensitive = Agent(
    task="Fill PAN and CVV fields",
    sensitive_data={"pan": decrypted_pan, "cvv": decrypted_cvv},
    use_vision=False  # No screenshots
)

# Phase 2: Verification (vision ON)
agent_verify = Agent(
    task="Submit and verify confirmation",
    use_vision=True  # Screenshots OK now
)
```

**Benefits:**
- No screenshots of card data
- Can still verify success after submission
- Simple toggle mechanism

**Downsides:**
- Two-phase execution
- Can't visually debug during sensitive entry
- Still need secure data handling (vision off ≠ data secure)

---

## 5. CreditClaw Checkout Flow Design

### 5.1 Original Approach (Full Sub-Agent Checkout)
**Context:** Initial design where sub-agent handled entire checkout.

**Issues Identified:**
- Sub-agent lacks main agent's context
- More complex form filling = higher failure rate
- Sub-agent needs to explore (slower, less reliable)

### 5.2 Minimalist Approach (2-Field Entry)
**Context:** Optimized design where main agent handles everything except PAN/CVV.

**Division of Labor:**

**Main Agent (High Context):**
- Explores checkout page structure
- Identifies ALL form fields
- Fills non-sensitive fields:
  - Cardholder name
  - Billing address
  - Expiry date (month/year)
  - ZIP code
  - Shipping options
  - Checkboxes (terms, newsletters)
- Tests field interactions
- Identifies PAN field ref (@e5)
- Identifies CVV field ref (@e7)
- Verifies fields work (dry run with fake data)
- Documents exact methodology

**Sub-Agent (Secure Executor):**
- Receives encrypted card file
- Requests decryption key from CreditClaw
- Decrypts temporarily
- Fills ONLY:
  - PAN field (@e5) with 16 digits
  - CVV field (@e7) with 3-4 digits
- Clears decrypted data
- Reports success

**Benefits:**
- Main agent's context = higher success rate
- Minimal sensitive data exposure
- Faster execution (no exploration in sub-agent)
- Easier to secure (only 2 fields to protect)

**Advanced Techniques:**
- Main agent can enter first 6 digits of PAN (BIN) to validate field
- Test CVV field with 2 digits (fails validation, proves field works)
- Screenshot verification before sensitive entry
- Handle double iframes (Shopify anti-bot)

---

## 6. Key Technical Decisions

### 6.1 Browser Tool Selection
**Decision:** Use agent-browser-clawdbot for deterministic automation, browser-use for complex AI-driven tasks.

**Rationale:**
- agent-browser: Fast, precise, good for known workflows
- browser-use: Flexible, good for unknown/complex sites
- Hybrid: Main agent uses browser-use for exploration, sub-agent uses agent-browser for precise execution

### 6.2 Sub-Agent vs Direct Execution
**Decision:** Use sub-agent pattern for ANY sensitive data handling.

**Rationale:**
- Compromise isolation
- Clear security boundaries
- Easier to audit and restrict

### 6.3 Encryption Strategy
**Decision:** Client-side encryption in browser, server-side key management.

**Rationale:**
- PCI compliance (we don't store full PAN)
- User owns encrypted backup
- CreditClaw controls decryption keys
- Time-bounded access

### 6.4 Vision Security
**Decision:** Disable vision during sensitive entry, re-enable for verification.

**Rationale:**
- Prevents screenshots of card data
- Still allows visual confirmation of success
- Simple implementation

---

## 7. Open Questions & Future Research

### 7.1 Field Verification Strategy
**Question:** Should main agent do dry-run testing of PAN/CVV fields before sub-agent execution?

**Options:**
1. **Identification only:** Map refs, trust they work
2. **Dry run:** Enter fake data, verify, clear
3. **Partial entry:** Enter first 6 digits, verify, let sub-agent complete

**Trade-offs:**
- Dry run = more reliable but slower
- Identification only = faster but riskier
- Partial entry = balance but complex

### 7.2 Error Handling
**Question:** How to handle sub-agent failures without exposing card data in error logs?

**Considerations:**
- Sub-agent should report: "Field @e7 fill failed" not "Card 1234... failed"
- Main agent should interpret generic errors
- Retry logic without re-decryption

### 7.3 Multiple Card Support
**Question:** How to handle users with multiple cards?

**Options:**
1. Separate encrypted files per card
2. Single file with multiple encrypted entries
3. CreditClaw manages card selection

### 7.4 Browser Fingerprinting
**Question:** How to handle sites with advanced bot detection?

**Considerations:**
- Real Chrome CDP mode (browser-use)
- Proxy rotation
- Human-like delays
- Session persistence

---

## 8. Security Checklist

### For Card Data:
- [ ] Encrypted at rest (client-side encryption)
- [ ] Never in LLM context (placeholders only)
- [ ] Never in main agent context (sub-agent only)
- [ ] Temporary decryption (time-bounded)
- [ ] Automatic memory cleanup
- [ ] No screenshots during entry (vision off)
- [ ] Audit trail (server-side logging)
- [ ] Single-use decryption keys

### For Authentication:
- [ ] SecretRefs for API keys (acceptable risk)
- [ ] Separate encrypted storage for passwords
- [ ] Same sub-agent pattern for sensitive auth

---

## 9. Summary

**Core Insight:** The "reverse pattern" (main agent analysis → sub-agent execution) is the key architectural decision for secure agentic shopping. Main agent handles UI complexity and context, sub-agent handles only the minimal sensitive data entry with temporary, time-bounded access to decrypted card details.

**Critical Realization:** `sensitive_data` parameters and SecretRefs do NOT provide true security for card numbers - they only keep values out of LLM prompts. True security requires encrypted storage + temporary decryption + sub-agent isolation.

**Recommended Stack:**
- **Main Agent:** browser-use for exploration, agent-browser for precise mapping
- **Sub-Agent:** agent-browser for deterministic execution
- **Security:** CreditClaw ephemeral decryption + vision toggle
- **Storage:** Client-side encrypted files + server-side key management

---

*Document created for CreditClaw product development. Focus: secure agentic shopping with credit card handling.*