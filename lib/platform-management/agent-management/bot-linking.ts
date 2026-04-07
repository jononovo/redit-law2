import { storage } from "@/server/storage";
import { fireRailsUpdated } from "@/lib/agent-interaction/webhooks";

const MAX_ENTITIES_PER_BOT = 3;

export type EntityType = "wallet" | "card";

export interface BotLinkingConfig {
  rail: string;
  entityType: EntityType;
  getEntity: (entityId: number | string) => Promise<{ ownerUid: string; botId: string | null; status: string } | null>;
  linkBot: (entityId: number | string, botId: string, ownerUid: string) => Promise<any>;
  unlinkBot: (entityId: number | string, ownerUid: string) => Promise<any>;
  countEntitiesByBotId: (botId: string) => Promise<number>;
  webhookActionLink: string;
  webhookActionUnlink: string;
  entityIdKey: string;
}

export interface LinkResult {
  success: boolean;
  error?: string;
  status?: number;
  data?: Record<string, unknown>;
}

const RAIL_CONFIGS: Record<string, () => BotLinkingConfig> = {
  rail1: () => ({
    rail: "rail1",
    entityType: "wallet",
    getEntity: async (id) => {
      const w = await storage.privyGetWalletById(Number(id));
      return w ? { ownerUid: w.ownerUid, botId: w.botId || null, status: w.status } : null;
    },
    linkBot: (id, botId, ownerUid) => storage.privyLinkBot(Number(id), botId, ownerUid),
    unlinkBot: (id, ownerUid) => storage.privyUnlinkBot(Number(id), ownerUid),
    countEntitiesByBotId: async (botId) => {
      const w = await storage.privyGetWalletByBotId(botId);
      return w ? 1 : 0;
    },
    webhookActionLink: "wallet_linked",
    webhookActionUnlink: "wallet_unlinked",
    entityIdKey: "wallet_id",
  }),
  rail2: () => ({
    rail: "rail2",
    entityType: "wallet",
    getEntity: async (id) => {
      const w = await storage.crossmintGetWalletById(Number(id));
      return w ? { ownerUid: w.ownerUid, botId: w.botId || null, status: w.status } : null;
    },
    linkBot: (id, botId, ownerUid) => storage.crossmintLinkBot(Number(id), botId, ownerUid),
    unlinkBot: (id, ownerUid) => storage.crossmintUnlinkBot(Number(id), ownerUid),
    countEntitiesByBotId: async (botId) => {
      const w = await storage.crossmintGetWalletByBotId(botId);
      return w ? 1 : 0;
    },
    webhookActionLink: "wallet_linked",
    webhookActionUnlink: "wallet_unlinked",
    entityIdKey: "wallet_id",
  }),
  rail5: () => ({
    rail: "rail5",
    entityType: "card",
    getEntity: async (id) => {
      const c = await storage.getRail5CardByCardId(String(id));
      return c ? { ownerUid: c.ownerUid, botId: c.botId || null, status: c.status } : null;
    },
    linkBot: (id, botId) => storage.updateRail5Card(String(id), { botId }),
    unlinkBot: (id) => storage.updateRail5Card(String(id), { botId: null } as any),
    countEntitiesByBotId: (botId) => storage.countRail5CardsByBotId(botId),
    webhookActionLink: "card_linked",
    webhookActionUnlink: "card_removed",
    entityIdKey: "card_id",
  }),
};

export function getRailConfig(rail: string): BotLinkingConfig {
  const factory = RAIL_CONFIGS[rail];
  if (!factory) throw new Error(`Unknown rail: ${rail}`);
  return factory();
}

export async function linkBotToEntity(
  rail: string,
  entityId: number | string,
  botId: string,
  ownerUid: string,
): Promise<LinkResult> {
  const config = getRailConfig(rail);

  const entity = await config.getEntity(entityId);
  if (!entity || entity.ownerUid !== ownerUid) {
    return { success: false, error: `${config.entityType === "wallet" ? "Wallet" : "Card"} not found or not owned by you`, status: 404 };
  }

  if (entity.botId && entity.botId.length > 0) {
    return { success: false, error: `This ${config.entityType} already has a bot linked. Unlink it first.`, status: 400 };
  }

  const bot = await storage.getBotByBotId(botId);
  if (!bot || bot.ownerUid !== ownerUid) {
    return { success: false, error: "Bot not found or not owned by you", status: 404 };
  }

  const entityCount = await config.countEntitiesByBotId(botId);
  if (entityCount >= MAX_ENTITIES_PER_BOT) {
    return {
      success: false,
      error: `This bot already has the maximum of ${MAX_ENTITIES_PER_BOT} ${config.entityType}s linked.`,
      status: 400,
      data: { entity_count: entityCount, max_entities: MAX_ENTITIES_PER_BOT },
    };
  }

  const updated = await config.linkBot(entityId, botId, ownerUid);
  if (!updated) {
    return { success: false, error: "Failed to link bot", status: 500 };
  }

  fireRailsUpdated(bot, config.webhookActionLink as any, config.rail, { [config.entityIdKey]: entityId }).catch(() => {});

  return {
    success: true,
    data: {
      [config.entityIdKey]: entityId,
      bot_id: botId,
      bot_name: bot.botName,
      message: "Bot linked successfully",
    },
  };
}

export async function unlinkBotFromEntity(
  rail: string,
  entityId: number | string,
  ownerUid: string,
): Promise<LinkResult> {
  const config = getRailConfig(rail);

  const entity = await config.getEntity(entityId);
  if (!entity || entity.ownerUid !== ownerUid) {
    return { success: false, error: `${config.entityType === "wallet" ? "Wallet" : "Card"} not found or not owned by you`, status: 404 };
  }

  if (!entity.botId || entity.botId.length === 0) {
    return { success: false, error: `No bot is linked to this ${config.entityType}`, status: 400 };
  }

  const bot = await storage.getBotByBotId(entity.botId);

  const updated = await config.unlinkBot(entityId, ownerUid);
  if (!updated) {
    return { success: false, error: "Failed to unlink bot", status: 500 };
  }

  if (bot) {
    fireRailsUpdated(bot, config.webhookActionUnlink as any, config.rail, { [config.entityIdKey]: entityId }).catch(() => {});
  }

  return {
    success: true,
    data: {
      [config.entityIdKey]: entityId,
      message: "Bot unlinked successfully",
    },
  };
}
