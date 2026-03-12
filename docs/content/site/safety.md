# Safety & Security

CreditClaw is built with security at every layer. Your money, your cards, your data — all protected by enterprise-grade infrastructure.

## Security Features

### Stripe-Powered Payments
All payments processed through Stripe — PCI-DSS Level 1 certified. Your card details are stored by Stripe, never on our servers. Tokenized for every transaction.

### Encrypted Everything
256-bit TLS encryption on every request. Session cookies are httpOnly with strict same-site policies. API keys are bcrypt-hashed with prefix-based lookup.

### Spending Guardrails
Per-transaction, daily, and monthly caps enforced server-side on every purchase. Category blocking, approval workflows, and threshold-based auto-approve.

### Instant Freeze
One click to pause all bot spending. Instantly. No calls, no support tickets. Unfreeze just as fast when you're ready.

### Full Audit Trail
Every transaction, every API call, every webhook delivery — logged and visible in your dashboard. Access logs capture endpoint, method, status, IP, and response time.

### Real-Time Alerts
Notifications for every purchase, decline, and balance change. Email + in-app. Suspicious activity alerts are always sent — no opt-out for safety-critical events.

## Infrastructure Partners

- **Stripe** — Payment processing. PCI-DSS Level 1, fraud detection, tokenized storage.
- **Google Cloud** — Authentication. Google-grade auth, session management, OAuth providers.
- **Privy** — Wallet infrastructure. Server wallets, embedded auth, Base chain integration.
- **CrossMint** — Smart wallets. NFT commerce, smart contract wallets, Amazon integration.
- **Bridge** — Crypto transfers. Stablecoin payments, fiat-to-crypto rails, cross-border transfers.
- **Circle** — Stablecoin infrastructure. USDC issuance, programmable wallets, compliance.

## Card Security Models

### Split-Knowledge (Rail 4)
Your card details are split so that CreditClaw never has access to the complete card number. Obfuscation and decoy data add additional layers of protection.

### End-to-End Encryption (Rail 5)
Card files are encrypted client-side with AES-256-GCM before leaving your browser. CreditClaw stores only the decryption key. At checkout, a disposable sub-agent gets the key, decrypts, pays, and is immediately deleted.
