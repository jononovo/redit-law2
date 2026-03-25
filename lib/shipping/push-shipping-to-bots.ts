import { storage } from "@/server/storage";
import { sendToBot } from "@/lib/agent-management/bot-messaging";
import { buildShippingFile } from "./build-shipping-file";

export async function pushShippingFileToBots(ownerUid: string): Promise<void> {
  const [addresses, bots] = await Promise.all([
    storage.getShippingAddressesByOwner(ownerUid),
    storage.getBotsByOwnerUid(ownerUid),
  ]);

  if (bots.length === 0) return;

  const shippingMd = buildShippingFile(addresses);

  const results = await Promise.allSettled(
    bots.map((bot) =>
      sendToBot(bot.botId, "shipping.addresses.updated", {
        file_content: shippingMd,
        suggested_path: ".creditclaw/shipping.md",
        address_count: addresses.length,
        has_default: addresses.some((a) => a.isDefault),
        instructions: SHIPPING_UPDATED_INSTRUCTIONS,
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(`[pushShippingFileToBots] Failed to notify ${failed.length}/${bots.length} bots for owner ${ownerUid}`);
  }
}

const SHIPPING_UPDATED_INSTRUCTIONS = `Your shipping addresses have been updated.
Save the file_content to .creditclaw/shipping.md (replacing any existing file).
The file contains all configured shipping addresses. The address marked (DEFAULT) should be used when a checkout requires a shipping address unless instructed otherwise.
If the file shows no addresses configured, ask the card owner to add one in CreditClaw settings before proceeding with checkouts that require shipping.`;
