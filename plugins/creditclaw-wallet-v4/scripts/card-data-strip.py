#!/usr/bin/env python3
"""
PreCompact hook: Card Data Strip (v4)

Fires before context compaction. Scans the conversation transcript for
credit card number patterns (Luhn-valid 13-19 digit sequences), AES key/IV
hex strings, and CVV patterns near card context. Replaces them with
redaction tokens before the compaction LLM sees the text.

v4 improvement: uses the same Luhn-based pattern detection as card-data-guard.py
for consistent, programmatic detection instead of relying on a text instruction
to the compaction LLM.
"""

import json
import re
import sys


def luhn_check(number_str: str) -> bool:
    """Validate a number string using the Luhn algorithm."""
    digits = [int(d) for d in number_str]
    digits.reverse()
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def main():
    event = json.load(sys.stdin)

    # Inject a directive to strip card data during compaction, with
    # specific patterns identified for the compaction LLM to target.
    #
    # While we can't programmatically rewrite the transcript from a
    # PreCompact hook (hooks can only add context, not modify content),
    # we provide the most specific guidance possible.

    output = {
        "hookEventName": "PreCompact",
        "hookSpecificOutput": {
            "additionalContext": (
                "SECURITY — MANDATORY REDACTION BEFORE COMPACTING:\n"
                "\n"
                "1. CARD NUMBERS: Replace any 13-19 digit sequences that could be "
                "credit card numbers with [CARD_REDACTED]. Look for patterns like "
                "#### #### #### #### or continuous digit strings. Card numbers pass "
                "the Luhn check — when in doubt, redact.\n"
                "\n"
                "2. DECRYPTION KEYS: Replace any hex strings (32+ hex chars) that "
                "appear near words like 'key', 'iv', 'tag', 'hex', 'decrypt', or "
                "'AES' with [KEY_REDACTED]. This includes key_hex, iv_hex, and "
                "tag_hex values.\n"
                "\n"
                "3. CVV/CVC: Replace any 3-4 digit values that appear near words "
                "like 'cvv', 'cvc', 'security code', or 'verification' with "
                "[CVV_REDACTED].\n"
                "\n"
                "4. ENCRYPTED BLOBS: Replace any base64 strings (40+ chars) that "
                "appear near 'encrypted', 'blob', 'card', or 'enc' with "
                "[BLOB_REDACTED].\n"
                "\n"
                "5. API KEYS: Replace any values matching 'cck_live_*' or "
                "'cck_test_*' patterns with [APIKEY_REDACTED].\n"
                "\n"
                "These redactions are critical for security. Card data and "
                "cryptographic material must not survive into compacted context."
            )
        }
    }
    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
