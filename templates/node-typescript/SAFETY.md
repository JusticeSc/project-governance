# Safety

English | [中文](SAFETY.zh.md)

## Scope and guarantees

This template installs engineering infrastructure, not a business application or a security boundary. It cannot establish that a project, dependency, CI workflow, or generated artifact is safe; each gate establishes only its stated predicate. Read the owning instructions and inspect command effects before using it in a project with sensitive data or release credentials.

## Commands and external services

Repository scripts run with the permissions of the invoking account. Review commands before running them in privileged, production, or credentialed environments. Use least privilege for local tools, CI tokens, Git credentials, package registries, and remote services. Never commit secrets or copy them into logs or fixtures.

## Files and persistent data

Template installation does not reconcile conflicts or install dependencies and hooks. Protect existing content and merge conflicts deliberately. Before migrations or destructive operations, preserve affected data and verify a restore path. `verify-persistence` checks declared type-history consistency; it does not prove runtime compatibility, migration safety, or recoverability.

## Responsible use

Use systems, repositories, package registries, and credentials only with authorization. Test changes against isolated data before production. Publishing or changing remote and host configuration requires separate authorization.

## No warranty or liability

Use the software with an understanding of its risks. It is provided under the [MIT License](LICENSE) without warranty. To the maximum extent permitted by law, the authors and copyright holders are not liable for computer damage, data loss or disclosure, lost files, or other harm arising from its use.
