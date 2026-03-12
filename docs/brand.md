# CreditClaw Brand Identity

CreditClaw is a fun, consumer-facing service that gives AI agents ("Claw Agents") secure spending power. The brand is playful, approachable, and designed to feel like a modern fintech product for the AI era—without the cold, corporate feel of traditional finance or the complex jargon of crypto.

## Core Identity

- **Name:** CreditClaw
- **Tagline:** Pocket money for your bots!
- **Mission:** The fun, safe way to give your OpenClaw agent an allowance.
- **Tone:** Playful, helpful, lighthearted, trustworthy, "consumer-tech" (not "enterprise-saas").

## Visual Language

The visual style is defined by "Soft Clay 3D" aesthetics, rounded geometry, and a vibrant pastel color palette. It feels tactile, friendly, and modern.

### Logo & Iconography
- **Primary Logo:** "The Golden Claw Chip" – A golden credit card EMV chip where the internal metallic lines subtly form the shape of a lobster claw.
- **Mascot:** A friendly 3D clay-style lobster (often just the claw/pincer) holding a credit card.
- **Style:** Minimalist 3D render, soft lighting, "claymation" texture, isometric views.

### Typography
We use rounded, geometric sans-serifs to maintain the friendly, modern vibe.

- **Primary Font (Headings):** `Plus Jakarta Sans`
  - Weights: Bold (700), ExtraBold (800)
  - Usage: Headlines, major calls to action, hero text.
- **Secondary Font (Body):** `Plus Jakarta Sans` (or fallback to system sans)
  - Weights: Regular (400), Medium (500)
  - Usage: Body copy, UI elements, buttons.
- **Monospace (Code/Data):** `JetBrains Mono`
  - Usage: Transaction IDs, code snippets, technical data.

### Color Palette

The palette is vibrant but soft, avoiding harsh neons. It uses a "Lobster Orange" as the primary brand color, supported by ocean blues and fun purples.

| Color Name | Hex/HSL | Usage |
| :--- | :--- | :--- |
| **Lobster Orange** | `hsl(10 85% 55%)` | Primary actions, brand accents, the "Claw" |
| **Ocean Blue** | `hsl(200 95% 60%)` | Secondary actions, trust indicators, backgrounds |
| **Fun Purple** | `hsl(260 90% 65%)` | Accents, gradients, "magic" moments |
| **Deep Navy** | `hsl(222 47% 11%)` | Primary text, strong contrast elements |
| **Soft Cloud** | `hsl(210 40% 98%)` | Page backgrounds, subtle surfaces |
| **Success Green** | `hsl(142 71% 45%)` | Validation success, positive confirmations, enabled states. Currently matches Tailwind `green-500`. |
| **White** | `#FFFFFF` | Cards, input fields, popovers |

### UI Design System ("Fun Consumer")

- **Rounded Corners:** Generous border radius (`1rem` / `16px`) on buttons, cards, and inputs.
- **Depth:** Soft, colorful shadows and backdrop blurs (`backdrop-blur-md`) to create hierarchy.
- **Glassmorphism:** Subtle transparency on navigation bars and floating elements.
- **Gradients:** Grainy, noise-textured gradients for section backgrounds (Orange → Blue → Purple).
- **Buttons:**
  - *Primary:* Solid Black or Lobster Orange with rounded full caps.
  - *Secondary:* White with subtle borders.
  - *Icon Buttons:* Circular, often transparent until hovered.

### Form Validation

All form validation across the platform uses a consistent, branded style tied to the theme's `--destructive` color variable.

| State | CSS Class | Visual |
| :--- | :--- | :--- |
| **Error** | `.form-field-error` | Red border + subtle red ring glow (`hsl(var(--destructive))`) |
| **Valid** | `.form-field-valid` | Green border + subtle green ring glow (`hsl(var(--success))`) |
| **Error text** | `.form-field-error-text` | Small red text below the field, 0.75rem, destructive color |

- Apply `.form-field-error` to any `<input>`, `<select>`, or `<textarea>` that fails validation.
- Use `.form-field-error-text` for the inline error message directly below the field.
- Use `.form-field-valid` sparingly for positive confirmation (e.g., completed card fields).
- On dark backgrounds (e.g., on-card fields), use the separate `.card-field-error` / `.card-field-valid` classes from `lib/card/card.css` which are tuned for dark surfaces.
- Prefer inline field highlighting over toast notifications for form validation errors.

## Brand Assets

- **Hero Image:** A 3D clay-style lobster claw holding a black CreditClaw card.
- **Favicon:** The Golden Claw Chip.
- **Avatars:** A mix of diverse human photos and colorful initial avatars to show community.

---
*Created: February 2026*
