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
  "U.S. Bank": ["U.S. BANK", "US BANK", "U.S. BANCORP"],
  "PNC": ["PNC BANK", "PNC FINANCIAL"],
  "TD Bank": ["TD BANK", "TORONTO-DOMINION"],
  "USAA": ["USAA", "UNITED SERVICES AUTOMOBILE"],
  "Navy Federal": ["NAVY FEDERAL"],
  "Truist": ["TRUIST", "SUNTRUST", "BB&T", "BRANCH BANKING AND TRUST"],
  "Fifth Third": ["FIFTH THIRD"],
  "Citizens": ["CITIZENS BANK", "CITIZENS FINANCIAL", "RBS CITIZENS"],
  "Regions": ["REGIONS BANK", "REGIONS FINANCIAL"],
  "KeyBank": ["KEYBANK", "KEY BANK"],
  "Huntington": ["HUNTINGTON NATIONAL", "HUNTINGTON BANK", "THE HUNTINGTON"],
  "M&T Bank": ["M&T BANK", "M & T BANK", "MANUFACTURERS AND TRADERS"],
  "Ally": ["ALLY BANK", "ALLY FINANCIAL", "GMAC"],
  "Goldman Sachs": ["GOLDMAN SACHS"],
  "Barclays": ["BARCLAYS"],
  "Synchrony": ["SYNCHRONY"],
  "First Citizens": ["FIRST CITIZENS", "SILICON VALLEY BANK"],
  "Comerica": ["COMERICA"],
  "First National Omaha": ["FIRST NATIONAL BANK OF OMAHA"],
  "Comenity": ["COMENITY"],
  "Charles Schwab": ["CHARLES SCHWAB"],
  "PenFed": ["PENTAGON FEDERAL", "PENFED"],
  "Elan": ["ELAN FINANCIAL"],
  "Merrick Bank": ["MERRICK BANK"],
  "BMO": ["BMO HARRIS", "BANK OF MONTREAL", "BMO FINANCIAL"],
  "Frost": ["FROST BANK", "FROST NATIONAL"],
  "BOK Financial": ["BOKF", "BOK FINANCIAL", "BANK OF OKLAHOMA"],
  "Arvest": ["ARVEST"],
  "Commerce Bank": ["COMMERCE BANK"],
  "UMB": ["UMB BANK", "UMB FINANCIAL"],
  "Webster": ["WEBSTER BANK"],
  "Old National": ["OLD NATIONAL"],
  "Hancock Whitney": ["HANCOCK WHITNEY", "HANCOCK BANK", "WHITNEY BANK"],

  "HSBC": ["HSBC"],
  "RBC": ["ROYAL BANK OF CANADA", "RBC FINANCIAL"],
  "Scotiabank": ["SCOTIABANK", "BANK OF NOVA SCOTIA"],
  "CIBC": ["CIBC", "CANADIAN IMPERIAL"],
  "BMO Canada": ["BANK OF MONTREAL"],
  "Lloyds": ["LLOYDS BANK", "LLOYDS TSB", "LLOYDS BANKING"],
  "NatWest": ["NATWEST", "NATIONAL WESTMINSTER"],
  "Standard Chartered": ["STANDARD CHARTERED"],
  "Santander": ["SANTANDER", "BANCO SANTANDER"],
  "Deutsche Bank": ["DEUTSCHE BANK"],
  "Commerzbank": ["COMMERZBANK"],
  "BNP Paribas": ["BNP PARIBAS"],
  "Société Générale": ["SOCIETE GENERALE"],
  "Crédit Agricole": ["CREDIT AGRICOLE"],
  "ING": ["ING BANK", "ING GROUP"],
  "Rabobank": ["RABOBANK", "COOPERATIEVE RABOBANK"],
  "UBS": ["UBS"],
  "Credit Suisse": ["CREDIT SUISSE"],
  "UniCredit": ["UNICREDIT"],
  "Intesa Sanpaolo": ["INTESA SANPAOLO"],
  "Nordea": ["NORDEA"],
  "SEB": ["SKANDINAVISKA ENSKILDA"],
  "Danske Bank": ["DANSKE BANK"],
  "ANZ": ["AUSTRALIA AND NEW ZEALAND", "ANZ BANK"],
  "Westpac": ["WESTPAC"],
  "NAB": ["NATIONAL AUSTRALIA BANK"],
  "Commonwealth Bank": ["COMMONWEALTH BANK"],
  "DBS": ["DBS BANK"],
  "OCBC": ["OVERSEA-CHINESE BANKING", "OCBC BANK"],
  "UOB": ["UNITED OVERSEAS BANK", "UOB"],
  "Mizuho": ["MIZUHO"],
  "MUFG": ["MITSUBISHI UFJ", "MUFG BANK"],
  "SMBC": ["SUMITOMO MITSUI"],
  "ICBC": ["INDUSTRIAL AND COMMERCIAL BANK OF CHINA", "ICBC"],
  "Bank of China": ["BANK OF CHINA"],
  "China Construction Bank": ["CHINA CONSTRUCTION BANK"],
  "Agricultural Bank of China": ["AGRICULTURAL BANK OF CHINA"],
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

    if (!issuer || !bin || bin.length < 6) continue;

    const bankName = matchBank(issuer);
    if (!bankName) continue;

    const bin6 = bin.slice(0, 6);
    if (!bankBins.has(bankName)) bankBins.set(bankName, new Set());
    bankBins.get(bankName)!.add(bin6);
  }

  const grouped: Record<string, string[]> = {};
  for (const [bankName, bins] of bankBins) {
    grouped[bankName] = [...bins].sort();
  }

  const outPath = path.join(process.cwd(), "data", "bin-lookup.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(grouped));

  const fileSize = fs.statSync(outPath).size;
  let totalBins = 0;
  for (const bins of Object.values(grouped)) totalBins += bins.length;

  console.log(`\nFile: ${outPath}`);
  console.log(`Size: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`Total BIN entries: ${totalBins}`);
  console.log(`Banks matched: ${bankBins.size}`);

  console.log(`\nUS Banks:`);
  const usNames = new Set(["Chase","Capital One","Bank of America","Citi","Wells Fargo","American Express","Discover","U.S. Bank","PNC","TD Bank","USAA","Navy Federal","Truist","Fifth Third","Citizens","Regions","KeyBank","Huntington","M&T Bank","Ally","Goldman Sachs","Barclays","Synchrony","First Citizens","Comerica","First National Omaha","Comenity","Charles Schwab","PenFed","Elan","Merrick Bank","BMO","Frost","BOK Financial","Arvest","Commerce Bank","UMB","Webster","Old National","Hancock Whitney"]);
  const intlNames = new Set([...bankBins.keys()].filter(n => !usNames.has(n)));

  const usBanks = [...bankBins.entries()]
    .filter(([name]) => usNames.has(name))
    .map(([name, bins]) => ({ name, count: bins.size }))
    .sort((a, b) => b.count - a.count);
  for (const { name, count } of usBanks) {
    console.log(`  ${name.padEnd(25)} ${count} BINs`);
  }

  console.log(`\nInternational Banks:`);
  const intlBanks = [...bankBins.entries()]
    .filter(([name]) => intlNames.has(name))
    .map(([name, bins]) => ({ name, count: bins.size }))
    .sort((a, b) => b.count - a.count);
  for (const { name, count } of intlBanks) {
    console.log(`  ${name.padEnd(25)} ${count} BINs`);
  }

  const whitelistNames = new Set(Object.keys(BANK_WHITELIST));
  const matched = new Set(bankBins.keys());
  const unmatched = [...whitelistNames].filter(n => !matched.has(n));
  if (unmatched.length > 0) {
    console.log(`\nBanks in whitelist with 0 matches:`);
    for (const name of unmatched) {
      console.log(`  ${name}`);
    }
  }

  console.log(`\nSample lookups:`);
  const samples = ["438857", "400229", "340000", "601100", "471600", "431261"];
  for (const bin of samples) {
    let found = "(not found)";
    for (const [bankName, bins] of Object.entries(grouped)) {
      if (bins.includes(bin)) { found = bankName; break; }
    }
    console.log(`  ${bin} → ${found}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
