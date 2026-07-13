import { db } from "@/server/db";
import { supportRequests, type SupportRequest, type InsertSupportRequest } from "@/shared/schema";
import type { IStorage } from "../types";

type SupportRequestMethods = Pick<IStorage, "createSupportRequest">;

export const supportRequestMethods: SupportRequestMethods = {
  async createSupportRequest(data: InsertSupportRequest): Promise<SupportRequest> {
    const [row] = await db.insert(supportRequests).values(data).returning();
    return row;
  },
};
