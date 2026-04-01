export function domainToSlug(domain: string): string {
  const d = domain.toLowerCase().trim();
  if (d.endsWith(".com")) {
    const withoutTld = d.slice(0, -4);
    return withoutTld.replace(/\./g, "-").replace(/[^a-z0-9-]/g, "");
  }
  return d.replace(/\./g, "-").replace(/[^a-z0-9-]/g, "");
}
