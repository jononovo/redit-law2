# CreditClaw Context: Building Agentic Shopping Solutions

## Overview

This document outlines methods for managing sensitive data like credit card numbers and authentication details (usernames, passwords) with agents working in the browser.

## Core Security Requirements

Sensitive data must be protected in two ways:

1. **Encrypted at rest** - Secure in the agent file system so the agent never has direct access to plaintext
2. **Out of LLM context** - Never visible in the LLM conversation or prompts

These are separate but complementary security measures.

## Scope

While this document covers both authentication details and credit card details, the primary focus is on **credit card details** as the main initial objective.

**Goal:** Enable agents to shop securely with owner approvals using any physical credit card.

---

## Constraints

### PCI Compliance Limitations

We are not PCI compliant, therefore we cannot store certain digits of credit card details in our database.

**Our Solution:**
- User enters card details directly in the browser
- Card details are encrypted client-side in the browser
- Encrypted data is sent directly to the bot/agent for storage
- User is encouraged to download the encrypted file as backup or to pass to the agent

**What We Store:**
- Decryption key for encrypted data sent to agent
- Agent and owner information
- Permissible card details: PAN (first 4 digits & last 4 digits), expiry month/year, cardholder name, billing address
- Shipping address (optional)

---

## Checkout Flow Approaches

### Original Approach: Full Sub-Agent Checkout

The initial plugin design required the sub-agent to handle the entire checkout process, including entering all details.

**Issues Identified:**
- Sub-agent lacks the main agent's context
- Complex form filling leads to higher failure rates
- Sub-agent must explore the page (slower, less reliable)

### Minimalist Approach: 2-Field Entry

**Key Insight:** The main agent has significantly more context, making it better suited to complete most of the checkout process. The elements requiring encryption and security are minimal.

**Division of Labor:**

**Main Agent Handles (Non-Sensitive):**
- All form filling and checkout flow analysis
- Shipping details and options
- Payment options
- Additional requests and checkboxes
- Cardholder name
- Billing address
- Expiry date (month/year)
- ZIP code

**Why This Works:**
- Expiry date entry is often the trickiest part of checkout
- Main agent can verify with screenshots before sensitive data entry
- Higher success rate due to better context understanding

**Sensitive Fields (Require Protection):**
- **CAN** (Card Account Number / PAN) - 16-digit credit card number
- **CVV** (Card Verification Value) - 3-4 digit security code

---

## Main Agent Pre-Processing

To simplify secure entry for the sub-agent or plugin, the main agent performs the following:

### 1. Element Identification
- Identify unique input elements for CAN and CVV fields
- Map HTML structure and element references (e.g., @e5, @e7)
- Document field names and attributes

### 2. Field Verification
- Test fields by entering data
- Verify data appears in correct field (even if masked with "***" or symbols)
- Clear test data after verification

### 3. Field Testing Strategy
To verify fields work correctly without risking actual submission:

**Partial Data Entry Testing:**
- Main agent enters intentionally incomplete data:
  - CVV field: Only 2 digits instead of 3
  - CAN field: Only 12 digits instead of 16
- This prevents automatic form validation from enabling submit button
- Verifies data appears in correct field (even if masked with "***")
- Allows screenshot verification before sensitive data entry

**Why This Matters:**
- Some sites (e.g., Shopify) use double iframes specifically to restrict bot purchasing
- Testing with partial data identifies field behavior without triggering security measures
- Main agent can verify field accessibility before sub-agent handles sensitive data

**Alternative Approaches:**

**Option A - Partial Pre-fill:**
- Main agent enters first 6 digits of PAN
- Sub-agent fills remaining 10 digits
- *Risk:* Potential complications with duplication or incorrect positioning

**Option B - Verification Only (Recommended):**
- Main agent verifies fields work with test data
- Clears all test data completely
- Sub-agent pastes complete value without conflict risk

**Consideration:** Option B is safer despite being slightly slower, as it avoids any danger of duplication or replacing digits in wrong locations.

---

## Security Implementation

### Data Flow

1. **Encryption:** Card details encrypted client-side in browser
2. **Transmission:** Encrypted file sent directly to agent
3. **Storage:** Agent stores encrypted file (no decryption capability)
4. **Checkout:** Agent requests decryption key from CreditClaw API
5. **Temporary Access:** Time-bounded decryption for transaction only
6. **Cleanup:** Automatic memory clearing after use

### Key Principles

- **Main agent never sees card data** - only handles UI complexity
- **Sub-agent is dumb executor** - no exploration, only precise actions
- **Temporary decryption** - keys are single-use and time-limited
- **No screenshots during entry** - vision disabled for sensitive fields
- **Automatic cleanup** - decrypted data cleared from memory immediately

---

## Implementation Options

### OpenClaw Options

#### 1. SecretRefs
OpenClaw has an in-built vault for secrets that uses placeholders to prevent sensitive data from entering the agent context. However, this only protects against LLM visibility - the data is still present in the agent's code and memory.

#### 2. Sub-Agents
OpenClaw provides specific instructions to spawn, instruct, and kill sub-agents. This architecture is ideal for sensitive browser operations:

**Benefits:**
- **Screenshots for verification:** Can capture screenshots to confirm correct entry while keeping them out of main agent context
- **Decrypted card details isolation:** Sub-agent calls CreditClaw API for decryption key, decrypts file from temporary storage, and enters details in browser - main agent never sees decrypted data
- **Process isolation:** Sensitive operations compartmentalized from main agent

#### 3. Plugins
OpenClaw recently introduced plugins with additional mechanisms that could potentially:
- Handle API calls for decryption
- Manage card details decryption
- Perform form entry for purchase
- Handle verification programmatically

**Challenges:**
- Verification and screenshot handling may be difficult
- Alternative: Plugin could provide stronger harness to manage sub-agents and approvals rather than handling everything directly

### Claude Coworker Options

**Setup Requirements:**
- Requires Chrome browser extension (not in official Chrome marketplace)
- Takes extra clicks to install
- Plugins can be used across all Claude conversations (chat, coworker, code)

**Security Feature:**
- Command available to remove sensitive details (like card numbers) from LLM context right before "compaction" (when conversation is compressed due to size)
- This happens automatically for most conversations as they grow

### Browser Extensions

**Custom Extension Approach:**
- Could create proprietary extension installable on any Chromium browser (Chrome, Brave, etc.)
- Would need verification for browser compatibility
- Potential for universal deployment across different agent platforms

---

## Browser Control Considerations

**Core Challenge:** Our goal is to create a tool that allows other people's agents to shop for them. This means:

1. **Heterogeneous Agent Landscape:** Other agents have their own browser control abilities - some highly optimized, others inefficient
2. **Variable Methodologies:** Browser control may use screenshots, DOM inspection, annotation, or accessibility trees
3. **Model Quality Impact:** Success heavily depends on the quality of the model being used
4. **Cost vs Success Trade-off:** Entire flow success is impacted by efficiency, token costs, and agent browser control success rates

**Implications:**
- Need flexible architecture that works with varying agent capabilities
- Must optimize for both high-performance and basic agents
- Token efficiency directly impacts viability for end users

---

## Future Considerations

### Field Verification Strategy

**Question:** Should main agent perform dry-run testing of CAN/CVV fields?

**Options:**
1. **Identification only:** Map refs and trust they work
2. **Dry run:** Enter fake data, verify, clear
3. **Partial entry:** Enter partial data, verify, let sub-agent complete

**Trade-offs:**
- Dry run = more reliable but slower
- Identification only = faster but riskier
- Partial entry = balance but complex

### Anti-Bot Measures

Some sites (e.g., Shopify) use double iframes specifically to restrict bot purchasing. Main agent testing can help identify and work around these protections.

### Testing Requirements

There is significant testing needed to determine the optimal balance between security and speed:
- Whether field identification alone is sufficient
- Whether main agent should perform test runs/dry runs
- Optimal partial entry strategies
- Cross-site compatibility for different checkout flows

---

## CreditClaw Shopping Skill Architecture

### Agent Recommendation System
To help other agents shop successfully, CreditClaw may need to provide:
- **Setup recommendations** - What browser tools, reels, or configurations to use
- **Browser control tips** - Best practices for efficient automation
- **Tool selection guidance** - Matching agent capabilities with appropriate tools

This advisory role ensures agents using CreditClaw have the best chance of success regardless of their underlying capabilities.

### Analysis Engine
The expanded CreditClaw shopping skill includes an **analysis engine** that:
- Determines what type of checkout is being used (Shopify, WooCommerce, custom, etc.)
- Provides agents with better advice on field identification
- Recommends optimal approaches for each checkout type
- Maximizes efficiency and success rates for both ordering and checkout processes

**Note:** Ordering and checkout are treated as separate processes with different optimization strategies.

### E-Commerce Provider Skills
CreditClaw maintains specialized skills for major e-commerce providers:
- Separate skill folders for each provider (Shopify, WooCommerce, Magento, etc.)
- Provider-specific checkout strategies
- Custom field mappings and automation patterns
- Located in the public folder of the repository

### Specialized Shopping Agent Service

**Vision:** CreditClaw could evolve from a payment tool to a full shopping service:

#### Phase 1: Information Service (Firecrawl-like)
If users store their details (authentication, credit cards) in CreditClaw:
- CreditClaw agent interacts with other agents
- Serves back relevant shopping information
- Acts as a specialized shopping data provider

#### Phase 2: Purchase Execution
When user wants to make a purchase:
- Trigger approval request through CreditClaw
- CreditClaw agent executes the purchase
- Acts as a specialized shopping and checkout agent

#### Phase 3: Memory and Optimization
The specialized agent maintains:
- **Shop history** - Which stores, what worked, what didn't
- **Checkout tips** - Site-specific automation strategies
- **Efficiency patterns** - Optimal approaches per merchant
- **Owner preferences** - Individual shopping patterns and preferences

**Interaction Model:**
- CreditClaw agent talks directly with user's agent (ChatGPT, Claude, etc.)
- User converses with their preferred agent
- CreditClaw handles the specialized shopping/checkout execution
- Seamless handoff between conversation and purchase

**Evolution:**
- Started: Payment facilitation and tips
- Evolved: Shopping advisory service
- Future: Full specialized shopping and checkout agent with memory and optimization

---

## Recommended Browser Control Tools

### Primary Tools
Based on research and testing, these tools show the most promise:

1. **agent-browser** (agent-browser-clawdbot)
   - Accessibility tree snapshots
   - Ref-based element selection (@e1, @e2)
   - Fast, deterministic automation
   - Good for known workflows

2. **browser-use** (browser-use-pro)
   - AI-powered natural language control
   - LLM-driven step-by-step execution
   - Good for complex, unknown sites
   - Built-in credential handling (with limitations)

3. **CLI Browser Tools**
   - Command-line browser control
   - Fast iteration and debugging
   - Good for scripting and automation

### Tips, Skills, and Best Practices

#### 1. Playwright Efficiency Flag
Playwright (underlying many browser tools) has an `--efficient` flag that:
- Reduces resource consumption
- Speeds up element detection
- Improves overall performance
- **Recommendation:** Always use for production automation

#### 2. Chrome DevTools Protocol (CDP)
Latest Chrome/Chromium versions include enhanced CDP support:
- Gives agents much more browser control
- Requires developer controls to be enabled
- Provides deeper access to browser internals
- **Note:** Check if available in target browser version

#### 3. Model Selection Impact
Browser control success heavily depends on:
- Model quality and reasoning ability
- Token efficiency (cost per action)
- Vision capabilities (if using screenshot-based control)
- Context window size (for complex multi-step flows)

**Recommendation:** Test with multiple models to find optimal cost/success balance.

---

## Summary

CreditClaw's evolution from payment facilitator to specialized shopping agent represents a significant expansion in capability. The architecture balances:

- **Security** - Encrypted data, sub-agent isolation, temporary decryption
- **Flexibility** - Works with heterogeneous agent landscape
- **Efficiency** - Analysis engine, provider-specific skills, memory/optimization
- **Usability** - Minimalist approach, clear division of labor, advisory services

The minimalist 2-field entry approach combined with the reverse agent pattern (main agent analysis → sub-agent execution) provides the optimal balance of security, success rate, and efficiency for agentic shopping.

**Next Steps:** Continue testing field verification strategies, expand provider-specific skills, and refine the specialized shopping agent service model.