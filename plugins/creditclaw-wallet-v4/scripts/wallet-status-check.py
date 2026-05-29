#!/usr/bin/env python3
"""
SessionStart hook: Wallet Status Check

On session start, checks if CREDITCLAW_API_KEY is set and injects
a context reminder about wallet capabilities.

If the API key is present, this hook reminds the agent that CreditClaw
wallet management is available. Actual API calls to check status should
be done by the agent when the user requests wallet-related actions.
"""

import json
import os
import sys


def main():
    api_key = os.environ.get("CREDITCLAW_API_KEY", "")

    if api_key:
        context = (
            "CreditClaw wallet is configured (API key present). "
            "Wallet management, secure checkout, vendor discovery, and "
            "storefront capabilities are available. "
            "Check GET /bot/status and GET /bot/messages if the user "
            "asks about wallet status or pending notifications."
        )
    else:
        context = (
            "CreditClaw wallet plugin is installed but no API key is configured. "
            "If the user wants to set up a wallet, use the wallet skill to "
            "register at POST /bots/register and save the returned API key "
            "as CREDITCLAW_API_KEY."
        )

    output = {
        "hookEventName": "SessionStart",
        "hookSpecificOutput": {
            "additionalContext": context
        }
    }
    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
