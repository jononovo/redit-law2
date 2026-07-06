import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { extractEncryptedBlob, decryptCard, wipeCardData } from "./decrypt";
import { getDecryptionKey } from "./api";
import { fillCardFields } from "./fill-card";
import type { CardData } from "./decrypt";
import type { FillResult } from "./fill-card";

interface FillCardParams {
  checkout_id: string;
  card_file_path: string;
  frame_hint?: string;
}

function wipeBuffer(buf: Buffer): void {
  buf.fill(0);
}

export default definePluginEntry({
  id: "creditclaw",
  name: "CreditClaw",
  register(api) {
    api.registerTool({
      name: "creditclaw_fill_card",
      description:
        "Securely fills card number and CVV fields on a checkout page. " +
        "Decrypts the card internally — the agent never sees card data. " +
        "Does NOT click submit — the agent handles submission and result detection.",
      parameters: {
        type: "object",
        properties: {
          checkout_id: {
            type: "string",
            description: "Approved checkout ID from POST /bot/rail5/checkout",
          },
          card_file_path: {
            type: "string",
            description:
              "Path to encrypted card file (e.g. .creditclaw/cards/Card-ChaseD-9547.md)",
          },
          frame_hint: {
            type: "string",
            description:
              "Optional CSS selector for payment iframe (e.g. iframe[src*='stripe.com']). " +
              "Omit if card fields are on the main page.",
          },
        },
        required: ["checkout_id", "card_file_path"],
      },
      execute: async (params: FillCardParams): Promise<FillResult> => {
        const apiKey = process.env.CREDITCLAW_API_KEY;
        if (!apiKey) {
          return {
            status: "error",
            reason: "missing_api_key",
            message: "CREDITCLAW_API_KEY environment variable is not set.",
          };
        }

        let encryptedData: Buffer | null = null;
        let keyMaterial: { key_hex: string; iv_hex: string; tag_hex: string } | null = null;
        let card: CardData | null = null;

        try {
          try {
            encryptedData = extractEncryptedBlob(params.card_file_path);
          } catch {
            return {
              status: "error",
              reason: "card_file_error",
              message: "Could not read or parse the encrypted card file. Verify the file path and format.",
            };
          }

          try {
            keyMaterial = await getDecryptionKey(params.checkout_id, apiKey);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Key retrieval failed.";
            return {
              status: "error",
              reason: "key_retrieval_failed",
              message: msg,
            };
          }

          try {
            card = decryptCard(
              encryptedData,
              keyMaterial.key_hex,
              keyMaterial.iv_hex,
              keyMaterial.tag_hex
            );
          } catch {
            return {
              status: "error",
              reason: "decryption_failed",
              message: "Card decryption failed. The key material may not match this card file.",
            };
          }

          const browser = api.runtime.browser;
          try {
            return await fillCardFields(browser, card, params.frame_hint);
          } catch {
            return {
              status: "error",
              reason: "browser_error",
              message: "Browser automation encountered an unexpected error while filling card fields.",
            };
          }
        } finally {
          if (card) {
            wipeCardData(card);
            card = null;
          }
          if (encryptedData) {
            wipeBuffer(encryptedData);
            encryptedData = null;
          }
          if (keyMaterial) {
            keyMaterial.key_hex = "0".repeat(64);
            keyMaterial.iv_hex = "0".repeat(24);
            keyMaterial.tag_hex = "0".repeat(32);
            keyMaterial = null;
          }
        }
      },
    });
  },
});
