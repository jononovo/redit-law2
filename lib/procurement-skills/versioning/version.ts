import { createHash } from "crypto";
import type { VendorSkill } from "../types";
import { generateVendorSkill } from "../generator";
import { generateSkillJson, generatePaymentsMd, generateDescriptionMd } from "../package";
import { detectChangedFields, hasBreakingChanges } from "./diff";

export type ChangeType = "initial" | "edit" | "community_update" | "rollback";
export type SourceType = "registry" | "draft" | "community";

export interface VersionFiles {
  skillMd: string;
  skillJson: object;
  paymentsMd: string;
  descriptionMd: string;
}

export interface CreateVersionInput {
  vendorSlug: string;
  vendorData: VendorSkill;
  changeType: ChangeType;
  changeSummary?: string;
  publishedBy?: string;
  sourceType: SourceType;
  sourceDraftId?: number;
  previousVersion?: {
    id: number;
    version: string;
    vendorData: VendorSkill;
  };
}

export function generateAllFiles(vendor: VendorSkill, version: string): VersionFiles {
  return {
    skillMd: generateVendorSkill(vendor),
    skillJson: generateSkillJson(vendor),
    paymentsMd: generatePaymentsMd(vendor),
    descriptionMd: generateDescriptionMd(vendor, version),
  };
}

export function computeChecksum(vendorData: VendorSkill): string {
  const json = JSON.stringify(vendorData, Object.keys(vendorData).sort());
  return createHash("sha256").update(json).digest("hex");
}

export function bumpVersion(
  currentVersion: string,
  oldSkill: VendorSkill | null,
  newSkill: VendorSkill
): string {
  if (!currentVersion || !oldSkill) return "1.0.0";

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  if (hasBreakingChanges(oldSkill, newSkill)) {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

export function prepareVersionData(input: CreateVersionInput) {
  let nextVersion: string;
  let changedFields: string[] | undefined;

  if (input.changeType === "initial" || !input.previousVersion) {
    nextVersion = input.vendorData.version || "1.0.0";
    changedFields = undefined;
  } else if (input.changeType === "rollback") {
    const [major, minor, patch] = input.previousVersion.version.split(".").map(Number);
    nextVersion = `${major}.${minor}.${patch + 1}`;
    changedFields = undefined;
  } else {
    nextVersion = bumpVersion(
      input.previousVersion.version,
      input.previousVersion.vendorData,
      input.vendorData
    );
    changedFields = detectChangedFields(input.previousVersion.vendorData, input.vendorData);
  }

  const files = generateAllFiles(input.vendorData, nextVersion);
  const checksum = computeChecksum(input.vendorData);

  return {
    vendorSlug: input.vendorSlug,
    version: nextVersion,
    vendorData: input.vendorData,
    skillMd: files.skillMd,
    skillJson: files.skillJson,
    paymentsMd: files.paymentsMd,
    descriptionMd: files.descriptionMd,
    checksum,
    changeType: input.changeType,
    changeSummary: input.changeSummary,
    changedFields,
    previousVersionId: input.previousVersion?.id ?? null,
    publishedBy: input.publishedBy,
    sourceType: input.sourceType,
    sourceDraftId: input.sourceDraftId ?? null,
    isActive: true,
  };
}
