# Bilingual documentation

English | [中文](README.zh.md)

This repository maintains its documentation in English and Simplified Chinese so readers in either language get the same facts. This page defines the pairing contract, the gate, scope, and exclusions; [translation-rules.md](translation-rules.md) defines how to translate; [terminology.md](terminology.md) is the terminology source of truth.

## The pairing contract

- **Both languages carry equal authority.** A document may be authored and reviewed in either language first, and the counterpart is translated from it. Neither file outranks the other; they must say the same thing.
- **A pair is three sibling files.** The English `foo.md`, the Chinese `foo.zh.md`, and a consistency record `foo.i18n.yaml`, all in the same directory. No locale directories, no separate translation repository, no interleaved bilingual files. A change never lands one language without the other two files.
- **The consistency record.** `foo.i18n.yaml` holds one entry per heading section that contains language-specific content. The key is the section's English heading-slug path (`/` for text before the first heading; a repeated path gets `~2`, `~3`, …), and the entry holds a hash of the English and of the Chinese blocks in that section. Section `i` of one side corresponds to section `i` of the other. Each side's hash covers every top-level block of the section except fenced code blocks and generated regions, the two kinds of content the gate requires to be identical on both sides; content that happens to be identical is still hashed. A section with no remaining blocks has no entry. Editing a code block on both sides leaves the record unchanged, and edits to different sections change separate record lines, so Git's default text merge composes them. A record conflicts only when both branches changed hashed content in the same section; resolve the Markdown and re-record the pair.

  ```yaml
  /foo:
    en: 41d772192075e133
    zh: dda91c6c670cfd9d
  /foo/usage:
    en: 86940bea4a3c7ed6
    zh: de78429597783c7f
  ```

- **Language switcher.** The Chinese file always links back immediately after its H1 with `[English](foo.md) | 中文`. An authored English file reciprocates with `English | [中文](foo.zh.md)`.
- **Structure mirrors the counterpart.** Heading depths and order, list kinds, ordered-list starts, list item counts, table row and column counts, semantic link targets with exact query/fragment suffixes, and verbatim code blocks match one to one across the pair. A relative document link uses the source side's locale: the English side names the `.md` path, the Chinese side the `.zh.md` path. A missing counterpart inside the bilingual corpus is a pair-completeness error, not a fallback; targets outside the corpus keep the authored path. Existing Markdown gates apply to `.zh.md` files unchanged (`verify-md-wrap`, `verify-md-links`).

## The gate: verify-translation-pairing

`pnpm run verify-translation-pairing` (part of `doc-sync`) enforces the contract mechanically:

1. Every document in scope has a complete pair. README discovery is case-insensitive on the basename.
2. Every pair artifact that exists at all is complete and consistent: all three files present, the record canonical and equal to the entries computed from the current contents, the Chinese backlink and authored English switcher present, every relative document link using its source side's target locale, and the structural signatures matching in order — heading depths, verbatim code blocks, table row and column counts, list kinds, ordered-list starts, item counts, and semantic link targets with exact query/fragment suffixes apart from the switcher.
3. Files listed as `excluded` have no `.zh.md` and no `.i18n.yaml`. Frozen Agent Notes under `.agents/notes/archived/` are outside this evolving gate; their dedicated verifier requires and seals the complete existing triplet instead.

`pnpm run verify-translation-pairing --list` prints the current pairing state of every document in scope — missing, out-of-sync, or ok — and never fails. `pnpm run verify-translation-pairing <pair...>` checks just the named pairs, naming any of the three files or the bare stem, so an update loop verifies its own pair in seconds; the no-argument corpus-wide form is what `doc-sync` runs, and a scoped green never substitutes for it at review time.

`pnpm run verify-translation-pairing --cached <pair...>` checks named pairs using index bytes. The installed commit and automatic merge-commit hooks use `--cached --staged` to select pairs affected by staged Markdown or record changes, including deletions and renames. They do not change the index or unstaged worktree; the full corpus check remains required.

The practical rule: **when a change edits either side of a paired document, the same change updates the counterpart in one terminology-guided pass and re-records the pair with `--write <pair>`.**

The gate's limit, stated plainly: **a green gate means the pair was confirmed consistent at these exact contents, not that the confirmation was sound.** It checks hashes and Markdown structure; it cannot judge whether the two sides say the same thing or whether the wording is accurate, well-termed, and natural — that is the reviewer's half of the contract, per [translation-rules.md](translation-rules.md).

## Scope and exclusions

**Scope**: the root `README.md`, `CONTRIBUTING.md`, and `SAFETY.md`, every non-vendor README, and every active document under `docs/**` and `.agents/notes/**`. README matching is case-insensitive on the basename and covers future directories without another manifest edit. Dependency and ignored build-output trees and the frozen `.agents/notes/archived/` tree are discovery exclusions, not evolving translation source.

**Excluded** (never paired, and the gate rejects a `.zh.md` or `.i18n.yaml` for them):

- Root `AGENTS.md`, `docs/AGENTS.md`, `.agents/notes/**/AGENTS.md`, `packages/AGENTS.md`, and their `CLAUDE.md` instruction entries — agent instructions, maintained in English only.
- `.agents/skills/**` — agent workflow definitions, maintained in English only.
- `docs/i18n/terminology.md` — bilingual by construction.
- [review-ownership/README.md](../../.github/review-ownership/README.md) and `.github/AGENTS.md` — repository-internal policy maintained in English only.
- `.agents/notes/archived/` — frozen historical triplets. [`verify-archived-agent-notes`](../../scripts/verify-archived-agent-notes.ts) validates their completeness and content seals; translation maintenance must never rewrite them.

`scripts/translation-pairing.manifest.json` contains only explicit exclusions; there is no per-file rollout list, date cutoff, or README-specific policy class. A new in-scope document merges as a complete pair.

## Division of labor

Routine counterparts are updated directly by the working agent in one terminology-guided pass; no explicit translation Skill invocation, briefing or delegation is required for that path. Patch only the edited side's changed units and preserve untouched reviewed wording; never retranslate a whole existing pair merely to apply an update. Reposition first-use annotations, review the counterpart diff clause by clause, then re-record and verify only the named confirmed pairs. Review owns quality, terminology and structural requirements the signature does not encode. A local green provides only the evidence actually exercised, not remote CI evidence.

An explicitly invoked translation workflow distinguishes an existing-pair update from a new pair. `pnpm run gen-translation-brief <pair>` briefs the last-confirmed, current authored and current counterpart units; unaligned or both-sides-changed input needs manual reconciliation. `pnpm run gen-translation-brief --apply <pair>` writes the counterpart only when all edits are inside fences originally byte-identical on both sides and the spliced result passes structure validation. It is not read-only and does not translate prose. Review its written diff before `pnpm run verify-translation-pairing --write <pair>` and `pnpm run verify-translation-pairing <pair>`. A new pair uses whole-document translation; deletion or rename carries the counterpart and record. Only explicit `--write --all` bulk-records the corpus; do not run it to hide unreviewed changes.
