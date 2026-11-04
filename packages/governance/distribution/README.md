# @project-governance/distribution

English | [中文](README.zh.md)

## Summary

Selects product distribution files and installs the self-contained Skill into a repository seat. The public interface is `packageFiles(sourceRoot)` and `installSkill(sourceRoot, targetRoot)`, plus the `SEAT_PATH` constant. `packageFiles` selects from the root `package.json` files allowlist; `installSkill` copies the `skills/project-governance/` subtree. The installed Skill's offline template installer needs no npm workspace dependencies.

## Contract

```js
import { installSkill, packageFiles, SEAT_PATH } from '@project-governance/distribution'

const files = packageFiles('/path/to/product-root')          // sorted, POSIX-style, root-relative
const { seat, fileCount } = installSkill('/path/to/product-root', '/path/to/existing-repository')
```

`packageFiles(sourceRoot)`:

- Reads `sourceRoot/package.json` and requires a non-empty `files` array of entries. Each entry is a literal file, a literal directory (copied recursively) or a glob pattern that must match at least one path.
- Rejects absolute paths, `..` segments, paths resolving outside the source root, symlinks and junctions anywhere in the selection, and patterns without matches. Missing literal paths are errors, never silently skipped.
- Skips `node_modules`, `.git`, `.hg`, `.svn`, `__pycache__`, `.cache`, `.turbo`, `.nyc_output` and `.venv` anywhere inside a selected directory.
- Requires `package.json` itself and every root license or source-attribution notice (`LICENSE`, `LICENCE`, `SOURCE-LICENSE`, `NOTICE`, `ATTRIBUTION`, with or without an extension) to be listed in the product allowlist.
- Returns the file list only; it writes nothing.

`installSkill(sourceRoot, targetRoot)`:

- Validates the Skill source subtree, including `SKILL.md`, the existing target repository and both `.agents` and `.agents/skills` parents before the first write. A source link or unsupported entry and a parent that is a symlink, junction or file are refused.
- Creates `SEAT_PATH` exclusively. An existing seat is never merged, overwritten or repaired.
- Copies the Skill subtree, not the full product distribution. If copying fails, it removes only this call's unchanged files and empty directories and reports paths it cannot safely remove.
- Returns `{ seat, fileCount }`. It installs no dependencies, adds no hooks and changes no project policy or remote setting.

## Known Limitations and Deferred Work

- Installing the Skill seat does not install the template; the Skill's installer is a separate offline step requiring Node.js >=22.19.0.
- Installation is one-shot: there is no update, upgrade, diff, uninstall or repair path. Reinstalling into the same repository fails by design; the caller must remove the seat deliberately.
- Parent directories `.agents` and `.agents/skills` are created when missing and are not removed when a later step fails; only the seat is cleaned up.
- `packageFiles` selection is global to the product root. There is no per-target filtering, no ignore file and no way to exclude a file that the allowlist selects.
- Copying preserves file contents and modes as given by the source tree; there is no transformation, templating or path rewriting.
- The package is private at version `0.0.0`. It is not published and claims no remote or release channel.
