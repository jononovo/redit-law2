import { db } from "@/server/db";
import {
  vendors,
  type Vendor,
} from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage } from "./types";

type VendorMethods = Pick<IStorage,
  | "getVendorBySlug" | "getVendorById" | "getAllVendors"
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
};
