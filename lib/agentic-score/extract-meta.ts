export function extractMeta(html: string, domain: string): { name: string; description: string } {
  let name = "";
  let description = "";

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    name = titleMatch[1].trim();
    name = name.replace(/\s*[\|–—\-:]\s*.{3,}$/, "").trim();
    name = name.replace(/\s*[\|–—\-:]\s*.{3,}$/, "").trim();
  }

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  if (!name) {
    const segment = domain.split(".")[0];
    name = segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  if (!description) {
    description = `Online store at ${domain}`;
  }

  return { name, description };
}
