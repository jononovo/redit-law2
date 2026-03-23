"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";
import type { BotInfo } from "@/components/wallet/types";

export interface UseBotLinkingConfig {
  railPrefix: string;
  entityType: "wallet" | "card";
  linkEndpoint?: string;
  unlinkEndpoint?: string;
  onUpdate?: () => void;
}

export interface LinkableEntity {
  id: number | string;
  name: string;
  bot_id: string | null;
  bot_name: string | null;
}

export function useBotLinking(config: UseBotLinkingConfig) {
  const { toast } = useToast();

  const [linkTarget, setLinkTarget] = useState<LinkableEntity | null>(null);
  const [linkBotId, setLinkBotId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  const [unlinkTarget, setUnlinkTarget] = useState<LinkableEntity | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const [bots, setBots] = useState<BotInfo[]>([]);

  const fetchBots = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/bots/mine");
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || []);
      }
    } catch {}
  }, []);

  const openLinkDialog = useCallback((entity: LinkableEntity) => {
    setLinkTarget(entity);
    setLinkBotId("");
  }, []);

  const closeLinkDialog = useCallback(() => {
    setLinkTarget(null);
    setLinkBotId("");
  }, []);

  const openUnlinkDialog = useCallback((entity: LinkableEntity) => {
    setUnlinkTarget(entity);
  }, []);

  const closeUnlinkDialog = useCallback(() => {
    setUnlinkTarget(null);
  }, []);

  const handleLinkBot = useCallback(async () => {
    if (!linkTarget || !linkBotId) return;
    setLinkLoading(true);
    try {
      let res: Response;

      if (config.linkEndpoint) {
        res = await authFetch(config.linkEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            config.entityType === "wallet"
              ? { wallet_id: linkTarget.id, bot_id: linkBotId }
              : { card_id: linkTarget.id, bot_id: linkBotId }
          ),
        });
      } else if (config.railPrefix === "rail5") {
        res = await authFetch(`/api/v1/rail5/cards/${linkTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot_id: linkBotId }),
        });
      } else {
        res = await authFetch(`/api/v1/${config.railPrefix}/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            config.entityType === "wallet"
              ? { wallet_id: linkTarget.id, bot_id: linkBotId }
              : { card_id: linkTarget.id, bot_id: linkBotId }
          ),
        });
      }

      if (res.ok) {
        toast({ title: "Bot linked", description: `Bot has been linked to this ${config.entityType}.` });
        setLinkTarget(null);
        setLinkBotId("");
        config.onUpdate?.();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to link bot", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLinkLoading(false);
    }
  }, [linkTarget, linkBotId, config, toast]);

  const handleUnlinkBot = useCallback(async () => {
    if (!unlinkTarget) return;
    setUnlinkLoading(true);
    try {
      let res: Response;

      if (config.unlinkEndpoint) {
        res = await authFetch(config.unlinkEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            config.entityType === "wallet"
              ? { wallet_id: unlinkTarget.id }
              : { card_id: unlinkTarget.id }
          ),
        });
      } else if (config.railPrefix === "rail5") {
        res = await authFetch(`/api/v1/rail5/cards/${unlinkTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot_id: null }),
        });
      } else {
        res = await authFetch(`/api/v1/${config.railPrefix}/unlink`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            config.entityType === "wallet"
              ? { wallet_id: unlinkTarget.id }
              : { card_id: unlinkTarget.id }
          ),
        });
      }

      if (res.ok) {
        toast({ title: "Bot unlinked", description: `Bot has been unlinked from this ${config.entityType}.` });
        setUnlinkTarget(null);
        config.onUpdate?.();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to unlink bot", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setUnlinkLoading(false);
    }
  }, [unlinkTarget, config, toast]);

  return {
    bots,
    fetchBots,
    linkTarget,
    linkBotId,
    linkLoading,
    setLinkBotId,
    openLinkDialog,
    closeLinkDialog,
    handleLinkBot,
    unlinkTarget,
    unlinkLoading,
    openUnlinkDialog,
    closeUnlinkDialog,
    handleUnlinkBot,
  };
}
