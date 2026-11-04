# Continuous integration and review ownership

[CI](workflows/ci.yml) installs the locked Node 24/pnpm 11.28.5 toolchain without dependency lifecycle scripts, provisions Python 3.10 plus the pinned review-classifier requirements, and runs the same `pnpm run check:ci` graph used locally. Full Git history and a trusted archive baseline are real prerequisites; unsupported setup must fail, not skip to a green result.

Keep the [weighted approval publisher](workflows/weighted-approval.yml) on trusted default-branch code and the [review-event handoff](workflows/weighted-approval-review-event.yml) permission-free. Never execute pull-request code in the status-writing job. Local tests do not configure remote branch rules or prove the publisher ran.

The [approval policy](review-ownership/approval-policy.json) keeps the source two-point threshold and one-point default, with no inherited organization-specific reviewer roster. Repository administrators must explicitly require the `weighted approval` status with GitHub Actions as its source and the CI aggregate in their branch rules.
