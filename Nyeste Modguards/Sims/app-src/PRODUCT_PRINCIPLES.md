# ModGuard Core Product Principles

## 1. Image-to-mod accuracy is the top priority

Preview images must correctly match the actual mod/package files. Incorrect previews are worse than missing previews.

ModGuard must not attach random images to mods, and it must not guess aggressively when confidence is low.

Accepted previews require confidence scoring across:

- filename similarity
- creator name
- mod title
- metadata and tags
- website source
- visual similarity
- related package names
- collection grouping
- overlay/addon relationships
- upload timestamps
- hash/signature matching where possible

If confidence is below the acceptance threshold, the UI must show `No verified preview found`.

## 2. Related packages must be grouped

Variants and addons such as:

- `simstrouble_FemaleHair_Sadie.package`
- `simstrouble_FemaleHair_Sadie_Declutted.package`
- `simstrouble_FemaleHair_SadieBowOverlay.package`

must resolve to one collection card when confidence supports the match. The collection should show the main item, related variants, overlays, and addons together.

## 3. Downloading must feel effortless and safe

Users should be able to search visually, inspect a mod, click download, and let ModGuard handle sandboxing, scanning, installing, conflicts, and outdated cleanup.

Downloads must never go directly into the Mods folder. They must go through sandbox and scanning first.

## 4. Universal Sims discovery is the long-term system

ModGuard should be built toward a universal Sims CC/mod search engine using whitelisted sources, crawlers, metadata indexing, embeddings, OCR, CLIP-style image matching, and preview caching.

Accuracy, trust, and safety take priority over quantity and speed.

## 5. Long-run AI indexing never stops after one pass

ModGuard must support extended indexing and validation sessions that continue in the background:

- Phase 1: initial discovery of local files, creators, categories, relationships, duplicates, conflicts, metadata, and candidate preview sources.
- Phase 2: image validation and retry focused only on preview correctness, creator matching, OCR/logo checks, filename similarity, semantic matching, and related package grouping.
- Phase 3: search quality testing with queries such as hair, furniture, toddler, skin, makeup, male hair, female hair, clothes, gameplay, and script mods.
- Phase 4: self-improvement loop using Analyze -> Test -> Retry -> Improve -> Retry Again.

Every indexed mod must carry internal quality scores for image confidence, metadata confidence, creator confidence, category confidence, source trust, and grouping confidence.

Low-confidence entries must keep retrying later. Wrong previews must stay hidden.
