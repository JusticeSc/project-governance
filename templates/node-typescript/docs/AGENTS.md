# AGENTS.md — The documentation standard

This file defines document structure, Markdown tiers, writing rules, and `verify-doc-budgets` ceilings. Use [dsh-doc](../.agents/skills/dsh-doc/SKILL.md) for placement and validation and [dsh-prose-standard](../.agents/skills/dsh-prose-standard/SKILL.md) for required coverage and editorial judgment.

## Document structure

These rules apply to human-facing documentation; [Agent Notes](../.agents/notes/README.md) remain outside their scope. A [post-mortem](postmortem/README.md) is an incident-scoped reference; chronology records evidence, not a teaching sequence. A document's subject and tree position fix its scope: describe its own subject at appropriate detail and direct children only by purpose, responsibility, and high-level behavior; link to the owning descendant for lower-level detail. Document type does not widen that scope. A reference may be exhaustive only about its own subject. Testing mechanisms, fixtures, and harnesses belong at the lowest owning level; higher documents link there.

Classify every in-scope document as a tutorial or reference. Tutorials follow an ordered path to an outcome and introduce only what each step needs. References define a lookup scope and current behavior without a teaching sequence. Separate substantial tutorial and reference content; label a section when either part is small.

Before writing a tutorial, privately classify the reader's starting knowledge and each concept as beginner, intermediate, or advanced. Establish prerequisites before dependent concepts, increase difficulty gradually, and move unnecessary advanced material to a later tutorial or reference.

Author in this order: locate the document in the tree; set its permitted detail; choose tutorial or reference; for a tutorial, order concepts by prerequisite and difficulty; relocate descendant-owned detail; replace lower-level explanations with links to their owners.

## The tier taxonomy: one home per fact

Each fact has one home: the tier whose job it is; elsewhere, link there.

| Tier | Job | Does NOT belong there |
|---|---|---|
| Root `AGENTS.md` | Standing orders an agent needs in context every session, one to three lines each, linking the home | Stories, worked examples, situational procedures, anything restated from a linked home |
| Subtree `AGENTS.md` (`packages/`, `docs/`, `.agents/notes/`) | Orders specific to that subtree | Repo-wide rules the root file already carries |
| [architecture.md](architecture.md) | Ordered map: the two workspaces, their roles, data flow, format ownership, and extension points; read before changing `packages/` or `apps/` | Type definitions (→ package READMEs and source), per-package detail (→ package READMEs), decision rationale (→ Agent Notes), implementation-status annotations |
| `docs/subsystems/` | A package group's cross-package domain model and semantics; the group README links its actual owning page, or has a justified no-page entry in `scripts/project-policy.ts` | Per-package API detail, imaginary subsystems, or an exemption copied from an unrelated group |
| [Agent Notes](../.agents/notes/README.md) | Active decision records: the why, what was given up, and required verification; `implemented/` notes describe shipped reality in the present tense | Migration plans, acceptance-task checklists, fixture walkthroughs, and spec-speak once the decision has shipped; archived notes are frozen history, never current authority |
| [defensive-patterns/](defensive-patterns/README.md) | Rules this repository enforces in review, stated as a rule plus the defect it prevents | Type definitions and semantics (→ package READMEs), decision rationale (→ Agent Notes) |
| [postmortem/](postmortem/README.md) | Incident stories — the only tier where war-story narrative belongs | — |
| [cookbook/](cookbook/adding-a-package.md) | Step-by-step how-tos with numbered verify steps | Design rationale (→ the Agent Note each guide links) |
| Package README | The per-package contract: purpose, API, side effects, limitations, and how to verify | JSDoc restatement, another package's concerns |
| [development.md](development.md) | Contributor setup, daily workflow, TypeScript layout, and check selection; a bilingual pair under the [i18n contract](i18n/README.md) | Runtime/version rationale (→ Agent Notes), gate-by-gate lists that drift from `package.json` scripts |
| [Upgrade guides](../.agents/skills/dsh-create-upgrade-guide/SKILL.md) | Release-to-release reader actions for externally observable breaks | Current API reference, internal-only changes, or fabricated migration history |
| Skills (`.agents/skills/`) | Reusable workflows and specialized decision standards | Product and runtime contracts (→ docs or source) |

Placement: bugs → post-mortems; rationale → Agent Notes; procedures → cookbooks; package contracts → READMEs; standing orders → root `AGENTS.md` with a rationale link; review-enforced rules → `defensive-patterns/`.

## Writing rules

- **Document current state.** Keep history in commits, pull requests, Agent Notes, or post-mortems. Other prose names live mechanisms, not changes or stack positions.
- **Apply the Agent Note creation criteria.** Mechanical and local edits are exempt; keep existing owning notes accurate ([scope](../.agents/notes/README.md#when-to-write-one)).
- **One physical line per paragraph** (`verify-md-wrap`): use editor soft-wrap. Code blocks, tables, and list structure keep their formatting; code comments stay under the linter's column limit.
- **Fenced `ts` examples compile.** Mark a verbatim source declaration and its original JSDoc as `ts type-equiv`; a body-stripped public class is `ts public-api`. Register either in `scripts/type-equiv.manifest.json` and follow [the projection workflow](development.md#documenting-source-contracts). An unchecked illustration uses `ts ignore-check`, not an unmarked pseudo-contract.
- **Pairs update together**: apply [translation rules](i18n/translation-rules.md) to both sides, re-record with `pnpm run verify-translation-pairing --write <pair>`, and preserve intentional untouched prose ([contract](i18n/README.md)).
- **Comments and JSDoc state complete contracts, not reasoning transcripts.** Preserve behavior, failure, timing, ownership, modality, exceptions, consequences, and non-obvious orientation; delete narration, test walkthroughs, review analysis, and code restatement. Keep the local contract and link its rationale. Use [dsh-prose-standard](../.agents/skills/dsh-prose-standard/SKILL.md) for details.
- Write directly: name actors and facts ([reference](../.agents/skills/dsh-prose-standard/SKILL.md)). Name the exact check, type, API, operation, or behavior instead of metaphorical "gate", "vocabulary", or "surface".
- **Source plane and artifact plane are different reader contracts.** Development documents must say when a command or import resolves TypeScript source through the root `paths` map, and when a consumer uses only a package's built root export. The validator publishes no `./src/*` subpath.
- **Documented types update with source.** Update the declaring package group's owning subsystem page in the same change. `verify-type-equiv` catches drift in registered pastes, not missing documentation for a new type; `verify-subsystem-pages` checks ownership, not semantic completeness.

## Wordcount budgets

[scripts/doc-budgets.manifest.json](../scripts/doc-budgets.manifest.json) sets standing-document ceilings; `pnpm run verify-doc-budgets` rejects excess or missing files.

When the gate goes red:

1. **Relocate** content that belongs in another tier; leave a one-line link if needed.
2. **Condense** content that belongs here but can be shorter.
3. **Raise** the ceiling only when the words need the space; justify the manifest diff in the change. A too-low ceiling is a budget bug.

Ceilings are guardrails, not reduction targets. At or below target, retain at least 5% headroom; above target, freeze the ceiling until relocation or condensation brings the document under target. Lower a ceiling only when the document still has room.

## The slop checklist

Hunt these in any doc; [dsh-doc](../.agents/skills/dsh-doc/SKILL.md) runs this list as an audit:

- Duplicated rules: search a distinctive phrase; keep one home and link the rest.
- History outside its permitted tier: state current facts and link the historical owner.
- Implementation-status annotations in prose or diagrams ("implemented!", "future: …"). The repository layout and package manifests carry status.
- Hand-restated catalogs, JSDoc, or inventories of tests, packages, and status when source or a generator is authoritative.
- Reasoning transcripts: step-by-step implementation narration, proof of obvious branches, test walkthroughs, or rejected local alternatives.
- Rationale repeated beside sibling methods instead of once at the owning capability.
- Paragraph walls carrying several independent rules: separate the rules or move detail to its owner.
- Emphasis inflation: reserve bold or capitals for the clause that changes behavior.
- Spec-speak in implemented Agent Notes: use the present tense for shipped facts, not migration plans or acceptance checklists.

## Package README contracts

Package README metadata, kind derivation, templates and reasoned exemptions follow the [cookbook](cookbook/adding-a-package.md#4-write-the-package-readme). `scripts/package-readme-policy.manifest.json` owns audited classifications. New kinds require their template, placement owner and focused check together.

English package README Summaries are at most 100 words; ordinary pages may use three-to-five-sentence Summaries. Agent Notes are outside these structure rules.

## References and generated documents

Use relative links for current files, tags or PRs for history. `verify-repository-references` applies `scripts/project-policy.ts` with declared provenance exclusions; `verify-md-links` checks targets and `verify-mermaid` parses diagrams, not their truth.

Regenerate [source-derived projections](package-relationships.md#updating-the-projection), never hand-edit them. Freshness is required. Published sites additionally verify built fragments, routing, language and raw-source behavior; source links alone are insufficient.

Scratch and Dev Notes are non-authoritative. At closure, promote facts, rationale and chronology to their respective owners; delete resolved chatter. Repair links atomically; preserve attribution and licenses.
