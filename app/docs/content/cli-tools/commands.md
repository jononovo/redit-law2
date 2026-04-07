# Commands

## `shopy add`

Install one or more shopping skills.

```bash
npx shopy add amazon
npx shopy add amazon walmart staples
```

### Install by sector

```bash
npx shopy add --sector office
npx shopy add --sector electronics
```

Downloads all skills in the specified sector.

## `shopy search`

Search the catalog for skills matching a query.

```bash
npx shopy search "office supplies"
npx shopy search "industrial safety equipment"
```

Returns matching vendors with their ASX Score, sector, and install command.

## `shopy list`

List all installed skills.

```bash
npx shopy list
```

Shows the vendor name, version, ASX Score, and file path for each installed skill.

## `shopy update`

Update all installed skills to their latest versions.

```bash
npx shopy update
```

Skills get stale — stores change their checkout flows, APIs get updated, new payment methods appear. `shopy update` pulls the latest versions.

## `shopy remove`

Remove an installed skill.

```bash
npx shopy remove amazon
```

## Flags

| Flag | Description |
|---|---|
| `--sector <name>` | Filter by sector (used with `add` and `search`) |
| `--min-score <n>` | Only include skills with ASX Score >= n |
| `--format json` | Output results as JSON instead of table |
| `--dir <path>` | Specify the skill directory (default: `./skills/`) |
