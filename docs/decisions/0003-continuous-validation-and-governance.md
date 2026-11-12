# ADR 0003: Establish Continuous Validation and Repository Governance

- **Status:** Proposed
- **Date:** 2026-11-11
- **Decision scope:** Roadmap Phase 0 governance, continuous scaffold validation, dependency policy, and supply-chain checks
- **Acceptance condition:** This record becomes Accepted only when the complete Phase 0 change is independently reviewed and merged into the hosted default branch.

## Context

Wave 1 established locally verified Cargo and pnpm workspaces, a zero-feature desktop and extension scaffold, and an exact root command gate. Commit `4b2aca0` is now published as hosted `main`; local upstream tracking, private vulnerability reporting, exact branch protection, and the initial four hosted checks were verified on 2026-11-12. Independent review and Phase 0 merge are not yet evidenced. [ADR 0001](0001-repository-scaffold.md) and [ADR 0002](0002-buildable-workspace-scaffold.md) remain Proposed.

The implementation-ready roadmap calls its first post-scaffold slice **Phase 0: Governance and continuous validation**. This phase name is distinct from the earlier **Wave 0** documentation milestone. Wave 0's historical exclusion of workflows remains true; Phase 0 is the separately authorized follow-on that may now automate the locally proven Wave 1 commands.

Continuous integration executes repository code and dependency tooling on hosted machines, so runner selection, token permissions, action provenance, dependency updates, advisory data, and ownership are security boundaries. Encoding the local gate without deciding those boundaries would make the automation difficult to review and unsafe to treat as required evidence.

## Decision

### 1. Preserve the local command contract

The existing `corepack pnpm check` order remains the authoritative, non-networked scaffold gate. Continuous integration provisions the exact repository-pinned tools and Playwright browser, then invokes that command without skipping or reimplementing its constituents.

Networked advisory checks remain separate from `check` because their registries and advisory databases change independently of a source revision. License-policy checks are deterministic against the installed frozen graph, while advisory results are point-in-time evidence.

### 2. Run the scaffold gate on the supported Windows baseline

The continuous-validation workflow runs on GitHub's explicit `windows-2025` image label. It uses Node `24.16.0`, Corepack pnpm `12.18.0`, Rust `1.99.1`, the committed lockfiles, and the locked Tauri no-bundle command already defined by Wave 1.

The workflow:

- runs for pull requests and pushes to `main`;
- grants only `contents: read` to the workflow token;
- uses commit-SHA-pinned actions and disables persisted checkout credentials;
- has bounded job time and concurrency cancellation;
- performs a frozen pnpm install and explicit Playwright Chromium provisioning;
- runs the full `corepack pnpm check` gate;
- verifies protected inputs did not drift; and
- removes generated dependency, build, and test output before checking repository cleanliness.

The hosted runner image label is maintained by GitHub and is not an immutable machine image digest. Exact repository toolchains, lockfiles, action commits, explicit runner label, and observed runner evidence bound this limitation. Packaging and signing will require a separate, more tightly controlled environment.

### 3. Separate supply-chain checks from product or release claims

A second workflow performs these checks without release credentials:

- Gitleaks `8.30.1`, downloaded from its fixed release URL and verified against the recorded SHA-256 before scanning full Git history.
- cargo-deny `0.20.2`, downloaded from its fixed release URL and verified against the recorded SHA-256 before checking advisories, licenses, bans, and sources with locked resolution.
- `corepack pnpm audit --audit-level high` over the frozen JavaScript graph.
- A repository-owned default-deny JavaScript license-expression check over `pnpm licenses list --json --long`.

The Rust policy considers only the first-release target `x86_64-pc-windows-msvc`, denies unknown registries and Git sources, denies wildcard version requirements, and allows only reviewed SPDX choices. Duplicate Rust versions remain warnings because the locked Tauri scaffold already contains reviewed duplicates; introducing a duplicate does not bypass license, advisory, source, or lock review.

No advisory is ignored in policy. A future exception must name the advisory or package, explain reachability and risk, identify an owner, include a bounded expiry or removal condition, and receive security-owner review. High and critical JavaScript advisories fail the workflow. Lower findings are still reviewed during dependency changes and release preparation.

### 4. Delay and review dependency updates

pnpm rejects packages published less than seven days ago by default, fails when registry publication time is missing, and revalidates loaded lockfiles. Version-qualified baseline exclusions are enumerated in `pnpm-workspace.yaml` only for packages already present in the locally verified Wave 1 graph that were still inside the seven-day window when Phase 0 enabled the policy. Each exception must be reconsidered with its next update, and exclusions for packages no longer resolved are pruned. A temporary exact `re2js` resolution override removes the observed high-severity vulnerable version while upstream `markdownlint` catches up.

Dependabot proposes weekly updates for the pnpm, Cargo, and GitHub Actions ecosystems. It does not auto-merge. Exact pins duplicated in documentation and policy tests must be reconciled in the same reviewed change. GitHub Actions updates remain full commit SHAs, not floating tags.

### 5. Make ownership and approval explicit

[`../../GOVERNANCE.md`](../../GOVERNANCE.md) defines maintainer, ADR, release, and security-response roles. [CODEOWNERS](../../.github/CODEOWNERS) requests review for the repository by default and explicitly covers workflows, dependency automation, security policy, ADRs, manifests, lockfiles, toolchains, and supply-chain policy.

CODEOWNERS requests are not proof of enforcement. The hosted repository must require the documented checks and independent code-owner review through branch rules. An author cannot use self-review to accept an ADR. No release approver is currently appointed, so release promotion remains prohibited.

### 6. Keep untrusted execution unprivileged

Untrusted pull requests use the `pull_request` event only. `pull_request_target`, `workflow_run`-based execution of proposed code, write permissions, environments, signing credentials, store credentials, and release secrets are prohibited in these workflows. No workflow publishes, signs, bundles, uploads, or changes repository contents.

## Consequences

### Positive

- The locally proven scaffold gate has one reviewed hosted definition instead of duplicated CI commands.
- Dependency, secret, license, and source regressions fail explicitly.
- Action and downloaded-tool identities are reviewable and immutable within the workflow definition.
- Ownership, approval, and private security-response responsibilities are visible before product work begins.
- Dependency proposals arrive regularly without bypassing exact-pin or documentation review.

### Costs

- Windows CI is comparatively slow because it runs the complete Tauri and Playwright scaffold gate without caches.
- Advisory checks depend on mutable external databases and can become red without a source change.
- Exact dependency and action pins require deliberate maintenance across manifests, tests, documentation, and locks.
- The seven-day release-age delay can postpone ordinary upgrades; narrowly reviewed security exceptions may still be necessary.

### Risks

- Workflow definitions may be mistaken for operational CI before the hosted default branch exists. Documentation must distinguish local policy evidence from hosted run evidence.
- CODEOWNERS may be ineffective if the named owner lacks hosted write access or branch rules do not require review.
- A green advisory scan is point-in-time evidence, not a guarantee that dependencies are vulnerability-free.
- Hosted image contents can change behind an explicit runner label. Every observed run must retain the runner and tool versions in its log.

## Hosted activation requirements

Hosted `main`/upstream tracking, private vulnerability reporting, exact protected checks/review policy, and an initial passing hosted run were verified on 2026-11-12. Branch protection keeps later revisions subject to the same controls. Phase 0 cannot satisfy its remaining hosted exit gate until an authorized maintainer:

1. obtains independent code-owner review of the scaffold and this complete Phase 0 change; and
2. merges the protected revision into hosted `main` without bypassing those controls.

These are hosted administrative actions. Local source changes and passing local policy tests do not claim they occurred.

## Alternatives considered

### Use floating action tags

Rejected because a tag can change the code executed by a reviewed workflow without a repository diff.

### Put networked advisory scans inside `pnpm check`

Rejected because the existing gate intentionally performs no public network access after provisioning and must remain reproducible from a reviewed dependency graph.

### Run the primary gate on Linux for speed

Rejected because Windows 11 x64 is the only current target and the required Tauri evidence depends on Windows-specific prerequisites.

### Auto-merge dependency updates

Rejected because exact version changes affect duplicated contracts, generated locks, platform behavior, licensing, and security evidence that require human review.

### Mark earlier ADRs Accepted from the local commit

Rejected because local history does not prove independent review or a merge into a hosted default branch.

## Compliance

This Proposed decision authorizes only repository governance and continuous-validation infrastructure. It implements no product networking, filesystem behavior, persistence, scheduler, browser handoff, media support, installer, signing, publishing, or release behavior. Acceptance still requires complete independent review and hosted default-branch merge evidence.
