# Roadmap

**Current status:** Buildable repository scaffold / pre-alpha. Wave 1 repository infrastructure is committed at `4b2aca0`, published as hosted `main`, and locally verified. Roadmap Phase 0 governance and continuous-validation definitions are present on a review branch; private vulnerability reporting is enabled, but independent review, merge, branch enforcement, and hosted workflow results are pending. Product functionality is not implemented. This roadmap orders outcomes and gates; it is not a delivery schedule or a release claim.

## Status vocabulary

- **Planned:** Requirements exist, but implementation has not started or is not evidenced.
- **Scaffolded:** A location, boundary, or policy is documented; behavior does not exist.
- **Implemented:** Source exists, failure and security paths are handled, relevant automated tests pass, and documentation matches verified behavior.
- **Released:** Implemented behavior is included in a published, verified artifact under the release policy.

Wave 0 documentation and Wave 1 build infrastructure exist in local history. The current Roadmap Phase 0 change defines CI and governance policy without proving hosted execution. ADRs 0001, 0002, and 0003 remain Proposed until independent review and default-branch merge. No product capability, distributable artifact, or release is implemented.

## Sequencing principles

1. Establish truthful governance and architecture before build metadata.
2. Create a buildable, testable bootstrap before product features.
3. Prove single-stream correctness and local fixtures before segmentation optimization.
4. Prove persistence and recovery before broad UI or browser claims.
5. Add browser and media surfaces only on a security-tested engine foundation.
6. Complete release, signing, privacy, and installer gates before public distribution.
7. Consider AI only after core reliability is demonstrated.

Each wave is separately reviewed. Later-wave documentation does not authorize pulling its implementation into an earlier scope.

## Wave 0: repository documentation and governance

**State:** Authored documentation milestone committed locally at `4b2aca0`; scaffolded only, with no hosted review/default-branch merge evidence.

Outcomes:

- Root project, contribution, conduct, vulnerability, changelog, agent, and Apache-2.0 licensing documents.
- Product, architecture, development, engine, browser, media, security, storage, test, release, and roadmap specifications.
- Initial repository-scaffold ADR.
- README-only ownership boundaries for desktop, browser extension, and cross-workspace tests.
- Documented monorepo tree, acyclic crate graph, selected toolchain policy, planned command contract, and validation procedure.
- No code, manifests, lockfiles, workflows, dependencies, generators, tests, build, installer, or release artifacts.

Exit evidence is limited to file-scope, link, required-language, text-hygiene, license, and unchanged-blueprint validation. It does not count as a product test.

## Wave 1: buildable repository scaffold

**State:** Explicitly user-authorized, implemented, locally verified, and committed locally at `4b2aca0` under [Proposed ADR 0002](decisions/0002-buildable-workspace-scaffold.md); hosted review, approval, acceptance, and default-branch merge are not evidenced.

Implemented infrastructure outcomes:

- One Cargo workspace containing exactly ten API-free libraries plus the zero-feature desktop Tauri package; no internal workspace dependency edges.
- One pnpm workspace containing exactly `@odm/desktop` and `@odm/browser-extension`, with a private root command orchestrator that is not a third app.
- Node `24.16.0`, Corepack pnpm `12.18.0`, Rust `1.99.1` with rustfmt/clippy, edition 2024, resolver 3, and the exact frontend/Tauri/test pins in [`DEVELOPMENT.md`](DEVELOPMENT.md).
- Committed `Cargo.lock` and `pnpm-lock.yaml`, with frozen/locked resolution.
- A static pre-alpha desktop shell with no product action and a zero-feature Tauri capability/CSP baseline.
- An inert three-key Manifest V3 document, version `0.0.1`, with no permission or browser behavior and build output containing only `manifest.json`.
- Meaningful scaffold evidence: React render, manifest policy, Tauri policy, topology/configuration regression, repeated extension-build determinism, Playwright local smoke, and Cargo format/clippy/test/build/no-bundle gates.
- No download, persistence, scheduling, browser integration, media, installer, release, publishing, or product API behavior.

CI is not part of Wave 1. The separately authorized Roadmap Phase 0 change below automates the now-verified local commands. Release packaging and publication remain excluded.

Local exit evidence: every binary criterion in [`PRD.md`](PRD.md) and every required command in [`TEST_PLAN.md`](TEST_PLAN.md) was observed passing on a supported Windows environment, with stable locks, current documentation, and unchanged blueprint evidence. This implements repository infrastructure only; downloads remain unavailable. Milestone and ADR acceptance still require review and merge.

## Roadmap Phase 0: governance and continuous validation

**State:** Authorized current review branch under [Proposed ADR 0003](decisions/0003-continuous-validation-and-governance.md). Definitions and policy gates are locally verified, hosted `main`/upstream tracking is restored, and private vulnerability reporting is enabled. Independent review, merge, protected-check enforcement, and hosted workflow results remain pending.

Implemented local-definition outcomes:

- Read-only Windows workflow that provisions exact tools and runs the complete frozen/locked scaffold gate without producing a bundle.
- Separate secret, Rust dependency, JavaScript advisory, and default-deny JavaScript license jobs with pinned tool identities.
- Weekly Dependabot proposals for pnpm, Cargo, and GitHub Actions, with no auto-merge.
- Seven-day pnpm release-age policy, exact reviewed exceptions, and a targeted patched resolution for the observed high-severity transitive advisory.
- CODEOWNERS plus documented maintainer, independent ADR approval, release-approval, security-response, and required-check policy.
- Scaffold regressions for action pins, workflow permissions/triggers/timeouts, dependency automation, ownership, and license policy.

Local exit evidence cannot establish the hosted gate. Restoring `main`/upstream tracking and enabling private vulnerability reporting satisfy two hosted prerequisites. Phase 0 completes only after the scaffold and Phase 0 change receive independent review, the exact required checks and code-owner rule are enforced, hosted runs pass, and the change is merged. Until then, ADR acceptance is not claimed.

## Wave 2: safe single-stream foundation

**State:** Planned, not implemented.

Intended outcomes:

- Controlled local mock download server and deterministic fixtures.
- HTTP/HTTPS URL, TLS, redirect, DNS/destination, metadata, and response-limit controls.
- Single-stream temporary-file download with exact-output verification.
- Core state-transition framework, cancellation, bounded retry classification, and sanitized diagnostics.
- Safe filename/destination handling and explicit duplicate policy on Windows.

Exit gate: unit, integration, resilience, and security tests prove correct bytes and safe cleanup under success, malformed response, interruption, cancellation, disk failure, and forbidden destination cases. No segmentation or resume claim is allowed yet.

## Wave 3: persistence, segmentation, and recovery

**State:** Planned, not implemented.

Intended outcomes:

- First SQLite schema and tested migrations after storage decisions are accepted.
- Transactional state/checkpoints and startup reconciliation with temporary files.
- Verified range probing, segment planning, positioned writes, bounded concurrency, and single-stream fallback.
- Pause/resume with validator checks, process-crash recovery, integrity levels, and safe finalization.
- Scheduler foundation with exactly-once job start, global/per-host limits, fairness, and retry timing.

Exit gate: controlled tests prove no gaps/overlaps/cross-version merges, exact final bytes, bounded recovery at crash points, safe schema migration, and no progress ahead of durable output.

## Wave 4: P0 desktop workflow

**State:** Planned, not implemented.

Intended outcomes:

- Accessible desktop flows to add, inspect, pause, resume, cancel, retry, and locate downloads.
- Queue/history/category views backed by authoritative Rust state.
- Aggregated progress updates, speed limits, destination selection, and honest unknown/unsupported states.
- Settings and system-tray behavior only after their security, lifecycle, and accessibility requirements are specified and tested.
- Windows packaging experiments without public release claims.

Exit gate: critical user journeys pass on clean supported Windows environments, backend ownership remains intact, and the UI cannot bypass path, state, or network policy.

## Wave 5: manual browser handoff

**State:** Planned, not implemented.

Intended outcomes:

- Least-privilege Chrome and Edge Manifest V3 extension for explicit manual actions.
- Versioned, size-limited native messaging and per-user authenticated local IPC.
- Installer-owned production registration with explicit extension IDs.
- Connection status, sanitized errors, service-worker recovery, duplicate prevention, and ordinary-browser fallback.

Suggested or automatic capture is not included automatically. It requires separate browser-policy, user-consent, and no-download-loss evidence.

Exit gate: malicious page/message, permission denial, host crash, stale version, ACL/peer, restart, fallback, and redaction suites pass separately for Chrome and Edge.

## Wave 6: advanced P1 capabilities

**State:** Planned, not implemented.

Candidate outcomes, delivered as independently scoped features:

- Scheduling windows, bandwidth policy, priorities, website rules, configurable retries, proxy, and authentication.
- User-supplied or trustworthy checksum verification, duplicate detection, and validated history import/export.
- Firefox integration with its own manifest, registration, and suite.
- Explicitly supported direct media, followed by narrow authorized clear HLS and DASH profiles.
- Improved privacy-aware diagnostics and support bundles.

Each candidate waits for its unresolved architectural/security decisions and tests. The wave label does not require bundling all candidates into one release.

## Wave 7: first public release readiness

**State:** Planned, not implemented.

Intended outcomes:

- Bounded P0 release scope with supported-version and compatibility policy.
- Clean install, upgrade, migration, repair, uninstall, and native-host registration evidence.
- Dependency/license, security, privacy, accessibility, performance, and artifact-content gates.
- Reproducible-build assessment, checksums, code-signing custody, provenance, release notes, and recovery/withdrawal procedures.
- Browser-store review only for behavior and permissions proven ready.

Exit gate: every applicable requirement in [`RELEASE_PLAN.md`](RELEASE_PLAN.md) passes for the exact published artifacts. Until then, installers and uploads remain excluded.

## Wave 8: optional P2 assistance and power-user features

**State:** Planned, not implemented.

Candidate outcomes:

- Local-first error explanation, category/filename suggestions, history search, duplicate assistance, and organization recommendations.
- Optional external provider only with informed consent, minimized/redacted data, and a fully functional disabled path.
- Rules-based grabbing and evidence-based analytics.

Models remain untrusted advisers, never arbiters of integrity, security, scheduling safety, or shell execution. Destructive actions require confirmation. This wave cannot begin until the engine and release security foundation is stable.

## Post-release possibilities

FTP/SFTP, separately evaluated BitTorrent support, website mirroring, synchronization, Linux/macOS, remote management, plugins, community site adapters, more AI providers, and advanced analytics remain outside the committed roadmap. They may be evaluated only after production-level core reliability and cannot be inferred from the blueprint as promised support.

## Dependency gates

- Browser work depends on stable engine intake and constrained IPC.
- Media work depends on nested-URL policy, parser limits, transfer integrity, and safe assembly decisions.
- Scheduling and recovery depend on a tested persistent state model.
- AI depends on redaction, consent, deterministic fallback, and stable core diagnostics.
- Public release depends on all applicable security and lifecycle gates, not merely feature presence.

When a prerequisite fails, narrow or delay the dependent scope; do not add a permissive bypass.

## Unresolved architectural decisions

Detailed open choices are owned by the relevant specifications. Roadmap-level decisions still unresolved are:

- Exact feature grouping and acceptance set for the first public P0 release.
- Whether suggested and automatic browser capture are feasible and policy-compliant.
- Whether a portable package can support safe updates and native-host registration.
- Which narrow HLS/DASH profiles, if any, are ready before the first public release.
- Versioning, support duration, release channels, and cross-component compatibility windows.
- Criteria for declaring the core engine stable enough to begin P2 work.

No date, staffing commitment, or release promise is attached to these waves.
