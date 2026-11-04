# Defensive patterns

English | [中文](README.zh.md)

Hard-won rules: each pattern in this directory is a requirement this repository enforces in review, stated as the rule and the defect it prevents. Every rule states what must hold, the condition a reviewer judges it by, its boundary, and a correct and a wrong example. Read the page for the area you are about to change, before you change it.

## Why these rules

Five habits cover most of what follows, and each page is their application to one area:

- **Make correctness explicit.** Write it into the structure — named call points, explicit lifecycles, explicit conditions and types — rather than compensating for it afterwards with timing.
- **Keep one source of truth.** One read path for a piece of data, one home for a fact, one owner for shared state.
- **Keep the change face equal to the review face.** A change carries only the lines its stated behavior needs, and a migration moves code rather than rewriting it.
- **Require evidence.** A claim is falsifiable and recomputable — measured before and after, or checked by a test that fails on the defect — rather than kept in sync by hand.
- **Bound the complete result.** Enforce byte, count, and time limits where the complete emitted or retained value, including wrappers and metadata, is known.

| Changing | Read |
|---|---|
| Generation, fetching, caching, output writing, error handling, timing, configuration, subprocesses, teardown | [general.md](general.md) |
| Package exports, package shape, build faces, dependency declarations | [packages/AGENTS.md](../../packages/AGENTS.md) and [development.md](../development.md#typescript-project-layout) |
| The index format and its validator types | [the format Agent Note](../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) and the [package README](../../packages/util/plugin-market-index/README.md) |
| UI identity, shared controls, styling, remote contracts, recovery, derived projections or display resources | [conditional-domains.md](conditional-domains.md); activate only the rules whose objects exist |

[dsh-code-review](../../.agents/skills/dsh-code-review/SKILL.md) reads this directory when judging a pull request, and the root [AGENTS.md](../../AGENTS.md) routes changes here.
