export function extractMeta(html: string, domain: string): { name: string; description: string } {
  let name = "";
  let description = "";

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    name = titleMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s*[\|\-–—:]\s*.+$/, "")
      .trim();
  }

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*\/?>/i)
    || html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["'][^>]*\/?>/i);
  if (descMatch) {
    description = descMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
  }

  if (!name) {
    const domainBase = domain.split(".")[0];
    name = domainBase.charAt(0).toUpperCase() + domainBase.slice(1);
  }

  if (!description) {
    description = `Online store at ${domain}`;
  }

  return { name, description };
}
