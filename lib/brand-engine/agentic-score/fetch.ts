export function normalizeDomain(input: string): string {
  if (!input || typeof input !== "string") {
    throw new Error("Domain is required");
  }
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/\/.*$/, "");
  domain = domain.replace(/^www\./, "");
  if (!domain || domain.length < 3 || !domain.includes(".")) {
    throw new Error(`Invalid domain: ${input}`);
  }
  return domain;
}

export { domainToSlug } from "./domain-utils";
