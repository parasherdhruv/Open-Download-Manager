# Documentation Index

## Current status

Open Download Manager is at the **buildable repository scaffold / pre-alpha** milestone. Wave 1 workspace metadata, locks, zero-feature application surfaces, API-free crates, scaffold tests, and local command gates are committed at `4b2aca0`, published as hosted `main`, and locally verified. Roadmap Phase 0 adds governance and continuous-validation definitions on a review branch; private vulnerability reporting is enabled, but independent review, merge, branch enforcement, and hosted workflow results are pending. There is no download engine behavior, persistence, scheduling, filesystem product I/O, browser capture/native messaging, local IPC, media pipeline, AI, telemetry, updater/tray behavior, installer, publishing, or release.

## Document authority

Repository information has three technical roles:

1. **Approved current documentation** describes present scope, verified behavior, and operating policy. Approved means reviewed and merged into the default branch.
2. [`../blueprint.md`](../blueprint.md) is the preserved source vision and long-range input. Its imperative or future-looking language is not an implementation claim.
3. [Architecture decision records](decisions/) capture proposed or approved technical decisions and their rationale.

The [`../LICENSE`](../LICENSE), [`../CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), and [`../SECURITY.md`](../SECURITY.md) govern their respective legal, conduct, and vulnerability-reporting subjects. For a technical conflict, a later accepted ADR controls the decision it addresses, current-scope documentation controls current behavior over the aspirational blueprint, and all affected documents must be reconciled in the same change. Never silently select a convenient rule or rewrite the blueprint to hide a conflict.

Explicit user authorization may permit a Proposed ADR and its exact implementation to be drafted together. The ADR remains Proposed until the complete change is reviewed and merged, cannot override an existing approved document or ADR, and must reconcile all affected documents in the same change. Authorization is not approval or evidence of merge.

The terms **scaffolded** and **implemented** have the strict meanings defined in [`../AGENTS.md`](../AGENTS.md).

## Product and engineering documents

| Document                                      | Purpose                                                                     | Current status                                          |
| --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| [Product requirements](PRD.md)                | Users, goals, priorities, milestone scope, acceptance criteria              | Wave 1 infrastructure evidenced; product planned        |
| [Architecture](ARCHITECTURE.md)               | Monorepo ownership, boundaries, dependency graph, composition roots         | Wave 1 tree/graph current; product design planned       |
| [Development](DEVELOPMENT.md)                 | Exact Wave 1 toolchain, prerequisites, command contract, environment policy | Commands implemented and locally verified               |
| [Engine specification](ENGINE_SPEC.md)        | HTTP transfer lifecycle, state, integrity, recovery, failure handling       | Product behavior not implemented                        |
| [Browser integration](BROWSER_INTEGRATION.md) | Extension and native-host trust boundaries and behavior                     | Inert manifest only; integration not implemented        |
| [Media support](MEDIA_SUPPORT.md)             | Authorized direct media, HLS, and DASH design limits                        | Product behavior not implemented                        |
| [Engineering security](SECURITY.md)           | Assets, threats, controls, and security verification                        | Zero-feature baselines tested; product controls planned |
| [Database schema](DATABASE_SCHEMA.md)         | Planned logical records, invariants, and migration rules                    | API-free crate only; no database or migrations          |
| [Test plan](TEST_PLAN.md)                     | Test layers, Wave 1 scaffold evidence, fixtures, and milestone validation   | Scaffold tests pass; product suites deferred            |
| [Release plan](RELEASE_PLAN.md)               | Future quality, security, signing, and publishing gates                     | No release process or distributable artifact            |
| [Roadmap](ROADMAP.md)                         | Ordered outcomes without delivery promises                                  | Wave 1 implemented locally; acceptance pending          |
| [Repository governance](../GOVERNANCE.md)     | Maintainers, approvers, required checks, and security-response ownership    | Phase 0 policy defined; hosted enforcement unverified   |

## Decision records

- [ADR 0001: Documentation-first repository scaffold](decisions/0001-repository-scaffold.md) - Proposed
- [ADR 0002: Buildable workspace scaffold](decisions/0002-buildable-workspace-scaffold.md) - Proposed
- [ADR 0003: Continuous validation and governance](decisions/0003-continuous-validation-and-governance.md) - Proposed

An ADR records a durable decision; it does not prove that the described implementation exists. A user-authorized Proposed same-change ADR governs only its exact drafting scope and is not approved or accepted until review and merge.

## Governance documents

- [Contributor and agent rules](../AGENTS.md)
- [Contributing guide](../CONTRIBUTING.md)
- [Repository governance](../GOVERNANCE.md)
- [Contributor Covenant](../CODE_OF_CONDUCT.md)
- [Vulnerability disclosure policy](../SECURITY.md)
- [Changelog](../CHANGELOG.md)
- [Apache License 2.0](../LICENSE)

## Maintaining documentation

- State current behavior before future intent.
- Link to the owning specification instead of duplicating a public contract.
- Update affected general documentation in the same change as every Proposed, accepted, or superseding ADR.
- Put genuine open choices under an "Unresolved architectural decisions" heading.
- Do not use empty placeholder markers or completion language for planned work.
- Validate local relative links, changed-file scope, text hygiene, and blueprint integrity on every documentation change.
