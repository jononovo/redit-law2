// Crossmint environment config — single source of truth.
//
// To switch between Crossmint projects (staging ↔ production), edit the
// THREE values below. Nothing else in the codebase needs to change.
//
// Staging:    HOST = "https://staging.crossmint.com", keys = …_STAGING
// Production: HOST = "https://www.crossmint.com",     keys = …  (no suffix)
//
// Docs: https://docs.crossmint.com/introduction/platform/staging-vs-production

export const CROSSMINT_HOST = "https://staging.crossmint.com";
export const CROSSMINT_SERVER_API_KEY = process.env.CROSSMINT_SERVER_API_KEY_STAGING;
export const CROSSMINT_CLIENT_API_KEY = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY_STAGING;
