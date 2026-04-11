import * as fs from "fs";
import * as path from "path";

let cache: Map<string, string> | null = null;

function loadLookup(): Map<string, string> {
  if (cache) return cache;

  const filePath = path.join(process.cwd(), "data", "bin-lookup.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const grouped: Record<string, string[]> = JSON.parse(raw);

  cache = new Map();
  for (const [bankName, bins] of Object.entries(grouped)) {
    for (const bin of bins) {
      if (!cache.has(bin)) {
        cache.set(bin, bankName);
      }
    }
  }

  return cache;
}

export function lookupIssuer(bin6: string): string | null {
  if (!bin6 || bin6.length < 4) return null;

  const lookup = loadLookup();

  if (bin6.length >= 6) {
    const match = lookup.get(bin6.slice(0, 6));
    if (match) return match;
  }

  return null;
}
