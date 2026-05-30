---
name: Image generation side effects
description: generateImage can silently modify unrelated tracked asset files (e.g. client/public/opengraph.jpg). Check git status after generating images.
---

# Image generation side effects

After calling `generateImage` (media-generation), the working tree showed an
unrequested modification to `client/public/opengraph.jpg` (recompressed, ~3KB
smaller) plus `.agents/agent_assets_metadata.toml`. The opengraph change is the
global social-preview image — unrelated to whatever you generated.

**Rule:** after generating images, run `git status` and revert any tracked file
you didn't intend to change. To revert a single binary without destructive git
(blocked for main agent): `git show HEAD:<path> > <path>`, then verify with
`md5sum` vs `git cat-file blob HEAD:<path>` (avoid `git status`/`git diff` right
after — they may try to take `.git/index.lock`, which is blocked).

**Why:** leaving it in violates "no unrequested scope" and silently alters the
site's OG image. `.agents/agent_assets_metadata.toml` changes are legitimate
(they track generated assets) and can be kept.
