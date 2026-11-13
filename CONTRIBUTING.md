# Contributing to Open Download Manager

## Current contribution boundary

ODM currently has locally verified Wave 1 repository infrastructure: buildable Cargo and pnpm workspaces, zero-feature application shells, and automated scaffold tests. Roadmap Phase 0 adds governance and continuous-validation definitions. It has no download-manager behavior, automated product test suite, distributable artifact, or release. All three ADRs remain Proposed until independent review and hosted default-branch merge; contributors must not convert local implementation evidence into an approval, acceptance, release, hosted-CI, or product-behavior claim.

Keep each change narrowly scoped. Do not add implementation, manifests, lockfiles, generated artifacts, workflows, or tool configuration as part of a documentation-only task.

## Before contributing

1. Read [`AGENTS.md`](AGENTS.md) for repository authority, terminology, security requirements, and completion rules.
2. Read [`docs/PRD.md`](docs/PRD.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).
3. Read the specification that owns the area, approved records, and any explicitly authorized Proposed same-change record in [`docs/decisions/`](docs/decisions/).
4. Read [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) and follow it in all project spaces.
5. Report suspected vulnerabilities through [`SECURITY.md`](SECURITY.md), not in a public change or issue.
6. Read [`GOVERNANCE.md`](GOVERNANCE.md) for ownership, approval, and required hosted-control policy.

The preserved [`blueprint.md`](blueprint.md) supplies product vision. Approved current-scope documents and accepted ADRs control current decisions as described in `AGENTS.md`; an explicitly authorized Proposed same-change ADR controls only its exact drafting scope and cannot override approved material. Do not edit the blueprint merely to reconcile a conflict.

## Change discipline

- Describe one clear problem and one bounded outcome.
- Preserve the acyclic ownership and dependency rules in the architecture document.
- Use **scaffolded** only for documented locations or responsibilities and **implemented** only for verified behavior with relevant tests.
- Put unresolved durable choices in an explicit "Unresolved architectural decisions" section. Do not use empty placeholder markers.
- Add an ADR for a cross-component, security-sensitive, or hard-to-reverse decision.
- Keep a same-change ADR Proposed until the complete change is reviewed and merged; authorization to draft or implement is not acceptance.
- Update every affected current-scope document in the same change.
- Do not introduce a public interface without reviewed requirements, migration impact, and tests.
- Do not include secrets, credentials, private URLs, personal data, or sensitive report details.
- Do not copy implementation from a project with incompatible license obligations. Review licenses before proposing major dependencies.
- Keep GitHub Actions pinned to full commit SHAs and do not introduce privileged untrusted-code triggers such as `pull_request_target`.
- Treat Dependabot changes as ordinary proposals: reconcile exact pins, locks, policy tests, licenses, advisories, and documentation before merge.

## Implementation contributions

When implementing a later separately authorized product milestone:

- Follow strict TypeScript and the pinned Rust toolchain policy.
- Keep network, filesystem, scheduling, persistence, and authoritative state in Rust backend components.
- Handle errors explicitly; do not use `unwrap` in production Rust paths.
- Add relevant unit, integration, resilience, regression, and security-boundary tests with the behavior.
- Use controlled local fixtures for network tests and verify resulting bytes or a trustworthy digest.
- Run all applicable checks and report any check that could not run.

The Wave 1 command contract in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) is executable and was locally verified on the documented Windows baseline. Run every applicable gate for a change and report exact results; scaffold-test success is not product-test evidence.

## Pull requests

Use [the pull request template](.github/pull_request_template.md) and include:

- Scope and motivation.
- Current-state and post-change behavior stated without future-tense ambiguity.
- Security and privacy impact.
- Documentation and ADR impact.
- Tests added and exact commands executed.
- Results, known limitations, and remaining tasks.
- Workflow permissions, action/tool pins, dependency-policy exceptions, and CODEOWNERS impact when automation or dependencies change.

Reviewers should reject completion claims that lack the required failure-path, security, test, and documentation evidence. Documentation validation is not a substitute for future product tests.

## Licensing

Unless explicitly stated otherwise, an intentional contribution submitted for inclusion is provided under the repository's [Apache License 2.0](LICENSE), consistent with section 5 of that license. Mark communications that are not contributions accordingly.
