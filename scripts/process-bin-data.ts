import * as fs from "fs";
import * as path from "path";

const CSV_URL =
  "https://raw.githubusercontent.com/iannuttall/binlist-data/master/binlist-data.csv";

const KNOWN_ISSUERS: Record<string, string> = {
  "JPMORGAN CHASE BANK, N.A.": "Chase",
  "JPMORGAN CHASE BANK N.A.": "Chase",
  "CHASE BANK USA, N.A.": "Chase",
  "CAPITAL ONE BANK (USA), N.A.": "Capital One",
  "CAPITAL ONE BANK, N.A.": "Capital One",
  "CAPITAL ONE, N.A.": "Capital One",
  "CAPITAL ONE F.S.B.": "Capital One",
  "BANK OF AMERICA, N.A.": "Bank of America",
  "BANK OF AMERICA": "Bank of America",
  "BANK OF AMERICA N.A.": "Bank of America",
  "FIA CARD SERVICES, N.A.": "Bank of America",
  "CITIBANK, N.A.": "Citi",
  "CITIBANK (SOUTH DAKOTA), N.A.": "Citi",
  "CITIBANK N.A.": "Citi",
  "CITICORP DINERS CLUB, INC.": "Citi",
  "WELLS FARGO BANK, N.A.": "Wells Fargo",
  "WELLS FARGO BANK NATIONAL ASSOCIATION": "Wells Fargo",
  "WELLS FARGO BANK, NATIONAL ASSOCIATION": "Wells Fargo",
  "AMERICAN EXPRESS": "American Express",
  "AMERICAN EXPRESS COMPANY": "American Express",
  "DISCOVER BANK": "Discover",
  "DISCOVER FINANCIAL SERVICES": "Discover",
  "U.S. BANK, N.A.": "U.S. Bank",
  "U.S. BANK N.A.": "U.S. Bank",
  "US BANK, N.A.": "U.S. Bank",
  "U.S. BANK NATIONAL ASSOCIATION": "U.S. Bank",
  "PNC BANK, N.A.": "PNC",
  "PNC BANK, NATIONAL ASSOCIATION": "PNC",
  "PNC BANK N.A.": "PNC",
  "TD BANK, N.A.": "TD Bank",
  "TD BANK USA, N.A.": "TD Bank",
  "USAA FEDERAL SAVINGS BANK": "USAA",
  "USAA SAVINGS BANK": "USAA",
  "NAVY FEDERAL CREDIT UNION": "Navy Federal",
  "BARCLAYS BANK DELAWARE": "Barclays",
  "BARCLAYS BANK PLC": "Barclays",
  "GOLDMAN SACHS BANK USA": "Goldman Sachs",
  "SYNCHRONY BANK": "Synchrony",
  "SYNCHRONY FINANCIAL": "Synchrony",
  "FIFTH THIRD BANK, N.A.": "Fifth Third",
  "FIFTH THIRD BANK": "Fifth Third",
  "CITIZENS BANK, N.A.": "Citizens",
  "CITIZENS BANK OF PENNSYLVANIA": "Citizens",
  "CITIZENS FINANCIAL GROUP, INC.": "Citizens",
  "REGIONS BANK": "Regions",
  "REGIONS FINANCIAL CORPORATION": "Regions",
  "TRUIST BANK": "Truist",
  "TRUIST FINANCIAL CORPORATION": "Truist",
  "SUNTRUST BANK": "Truist",
  "BB&T FINANCIAL CORPORATION": "Truist",
  "KEYBANK NATIONAL ASSOCIATION": "KeyBank",
  "KEYBANK, N.A.": "KeyBank",
  "HUNTINGTON NATIONAL BANK": "Huntington",
  "THE HUNTINGTON NATIONAL BANK": "Huntington",
  "M&T BANK": "M&T Bank",
  "M&T BANK CORPORATION": "M&T Bank",
  "ALLY BANK": "Ally",
  "ALLY FINANCIAL INC.": "Ally",
  "FIRST CITIZENS BANK & TRUST COMPANY": "First Citizens",
  "SILICON VALLEY BANK": "First Citizens",
  "COMERICA BANK": "Comerica",
  "ZIONS BANCORPORATION, N.A.": "Zions",
  "ZIONS BANK": "Zions",
  "WEBSTER BANK, N.A.": "Webster",
  "NEW YORK COMMUNITY BANK": "NY Community",
  "FLAGSTAR BANK, N.A.": "Flagstar",
  "FLAGSTAR BANK": "Flagstar",
  "POPULAR BANK": "Popular",
  "BANCO POPULAR DE PUERTO RICO": "Popular",
  "FIRST HORIZON BANK": "First Horizon",
  "FIRST HORIZON NATIONAL CORPORATION": "First Horizon",
  "EAST WEST BANK": "East West",
  "VALLEY NATIONAL BANK": "Valley National",
  "CULBERSON STATE BANK": "Culberson State",
  "PACIFIC WESTERN BANK": "Pacific Western",
  "WESTERN ALLIANCE BANK": "Western Alliance",
  "GLACIER BANCORP, INC.": "Glacier",
  "BOKF, NATIONAL ASSOCIATION": "BOK Financial",
  "BOK FINANCIAL CORPORATION": "BOK Financial",
  "FIRST NATIONAL BANK OF OMAHA": "First National Omaha",
  "COMENITY BANK": "Comenity",
  "COMENITY CAPITAL BANK": "Comenity",
  "ATLANTIC CAPITAL BANK, N.A.": "Atlantic Capital",
  "CHARLES SCHWAB BANK": "Charles Schwab",
  "CHARLES SCHWAB BANK, SSB": "Charles Schwab",
  "STATE EMPLOYEES CREDIT UNION": "State Employees CU",
  "PENTAGON FEDERAL CREDIT UNION": "PenFed",
  "PENTAGON FEDERAL C.U.": "PenFed",
  "SCHOOLSFIRST FEDERAL CREDIT UNION": "SchoolsFirst",
  "BOEING EMPLOYEES CREDIT UNION": "BECU",
  "GOLDEN 1 CREDIT UNION": "Golden 1",
  "FIRST TECH FEDERAL CREDIT UNION": "First Tech",
  "ALASKA USA FEDERAL CREDIT UNION": "Alaska USA",
  "MOUNTAIN AMERICA CREDIT UNION": "Mountain America",
  "RANDOLPH-BROOKS FEDERAL CREDIT UNION": "RBFCU",
  "DIGITAL FEDERAL CREDIT UNION": "DCU",
  "UNITED SERVICES AUTOMOBILE ASSOCIATION": "USAA",
  "ELAN FINANCIAL SERVICES": "Elan",
  "COMMERCE BANK": "Commerce",
  "FIRST INTERSTATE BANCSYSTEM, INC.": "First Interstate",
  "ASSOCIATED BANK, N.A.": "Associated",
  "ASSOCIATED BANC-CORP": "Associated",
  "FROST BANK": "Frost",
  "CULBERSON COUNTY STATE BANK": "Culberson County State",
  "WINTRUST FINANCIAL CORPORATION": "Wintrust",
  "OLD NATIONAL BANK": "Old National",
  "COLUMBIA BANKING SYSTEM, INC.": "Columbia",
  "PINNACLE FINANCIAL PARTNERS, INC.": "Pinnacle",
  "UMB FINANCIAL CORPORATION": "UMB",
  "UMB BANK, N.A.": "UMB",
  "SOUTH STATE BANK": "South State",
  "HANCOCK WHITNEY BANK": "Hancock Whitney",
  "HANCOCK WHITNEY CORPORATION": "Hancock Whitney",
  "FIRST BANCSHARES, INC.": "First Bancshares",
  "ARVEST BANK": "Arvest",
  "GLACIER BANK": "Glacier",
  "STIFEL FINANCIAL CORP.": "Stifel",
  "STIFEL BANK & TRUST": "Stifel",
  "CATHAY BANK": "Cathay",
  "CATHAY GENERAL BANCORP": "Cathay",
};

function normalizeIssuer(raw: string): string {
  const upper = raw.trim().toUpperCase();

  if (KNOWN_ISSUERS[upper]) return KNOWN_ISSUERS[upper];

  for (const [key, value] of Object.entries(KNOWN_ISSUERS)) {
    if (upper.includes(key) || key.includes(upper)) return value;
  }

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/,?\s*N\.A\.$/i, "");
  cleaned = cleaned.replace(/\s*\(USA\)/i, "");
  cleaned = cleaned.replace(/,?\s*NATIONAL ASSOCIATION$/i, "");
  cleaned = cleaned.replace(/,?\s*INC\.?$/i, "");
  cleaned = cleaned.replace(/,?\s*CORP\.?$/i, "");
  cleaned = cleaned.replace(/,?\s*CORPORATION$/i, "");
  cleaned = cleaned.replace(/,?\s*LLC$/i, "");
  cleaned = cleaned.replace(/,?\s*L\.L\.C\.$/i, "");
  cleaned = cleaned.replace(/,?\s*F\.S\.B\.$/i, "");
  cleaned = cleaned.replace(/,?\s*SSB$/i, "");
  cleaned = cleaned.trim().replace(/,\s*$/, "");

  cleaned = cleaned
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return cleaned;
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
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const lines = csvText.split("\n");
  console.log(`Total lines: ${lines.length}`);

  const header = parseCSVLine(lines[0]);
  console.log(`Columns: ${header.join(", ")}`);

  const binIdx = header.indexOf("bin");
  const issuerIdx = header.indexOf("issuer");
  const alpha2Idx = header.indexOf("alpha_2");

  if (binIdx === -1 || issuerIdx === -1 || alpha2Idx === -1) {
    throw new Error(`Missing required columns. Found: ${header.join(", ")}`);
  }

  const issuerBins: Map<string, string[]> = new Map();
  let usCount = 0;
  let withIssuer = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const bin = fields[binIdx]?.trim();
    const issuer = fields[issuerIdx]?.trim();
    const alpha2 = fields[alpha2Idx]?.trim();

    if (alpha2 !== "US") continue;
    usCount++;

    if (!issuer) continue;
    withIssuer++;

    if (!bin || bin.length < 6) continue;
    const bin6 = bin.slice(0, 6);

    const normalized = normalizeIssuer(issuer);

    if (!issuerBins.has(normalized)) {
      issuerBins.set(normalized, []);
    }
    issuerBins.get(normalized)!.push(bin6);
  }

  console.log(`\nUS entries: ${usCount}`);
  console.log(`US entries with issuer: ${withIssuer}`);
  console.log(`Unique normalized issuers: ${issuerBins.size}`);

  const ranked = [...issuerBins.entries()]
    .map(([name, bins]) => ({ name, count: bins.length, bins }))
    .sort((a, b) => b.count - a.count);

  console.log(`\nTop 50 US issuers by BIN count:`);
  const top50 = ranked.slice(0, 50);
  for (const [i, entry] of top50.entries()) {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${entry.name.padEnd(30)} ${entry.count} BINs`);
  }

  const lookup: Record<string, string> = {};
  let totalBins = 0;

  for (const entry of top50) {
    for (const bin of entry.bins) {
      if (!lookup[bin]) {
        lookup[bin] = entry.name;
        totalBins++;
      }
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
  console.log(`\nOutput: ${outPath}`);
  console.log(`Total unique BIN entries: ${totalBins}`);
  console.log(`File size: ${(fileSize / 1024).toFixed(1)} KB`);

  console.log(`\nSpot checks:`);
  const spotChecks = ["400229", "414709", "340000", "601100", "421345", "471600", "520082", "545503"];
  for (const bin of spotChecks) {
    console.log(`  ${bin} → ${sorted[bin] || "(not found)"}`);
  }

  if (ranked.length > 50) {
    console.log(`\nIssuers NOT included (next 10):`);
    for (const entry of ranked.slice(50, 60)) {
      console.log(`  ${entry.name.padEnd(30)} ${entry.count} BINs`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
