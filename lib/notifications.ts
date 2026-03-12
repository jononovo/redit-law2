import { storage } from "@/server/storage";
import type { NotificationPreference } from "@/shared/schema";

export type NotificationType =
  | "purchase"
  | "balance_low"
  | "topup_request"
  | "topup_completed"
  | "suspicious"
  | "wallet_activated"
  | "payment_received";

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

export async function notifyPurchase(
  ownerUid: string,
  ownerEmail: string,
  botName: string,
  botId: string,
  amountCents: number,
  merchant: string,
  newBalanceCents: number,
): Promise<void> {
  const { sendPurchaseAlertEmail } = await import("@/lib/email");
  const amountUsd = (amountCents / 100).toFixed(2);

  await notifyOwner({
    ownerUid,
    ownerEmail,
    type: "purchase",
    title: `${botName} spent $${amountUsd}`,
    body: `${botName} made a $${amountUsd} purchase at ${merchant}. Balance: $${(newBalanceCents / 100).toFixed(2)}.`,
    botId,
    shouldNotify: (prefs) => prefs.inAppEnabled && prefs.transactionAlerts,
    shouldEmail: (prefs) => prefs.emailEnabled && prefs.transactionAlerts && amountCents >= prefs.purchaseOverThresholdCents,
    emailFn: (email) => sendPurchaseAlertEmail({ ownerEmail: email, botName, amountUsd: Number(amountUsd), merchant }),
  });
}

export async function notifyBalanceLow(
  ownerUid: string,
  ownerEmail: string,
  botName: string,
  botId: string,
  balanceCents: number,
): Promise<void> {
  const { sendBalanceLowEmail } = await import("@/lib/email");
  const balanceUsd = (balanceCents / 100).toFixed(2);

  await notifyOwner({
    ownerUid,
    ownerEmail,
    type: "balance_low",
    title: `${botName}'s balance is low`,
    body: `${botName}'s wallet balance dropped to $${balanceUsd}. Consider adding funds.`,
    botId,
    shouldNotify: (prefs) => prefs.inAppEnabled && prefs.budgetWarnings,
    shouldEmail: (prefs) => prefs.emailEnabled && prefs.budgetWarnings,
    emailFn: (email) => sendBalanceLowEmail({ ownerEmail: email, botName, balanceUsd: Number(balanceUsd) }),
  });
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
  const { sendSuspiciousActivityEmail } = await import("@/lib/email");
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

export async function notifyTopupCompleted(
  ownerUid: string,
  ownerEmail: string,
  botName: string,
  botId: string,
  amountCents: number,
  newBalanceCents: number,
): Promise<void> {
  const amountUsd = (amountCents / 100).toFixed(2);

  await notifyOwner({
    ownerUid,
    ownerEmail,
    type: "topup_completed",
    title: `Wallet funded $${amountUsd}`,
    body: `Added $${amountUsd} to ${botName}'s wallet. New balance: $${(newBalanceCents / 100).toFixed(2)}.`,
    botId,
    shouldNotify: (prefs) => prefs.inAppEnabled && prefs.transactionAlerts,
    shouldEmail: () => false,
  });
}

export async function notifyPaymentReceived(
  ownerUid: string,
  ownerEmail: string,
  botName: string,
  botId: string,
  amountCents: number,
  description: string,
): Promise<void> {
  const amountUsd = (amountCents / 100).toFixed(2);

  await notifyOwner({
    ownerUid,
    ownerEmail,
    type: "payment_received",
    title: `${botName} received $${amountUsd}`,
    body: `${botName} received a $${amountUsd} payment for: ${description}.`,
    botId,
    shouldNotify: (prefs) => prefs.inAppEnabled && prefs.transactionAlerts,
    shouldEmail: (prefs) => prefs.emailEnabled && prefs.transactionAlerts,
    emailFn: async () => {},
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
