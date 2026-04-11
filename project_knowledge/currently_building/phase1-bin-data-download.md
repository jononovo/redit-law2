# Phase 1: Download & Process BIN Data

## Objective
Download the open-source BIN CSV, filter to top US bank issuers only, normalize names, and produce a small static JSON lookup file at `data/bin-lookup.json`. Validate the output before proceeding to any code changes.

## Approach

### Step 1: Download the raw CSV
- Source: `https://raw.githubusercontent.com/iannuttall/binlist-data/master/binlist-data.csv`
- ~343K rows total
- Columns: bin, brand, type, category, issuer, alpha_2, alpha_3, country, latitude, longitude, bank_phone, bank_url

### Step 2: Filter criteria
- Country = US only (`alpha_2 === "US"`)
- Issuer field is non-empty
- Deduplicate: many BINs share the same issuer — we keep only unique BIN→issuer mappings

### Step 3: Identify top US issuers
Rather than keeping all ~160K entries, identify the top ~100 US bank issuers by BIN count (i.e., the banks that appear most frequently in the dataset). This covers the vast majority of cards in circulation:
- Chase / JPMorgan Chase
- Capital One
- Bank of America
- Citibank / Citi
- Wells Fargo
- American Express
- Discover
- U.S. Bank
- PNC
- TD Bank
- USAA
- Navy Federal Credit Union
- Barclays
- Goldman Sachs (Apple Card)
- Synchrony
- And ~85 more top issuers

### Step 4: Normalize issuer names
Raw data has messy names like:
- `"CAPITAL ONE BANK (USA), N.A."` → `"Capital One"`
- `"JPMORGAN CHASE BANK, N.A."` → `"Chase"`
- `"BANK OF AMERICA, N.A."` → `"Bank of America"`
- `"CITIBANK, N.A."` → `"Citi"`
- `"WELLS FARGO BANK, N.A."` → `"Wells Fargo"`
- `"U.S. BANK, N.A."` → `"U.S. Bank"`
- `"NAVY FEDERAL CREDIT UNION"` → `"Navy Federal"`
- `"USAA FEDERAL SAVINGS BANK"` → `"USAA"`
- `"GOLDMAN SACHS BANK USA"` → `"Goldman Sachs"`

Normalization rules:
1. Apply manual mapping for known top banks (exact name → clean name)
2. For remaining issuers in the top 100: strip ", N.A.", "(USA)", "BANK", "CORPORATION", "SAVINGS", "FEDERAL" suffixes, then title-case
3. Remove trailing commas, extra whitespace

### Step 5: Generate output file
- File: `data/bin-lookup.json`
- Format: `{ "400229": "Capital One", "414709": "Chase", ... }`
- Only BINs belonging to the top ~100 US issuers are included
- Expected size: well under 500KB (likely under 200KB)

### Step 6: Processing script
- File: `scripts/process-bin-data.ts`
- One-time script that:
  1. Downloads the CSV (or reads from a local temp file)
  2. Parses and filters (US only, non-empty issuer)
  3. Ranks issuers by BIN count, takes top 100
  4. Normalizes names
  5. Writes `data/bin-lookup.json`
- Can be deleted after use, but keeping it allows regeneration if the source data updates

## Validation
After generating the file, verify:
1. File size is reasonable (under 500KB)
2. Total BIN entries count
3. Spot-check known BINs:
   - `400229` → Capital One
   - `414709` → Chase
   - `340000` → American Express
   - `601100` → Discover
4. Spot-check that common test card prefixes resolve correctly
5. Confirm no duplicate BIN keys
6. Confirm all issuer names are clean (no "N.A.", no all-caps, no trailing punctuation)

## Files
| File | Action |
|------|--------|
| `scripts/process-bin-data.ts` | NEW — processing script |
| `data/bin-lookup.json` | NEW — output lookup file |

## Success criteria
- `data/bin-lookup.json` exists with clean BIN→issuer mappings
- Only top US banks included (~100 issuers)
- File is small and fast to load
- Spot-check validations pass
- Report back with: file size, entry count, top 10 issuers by BIN count, and sample lookups
