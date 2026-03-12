import { db } from "@/server/db";
import {
  vendors,
  merchantAccounts,
  type Vendor, type InsertVendor,
  type MerchantAccount, type InsertMerchantAccount,
} from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./types";

type VendorMethods = Pick<IStorage,
  | "getVendorBySlug" | "getVendorById" | "getAllVendors"
  | "createMerchantAccount" | "getMerchantAccountsByOwner"
  | "getMerchantAccountByVendor" | "updateMerchantAccount"
  | "deleteMerchantAccount"
>;

export const vendorMethods: VendorMethods = {
  async getVendorBySlug(slug: string): Promise<Vendor | null> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.slug, slug)).limit(1);
    return vendor || null;
  },

  async getVendorById(id: number): Promise<Vendor | null> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    return vendor || null;
  },

  async getAllVendors(): Promise<Vendor[]> {
    return db.select().from(vendors);
  },

  async createMerchantAccount(data: InsertMerchantAccount): Promise<MerchantAccount> {
    const [account] = await db.insert(merchantAccounts).values(data).returning();
    return account;
  },

  async getMerchantAccountsByOwner(ownerUid: string): Promise<MerchantAccount[]> {
    return db.select().from(merchantAccounts).where(eq(merchantAccounts.ownerUid, ownerUid));
  },

  async getMerchantAccountByVendor(ownerUid: string, vendorId: number): Promise<MerchantAccount | null> {
    const [account] = await db.select().from(merchantAccounts)
      .where(and(eq(merchantAccounts.ownerUid, ownerUid), eq(merchantAccounts.vendorId, vendorId)))
      .limit(1);
    return account || null;
  },

  async updateMerchantAccount(id: number, updates: Partial<InsertMerchantAccount>): Promise<MerchantAccount | null> {
    const [account] = await db.update(merchantAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(merchantAccounts.id, id))
      .returning();
    return account || null;
  },

  async deleteMerchantAccount(id: number): Promise<void> {
    await db.delete(merchantAccounts).where(eq(merchantAccounts.id, id));
  },
};
