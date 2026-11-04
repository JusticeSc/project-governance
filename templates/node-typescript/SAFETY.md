# Safety

English | [中文](SAFETY.zh.md)

## Experimental status

This toolkit is developer-preview software. It has not undergone a security audit and must not be treated as secure or production-ready.

The generator reads remote package and repository data and writes files to paths you choose. It does not execute package code, install packages, or check out a working tree, but defects, malicious package metadata, an untrusted registry, or an untrusted Git server can still produce a misleading index or expose data.

## What the tools access

- **Network.** The generator requests npm registry documents and tarballs, and runs Git against each listed repository. It applies no registry tokens from `.npmrc`, and Git never prompts for credentials; a private repository must be readable through a credential helper or an SSH agent.
- **Local files.** It reads the source list, writes the index, writes large icons under `icons/` beside it, and maintains a cache beside the input list. It removes only generated icon files it recognizes in that output directory.
- **Package content.** Tarballs are read in memory under a size limit and an integrity check. Git objects are fetched into a private temporary bare repository and read as blobs; hooks, the file-system monitor, submodules, and all transports except HTTPS and SSH are disabled, and inherited `GIT_*` variables are dropped except `GIT_SSH` and `GIT_SSH_COMMAND`.

## Trust boundaries

An index is unauthenticated data. Titles, authors, labels, scores, package names, versions, and `engines` values are claims made by the package or the market; a listed repository can claim any package name. Review the source list and the rendered index before you publish it, and publish over HTTPS. Clients must show the index URL and each version's install source.

The validator checks the document structure and rules; it cannot verify that a version's metadata matches the package it describes, or that the package is safe. It also does not bound document size; the caller must.

## Responsible use

- Grant the process only the file-system, network, and Git access it needs.
- Prefer a disposable environment when reading untrusted repositories.
- Keep backups of output and cache directories that the tool can modify.
- Do not publish credentials or private repository URLs in a source list or index.
- Review generated icons and localized text before publishing them.

## No warranty or liability

Use this software at your own risk. It is provided without warranty under the [MIT License](LICENSE). To the maximum extent permitted by applicable law, the authors and copyright holders are not responsible for damage to computers, loss or disclosure of data, loss of files, or other harm arising from use of the project.
