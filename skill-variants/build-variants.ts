import * as fs from "fs";
import * as path from "path";

interface VariantConfig {
  source: string;
  urlPrefix: string;
  overrides: Record<string, string>;
  skillJsonOverrides: Record<string, string>;
  titleOverride?: string;
  extraFiles?: string[];
}

const VARIANTS_DIR = path.resolve("skill-variants");
const BASE_URL = "https://creditclaw.com";

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Could not parse frontmatter");
  }
  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }
  return { frontmatter, body: match[2] };
}

function serializeFrontmatter(frontmatter: Record<string, string>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

function rewriteUrls(body: string, urlPrefix: string): string {
  const escapedBase = BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escapedBase})/([a-zA-Z0-9_-]+\\.(?:md|json))`, "g");
  let result = body.replace(pattern, `$1/${urlPrefix}/$2`);
  const barePattern = new RegExp(`(creditclaw\\.com)/([a-zA-Z0-9_-]+\\.(?:md|json))`, "g");
  result = result.replace(barePattern, (match, domain, file) => {
    if (match.includes(`${urlPrefix}/`)) return match;
    return `${domain}/${urlPrefix}/${file}`;
  });
  return result;
}

function replaceTitle(body: string, newTitle: string): string {
  return body.replace(/^# .+$/m, `# ${newTitle}`);
}

function generateSkillFilesTable(files: string[], urlPrefix: string): string {
  const FILE_PURPOSES: Record<string, string> = {
    "skill.md": "Registration, setup, webhooks, status, spending permissions, API reference",
    "heartbeat.md": "Lightweight polling routine for balance and spending checks",
    "encrypted-card.md": "Encrypted card checkout — sub-agent flow, card delivery, decryption, confirmation",
    "stripe-x402-wallet.md": "x402 payment signing, USDC balance, Stripe Wallet transactions",
    "management.md": "Cross-rail operations — top-ups, transaction history, approvals",
    "checkout.md": "Sell to anyone — checkout pages, payment links, invoices, shops",
    "crossmint-wallet.md": "Crossmint-managed purchases for supported merchants",
    "spending.md": "Spending permissions, guardrails, and approval modes",
    "shopping.md": "General purchasing guide — merchant types, tips, common patterns",
    "amazon.md": "Amazon-specific guide — ASIN discovery, restrictions, tracking",
    "prepaid-wallet.md": "Pre-paid Wallet — purchase flow, merchant formats, order tracking",
    "self-hosted-card.md": "Self-Hosted Card — checkout flow, approval, multi-card handling",
    "description.md": "High-level vendor description and maturity summary",
  };

  const rows: string[] = [];
  rows.push("| File | URL | Purpose |");
  rows.push("|------|-----|---------|");

  const skillUrl = `\`${BASE_URL}/${urlPrefix}/skill.md\``;
  rows.push(`| **SKILL.md** (this file) | ${skillUrl} | ${FILE_PURPOSES["skill.md"]} |`);

  const sortedFiles = files
    .filter((f) => f !== "skill.md" && f !== "skill.json")
    .sort();

  for (const file of sortedFiles) {
    const displayName = `**${file.toUpperCase().replace(".MD", ".md").replace(".md", ".md").split(".")[0]}.md**`;
    const url = `\`${BASE_URL}/${urlPrefix}/${file}\``;
    const purpose = FILE_PURPOSES[file] || "Supporting documentation";
    rows.push(`| ${displayName} | ${url} | ${purpose} |`);
  }

  const jsonUrl = `\`${BASE_URL}/${urlPrefix}/skill.json\``;
  rows.push(`| **package.json** (metadata) | ${jsonUrl} | Machine-readable skill metadata |`);

  return rows.join("\n");
}

function generateInstallCommands(files: string[], urlPrefix: string): string {
  const lines: string[] = [];
  lines.push("```bash");
  lines.push(`mkdir -p ~/.creditclaw/skills/${urlPrefix}`);

  const allFiles = ["skill.md", ...files.filter((f) => f !== "skill.md" && f !== "skill.json").sort(), "skill.json"];

  for (const file of allFiles) {
    const url = `${BASE_URL}/${urlPrefix}/${file}`;
    const destName = file === "skill.md" ? "SKILL.md" : file === "skill.json" ? "package.json" : file.toUpperCase().replace(".MD", ".md").replace(".md", ".md").split(".")[0] + ".md";
    const finalName = file === "skill.json" ? "package.json" : destName;
    lines.push(`curl -s ${url} > ~/.creditclaw/skills/${urlPrefix}/${finalName}`);
  }

  lines.push("```");
  return lines.join("\n");
}

function replaceSkillFilesSection(body: string, files: string[], urlPrefix: string): string {
  const newTable = generateSkillFilesTable(files, urlPrefix);
  const tablePattern = /## Skill Files\n\n\| File \| URL \| Purpose \|\n\|[-]+\|[-]+\|[-]+\|\n(?:\|[^\n]+\|\n?)*/;
  if (tablePattern.test(body)) {
    body = body.replace(tablePattern, `## Skill Files\n\n${newTable}`);
  }

  const installPattern = /Follow your human's instructions on how to manage and save skill files\. If unsure, you can install locally:\n```bash\n[\s\S]*?```/;
  const masterInstallPattern = /\*\*Read these files directly from the URLs above — no local installation needed\.\*\*/;

  const installBlock = `Follow your human's instructions on how to manage and save skill files. If unsure, you can install locally:\n${generateInstallCommands(files, urlPrefix)}\n\nOr just read them directly from the URLs above.`;

  if (installPattern.test(body)) {
    body = body.replace(
      /Follow your human's instructions on how to manage and save skill files\. If unsure, you can install locally:\n```bash\n[\s\S]*?```\n\nOr just read them directly from the URLs above\./,
      installBlock
    );
  } else if (masterInstallPattern.test(body)) {
    body = body.replace(masterInstallPattern, installBlock);
  }

  return body;
}

function generateSkillJson(
  masterJson: Record<string, any>,
  overrides: Record<string, string>,
  files: string[],
  urlPrefix: string
): Record<string, any> {
  const result = { ...masterJson, ...overrides };

  const filesMap: Record<string, string> = {};
  filesMap["SKILL.md"] = `${BASE_URL}/${urlPrefix}/skill.md`;

  const sortedFiles = files.filter((f) => f !== "skill.md" && f !== "skill.json").sort();
  for (const file of sortedFiles) {
    const key = file.toUpperCase().replace(".md", ".md").split(".")[0] + ".md";
    const upperKey = file.split(".")[0].toUpperCase() + ".md";
    filesMap[upperKey] = `${BASE_URL}/${urlPrefix}/${file}`;
  }
  filesMap["HEARTBEAT.md"] = `${BASE_URL}/${urlPrefix}/heartbeat.md`;

  result.files = filesMap;
  return result;
}

function buildVariant(variantName: string, variantDir: string): void {
  const configPath = path.join(variantDir, "variant.config.json");
  if (!fs.existsSync(configPath)) {
    console.log(`  ⚠ Skipping ${variantName}: no variant.config.json found`);
    return;
  }

  const config: VariantConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const sourceDir = path.resolve(config.source);

  if (!fs.existsSync(sourceDir)) {
    console.log(`  ⚠ Skipping ${variantName}: source directory "${config.source}" not found`);
    return;
  }

  const masterSkillMd = fs.readFileSync(path.join(sourceDir, "skill.md"), "utf-8");
  const masterSkillJson = JSON.parse(fs.readFileSync(path.join(sourceDir, "skill.json"), "utf-8"));

  const allSourceFiles = fs.readdirSync(sourceDir).filter((f) => {
    const fullPath = path.join(sourceDir, f);
    return fs.statSync(fullPath).isFile() && (f.endsWith(".md") || f.endsWith(".json"));
  });

  const { frontmatter, body } = parseFrontmatter(masterSkillMd);
  const patchedFrontmatter = { ...frontmatter, ...config.overrides };

  let patchedBody = rewriteUrls(body, config.urlPrefix);

  if (config.titleOverride) {
    patchedBody = replaceTitle(patchedBody, config.titleOverride);
  }

  patchedBody = replaceSkillFilesSection(patchedBody, allSourceFiles, config.urlPrefix);

  const finalSkillMd = serializeFrontmatter(patchedFrontmatter) + patchedBody;

  const finalSkillJson = generateSkillJson(masterSkillJson, config.skillJsonOverrides, allSourceFiles, config.urlPrefix);

  const distDir = path.join(variantDir, "dist");
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  fs.writeFileSync(path.join(distDir, "skill.md"), finalSkillMd);
  fs.writeFileSync(path.join(distDir, "skill.json"), JSON.stringify(finalSkillJson, null, 2) + "\n");

  for (const file of allSourceFiles) {
    if (file === "skill.md" || file === "skill.json") continue;
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(distDir, file);
    if (file.endsWith(".md")) {
      let content = fs.readFileSync(srcPath, "utf-8");
      content = rewriteUrls(content, config.urlPrefix);
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  if (config.extraFiles && config.extraFiles.length > 0) {
    for (const extraFile of config.extraFiles) {
      const extraPath = path.join(variantDir, extraFile);
      if (fs.existsSync(extraPath)) {
        const destPath = path.join(distDir, extraFile);
        const destDir2 = path.dirname(destPath);
        if (!fs.existsSync(destDir2)) {
          fs.mkdirSync(destDir2, { recursive: true });
        }
        fs.copyFileSync(extraPath, destPath);
      } else {
        console.log(`  ⚠ Extra file not found: ${extraFile}`);
      }
    }
  }

  const distFiles = fs.readdirSync(distDir);
  console.log(`  ✓ ${variantName}: ${distFiles.length} files → ${path.relative(process.cwd(), distDir)}/`);
  for (const f of distFiles.sort()) {
    console.log(`    - ${f}`);
  }
}

function main(): void {
  console.log("Building skill variants...\n");

  if (!fs.existsSync(VARIANTS_DIR)) {
    console.error(`Error: ${VARIANTS_DIR} directory not found`);
    process.exit(1);
  }

  const variants = fs
    .readdirSync(VARIANTS_DIR)
    .filter((entry) => {
      const fullPath = path.join(VARIANTS_DIR, entry);
      return fs.statSync(fullPath).isDirectory() && entry !== "node_modules";
    })
    .sort();

  if (variants.length === 0) {
    console.log("No variant directories found.");
    return;
  }

  console.log(`Found ${variants.length} variant(s): ${variants.join(", ")}\n`);

  for (const variant of variants) {
    buildVariant(variant, path.join(VARIANTS_DIR, variant));
  }

  console.log("\nDone.");
}

main();
