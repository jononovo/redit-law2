# Skill Variants & Auto-Publish Setup Instructions

These instructions explain how to add the skill variant system and GitHub Actions auto-publishing to the CreditClaw repo. This accompanies two zip files that contain the necessary folders.

---

## Background

We built a system that:

1. **Generates variant skill packages** from the master skill files in `public/`. Each variant (stripe, creditcard, amazon, shopping) gets its own copy of the skill files with customized names, descriptions, URLs, and titles — all driven by a simple config file per variant.

2. **Auto-publishes the main skill to ClawHub** whenever skill files are updated on `main`. This is handled by a GitHub Actions workflow that detects changes to `public/*.md` and `public/*.json`, extracts the version from the frontmatter, and runs `clawhub publish` with the correct flags.

3. **Variant auto-publishing is ready but disabled.** Once the main skill publishing is confirmed working, variant publishing can be turned on by uncommenting a few lines in the workflow file (documented below and in `DEPLOYMENT.md`).

---

## What's in the Zip Files

### `skill-variants.zip`

Place the contents at the project root so the structure is:

```
skill-variants/
  DEPLOYMENT.md              ← full documentation for the build + deploy system
  SETUP-INSTRUCTIONS.md      ← this file
  stripe/
    variant.config.json      ← config for the stripe variant
    dist/                    ← generated output (gitignored)
  creditcard/
    variant.config.json
    dist/
  amazon/
    variant.config.json
    dist/
  shopping/
    variant.config.json
    dist/
```

### `github.zip`

Place the contents at the project root so the structure is:

```
.github/
  workflows/
    publish-skills.yml       ← GitHub Actions workflow for auto-publishing
```

---

## Setup Steps

### 1. Add the folders to the repo

Extract both zip files into the project root. The `skill-variants/` folder and `.github/` folder should sit alongside `public/`, `src/`, etc.

### 2. Update `.gitignore`

Add this line to `.gitignore` if it's not already there:

```
skill-variants/*/dist/
```

This prevents the generated variant output from being committed. The `dist/` folders are rebuilt from master files every time.

### 3. Make sure `scripts/build-variants.ts` exists

The build script should already be in the repo at `scripts/build-variants.ts`. If it's missing, it needs to be restored — this is the script that reads each variant config and generates the output files.

### 4. Add the ClawHub token to GitHub

1. Log into clawhub.ai and copy your CLI token from account settings
2. In the GitHub repo, go to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `CLAWHUB_TOKEN`
5. Value: paste the CLI token
6. Click **Add secret**

### 5. Push to main

Once the `.github/workflows/publish-skills.yml` file is on `main`, GitHub will start watching for skill file changes. The workflow triggers automatically when files in `public/*.md` or `public/*.json` are modified.

### 6. Test it

Make a small edit to `public/skill.md` (bump the version number), commit, and push to `main`. Check the **Actions** tab in GitHub to see the workflow run. If it succeeds, check clawhub.ai to confirm the skill updated.

---

## How the Auto-Publish Works

The workflow at `.github/workflows/publish-skills.yml`:

1. **Triggers only on skill file changes** — edits to app code, frontend, backend, etc. do NOT trigger it
2. **Extracts `name` and `version`** from `public/skill.md` frontmatter using grep
3. **Runs the publish command:**
   ```bash
   clawhub publish ./public \
     --slug creditclaw \
     --version <extracted version> \
     --tags latest \
     --no-input
   ```
4. The `--no-input` flag handles the MIT-0 license acceptance automatically in CI
5. The existing display name on ClawHub ("CreditClaw - Give your Claw spending power (Powered by Stripe)") is preserved — we don't pass `--name` so it won't be overwritten
6. ClawHub auto-generates the changelog, so we don't pass `--changelog`

### Important: Version Bumping

Every publish to ClawHub requires a **new version number**. If you push changes to skill files without bumping the `version` field in `public/skill.md`, the publish will fail. The current version on ClawHub is 2.2.1, and `skill.md` has version 2.5.0, so the first automated publish will work. After that, bump the version each time.

---

## Enabling Variant Publishing (Later)

Once the main skill is publishing correctly, enable variants by editing `.github/workflows/publish-skills.yml`:

**Step 1:** Uncomment the path triggers (near the top, around lines 9-10):

```yaml
# Before:
      # - 'skill-variants/**/variant.config.json'
      # - 'scripts/build-variants.ts'

# After:
      - 'skill-variants/**/variant.config.json'
      - 'scripts/build-variants.ts'
```

**Step 2:** Uncomment the entire `publish-variants` job block (around lines 45-89). Remove the `#` from every line in that section.

**Step 3:** Commit and push. Variants will now auto-build and auto-publish alongside the main skill.

Full details are in `DEPLOYMENT.md`.

---

## How to Build Variants Manually

Run this from the project root:

```bash
npx tsx scripts/build-variants.ts
```

This generates output in each variant's `dist/` folder. You can then manually publish any variant:

```bash
clawhub publish ./skill-variants/stripe/dist \
  --slug creditclaw-stripe --version 2.3.1 --tags latest
```

---

## Summary

| What | Where | Status |
|------|-------|--------|
| Master skill files | `public/` | Source of truth — edit here |
| Variant configs | `skill-variants/<name>/variant.config.json` | One config per variant |
| Build script | `scripts/build-variants.ts` | Generates all variant outputs |
| GitHub Actions workflow | `.github/workflows/publish-skills.yml` | Auto-publishes on skill changes |
| Main skill auto-publish | Enabled | Triggers on `public/` changes |
| Variant auto-publish | Disabled (commented out) | Enable when main skill is verified |
| ClawHub token | GitHub secret `CLAWHUB_TOKEN` | Required for publishing |
