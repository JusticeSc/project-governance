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

`install` copies exactly the files selected by the product root `package.json` files allowlist into an existing repository seat. It refuses an existing seat, a `.agents` or `.agents/skills` parent that is a symlink, junction or file, and a target that does not exist. A failed copy removes only the seat that this run created.

`install` prints the installed seat and the copied file count, and reminds you that the seat imports its workspace packages by package name. Prepare it yourself:

```sh
cd .agents/skills/project-governance
npm ci --ignore-scripts
```

## What It Never Does

- It never creates `.governance/`, never derives checks from project files and never infers a policy.
- It never overwrites, merges or repairs an existing seat, and it writes nothing outside the target repository.
- It never adds hooks, changes project policy, and never touches remote settings, workflows or global configuration.
- It never installs dependencies: no file is fetched from the network by this command.

## Known Limitations and Deferred Work

- The seat is not runnable until its workspace dependencies are prepared with `npm ci --ignore-scripts`; the package-name imports in this command require the npm workspace links. Distribution alone does not provide a lock file if the product root does not list one in its files allowlist.
- The command has no `init`, `status` or knowledge-query subcommands; those behaviours are not part of this product.
- `check` executes the policy's command strings through the operating system shell with the current user's permissions. The policy author is trusted; sandboxing and command parsing are out of scope.
- There is no automatic discovery of a policy outside the target repository and no check registry.
- The package is private at version `0.0.0`. It is not published, and no registry, remote address or release process is claimed.
