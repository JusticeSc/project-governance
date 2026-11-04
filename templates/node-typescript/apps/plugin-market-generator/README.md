# Plugin market index generator

English | [中文](README.zh.md)

A reference generator for [plugin market index](../../.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md) files. It reads a plain list of npm package names and Git repository URLs and writes one `index.json` that a market page can render without further requests. It is a standalone Node program, not a plugin host, and it never installs or runs the code of the packages it describes.

## Usage

Write a source list, one entry per line. Blank lines and lines starting with `#` are ignored.

```text
# npm packages: every non-deprecated bundle version is listed
@scope/example-plugin
example-plugin
# Git repositories: release tags and the default branch are listed
https://github.com/author/example-plugins
https://gitlab.example.com/group/example-plugins
```

Run the generator from the repository:

```sh
pnpm start --input plugins.txt --output site/index.json --title "Example Market"
```

`--input` and `--output` are resolved relative to the directory where you run pnpm. Publish the output directory over HTTPS and point the market at `index.json`.

| Option | Default | Meaning |
|---|---|---|
| `--input <file>` | required | Source list. |
| `--output <file>` | required | Index file. Icons too large to inline are written to `icons/` next to it; generated icon files the index no longer uses are removed from there. |
| `--title <text>` | required | Market title. |
| `--description <text>` | none | Market description. |
| `--cache <dir>` | `.plugin-market-cache` next to the input list | Result cache. It stays out of the output directory, which is published. |
| `--registry <url>` | `https://registry.npmjs.org/` | npm registry. Any other registry is recorded in each npm version. |
| `--inline-icon-bytes <n>` | `16384` | Largest icon embedded as a `data:` URL, at most 32768, the format's inline icon limit. |
| `--concurrency <n>` | `4` | Sources read at the same time. |
| `--timeout-ms <n>` | `60000` | Deadline for one request or Git command. |
| `-h`, `--help` | | Print these options and the exit statuses. |

The exit status is 0 when every source was read, 1 when a source could not be read, and 2 for invalid arguments or an invalid list. A list line that the index format would reject, such as an `http:` URL, a URL with credentials, a query, or a fragment, a URL with fewer than two path segments, or a tarball URL, is an invalid list. An unreadable source reuses its last successful result when a valid current-format cache record exists; otherwise it contributes no plugins. The failure is reported in either case.

## What gets listed

Each package becomes one plugin with one or more versions. A version is listed only when its `package.json` declares `dsh.bundle` with `patch` set to a file path or a list of file paths.

- **npm package**: every version in the registry document that is not deprecated, declares a bundle, and has a publish time. Versions come from the registry document alone; only the tarball of the highest listed version is downloaded, for its display fields. Its `package.json` must name the requested package and version.
- **Git repository**: bundle packages are found on the default branch, in this order:
  1. the root `package.json` declares `dsh.bundle`: the root package only;
  2. `package.json` `workspaces` or `pnpm-workspace.yaml` `packages` match packages that declare `dsh.bundle`: those packages. Each glob segment is a literal name, a name with `*`, or `**`; negated globs are ignored, and a glob that matches nothing is reported;
  3. otherwise, every package declaring `dsh.bundle` within three directory levels, outside `node_modules`, `test`, `tests`, `fixtures`, `example`, and `examples`.

  Each package's versions come from release tags and the default branch. A `vX.Y.Z` or `X.Y.Z` tag applies to every package, and a `<name>@X.Y.Z` tag, such as `@scope/example@1.2.0`, to the package with that name; the tag version must be an exact SemVer version, and build metadata is preserved. A tag lists a package when the package's directory at the tagged commit holds a bundle manifest with the same name and the tag's version. The default branch commit lists each package's current version unless a tag already lists it. When several tags list one version, a `<name>@` tag wins over a unified tag, then the earlier commit wins. The publish time is the commit's committer time.

Each listed version must declare a non-blank, valid npm SemVer range in `engines.dsh`; the generator copies it unchanged. `*` explicitly supports any DSH version. A missing, blank, or invalid declaration skips that version with a warning; peer dependencies are not used as a fallback. For npm sources, `dist-tags` retains registry channel mappings only when the target version is listed. Git release tags identify versions but do not themselves supply channel mappings.

Display fields come from the highest listed version. `./locale/en.json` and `./locale/<language>.json` are resolved through the package `exports` map with the `import`, `node`, and `default` conditions, or literally without one, and every locale file must sit in the English file's directory; their `meta.title` and `meta.description` fall back to the manifest `name` and `description`. The icon is the manifest `icon`, a relative path, or else the exported `./icon`: SVG, PNG, JPEG, or WebP, at most 256 KiB, inside the package. `author` is the name part of the manifest `author` string, without its `<email>` and `(url)`, or the `name` of an author object. `homepage` is the manifest `homepage` as written when it is an absolute `https:` or `http:` URL. `repository` is the manifest `repository` with its `directory` when the value names a web-addressable repository.

`metadata.keywords` is an optional array of strings for discovery. npm `package.json` `keywords` is the convention; index generators may supplement or adjust it. This generator copies the highest listed version's manifest `keywords` unchanged, including empty strings, duplicates, and an empty array. An absent field is omitted; a non-array value or an array containing any non-string produces a warning and omits the whole field without dropping the package.

When several sources produce the same package name, the first one in the list wins.

## Caching and repeated runs

Each run reads the registry document of every npm source and the refs of every Git repository. Results are cached by input: an npm plugin per registry, icon threshold, package, set of listed versions, and retained channel mappings; a Git repository per default branch commit and release tags; and each Git package per commit and directory. A Git run therefore fetches only the commits whose packages are not cached. Cache files are written atomically, and a cache file that is damaged or that the index format rejects is rebuilt. Output is deterministic: entries follow the list order, and the index and icon files are rewritten only when their contents change, so running the generator again without upstream changes leaves the output untouched.

Changes to the cache format can make earlier records unavailable, including the last-success fallback. Run the upgraded generator successfully before relying on that fallback during an outage.

The format-validation correction advances the cache identity to version 9. Version-8 results, including cached omissions and last-success records, are not reused; the next successful run rebuilds them under the corrected rules. Existing files are not deleted.

## Security

The generator downloads and reads files only. npm tarballs are read in memory: a tarball and its unpacked files may not exceed 64 MiB each, the bytes must match the registry integrity hash, and only regular files outside `node_modules` are kept, without paths that leave the package. Git objects are fetched with depth 1 into a private temporary bare repository and read as blobs, so no working tree exists and no checkout filter, LFS download, or symbolic link takes effect; symbolic links and submodules count as absent. Git runs with hooks and the file-system monitor disabled, no submodules, only the https and ssh transports, and without inherited `GIT_*` variables except `GIT_SSH` and `GIT_SSH_COMMAND`. Your ssh program and `GIT_SSH_COMMAND` keep precedence.

Index content is what the packages claim about themselves. Review the list you publish: a listed repository can use any package name. Registry tokens from `.npmrc` are not applied, and Git never prompts for credentials.

## Limits

- A Git server must allow fetching a commit by its SHA, as GitHub, GitLab, and Gitea do. When a server refuses, the generator fetches the tags and the default branch by name, which fails if a ref moved after it was listed.
- Registry tokens from `.npmrc` are not applied; only public or unauthenticated registries work.
- Git never prompts for credentials. A repository that needs them must be readable through a credential helper or an ssh agent.

## Development

Build and run the emitted app with `pnpm run build` and `pnpm start:built --input ...`; see the [development guide](../../docs/development.md) for checks and the [testing policy](../../docs/testing.md) for required evidence.
