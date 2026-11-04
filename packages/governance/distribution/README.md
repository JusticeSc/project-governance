# @project-governance/distribution

English | [中文](README.zh.md)

## Summary

Selects the files the Skill distributes and installs them into a repository seat. The public interface is `packageFiles(sourceRoot)` and `installSkill(sourceRoot, targetRoot)`, plus the `SEAT_PATH` constant. The root `package.json` files allowlist is the only selection source; there is no second list of paths in code. Installed content keeps the real workspace layout, because the runtime imports its workspace packages by package name and the seat must be prepared with `npm ci --ignore-scripts`.

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
- Requires `package.json` itself in the allowlist so an installed seat keeps its workspace manifest, and requires every root license or source-attribution notice (`LICENSE`, `LICENCE`, `SOURCE-LICENSE`, `NOTICE`, `ATTRIBUTION`, with or without an extension) to be listed so attribution travels with the content.
- Returns the file list only; it writes nothing.

`installSkill(sourceRoot, targetRoot)`:

- Validates the source selection, the existing target repository and both `.agents` and `.agents/skills` parents before the first write. A parent that is a symlink, junction or file is refused, so the seat cannot be redirected outside the target.
- Creates `SEAT_PATH` exclusively. An existing seat is never merged, overwritten or repaired.
- Copies every selected file, including any lock file the allowlist lists. If copying fails, only the seat created by this call is removed.
- Returns `{ seat, fileCount }`. It installs no dependencies, adds no hooks and changes no project policy or remote setting.

## Known Limitations and Deferred Work

- The installed seat is not runnable until its workspace dependencies are prepared with `npm ci --ignore-scripts` inside the seat. Distribution does not perform that step and does not supply a lock file unless the root allowlist lists one.
- Installation is one-shot: there is no update, upgrade, diff, uninstall or repair path. Reinstalling into the same repository fails by design; the caller must remove the seat deliberately.
- Parent directories `.agents` and `.agents/skills` are created when missing and are not removed when a later step fails; only the seat is cleaned up.
- Selection is global to the product root. There is no per-target filtering, no ignore file and no way to exclude a file that the allowlist selects.
- Copying preserves file contents and modes as given by the source tree; there is no transformation, templating or path rewriting.
- The package is private at version `0.0.0`. It is not published and claims no remote or release channel.
