import { db } from "@/server/db";
import {
  orders,
  type Order, type InsertOrder,
} from "@/shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import type { IStorage } from "./types";

export interface OrderFilters {
  rail?: string;
  botId?: string;
  walletId?: number;
  cardId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

type OrderMethods = Pick<IStorage,
  | "createOrder" | "getOrderById" | "getOrderByExternalId"
  | "getOrdersByOwner" | "getOrdersByWallet" | "getOrdersByCard"
  | "updateOrder"
>;

export const orderMethods: OrderMethods = {
  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  },

  async getOrderById(id: number): Promise<Order | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return order || null;
  },

  async getOrderByExternalId(externalId: string): Promise<Order | null> {
    const [order] = await db.select().from(orders).where(eq(orders.externalOrderId, externalId)).limit(1);
    return order || null;
  },

  async getOrdersByOwner(ownerUid: string, filters?: OrderFilters): Promise<Order[]> {
    const conditions = [eq(orders.ownerUid, ownerUid)];

    if (filters?.rail) {
      conditions.push(eq(orders.rail, filters.rail));
    }
    if (filters?.botId) {
      conditions.push(eq(orders.botId, filters.botId));
    }
    if (filters?.walletId) {
      conditions.push(eq(orders.walletId, filters.walletId));
    }
    if (filters?.cardId) {
      conditions.push(eq(orders.cardId, filters.cardId));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(orders.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(orders.createdAt, filters.dateTo));
    }

    return db.select().from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  },

  async getOrdersByWallet(walletId: number): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.walletId, walletId))
      .orderBy(desc(orders.createdAt));
  },

  async getOrdersByCard(cardId: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.cardId, cardId))
      .orderBy(desc(orders.createdAt));
  },

  async updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order | null> {
    const [order] = await db.update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order || null;
  },
};
