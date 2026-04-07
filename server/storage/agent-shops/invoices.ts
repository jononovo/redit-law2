import { db } from "@/server/db";
import { invoices, sales } from "@/shared/schema";
import type { Invoice, InsertInvoice, Sale } from "@/shared/schema";
import type { IStorage } from "./types";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface InvoiceFilters {
  status?: string;
  checkoutPageId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

type InvoiceMethods = Pick<IStorage,
  | "createInvoice"
  | "getInvoiceById"
  | "getInvoiceByReferenceNumber"
  | "getInvoicesByOwnerUid"
  | "getInvoicesByCheckoutPageId"
  | "updateInvoice"
  | "markInvoiceSent"
  | "markInvoiceViewed"
  | "markInvoicePaid"
  | "cancelInvoice"
  | "getNextReferenceNumber"
  | "updateSaleInvoiceId"
>;

export const invoiceMethods: InvoiceMethods = {
  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  },

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceId, invoiceId)).limit(1);
    return invoice || null;
  },

  async getInvoiceByReferenceNumber(ref: string): Promise<Invoice | null> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.referenceNumber, ref)).limit(1);
    return invoice || null;
  },

  async getInvoicesByOwnerUid(ownerUid: string, filters?: InvoiceFilters): Promise<Invoice[]> {
    const conditions = [eq(invoices.ownerUid, ownerUid)];
    if (filters?.status) conditions.push(eq(invoices.status, filters.status));
    if (filters?.checkoutPageId) conditions.push(eq(invoices.checkoutPageId, filters.checkoutPageId));
    if (filters?.dateFrom) conditions.push(gte(invoices.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(invoices.createdAt, filters.dateTo));

    const limit = filters?.limit || 50;
    return db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt)).limit(limit);
  },

  async getInvoicesByCheckoutPageId(checkoutPageId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.checkoutPageId, checkoutPageId)).orderBy(desc(invoices.createdAt));
  },

  async updateInvoice(invoiceId: string, data: Partial<InsertInvoice>): Promise<Invoice | null> {
    const [updated] = await db.update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoices.invoiceId, invoiceId))
      .returning();
    return updated || null;
  },

  async markInvoiceSent(invoiceId: string): Promise<Invoice | null> {
    const [updated] = await db.update(invoices)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.invoiceId, invoiceId))
      .returning();
    return updated || null;
  },

  async markInvoiceViewed(invoiceId: string): Promise<Invoice | null> {
    const [updated] = await db.update(invoices)
      .set({ status: "viewed", viewedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoices.invoiceId, invoiceId), eq(invoices.status, "sent")))
      .returning();
    return updated || null;
  },

  async markInvoicePaid(invoiceId: string, saleId: string): Promise<Invoice | null> {
    const [updated] = await db.update(invoices)
      .set({ status: "paid", paidAt: new Date(), saleId, updatedAt: new Date() })
      .where(eq(invoices.invoiceId, invoiceId))
      .returning();
    return updated || null;
  },

  async cancelInvoice(invoiceId: string): Promise<Invoice | null> {
    const [updated] = await db.update(invoices)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(invoices.invoiceId, invoiceId))
      .returning();
    return updated || null;
  },

  async getNextReferenceNumber(ownerUid: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.ownerUid, ownerUid),
        sql`${invoices.referenceNumber} LIKE ${prefix + '%'}`
      ));
    const nextNum = (result[0]?.count || 0) + 1;
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  },

  async updateSaleInvoiceId(saleId: string, invoiceId: string): Promise<Sale | null> {
    const [updated] = await db.update(sales)
      .set({ invoiceId })
      .where(eq(sales.saleId, saleId))
      .returning();
    return updated || null;
  },
};
