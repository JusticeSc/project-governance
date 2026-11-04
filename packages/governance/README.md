---
kind: group
description: Locate check, documentation and distribution contracts.
---

# Governance packages

English | [中文](README.zh.md)

## Summary

Locate the package that owns a check or installation operation. These packages do not depend on the CLI application. The application selects their declared public interfaces.

## Packages

| Package | Owns |
|---|---|
| [checks](checks/README.md) | Trusted policy validation, command execution and failure propagation. |
| [documentation](documentation/README.md) | Declared-corpus Markdown, pairing, package documentation and compiler-backed checks. |
| [distribution](distribution/README.md) | Runtime file selection and exclusive, non-overwriting Skill installation. |
