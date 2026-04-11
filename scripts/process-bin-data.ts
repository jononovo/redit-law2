import * as fs from "fs";
import * as path from "path";

const CSV_URL =
  "https://raw.githubusercontent.com/iannuttall/binlist-data/master/binlist-data.csv";

const BANK_WHITELIST: Record<string, string[]> = {
  "Chase": ["JPMORGAN CHASE", "CHASE BANK", "CHASE MANHATTAN"],
  "Capital One": ["CAPITAL ONE"],
  "Bank of America": ["BANK OF AMERICA", "FIA CARD SERVICES"],
  "Citi": ["CITIBANK", "CITICORP"],
  "Wells Fargo": ["WELLS FARGO"],
  "American Express": ["AMERICAN EXPRESS"],
  "Discover": ["DISCOVER"],
  "U.S. Bank": ["U.S. BANK", "US BANK"],
  "PNC": ["PNC BANK", "PNC FINANCIAL"],
  "TD Bank": ["TD BANK"],
  "USAA": ["USAA"],
  "Navy Federal": ["NAVY FEDERAL"],
  "Truist": ["TRUIST", "SUNTRUST", "BB&T"],
  "Fifth Third": ["FIFTH THIRD"],
  "Citizens": ["CITIZENS BANK", "CITIZENS FINANCIAL", "RBS CITIZENS"],
  "Regions": ["REGIONS BANK", "REGIONS FINANCIAL"],
  "KeyBank": ["KEYBANK", "KEY BANK"],
  "Huntington": ["HUNTINGTON NATIONAL", "HUNTINGTON BANK"],
  "M&T Bank": ["M&T BANK", "M & T BANK"],
  "Ally": ["ALLY BANK", "ALLY FINANCIAL"],
  "Goldman Sachs": ["GOLDMAN SACHS"],
  "Barclays": ["BARCLAYS"],
  "Synchrony": ["SYNCHRONY"],
  "First Citizens": ["FIRST CITIZENS", "SILICON VALLEY BANK"],
  "Comerica": ["COMERICA"],
  "First National Omaha": ["FIRST NATIONAL BANK OF OMAHA"],
  "Comenity": ["COMENITY"],
  "Charles Schwab": ["CHARLES SCHWAB"],
  "PenFed": ["PENTAGON FEDERAL"],
  "Elan": ["ELAN FINANCIAL"],
};

function matchBank(issuer: string): string | null {
  const upper = issuer.toUpperCase();
  for (const [cleanName, patterns] of Object.entries(BANK_WHITELIST)) {
    for (const pattern of patterns) {
      if (upper.includes(pattern)) return cleanName;
    }
  }
  return null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  console.log("Downloading BIN data...");
  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const csvText = await response.text();
  const lines = csvText.split("\n");

  const header = parseCSVLine(lines[0]);
  const binIdx = header.indexOf("bin");
  const issuerIdx = header.indexOf("issuer");
  const alpha2Idx = header.indexOf("alpha_2");

  const bankBins: Map<string, Set<string>> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const bin = fields[binIdx]?.trim();
    const issuer = fields[issuerIdx]?.trim();
    const alpha2 = fields[alpha2Idx]?.trim();

    if (alpha2 !== "US" || !issuer || !bin || bin.length < 6) continue;

    const bankName = matchBank(issuer);
    if (!bankName) continue;

    const bin6 = bin.slice(0, 6);
    if (!bankBins.has(bankName)) bankBins.set(bankName, new Set());
    bankBins.get(bankName)!.add(bin6);
  }

  const lookup: Record<string, string> = {};
  for (const [bankName, bins] of bankBins) {
    for (const bin of bins) {
      lookup[bin] = bankName;
    }
  }

  const sorted = Object.keys(lookup)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      acc[key] = lookup[key];
      return acc;
    }, {});

  const outPath = path.join(process.cwd(), "data", "bin-lookup.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2));

  const fileSize = fs.statSync(outPath).size;
  const totalBins = Object.keys(sorted).length;

  console.log(`\nFile: ${outPath}`);
  console.log(`Size: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`Total BIN entries: ${totalBins}`);
  console.log(`Banks: ${bankBins.size}`);

  console.log(`\nBINs per bank:`);
  const rankedBanks = [...bankBins.entries()]
    .map(([name, bins]) => ({ name, count: bins.size }))
    .sort((a, b) => b.count - a.count);
  for (const { name, count } of rankedBanks) {
    console.log(`  ${name.padEnd(25)} ${count}`);
  }

  console.log(`\nSample lookups:`);
  const samples = ["438857", "400229", "340000", "601100", "471600"];
  for (const bin of samples) {
    console.log(`  ${bin} → ${sorted[bin] || "(not found)"}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
