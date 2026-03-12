import { db } from "@/server/db";
import { checkoutPages, sales } from "@/shared/schema";
import type { CheckoutPage, InsertCheckoutPage, Sale, InsertSale } from "@/shared/schema";
import type { IStorage } from "./types";
import { eq, and, desc, sql } from "drizzle-orm";

export interface SaleFilters {
  checkoutPageId?: string;
  status?: string;
  paymentMethod?: string;
  limit?: number;
}

type SalesMethods = Pick<IStorage,
  | "createCheckoutPage"
  | "getCheckoutPageById"
  | "getCheckoutPagesByOwnerUid"
  | "getShopPagesByOwnerUid"
  | "updateCheckoutPage"
  | "archiveCheckoutPage"
  | "createSale"
  | "getSaleById"
  | "getSaleByX402Nonce"
  | "getSalesByOwnerUid"
  | "getSalesByCheckoutPageId"
  | "updateSaleStatus"
  | "incrementCheckoutPageStats"
  | "incrementCheckoutPageViewCount"
  | "getBuyerCountForCheckoutPage"
  | "getBuyerNamesForCheckoutPage"
>;

export const salesMethods: SalesMethods = {
  async createCheckoutPage(data: InsertCheckoutPage): Promise<CheckoutPage> {
    const [page] = await db.insert(checkoutPages).values(data).returning();
    return page;
  },

  async getCheckoutPageById(checkoutPageId: string): Promise<CheckoutPage | null> {
    const [page] = await db.select().from(checkoutPages).where(eq(checkoutPages.checkoutPageId, checkoutPageId)).limit(1);
    return page || null;
  },

  async getCheckoutPagesByOwnerUid(ownerUid: string): Promise<CheckoutPage[]> {
    return db.select().from(checkoutPages).where(eq(checkoutPages.ownerUid, ownerUid)).orderBy(desc(checkoutPages.createdAt));
  },

  async updateCheckoutPage(checkoutPageId: string, data: Partial<InsertCheckoutPage>): Promise<CheckoutPage | null> {
    const [updated] = await db.update(checkoutPages).set({ ...data, updatedAt: new Date() }).where(eq(checkoutPages.checkoutPageId, checkoutPageId)).returning();
    return updated || null;
  },

  async archiveCheckoutPage(checkoutPageId: string, ownerUid: string): Promise<CheckoutPage | null> {
    const [updated] = await db.update(checkoutPages).set({ status: "archived", updatedAt: new Date() }).where(and(eq(checkoutPages.checkoutPageId, checkoutPageId), eq(checkoutPages.ownerUid, ownerUid))).returning();
    return updated || null;
  },

  async createSale(data: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(data).returning();
    return sale;
  },

  async getSaleById(saleId: string): Promise<Sale | null> {
    const [sale] = await db.select().from(sales).where(eq(sales.saleId, saleId)).limit(1);
    return sale || null;
  },

  async getSaleByX402Nonce(nonce: string, checkoutPageId: string): Promise<Sale | null> {
    const [sale] = await db.select().from(sales).where(
      and(
        eq(sales.x402Nonce, nonce),
        eq(sales.checkoutPageId, checkoutPageId),
        eq(sales.status, "confirmed"),
      )
    ).limit(1);
    return sale || null;
  },

  async getSalesByOwnerUid(ownerUid: string, filters?: SaleFilters): Promise<Sale[]> {
    const conditions = [eq(sales.ownerUid, ownerUid)];
    if (filters?.checkoutPageId) conditions.push(eq(sales.checkoutPageId, filters.checkoutPageId));
    if (filters?.status) conditions.push(eq(sales.status, filters.status));
    if (filters?.paymentMethod) conditions.push(eq(sales.paymentMethod, filters.paymentMethod));

    const limit = filters?.limit || 50;
    return db.select().from(sales).where(and(...conditions)).orderBy(desc(sales.createdAt)).limit(limit);
  },

  async getSalesByCheckoutPageId(checkoutPageId: string): Promise<Sale[]> {
    return db.select().from(sales).where(eq(sales.checkoutPageId, checkoutPageId)).orderBy(desc(sales.createdAt));
  },

  async updateSaleStatus(saleId: string, status: string, confirmedAt?: Date): Promise<Sale | null> {
    const updates: Partial<InsertSale> = { status };
    if (confirmedAt) (updates as any).confirmedAt = confirmedAt;
    const [updated] = await db.update(sales).set(updates).where(eq(sales.saleId, saleId)).returning();
    return updated || null;
  },

  async incrementCheckoutPageStats(checkoutPageId: string, amountUsdc: number): Promise<void> {
    await db.update(checkoutPages).set({
      paymentCount: sql`${checkoutPages.paymentCount} + 1`,
      totalReceivedUsdc: sql`${checkoutPages.totalReceivedUsdc} + ${amountUsdc}`,
      updatedAt: new Date(),
    }).where(eq(checkoutPages.checkoutPageId, checkoutPageId));
  },

  async incrementCheckoutPageViewCount(checkoutPageId: string): Promise<void> {
    await db.update(checkoutPages).set({
      viewCount: sql`${checkoutPages.viewCount} + 1`,
    }).where(eq(checkoutPages.checkoutPageId, checkoutPageId));
  },

  async getShopPagesByOwnerUid(ownerUid: string): Promise<CheckoutPage[]> {
    return db.select().from(checkoutPages)
      .where(and(
        eq(checkoutPages.ownerUid, ownerUid),
        eq(checkoutPages.shopVisible, true),
        eq(checkoutPages.status, "active"),
      ))
      .orderBy(checkoutPages.shopOrder);
  },

  async getBuyerCountForCheckoutPage(checkoutPageId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` })
      .from(sales)
      .where(and(
        eq(sales.checkoutPageId, checkoutPageId),
        eq(sales.status, "confirmed"),
      ));
    return result?.count || 0;
  },

  async getBuyerNamesForCheckoutPage(checkoutPageId: string): Promise<string[]> {
    const rows = await db.select({ buyerName: sales.buyerName })
      .from(sales)
      .where(and(
        eq(sales.checkoutPageId, checkoutPageId),
        eq(sales.status, "confirmed"),
        sql`${sales.buyerName} IS NOT NULL AND ${sales.buyerName} != ''`,
      ))
      .orderBy(desc(sales.createdAt))
      .limit(100);
    return rows.map(r => r.buyerName!);
  },
};
