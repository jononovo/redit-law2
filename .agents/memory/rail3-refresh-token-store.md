---
name: Rail 3 refresh-token store (plaintext, by decision)
description: Why Firebase refresh tokens for headless rail3 bot checkout are stored plaintext and encryption was declined.
---

Headless rail3 bot checkout mints a fresh Firebase ID token from a per-owner refresh token (`getFreshIdToken` exchanges the stored token with Google securetoken). The refresh token is stored as **plaintext** in `owners.firebase_refresh_token`.

**Decision:** app-layer encryption (the original "encrypted store" plan) was **intentionally declined**. The `OWNER_REFRESH_TOKEN_ENCRYPTION_KEY` secret is unused, not set, and should NOT be added. The full encrypted-design plan doc was deleted to stop confusing future agents; the plaintext decision record is the `…-MINIMAL.md` doc in rail3 `_completed/`.

**Why:** provider disk encryption + DATABASE_URL-gated access were judged sufficient at this stage; an encryption key adds a re-auth-everyone failure mode (lost key) for limited real-world gain.

**How to apply:** do not re-introduce app-layer encryption or the encryption key without an explicit ask. Failure mode when a token is absent/stale = `412 reauth_required` (owner re-signs in to repopulate). Only open item on this path: live in-app prod E2E.
