# Registry API

The Skill Registry exposes several API endpoints for agents and developers to discover, search, and consume merchant skills programmatically.

## Endpoints

### Brand List — `GET /api/v1/brands`

Paginated, filterable list of all brands in the registry.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Full-text search by brand name |
| `sector` | string | Filter by sector slug (e.g. `electronics`, `apparel`) |
| `maturity` | string[] | Filter by maturity level(s): `verified`, `official`, `beta`, `community` |
| `checkout` | string[] | Filter by checkout method: `api`, `browser`, `x402`, `agentic`, `crossmint` |
| `capability` | string[] | Filter by capability: `guest_checkout`, `order_tracking`, `returns`, etc. |
| `sort` | string | Sort by: `score`, `rating`, `name`, `newest` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |
| `lite` | boolean | If `true`, returns lightweight records without full skill payloads |

**Response:** Paginated array of brand objects with identity, classification, scoring, and capability fields.

---

### Skill Registry — `GET /api/v1/registry`

Paginated list of skills formatted for agent consumption. Similar to the brands endpoint but returns skills in a standardized format.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `maturity` | string | Filter by maturity level |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

### Agent Catalog — `GET /api/v1/bot/skills`

The primary endpoint for AI agents to search the catalog at runtime. Returns formatted `VendorSkill` objects.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| `sector` | string | Sector filter |
| `checkout` | string | Checkout method filter |

---

### Raw SKILL.md — `GET /brands/{slug}/skill`

Returns the raw SKILL.md markdown for a specific brand.

- **Content-Type:** `text/markdown`
- **Cache-Control:** 24 hours (`max-age=86400`)

This is the human-readable shopping instruction file that agents can consume directly.

---

### Structured skill.json — `GET /brands/{slug}/skill-json`

Returns the structured JSON representation of a brand's skill.

- **Content-Type:** `application/json`
- **Cache-Control:** 24 hours (`max-age=86400`)

This is the machine-readable format, containing checkout methods, capabilities, search patterns, shipping info, and tips in a structured schema.

---

### Single Brand — `GET /api/v1/brands/{slug}`

Returns the full record for a single brand by slug, including all scoring, capability, and payload data.

## Authentication

Registry endpoints are public and do not require authentication. Rate limiting applies to prevent abuse.

## Pagination

All list endpoints return paginated results. Use the `page` and `limit` parameters to navigate through results. The response includes the total count for building pagination UI.

## Next steps

- [What is the Skill Registry](/docs/skill-registry/what-is-the-registry) — Overview of the registry
- [SKILL.md & skill.json](/docs/skill-registry/skill-format) — Understand the skill file formats
