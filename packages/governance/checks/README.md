# @project-governance/checks

English | [中文](README.zh.md)

## Summary

Runs the commands a repository configured for itself, and nothing else. The public interface is `runChecks(repository, policyPath = 'governance-checks.json')`, which returns the process exit code instead of exiting. The policy is a repository file whose `checks` object maps names to non-empty command strings. The whole policy is validated before the first command runs, then commands run in order with the repository root as their working directory. The package never writes target state, never derives commands from project files and never grants execution permission on its own.

## Contract

```js
import { runChecks } from '@project-governance/checks'

const code = runChecks('/path/to/repository') // or runChecks(repository, 'config/checks.json')
```

- `repository` must be an existing directory; it is resolved to its real path, so a legitimate alias of the same repository is accepted.
- `policyPath` is repository-relative; an absolute path is accepted only when its canonical form stays inside the repository. A policy file, or a parent directory of it, redirected outside by a symlink or junction is refused and never executed.
- The policy must be valid JSON with a `checks` object holding at least one entry, and every value must be a non-empty command string. Any violation returns `2` before any command runs.
- Each command executes through the operating system shell with the repository root as `cwd` and the current environment. Output is inherited by the caller.
- Return values: `0` every configured check passed, `1` a check returned a non-zero status or was terminated by a signal, `2` the repository, policy, path or argument could not be validated.
- Because the shell is the direct child, a signal that ends the command itself reaches this package as the shell's non-zero status; the `[observed exit …, signal …]` line names a signal only when the shell process itself is terminated by one. The exit code is `1` either way.

## Known Limitations and Deferred Work

- It writes no state at all: no result file, no baseline, no `.governance/` directory. Callers must persist results themselves if they need history.
- It does not parse project manifests, so it cannot discover toolchains or synthesize checks; an empty or absent `checks` object is a configuration error, not an invitation to guess.
- The policy author is trusted: command strings are arbitrary shell commands running with the current user's permissions. No sandbox, no allowlist of binaries and no command parsing is provided.
- There is no parallelism, retry, timeout or per-check environment override; the only supported shape is a sequential list of command strings.
- Check names are only labels for output and failure reporting; they carry no ordering or grouping semantics beyond the key order of the `checks` object.
- The package is private at version `0.0.0`. It is not published and claims no remote or release channel.
