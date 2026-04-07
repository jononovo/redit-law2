import { storage } from "@/server/storage";
import type { NotificationPreference } from "@/shared/schema";

export type NotificationType =
  | "purchase"
  | "balance_low"
  | "suspicious"
  | "wallet_activated";

interface NotifyOwnerOpts {
  ownerUid: string;
  ownerEmail: string;
  type: NotificationType;
  title: string;
  body: string;
  botId?: string;
  emailFn?: (email: string) => Promise<unknown>;
  shouldEmail?: (prefs: NotificationPreference) => boolean;
  shouldNotify?: (prefs: NotificationPreference) => boolean;
}

async function getOrDefaultPrefs(ownerUid: string): Promise<NotificationPreference> {
  const prefs = await storage.getNotificationPreferences(ownerUid);
  if (prefs) return prefs;
  return {
    id: 0,
    ownerUid,
    transactionAlerts: true,
    budgetWarnings: true,
    weeklySummary: false,
    purchaseOverThresholdCents: 5000,
    balanceLowCents: 500,
    emailEnabled: true,
    inAppEnabled: true,
    updatedAt: new Date(),
  };
}

export async function notifyOwner(opts: NotifyOwnerOpts): Promise<void> {
  const prefs = await getOrDefaultPrefs(opts.ownerUid);

  const shouldCreateNotif = opts.shouldNotify ? opts.shouldNotify(prefs) : prefs.inAppEnabled;
  if (shouldCreateNotif) {
    await storage.createNotification({
      ownerUid: opts.ownerUid,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      botId: opts.botId || null,
    });
  }

  const shouldSendEmail = opts.shouldEmail ? opts.shouldEmail(prefs) : false;
  if (shouldSendEmail && opts.emailFn) {
    opts.emailFn(opts.ownerEmail).catch((err) => {
      console.error("Notification email failed:", err);
    });
  }
}

export async function notifySuspicious(
  ownerUid: string,
  ownerEmail: string,
  botName: string,
  botId: string,
  reason: string,
  amountCents: number,
  merchant: string,
): Promise<void> {
  const { sendSuspiciousActivityEmail } = await import("@/features/platform-management/email");
  const amountUsd = (amountCents / 100).toFixed(2);

  await notifyOwner({
    ownerUid,
    ownerEmail,
    type: "suspicious",
    title: `Purchase by ${botName} was declined`,
    body: `A $${amountUsd} purchase at ${merchant} was declined: ${reason}.`,
    botId,
    shouldNotify: (prefs) => prefs.inAppEnabled,
    shouldEmail: (prefs) => prefs.emailEnabled,
    emailFn: (email) => sendSuspiciousActivityEmail({ ownerEmail: email, botName, amountUsd: Number(amountUsd), merchant, reason }),
  });
}

export async function notifyWalletActivated(
  ownerUid: string,
  botName: string,
  botId: string,
): Promise<void> {
  await notifyOwner({
    ownerUid,
    ownerEmail: "",
    type: "wallet_activated",
    title: `${botName} is live!`,
    body: `You claimed ${botName} and its wallet is now active. Add funds to get started.`,
    botId,
    shouldNotify: (prefs) => prefs.inAppEnabled,
    shouldEmail: () => false,
  });
}
