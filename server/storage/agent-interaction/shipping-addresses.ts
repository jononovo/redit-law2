import { db } from "@/server/db";
import {
  shippingAddresses,
  type SavedShippingAddress, type InsertShippingAddress,
} from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./types";

type ShippingAddressMethods = Pick<IStorage,
  | "createShippingAddress" | "getShippingAddressesByOwner"
  | "getDefaultShippingAddress" | "updateShippingAddress"
  | "deleteShippingAddress"
>;

export const shippingAddressMethods: ShippingAddressMethods = {
  async createShippingAddress(data: InsertShippingAddress): Promise<SavedShippingAddress> {
    if (data.isDefault) {
      await db.update(shippingAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(
          eq(shippingAddresses.ownerUid, data.ownerUid),
          eq(shippingAddresses.isDefault, true),
        ));
    }
    const [addr] = await db.insert(shippingAddresses).values(data).returning();
    return addr;
  },

  async getShippingAddressesByOwner(ownerUid: string): Promise<SavedShippingAddress[]> {
    return db.select().from(shippingAddresses)
      .where(eq(shippingAddresses.ownerUid, ownerUid));
  },

  async getDefaultShippingAddress(ownerUid: string): Promise<SavedShippingAddress | null> {
    const [addr] = await db.select().from(shippingAddresses)
      .where(and(
        eq(shippingAddresses.ownerUid, ownerUid),
        eq(shippingAddresses.isDefault, true),
      ))
      .limit(1);
    return addr || null;
  },

  async updateShippingAddress(id: number, updates: Partial<InsertShippingAddress>): Promise<SavedShippingAddress | null> {
    if (updates.isDefault && updates.ownerUid) {
      await db.update(shippingAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(
          eq(shippingAddresses.ownerUid, updates.ownerUid),
          eq(shippingAddresses.isDefault, true),
        ));
    }
    const [addr] = await db.update(shippingAddresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shippingAddresses.id, id))
      .returning();
    return addr || null;
  },

  async deleteShippingAddress(id: number): Promise<void> {
    await db.delete(shippingAddresses).where(eq(shippingAddresses.id, id));
  },
};
