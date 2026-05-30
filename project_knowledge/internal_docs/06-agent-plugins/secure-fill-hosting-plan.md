# SecureFill — hosting plan (docs + privacy on CreditClaw)

Status: done. Pages live at `/securefill` and `/securefill/privacy`; footer link added; manifest icons wired; store assets generated.

## Goal

The SecureFill Chrome extension needs a public docs page and a publicly hosted
privacy policy URL (Chrome Web Store requirement). Decision: **option 2** — no
new tenant, no new domain. Host both as official CreditClaw pages and put the
privacy URL in the store listing. Reuse existing CreditClaw public-page
conventions; add zero new components.

## Pages

- `app/securefill/page.tsx` — overview/docs. Modeled on `app/safety/page.tsx`
  (dark `bg-neutral-900` hero + clay feature/step cards). Sections: hero, how it
  works (3 steps), what it guarantees vs not (security boundary), install/connect
  steps, link to privacy.
- `app/securefill/privacy/page.tsx` — privacy policy. Modeled on
  `app/privacy/page.tsx` (dark hero + numbered prose sections). Content lifted
  from `plugins/secure-fill-extension/PRIVACY.md`.

Both are thin server components following the established page shell:
`min-h-screen bg-background … font-sans` wrapping `<AnnouncementBar/> <Nav/>
<main>…</main> <Footer/>`. Each adds a minimal `export const metadata` title.

## Reuse (no new components, no new CSS)

- `components/nav.tsx`, `components/footer.tsx`, `components/announcement-bar.tsx`.
- Existing clay Tailwind classes: dark hero with blur orbs + `/assets/noise.svg`,
  `rounded-3xl bg-neutral-50 border border-neutral-100` cards, `lucide-react`
  icons, `text-primary` accents, `prose`-style numbered sections.
- CreditClaw theme tokens + Plus Jakarta Sans (already injected by
  `app/layout.tsx` + tenant config).

## Footer discoverability

One-line config edit in `public/tenants/creditclaw/config.json` → footer
"Resources" column gains `{ "label": "SecureFill Extension", "href":
"/securefill" }`. Config-driven; no component change.

## Store images (full set)

Generated via media-generation (soft 3D clay, pastel coral/blue/lavender,
neutral — no card imagery, no baked-in text since text renders unreliably):

- 128×128 store icon → also wired into the extension manifest (16/48/128),
  closing the icon TODO in `STORE-LISTING.md`.
- 1280×800 explainer (also used as the docs-page hero image).
- 440×280 small promo tile.

Raw gen at nearest aspect, then resized/cropped to exact Chrome dimensions with
ImageMagick. Submission assets land in
`plugins/secure-fill-extension/store-assets/`; the explainer is copied to
`public/assets/securefill/` for the docs page.

## Copy rule

Public pages stay neutral (no card/CVV/payment vocabulary) to match the
extension listing and because Google reviewers may visit the privacy URL.
Publisher = CreditClaw is fine; the *product naming* is what stays generic.

## Double-check: will this solve it without breaking anything?

- **Solves it:** Chrome needs a public privacy URL + a listing/explainer image;
  this produces `creditclaw.com/securefill/privacy`, a docs page, and the full
  image set. ✓
- **Routing safety:** `middleware.ts` does hostname→tenant only, no path
  gating/rewrites; new App Router routes resolve like existing `/privacy` etc.
  No middleware change. ✓
- **No regression surface:** purely additive — two new route files, one footer
  config line, one manifest icons block, new asset files. Touches no shared
  engine, no API path, no existing page. ✓
- **Cross-tenant note:** `/securefill` also resolves on shopy/brands hostnames
  (same as `/privacy`/`/safety` today). Accepted existing behavior, not a
  regression; only CreditClaw links to it.
- **Image text caveat:** generated images avoid relying on rendered text; the
  store caption carries the words.
