import { db } from "@/server/db";
import {
  brandLoginAccounts,
  type BrandLoginAccount, type InsertBrandLoginAccount,
} from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./types";

type BrandLoginAccountMethods = Pick<IStorage,
  | "createBrandLoginAccount" | "getBrandLoginAccountsByOwner"
  | "getBrandLoginAccountByBrand" | "updateBrandLoginAccount"
  | "deleteBrandLoginAccount"
>;

export const brandLoginAccountMethods: BrandLoginAccountMethods = {
  async createBrandLoginAccount(data: InsertBrandLoginAccount): Promise<BrandLoginAccount> {
    const [account] = await db.insert(brandLoginAccounts).values(data).returning();
    return account;
  },

  async getBrandLoginAccountsByOwner(ownerUid: string): Promise<BrandLoginAccount[]> {
    return db.select().from(brandLoginAccounts).where(eq(brandLoginAccounts.ownerUid, ownerUid));
  },

  async getBrandLoginAccountByBrand(ownerUid: string, brandId: number): Promise<BrandLoginAccount | null> {
    const [account] = await db.select().from(brandLoginAccounts)
      .where(and(eq(brandLoginAccounts.ownerUid, ownerUid), eq(brandLoginAccounts.brandId, brandId)))
      .limit(1);
    return account || null;
  },

  async updateBrandLoginAccount(id: number, updates: Partial<InsertBrandLoginAccount>): Promise<BrandLoginAccount | null> {
    const [account] = await db.update(brandLoginAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandLoginAccounts.id, id))
      .returning();
    return account || null;
  },

  async deleteBrandLoginAccount(id: number): Promise<void> {
    await db.delete(brandLoginAccounts).where(eq(brandLoginAccounts.id, id));
  },
};
