# Repository Governance

## Current status

Open Download Manager is a pre-alpha repository scaffold with no released product. The Wave 1 scaffold commit `4b2aca0` is published as the hosted `main` branch, local upstream tracking is repaired, private vulnerability reporting is enabled, exact branch protection is active, and the initial four hosted checks passed on Phase 0 commit `c747844`. The Phase 0 governance/workflow change is still awaiting independent review and merge.

This policy implements the ownership model proposed by [ADR 0003](docs/decisions/0003-continuous-validation-and-governance.md). The ADR remains Proposed until independent review and hosted default-branch merge.

## Roles

| Role                    | Current holder                                              | Responsibilities                                                                                                                              |
| ----------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository maintainer   | `@parasherdhruv`                                            | Triage contributions, maintain branch rules, review dependency and workflow changes, and keep repository status accurate.                     |
| Code owner              | `@parasherdhruv`                                            | Review paths assigned by [CODEOWNERS](.github/CODEOWNERS); ownership requests do not replace technical review.                                |
| ADR approver            | An independent code owner who did not author the ADR change | Verify authority, alternatives, security impact, synchronized documentation, tests, and merge evidence before changing an ADR to Accepted.    |
| Security-response owner | `@parasherdhruv`                                            | Monitor the private reporting route, restrict sensitive details, coordinate remediation, and add safe regression evidence.                    |
| Release approver        | None appointed                                              | Release promotion is prohibited until a later release ADR appoints authorized approvers and defines independent approval and signing custody. |

The current single-maintainer declaration means a maintainer-authored ADR cannot be accepted by self-review. A second qualified code owner must independently review it. If an owner becomes unavailable or loses hosted write access, CODEOWNERS and this document must be corrected before their review is relied upon.

## Decision process

- Keep each change bounded to one authorized milestone or independently reviewable maintenance outcome.
- Durable, security-sensitive, cross-component, or hard-to-reverse decisions require an ADR.
- A same-change ADR remains Proposed during implementation. User authorization is scope authorization, not approval.
- ADR acceptance requires independent code-owner approval, all required checks passing, and merge into the hosted default branch.
- Product, release, or security claims require the evidence specified by the governing documentation; repository automation alone is not product evidence.
- Unresolved disagreements narrow or defer the affected scope. They are not resolved by silently weakening a test or security policy.

## Required hosted controls

Hosted `main` protection was verified on 2026-11-12 to:

1. require pull requests rather than direct changes to protected `main`;
2. require an independent code-owner approval and dismiss stale approvals after relevant changes;
3. require conversation resolution;
4. require these exact checks:
   - `Windows scaffold gate`
   - `Secret scan`
   - `Rust dependency policy`
   - `JavaScript dependency policy`
5. prevent force pushes and branch deletion; and
6. keep administrators subject to the same review and check requirements except for an auditable emergency recovery.

The ruleset configuration is hosted state and cannot be proven by files in this repository. The maintainer must record its inspection during Phase 0 review. No workflow receives permission to alter these settings.

## Dependency and workflow review

- Dependabot opens proposals only; automatic merging is prohibited.
- Review manifest, lockfile, license, advisory, build-script, source, and platform impact together.
- Keep JavaScript and Cargo requirements exact where the development policy requires exact pins.
- Keep GitHub Actions on full commit SHAs. A version comment is informational and never the executable reference.
- Review every release-age exclusion and dependency-policy exception for a concrete package, reason, owner, and removal condition.
- Untrusted pull requests receive no signing, publishing, store, provider, or other repository secret.

## Vulnerability response

Suspected vulnerabilities follow [`SECURITY.md`](SECURITY.md). The hosting service's private vulnerability-reporting feature was verified enabled on 2026-11-12 and is the primary route. If it becomes unavailable, request a private channel publicly without technical details, credentials, or identifying information.

The security-response owner controls access to report details, coordinates fixes and disclosure, and avoids promises not made by the vulnerability policy. Public issues, pull requests, workflow logs, and advisory exceptions must not contain exploit details or secrets.

## Changes to governance

Changes to roles, approval thresholds, required checks, dependency policy, workflow permissions, or vulnerability ownership require code-owner review and synchronized updates to ADR 0003 and affected current-scope documentation. A local edit does not prove hosted enforcement.
