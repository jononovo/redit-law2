export const TIERS = ["admin", "beta", "paid"] as const;
export type Tier = (typeof TIERS)[number];
