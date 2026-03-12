export interface ApprovalRecord {
  id: number;
  status: string;
  expiresAt: Date;
}

export function isApprovalExpired(approval: ApprovalRecord): boolean {
  return new Date() > approval.expiresAt;
}

export function getApprovalExpiresAt(ttlMinutes: number): Date {
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

export const RAIL1_APPROVAL_TTL_MINUTES = 5;
export const RAIL1_EMAIL_APPROVAL_TTL_MINUTES = 10;
export const RAIL2_APPROVAL_TTL_MINUTES = 15;
export const RAIL4_APPROVAL_TTL_MINUTES = 15;
export const RAIL5_APPROVAL_TTL_MINUTES = 15;

export const APPROVAL_TTL_BY_RAIL: Record<string, number> = {
  rail1: RAIL1_EMAIL_APPROVAL_TTL_MINUTES,
  rail2: RAIL2_APPROVAL_TTL_MINUTES,
  rail4: RAIL4_APPROVAL_TTL_MINUTES,
  rail5: RAIL5_APPROVAL_TTL_MINUTES,
};
