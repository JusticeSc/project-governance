# @project-governance/cli

English | [中文](README.zh.md)

## Summary

Command entry for the project-governance Skill. `check` runs only the commands a repository configured in its own policy file, after validating the whole policy; `install` copies the Skill's distributed files into `.agents/skills/project-governance` in an existing repository. The binary is `project-governance`. It owns argument parsing, dispatch and exit codes; check and distribution decisions live in `@project-governance/checks` and `@project-governance/distribution`, imported by package name.

## Commands

```text
project-governance check [repository] [--policy path]
project-governance install <existing-repository>
project-governance --help
```

`check` defaults to the current directory and to the policy file `governance-checks.json` inside that repository. `--policy` takes a repository-relative path; an absolute path is accepted only when it still resolves inside the repository. The whole policy is validated before the first command runs, and commands then run in policy order with the repository root as their working directory. Exit code `0` means every configured check passed, `1` means a check returned a non-zero status or was terminated by a signal, and `2` means the policy, a path or an argument could not be validated — in that case nothing was executed.

`install` copies the self-contained Skill directory into an existing repository seat. It refuses an existing seat, a `.agents` or `.agents/skills` parent that is a symlink, junction or file, and a target that does not exist. On failure it removes only its own unchanged files and empty directories, reporting paths that cannot safely be removed.

`install` places the Skill, not the project template. To install the template, follow the copied Skill's instructions; its installer runs offline without npm workspace dependencies.

## What It Never Does

- It never creates `.governance/`, never derives checks from project files and never infers a policy.
- It never overwrites, merges or repairs an existing seat, and it writes nothing outside the target repository.
- It never adds hooks, changes project policy, and never touches remote settings, workflows or global configuration.
- It never installs dependencies: no file is fetched from the network by this command.

## Known Limitations and Deferred Work

- Template installation is a separate step from installing the Skill seat; it requires Node.js >=22.19.0 and a filesystem and account that permit directory symlinks.
- The command has no `init`, `status` or knowledge-query subcommands; those behaviours are not part of this product.
- `check` executes the policy's command strings through the operating system shell with the current user's permissions. The policy author is trusted; sandboxing and command parsing are out of scope.
- There is no automatic discovery of a policy outside the target repository and no check registry.
- The package is private at version `0.0.0`. It is not published, and no registry, remote address or release process is claimed.
