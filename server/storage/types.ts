import {
  type Owner, type InsertOwner,
  type Bot, type InsertBot,
  type Wallet, type InsertWallet,
  type Transaction, type InsertTransaction,
  type PaymentMethod, type InsertPaymentMethod,
  type TopupRequest, type InsertTopupRequest,
  type ApiAccessLog, type InsertApiAccessLog,
  type WebhookDelivery, type InsertWebhookDelivery,
  type NotificationPreference, type InsertNotificationPreference,
  type Notification, type InsertNotification,
  type PaymentLink, type InsertPaymentLink,
  type ReconciliationLog, type InsertReconciliationLog,
  type PairingCode, type InsertPairingCode,
  type WaitlistEntry, type InsertWaitlistEntry,
  type Rail4Card, type InsertRail4Card,
  type ObfuscationEvent, type InsertObfuscationEvent,
  type ObfuscationState, type InsertObfuscationState,
  type ProfileAllowanceUsage,
  type CheckoutConfirmation, type InsertCheckoutConfirmation,
  type PrivyWallet, type InsertPrivyWallet,
  type PrivyGuardrail, type InsertPrivyGuardrail,
  type PrivyTransaction, type InsertPrivyTransaction,
  type CrossmintWallet, type InsertCrossmintWallet,
  type CrossmintGuardrail, type InsertCrossmintGuardrail,
  type CrossmintTransaction, type InsertCrossmintTransaction,
  type MasterGuardrail, type InsertMasterGuardrail,
  type Rail4Guardrail, type InsertRail4Guardrail,
  type Rail5Guardrail, type InsertRail5Guardrail,
  type ProcurementControl, type InsertProcurementControl,
  type SkillDraft, type InsertSkillDraft,
  type SkillEvidence, type InsertSkillEvidence,
  type SkillSubmitterProfile, type InsertSkillSubmitterProfile,
  type SkillVersion, type InsertSkillVersion,
  type SkillExport, type InsertSkillExport,
  type UnifiedApproval, type InsertUnifiedApproval,
  type Rail5Card, type InsertRail5Card,
  type Rail5Checkout, type InsertRail5Checkout,
  type Order, type InsertOrder,
  type CheckoutPage, type InsertCheckoutPage,
  type Sale, type InsertSale,
  type Vendor, type InsertVendor,
  type BrandLoginAccount, type InsertBrandLoginAccount,
  type MerchantAccount, type InsertMerchantAccount,
  type SavedShippingAddress, type InsertShippingAddress,
  type SellerProfile, type InsertSellerProfile,
  type Invoice, type InsertInvoice,
  type BasePayPayment, type InsertBasePayPayment,
  type QrPayment, type InsertQrPayment,
  type BotPendingMessage,
  type BrandIndex, type InsertBrandIndex,
  type BrandClaim, type InsertBrandClaim,
  type BrandFeedback, type InsertBrandFeedback,
} from "@/shared/schema";

import type { OrderFilters } from "./orders";
import type { SaleFilters } from "./sales";
import type { InvoiceFilters } from "./invoices";
import type { BrandSearchFilters } from "./brand-index";

export interface IStorage {
  getOwnerByUid(uid: string): Promise<Owner | null>;
  upsertOwner(uid: string, data: Partial<InsertOwner>): Promise<Owner>;

  createBot(data: InsertBot): Promise<Bot>;
  getBotByClaimToken(token: string): Promise<Bot | null>;
  getBotByBotId(botId: string): Promise<Bot | null>;
  getBotsByOwnerEmail(email: string): Promise<Bot[]>;
  getBotsByOwnerUid(ownerUid: string): Promise<Bot[]>;
  claimBot(claimToken: string, ownerUid: string): Promise<Bot | null>;
  updateBotDefaultRail(botId: string, ownerUid: string, defaultRail: string | null): Promise<Bot | null>;
  updateBotWebhookHealth(botId: string, status: string, failCount: number): Promise<void>;
  updateBotProfile(botId: string, ownerUid: string, data: { callbackUrl?: string; botName?: string; description?: string | null }): Promise<{ bot: Bot; newWebhookSecret: string | null }>;
  checkDuplicateRegistration(botName: string, ownerEmail: string): Promise<boolean>;

  createWallet(data: InsertWallet): Promise<Wallet>;
  getWalletByBotId(botId: string): Promise<Wallet | null>;
  getWalletByOwnerUid(ownerUid: string): Promise<Wallet | null>;
  creditWallet(walletId: number, amountCents: number): Promise<Wallet>;

  createTransaction(data: InsertTransaction): Promise<Transaction>;
  getTransactionsByWalletId(walletId: number, limit?: number): Promise<Transaction[]>;

  getPaymentMethod(ownerUid: string): Promise<PaymentMethod | null>;
  getPaymentMethods(ownerUid: string): Promise<PaymentMethod[]>;
  getPaymentMethodById(id: number, ownerUid: string): Promise<PaymentMethod | null>;
  addPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  deletePaymentMethodById(id: number, ownerUid: string): Promise<void>;
  setDefaultPaymentMethod(id: number, ownerUid: string): Promise<PaymentMethod | null>;

  getBotsByApiKeyPrefix(prefix: string): Promise<Bot[]>;
  debitWallet(walletId: number, amountCents: number): Promise<Wallet | null>;
  getDailySpend(walletId: number): Promise<number>;
  getMonthlySpend(walletId: number): Promise<number>;


  createTopupRequest(data: InsertTopupRequest): Promise<TopupRequest>;

  createAccessLog(data: InsertApiAccessLog): Promise<void>;
  getAccessLogsByBotIds(botIds: string[], limit?: number): Promise<ApiAccessLog[]>;

  createWebhookDelivery(data: InsertWebhookDelivery): Promise<WebhookDelivery>;
  updateWebhookDelivery(id: number, data: Partial<InsertWebhookDelivery>): Promise<WebhookDelivery | null>;
  getPendingWebhookRetries(now: Date, limit?: number): Promise<WebhookDelivery[]>;
  getPendingWebhookRetriesForBot(botId: string, now: Date, limit?: number): Promise<WebhookDelivery[]>;
  getWebhookDeliveriesByBotIds(botIds: string[], limit?: number): Promise<WebhookDelivery[]>;

  getNotificationPreferences(ownerUid: string): Promise<NotificationPreference | null>;
  upsertNotificationPreferences(ownerUid: string, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;
  createNotification(data: InsertNotification): Promise<Notification>;
  getNotifications(ownerUid: string, limit?: number, unreadOnly?: boolean): Promise<Notification[]>;
  getUnreadCount(ownerUid: string): Promise<number>;
  markNotificationsRead(ids: number[], ownerUid: string): Promise<void>;
  markAllNotificationsRead(ownerUid: string): Promise<void>;

  getWalletsByOwnerUid(ownerUid: string): Promise<Wallet[]>;
  getTransactionSumByWalletId(walletId: number): Promise<number>;
  createReconciliationLog(data: InsertReconciliationLog): Promise<ReconciliationLog>;
  getFailedWebhookCount24h(botIds: string[]): Promise<number>;

  createPaymentLink(data: InsertPaymentLink): Promise<PaymentLink>;
  getPaymentLinksByBotId(botId: string, limit?: number, status?: string): Promise<PaymentLink[]>;
  getPaymentLinkByStripeSession(sessionId: string): Promise<PaymentLink | null>;
  getPaymentLinkByPaymentLinkId(paymentLinkId: string): Promise<PaymentLink | null>;
  getPaymentLinksByOwnerUid(ownerUid: string, limit?: number): Promise<PaymentLink[]>;
  updatePaymentLinkStatus(id: number, status: string, paidAt?: Date): Promise<PaymentLink | null>;
  completePaymentLink(id: number): Promise<PaymentLink | null>;

  createPairingCode(data: InsertPairingCode): Promise<PairingCode>;
  getPairingCodeByCode(code: string): Promise<PairingCode | null>;
  claimPairingCode(code: string, botId: string): Promise<PairingCode | null>;
  getRecentPairingCodeCount(ownerUid: string): Promise<number>;

  addWaitlistEntry(data: InsertWaitlistEntry): Promise<WaitlistEntry>;
  getWaitlistEntryByEmail(email: string): Promise<WaitlistEntry | null>;

  freezeWallet(walletId: number, ownerUid: string): Promise<Wallet | null>;
  unfreezeWallet(walletId: number, ownerUid: string): Promise<Wallet | null>;
  getWalletsWithBotsByOwnerUid(ownerUid: string): Promise<(Wallet & { botName: string; botId: string })[]>;

  crossmintCreateWallet(data: InsertCrossmintWallet): Promise<CrossmintWallet>;
  crossmintGetWalletById(id: number): Promise<CrossmintWallet | null>;
  crossmintGetWalletByBotId(botId: string): Promise<CrossmintWallet | null>;
  crossmintGetWalletsByOwnerUid(ownerUid: string): Promise<CrossmintWallet[]>;
  crossmintUpdateWalletBalance(id: number, balanceUsdc: number): Promise<CrossmintWallet | null>;
  crossmintUpdateWalletBalanceAndSync(id: number, balanceUsdc: number): Promise<CrossmintWallet | null>;
  crossmintUpdateWalletSyncedAt(id: number): Promise<void>;
  crossmintUpdateWalletStatus(id: number, status: string, ownerUid: string): Promise<CrossmintWallet | null>;
  crossmintLinkBot(id: number, botId: string, ownerUid: string): Promise<CrossmintWallet | null>;
  crossmintUnlinkBot(id: number, ownerUid: string): Promise<CrossmintWallet | null>;

  crossmintGetGuardrails(walletId: number): Promise<CrossmintGuardrail | null>;
  crossmintUpsertGuardrails(walletId: number, data: Partial<InsertCrossmintGuardrail>): Promise<CrossmintGuardrail>;

  crossmintCreateTransaction(data: InsertCrossmintTransaction): Promise<CrossmintTransaction>;
  crossmintGetTransactionsByWalletId(walletId: number, limit?: number): Promise<CrossmintTransaction[]>;
  crossmintGetTransactionById(id: number): Promise<CrossmintTransaction | null>;
  crossmintGetTransactionByOrderId(orderId: string): Promise<CrossmintTransaction | null>;
  crossmintUpdateTransaction(id: number, data: Partial<InsertCrossmintTransaction>): Promise<CrossmintTransaction | null>;
  crossmintGetDailySpend(walletId: number): Promise<number>;
  crossmintGetMonthlySpend(walletId: number): Promise<number>;

  privyCreateWallet(data: InsertPrivyWallet): Promise<PrivyWallet>;
  privyGetWalletById(id: number): Promise<PrivyWallet | null>;
  privyGetWalletByBotId(botId: string): Promise<PrivyWallet | null>;
  privyGetWalletsByOwnerUid(ownerUid: string): Promise<PrivyWallet[]>;
  privyGetWalletByAddress(address: string): Promise<PrivyWallet | null>;
  privyUpdateWalletBalance(id: number, balanceUsdc: number): Promise<PrivyWallet | null>;
  privyUpdateWalletStatus(id: number, status: string, ownerUid: string): Promise<PrivyWallet | null>;
  privyUnlinkBot(id: number, ownerUid: string): Promise<PrivyWallet | null>;
  privyLinkBot(id: number, botId: string, ownerUid: string): Promise<PrivyWallet | null>;

  privyUpdateWalletBalanceAndSync(id: number, balanceUsdc: number): Promise<PrivyWallet | null>;
  privyUpdateWalletSyncedAt(id: number): Promise<void>;
  privyGetGuardrails(walletId: number): Promise<PrivyGuardrail | null>;
  privyUpsertGuardrails(walletId: number, data: Partial<InsertPrivyGuardrail>): Promise<PrivyGuardrail>;

  privyCreateTransaction(data: InsertPrivyTransaction): Promise<PrivyTransaction>;
  privyGetTransactionsByWalletId(walletId: number, limit?: number): Promise<PrivyTransaction[]>;
  privyUpdateTransactionStatus(id: number, status: string, txHash?: string): Promise<PrivyTransaction | null>;
  privyGetDailySpend(walletId: number): Promise<number>;
  privyGetMonthlySpend(walletId: number): Promise<number>;

  createRail4Card(data: InsertRail4Card): Promise<Rail4Card>;
  getRail4CardByCardId(cardId: string): Promise<Rail4Card | null>;
  getRail4CardByBotId(botId: string): Promise<Rail4Card | null>;
  getRail4CardsByBotId(botId: string): Promise<Rail4Card[]>;
  countCardsByBotId(botId: string): Promise<number>;
  getRail4CardsByOwnerUid(ownerUid: string): Promise<Rail4Card[]>;
  updateRail4CardByCardId(cardId: string, data: Partial<InsertRail4Card>): Promise<Rail4Card | null>;
  updateRail4Card(botId: string, data: Partial<InsertRail4Card>): Promise<Rail4Card | null>;
  deleteRail4CardByCardId(cardId: string): Promise<void>;
  deleteRail4Card(botId: string): Promise<void>;

  createObfuscationEvent(data: InsertObfuscationEvent): Promise<ObfuscationEvent>;
  getObfuscationEventsByCardId(cardId: string, limit?: number): Promise<ObfuscationEvent[]>;
  getObfuscationEventsByBotId(botId: string, limit?: number): Promise<ObfuscationEvent[]>;
  getPendingObfuscationEvents(cardId: string): Promise<ObfuscationEvent[]>;
  completeObfuscationEvent(id: number, occurredAt: Date): Promise<ObfuscationEvent | null>;
  updateObfuscationEventConfirmation(id: number, confirmationId: string): Promise<void>;

  getObfuscationState(cardId: string): Promise<ObfuscationState | null>;
  createObfuscationState(data: InsertObfuscationState): Promise<ObfuscationState>;
  updateObfuscationState(cardId: string, data: Partial<InsertObfuscationState>): Promise<ObfuscationState | null>;
  getActiveObfuscationStates(): Promise<ObfuscationState[]>;

  getProfileAllowanceUsage(cardId: string, profileIndex: number, windowStart: Date): Promise<ProfileAllowanceUsage | null>;
  upsertProfileAllowanceUsage(cardId: string, profileIndex: number, windowStart: Date, addCents: number): Promise<ProfileAllowanceUsage>;

  createCheckoutConfirmation(data: InsertCheckoutConfirmation): Promise<CheckoutConfirmation>;
  getCheckoutConfirmation(confirmationId: string): Promise<CheckoutConfirmation | null>;
  updateCheckoutConfirmationStatus(confirmationId: string, status: string): Promise<CheckoutConfirmation | null>;
  getPendingConfirmationsByBotIds(botIds: string[]): Promise<CheckoutConfirmation[]>;
  getPendingConfirmationsByCardIds(cardIds: string[]): Promise<CheckoutConfirmation[]>;

  getMasterGuardrails(ownerUid: string): Promise<MasterGuardrail | null>;
  upsertMasterGuardrails(ownerUid: string, data: Partial<InsertMasterGuardrail>): Promise<MasterGuardrail>;
  getMasterDailySpend(ownerUid: string): Promise<{ rail1: number; rail2: number; rail4: number; total: number }>;
  getMasterMonthlySpend(ownerUid: string): Promise<{ rail1: number; rail2: number; rail4: number; total: number }>;

  getRail4Guardrails(cardId: string): Promise<Rail4Guardrail | null>;
  upsertRail4Guardrails(cardId: string, data: Partial<InsertRail4Guardrail>): Promise<Rail4Guardrail>;
  getRail4DailySpendCents(cardId: string): Promise<number>;
  getRail4MonthlySpendCents(cardId: string): Promise<number>;

  getRail5Guardrails(cardId: string): Promise<Rail5Guardrail | null>;
  upsertRail5Guardrails(cardId: string, data: Partial<InsertRail5Guardrail>): Promise<Rail5Guardrail>;
  getRail5DailySpendCents(cardId: string): Promise<number>;
  getRail5MonthlySpendCents(cardId: string): Promise<number>;

  getProcurementControls(ownerUid: string): Promise<ProcurementControl[]>;
  getProcurementControlsByScope(ownerUid: string, scope: string, scopeRefId?: string | null): Promise<ProcurementControl | null>;
  upsertProcurementControls(ownerUid: string, scope: string, scopeRefId: string | null, data: Partial<InsertProcurementControl>): Promise<ProcurementControl>;

  createSkillDraft(data: InsertSkillDraft): Promise<SkillDraft>;
  createSkillDraftWithEvidence(draftData: InsertSkillDraft, evidenceData: InsertSkillEvidence[]): Promise<SkillDraft>;
  getSkillDraft(id: number): Promise<SkillDraft | null>;
  listSkillDrafts(status?: string): Promise<SkillDraft[]>;
  updateSkillDraft(id: number, data: Partial<InsertSkillDraft>): Promise<SkillDraft | null>;
  deleteSkillDraft(id: number): Promise<void>;
  createSkillEvidence(data: InsertSkillEvidence): Promise<SkillEvidence>;
  getSkillEvidenceByDraftId(draftId: number): Promise<SkillEvidence[]>;

  upsertSubmitterProfile(ownerUid: string, data: Partial<InsertSkillSubmitterProfile>): Promise<SkillSubmitterProfile>;
  getSubmitterProfile(ownerUid: string): Promise<SkillSubmitterProfile | null>;
  incrementSubmitterStat(ownerUid: string, field: "skillsSubmitted" | "skillsPublished" | "skillsRejected"): Promise<void>;
  listSkillDraftsBySubmitter(ownerUid: string): Promise<SkillDraft[]>;

  createSkillVersion(data: InsertSkillVersion): Promise<SkillVersion>;
  getSkillVersion(id: number): Promise<SkillVersion | null>;
  getActiveVersion(vendorSlug: string): Promise<SkillVersion | null>;
  listVersionsByVendor(vendorSlug: string): Promise<SkillVersion[]>;
  deactivateVersions(vendorSlug: string): Promise<void>;

  createSkillExport(data: InsertSkillExport): Promise<SkillExport>;
  getLastExport(vendorSlug: string, destination: string): Promise<SkillExport | null>;
  listExportsByDestination(destination: string): Promise<SkillExport[]>;
  createSkillExportBatch(items: InsertSkillExport[]): Promise<SkillExport[]>;

  createRail5Card(data: InsertRail5Card): Promise<Rail5Card>;
  getRail5CardByCardId(cardId: string): Promise<Rail5Card | null>;
  getRail5CardsByOwnerUid(ownerUid: string): Promise<Rail5Card[]>;
  getRail5CardByBotId(botId: string): Promise<Rail5Card | null>;
  countRail5CardsByBotId(botId: string): Promise<number>;
  updateRail5Card(cardId: string, data: Partial<InsertRail5Card>): Promise<Rail5Card | null>;
  deleteRail5Card(cardId: string): Promise<void>;
  getRail5CardByTestToken(token: string): Promise<Rail5Card | null>;

  createRail5Checkout(data: InsertRail5Checkout): Promise<Rail5Checkout>;
  getRail5CheckoutById(checkoutId: string): Promise<Rail5Checkout | null>;
  updateRail5Checkout(checkoutId: string, data: Partial<InsertRail5Checkout>): Promise<Rail5Checkout | null>;
  getRail5CheckoutsByCardId(cardId: string, limit?: number): Promise<Rail5Checkout[]>;

  createUnifiedApproval(data: InsertUnifiedApproval): Promise<UnifiedApproval>;
  getUnifiedApprovalById(approvalId: string): Promise<UnifiedApproval | null>;
  getUnifiedApprovalByRailRef(rail: string, railRef: string): Promise<UnifiedApproval | null>;
  decideUnifiedApproval(approvalId: string, decision: string): Promise<UnifiedApproval | null>;
  closeUnifiedApprovalByRailRef(rail: string, railRef: string, decision: string): Promise<void>;
  getUnifiedApprovalsByOwnerUid(ownerUid: string, status?: string): Promise<UnifiedApproval[]>;
  getApprovalHistory(ownerUid: string, filters?: import("./approvals").ApprovalFilters): Promise<UnifiedApproval[]>;

  createOrder(data: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | null>;
  getOrderByExternalId(externalId: string): Promise<Order | null>;
  getOrdersByOwner(ownerUid: string, filters?: OrderFilters): Promise<Order[]>;
  getOrdersByWallet(walletId: number): Promise<Order[]>;
  getOrdersByCard(cardId: string): Promise<Order[]>;
  updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order | null>;

  createCheckoutPage(data: InsertCheckoutPage): Promise<CheckoutPage>;
  getCheckoutPageById(checkoutPageId: string): Promise<CheckoutPage | null>;
  getCheckoutPagesByOwnerUid(ownerUid: string): Promise<CheckoutPage[]>;
  getShopPagesByOwnerUid(ownerUid: string): Promise<CheckoutPage[]>;
  updateCheckoutPage(checkoutPageId: string, data: Partial<InsertCheckoutPage>): Promise<CheckoutPage | null>;
  archiveCheckoutPage(checkoutPageId: string, ownerUid: string): Promise<CheckoutPage | null>;

  createSale(data: InsertSale): Promise<Sale>;
  getSaleById(saleId: string): Promise<Sale | null>;
  getSaleByX402Nonce(nonce: string, checkoutPageId: string): Promise<Sale | null>;
  getSalesByOwnerUid(ownerUid: string, filters?: SaleFilters): Promise<Sale[]>;
  getSalesByCheckoutPageId(checkoutPageId: string): Promise<Sale[]>;
  updateSaleStatus(saleId: string, status: string, confirmedAt?: Date): Promise<Sale | null>;
  incrementCheckoutPageStats(checkoutPageId: string, amountUsdc: number): Promise<void>;
  incrementCheckoutPageViewCount(checkoutPageId: string): Promise<void>;
  getBuyerCountForCheckoutPage(checkoutPageId: string): Promise<number>;
  getBuyerNamesForCheckoutPage(checkoutPageId: string): Promise<string[]>;
  getVendorBySlug(slug: string): Promise<Vendor | null>;
  getVendorById(id: number): Promise<Vendor | null>;
  getAllVendors(): Promise<Vendor[]>;

  createBrandLoginAccount(data: InsertBrandLoginAccount): Promise<BrandLoginAccount>;
  getBrandLoginAccountsByOwner(ownerUid: string): Promise<BrandLoginAccount[]>;
  getBrandLoginAccountByBrand(ownerUid: string, brandId: number): Promise<BrandLoginAccount | null>;
  updateBrandLoginAccount(id: number, updates: Partial<InsertBrandLoginAccount>): Promise<BrandLoginAccount | null>;
  deleteBrandLoginAccount(id: number): Promise<void>;

  createShippingAddress(data: InsertShippingAddress): Promise<SavedShippingAddress>;
  getShippingAddressesByOwner(ownerUid: string): Promise<SavedShippingAddress[]>;
  getDefaultShippingAddress(ownerUid: string): Promise<SavedShippingAddress | null>;
  updateShippingAddress(id: number, updates: Partial<InsertShippingAddress>): Promise<SavedShippingAddress | null>;
  deleteShippingAddress(id: number): Promise<void>;

  getSellerProfileByOwnerUid(ownerUid: string): Promise<SellerProfile | null>;
  getSellerProfileBySlug(slug: string): Promise<SellerProfile | null>;
  upsertSellerProfile(ownerUid: string, data: Partial<InsertSellerProfile>): Promise<SellerProfile>;

  createInvoice(data: InsertInvoice): Promise<Invoice>;
  getInvoiceById(invoiceId: string): Promise<Invoice | null>;
  getInvoiceByReferenceNumber(ref: string): Promise<Invoice | null>;
  getInvoicesByOwnerUid(ownerUid: string, filters?: InvoiceFilters): Promise<Invoice[]>;
  getInvoicesByCheckoutPageId(checkoutPageId: string): Promise<Invoice[]>;
  updateInvoice(invoiceId: string, data: Partial<InsertInvoice>): Promise<Invoice | null>;
  markInvoiceSent(invoiceId: string): Promise<Invoice | null>;
  markInvoiceViewed(invoiceId: string): Promise<Invoice | null>;
  markInvoicePaid(invoiceId: string, saleId: string): Promise<Invoice | null>;
  cancelInvoice(invoiceId: string): Promise<Invoice | null>;
  getNextReferenceNumber(ownerUid: string): Promise<string>;
  updateSaleInvoiceId(saleId: string, invoiceId: string): Promise<Sale | null>;

  createBasePayPayment(data: InsertBasePayPayment): Promise<BasePayPayment>;
  getBasePayPaymentByTxId(txId: string): Promise<BasePayPayment | null>;
  updateBasePayPaymentStatus(txId: string, status: string, confirmedAt?: Date): Promise<BasePayPayment | null>;

  createQrPayment(data: InsertQrPayment): Promise<QrPayment>;
  getQrPaymentById(paymentId: string): Promise<QrPayment | null>;
  confirmQrPayment(paymentId: string, creditedUsdc: number, confirmedAt: Date): Promise<QrPayment | null>;
  expireQrPayment(paymentId: string): Promise<QrPayment | null>;
  expireWaitingQrPaymentsForWallet(walletAddress: string): Promise<number>;

  createPendingMessage(botId: string, eventType: string, payload: Record<string, unknown>, expiresAt: Date): Promise<BotPendingMessage>;
  getPendingMessagesForBot(botId: string): Promise<BotPendingMessage[]>;
  getPendingMessageCount(botId: string): Promise<number>;
  ackMessage(id: number, botId: string): Promise<boolean>;
  purgeExpiredMessages(): Promise<number>;
  deletePendingMessagesByRef(botId: string, eventType: string, refKey: string, refValue: string): Promise<number>;

  searchBrands(filters: BrandSearchFilters): Promise<BrandIndex[]>;
  searchBrandsCount(filters: BrandSearchFilters): Promise<number>;
  getBrandById(id: number): Promise<BrandIndex | null>;
  getBrandBySlug(slug: string): Promise<BrandIndex | null>;
  getRetailersForBrand(brandName: string): Promise<BrandIndex[]>;
  upsertBrandIndex(data: InsertBrandIndex): Promise<BrandIndex>;
  recomputeReadiness(slug: string): Promise<number>;
  getAllBrandFacets(): Promise<{ sectors: string[]; tiers: string[] }>;

  createBrandFeedback(data: InsertBrandFeedback): Promise<BrandFeedback>;
  getBrandFeedback(brandSlug: string, limit?: number): Promise<BrandFeedback[]>;
  getBrandFeedbackCount(brandSlug: string): Promise<number>;
  getRecentFeedbackByBot(brandSlug: string, botId: string, windowHours?: number): Promise<BrandFeedback | null>;

  createBrandClaim(data: InsertBrandClaim): Promise<BrandClaim>;
  getBrandClaimById(id: number): Promise<BrandClaim | null>;
  getActiveClaimForBrand(brandSlug: string): Promise<BrandClaim | null>;
  getPendingClaimForBrand(brandSlug: string, claimerUid: string): Promise<BrandClaim | null>;
  getClaimsByUser(claimerUid: string): Promise<BrandClaim[]>;
  getPendingClaims(): Promise<BrandClaim[]>;
  verifyClaim(id: number, reviewedBy?: string): Promise<BrandClaim>;
  rejectClaim(id: number, reason: string, reviewedBy: string): Promise<BrandClaim>;
  revokeClaim(id: number): Promise<BrandClaim>;
}
