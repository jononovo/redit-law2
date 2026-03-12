import { db } from "@/server/db";
import {
  skillDrafts, skillEvidence, skillSubmitterProfiles, skillVersions, skillExports,
  type SkillDraft, type InsertSkillDraft,
  type SkillEvidence, type InsertSkillEvidence,
  type SkillSubmitterProfile, type InsertSkillSubmitterProfile,
  type SkillVersion, type InsertSkillVersion,
  type SkillExport, type InsertSkillExport,
} from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { IStorage } from "./types";

type SkillMethods = Pick<IStorage,
  | "createSkillDraft" | "createSkillDraftWithEvidence" | "getSkillDraft"
  | "listSkillDrafts" | "updateSkillDraft" | "deleteSkillDraft"
  | "createSkillEvidence" | "getSkillEvidenceByDraftId"
  | "upsertSubmitterProfile" | "getSubmitterProfile"
  | "incrementSubmitterStat" | "listSkillDraftsBySubmitter"
  | "createSkillVersion" | "getSkillVersion" | "getActiveVersion"
  | "listVersionsByVendor" | "deactivateVersions"
  | "createSkillExport" | "getLastExport" | "listExportsByDestination" | "createSkillExportBatch"
>;

export const skillMethods: SkillMethods = {
  async createSkillDraft(data: InsertSkillDraft): Promise<SkillDraft> {
    const [draft] = await db.insert(skillDrafts).values(data).returning();
    return draft;
  },

  async createSkillDraftWithEvidence(draftData: InsertSkillDraft, evidenceData: InsertSkillEvidence[]): Promise<SkillDraft> {
    return db.transaction(async (tx) => {
      const [draft] = await tx.insert(skillDrafts).values(draftData).returning();
      if (evidenceData.length > 0) {
        await tx.insert(skillEvidence).values(
          evidenceData.map(ev => ({ ...ev, draftId: draft.id }))
        );
      }
      return draft;
    });
  },

  async getSkillDraft(id: number): Promise<SkillDraft | null> {
    const [draft] = await db.select().from(skillDrafts).where(eq(skillDrafts.id, id)).limit(1);
    return draft ?? null;
  },

  async listSkillDrafts(status?: string): Promise<SkillDraft[]> {
    if (status) {
      return db.select().from(skillDrafts).where(eq(skillDrafts.status, status)).orderBy(desc(skillDrafts.createdAt));
    }
    return db.select().from(skillDrafts).orderBy(desc(skillDrafts.createdAt));
  },

  async updateSkillDraft(id: number, data: Partial<InsertSkillDraft>): Promise<SkillDraft | null> {
    const [draft] = await db.update(skillDrafts).set({ ...data, updatedAt: new Date() }).where(eq(skillDrafts.id, id)).returning();
    return draft ?? null;
  },

  async deleteSkillDraft(id: number): Promise<void> {
    await db.delete(skillEvidence).where(eq(skillEvidence.draftId, id));
    await db.delete(skillDrafts).where(eq(skillDrafts.id, id));
  },

  async createSkillEvidence(data: InsertSkillEvidence): Promise<SkillEvidence> {
    const [evidence] = await db.insert(skillEvidence).values(data).returning();
    return evidence;
  },

  async getSkillEvidenceByDraftId(draftId: number): Promise<SkillEvidence[]> {
    return db.select().from(skillEvidence).where(eq(skillEvidence.draftId, draftId)).orderBy(skillEvidence.field);
  },

  async upsertSubmitterProfile(ownerUid: string, data: Partial<InsertSkillSubmitterProfile>): Promise<SkillSubmitterProfile> {
    const existing = await db.select().from(skillSubmitterProfiles).where(eq(skillSubmitterProfiles.ownerUid, ownerUid)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(skillSubmitterProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(skillSubmitterProfiles.ownerUid, ownerUid))
        .returning();
      return updated;
    }
    const [profile] = await db.insert(skillSubmitterProfiles)
      .values({ ownerUid, ...data })
      .returning();
    return profile;
  },

  async getSubmitterProfile(ownerUid: string): Promise<SkillSubmitterProfile | null> {
    const [profile] = await db.select().from(skillSubmitterProfiles).where(eq(skillSubmitterProfiles.ownerUid, ownerUid)).limit(1);
    return profile ?? null;
  },

  async incrementSubmitterStat(ownerUid: string, field: "skillsSubmitted" | "skillsPublished" | "skillsRejected"): Promise<void> {
    const existing = await db.select().from(skillSubmitterProfiles).where(eq(skillSubmitterProfiles.ownerUid, ownerUid)).limit(1);
    if (existing.length === 0) {
      await db.insert(skillSubmitterProfiles).values({ ownerUid, [field]: 1 });
    } else {
      await db.update(skillSubmitterProfiles)
        .set({ [field]: sql`${skillSubmitterProfiles[field]} + 1`, updatedAt: new Date() })
        .where(eq(skillSubmitterProfiles.ownerUid, ownerUid));
    }
  },

  async listSkillDraftsBySubmitter(ownerUid: string): Promise<SkillDraft[]> {
    return db.select().from(skillDrafts)
      .where(eq(skillDrafts.submitterUid, ownerUid))
      .orderBy(desc(skillDrafts.createdAt));
  },

  async createSkillVersion(data: InsertSkillVersion): Promise<SkillVersion> {
    const [version] = await db.insert(skillVersions).values(data).returning();
    return version;
  },

  async getSkillVersion(id: number): Promise<SkillVersion | null> {
    const [version] = await db.select().from(skillVersions).where(eq(skillVersions.id, id)).limit(1);
    return version ?? null;
  },

  async getActiveVersion(vendorSlug: string): Promise<SkillVersion | null> {
    const [version] = await db.select().from(skillVersions)
      .where(and(eq(skillVersions.vendorSlug, vendorSlug), eq(skillVersions.isActive, true)))
      .limit(1);
    return version ?? null;
  },

  async listVersionsByVendor(vendorSlug: string): Promise<SkillVersion[]> {
    return db.select().from(skillVersions)
      .where(eq(skillVersions.vendorSlug, vendorSlug))
      .orderBy(desc(skillVersions.createdAt));
  },

  async deactivateVersions(vendorSlug: string): Promise<void> {
    await db.update(skillVersions)
      .set({ isActive: false })
      .where(and(eq(skillVersions.vendorSlug, vendorSlug), eq(skillVersions.isActive, true)));
  },

  async createSkillExport(data: InsertSkillExport): Promise<SkillExport> {
    const [exp] = await db.insert(skillExports).values(data).returning();
    return exp;
  },

  async getLastExport(vendorSlug: string, destination: string): Promise<SkillExport | null> {
    const [exp] = await db.select().from(skillExports)
      .where(and(eq(skillExports.vendorSlug, vendorSlug), eq(skillExports.destination, destination)))
      .orderBy(desc(skillExports.exportedAt))
      .limit(1);
    return exp ?? null;
  },

  async listExportsByDestination(destination: string): Promise<SkillExport[]> {
    return db.select().from(skillExports)
      .where(eq(skillExports.destination, destination))
      .orderBy(desc(skillExports.exportedAt));
  },

  async createSkillExportBatch(items: InsertSkillExport[]): Promise<SkillExport[]> {
    if (items.length === 0) return [];
    return db.insert(skillExports).values(items).returning();
  },
};
