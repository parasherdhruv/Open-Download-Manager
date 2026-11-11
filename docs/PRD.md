# Product Requirements Document

**Product:** Open Download Manager (ODM)
**Current repository state:** Buildable repository scaffold / pre-alpha
**Authorized implementation scope:** Wave 1 buildable repository scaffold under Proposed ADR 0002
**Implementation status:** Wave 1 repository infrastructure is implemented and locally verified in this unmerged working tree; all product functionality remains unimplemented

## Purpose

ODM is intended to become a reliable, local-first download manager for Windows 11. It should make large, numerous, or failure-prone authorized downloads easier to control without requiring an account, subscription, or cloud service. This document defines desired outcomes and priority; it does not claim the planned capabilities exist.

## Target users

- Windows users who need clear progress, pause, resume, retry, and history for ordinary HTTP or HTTPS downloads.
- Users managing many or large files who need queues, priorities, bandwidth limits, and predictable destination handling.
- Privacy-conscious users who expect local operation and no undisclosed telemetry.
- Browser users who want an explicit handoff of supported direct downloads to a desktop manager.
- Users downloading media they are authorized to access in clear, supported formats.
- Power users who may later opt into advanced automation or assistance without making AI part of core reliability.

## User problems

- Browser downloads may be difficult to organize, recover, schedule, or inspect at scale.
- Interrupted transfers can waste time or produce ambiguous partial files.
- Multi-connection downloading is unsafe when servers do not honor byte ranges consistently.
- Browser-to-desktop handoff creates permission, origin, and secret-handling risks.
- Media URLs and manifests vary, and unsupported or protected content must fail honestly rather than be circumvented.

## Product goals

- Deliver correct bytes and never trade integrity for apparent speed.
- Provide explicit, recoverable state for supported downloads.
- Keep network access, file writes, scheduling, persistence, and authoritative state in the Rust backend.
- Make browser capture optional, least-privilege, and recoverable when the desktop app is unavailable.
- Remain local-first and account-free for the first release.
- Provide accessible, responsive desktop controls without flooding the frontend with low-level transfer events.
- Make compatibility, integrity, and performance claims only from reproducible evidence.

## Non-goals and hard boundaries

- Circumventing DRM, paywalls, authentication, encrypted-media protections, or site access controls.
- Guaranteeing capture of every browser transfer or support for every streaming site.
- Automatically executing downloaded files.
- Replacing core reliability with AI decisions.
- Requiring a cloud service, account, subscription, or telemetry for the first release.
- Adding FTP, SFTP, BitTorrent, remote management, cross-device synchronization, or plugins before the core engine demonstrates production-level reliability.

## Product principles

1. Reliability before feature quantity.
2. Correctness and measured performance before marketing claims.
3. Privacy and permission minimization by default.
4. Explicit trust boundaries and structured failure behavior.
5. Modular, acyclic architecture with backend ownership of privileged work.
6. Transparent status: planned work is never presented as implemented.

## Prioritized scope

Every item in this section is a **planned requirement**, not a completed checklist.

### P0: essential MVP

- Add a download from an HTTP or HTTPS URL.
- Inspect metadata and use concurrent byte ranges only when range behavior is verified.
- Fall back safely to a single connection.
- Show accurate progress where length is known and honest indeterminate progress otherwise.
- Pause, resume where valid, cancel, retry, and recover safely after a crash.
- Maintain a queue with global and per-download connection and speed limits.
- Detect a safe filename and category while allowing destination selection.
- Persist download state and history locally.
- Handle duplicate filenames without overwriting unexpectedly.
- Provide a Windows desktop interface and system tray behavior.
- Support explicit Chrome and Edge handoff through a constrained browser integration.

### P1: advanced capability

- Add Firefox integration and browser context-menu actions.
- Detect supported direct media and authorized, clear HLS or DASH resources.
- Schedule downloads and bandwidth windows.
- Support queue priority and website-specific rules.
- Verify user-provided or trustworthy server checksums.
- Detect duplicate files and support history import or export.
- Add advanced filters, configurable retries, proxy configuration, and HTTP authentication.
- Provide privacy-aware diagnostics and logging.

### P2: opt-in power-user capability

- Provide an optional assistant for error explanations, categories, filenames, search, duplicate analysis, scheduling, and batch organization.
- Prefer local models where practical and allow reviewed external providers only with explicit consent and redaction.
- Add rules-based website grabbing and evidence-based analytics.
- Require confirmation for destructive actions and never allow a model to execute arbitrary shell commands.

P2 work begins only after core transfer reliability and its security boundaries are demonstrated by automated tests.

## Cross-cutting requirements

### Reliability and integrity

- A completed download must match the expected byte count and, when a trustworthy expected digest exists, that digest.
- A segmented transfer must not merge bytes from different resource versions.
- Unsafe or inconsistent persisted progress must be rejected or reinspected, not blindly resumed.
- Temporary output must not become a final file until finalization checks pass.

### Security and privacy

- TLS validation remains enabled.
- Schemes, redirects, DNS outcomes, response metadata, names, paths, browser origins, IPC messages, sizes, and stored data are untrusted.
- Credentials, cookies, authorization headers, signed query values, and secrets must not enter logs.
- Telemetry is absent unless a later reviewed decision defines informed consent.
- Security requirements in [the engineering model](SECURITY.md) are release-blocking.

### Accessibility and usability

- Planned desktop controls require accessible names, keyboard operation, readable status, and non-color-only error communication.
- Progress updates must be aggregated so the interface stays responsive.
- Unsupported actions must be disabled or explained honestly.

### Compatibility and performance

- Windows 11 is the first supported target.
- Server behavior, browser policy, and filesystem behavior must be tested with controlled fixtures.
- Performance comparisons require identical inputs and conditions and must include integrity, resource use, and retries.

## Wave 0: repository scaffold milestone

### Objective

Establish a substantive documentation and governance baseline for a future monorepo and build bootstrap without introducing product functionality or build configuration.

### In scope

- Root governance, contribution, conduct, disclosure, changelog, licensing, and project overview documents.
- Product, architecture, development, engine, browser, media, security, database, test, release, and roadmap specifications.
- One decision record for the repository scaffold.
- README-only ownership boundaries for the desktop app, browser extension, and cross-workspace tests.
- A documentation-only pull request template.

### Explicitly out of scope

- Source code, public method signatures, manifests, lockfiles, dependency installation, generators, scripts, workflows, or tool configuration.
- Any runnable app, engine, database, migration, test, browser extension, native host, installer, release, or published package.
- Claims that planned root commands pass or that a workspace can build.

### Acceptance criteria

1. Every in-scope document exists and contains actionable ownership, failure, security, or validation guidance appropriate to its subject.
2. Every document identifies the scaffold / pre-alpha state or avoids language that could imply implementation.
3. The architecture defines a target monorepo tree, frontend/backend ownership, application composition roots, workspace boundaries, and an exact acyclic Rust dependency graph.
4. Development policy records the exact authorized Wave 1 toolchain, engines, dependency pins, and Windows/Tauri prerequisites without creating metadata in this documentation-only change.
5. Technical specifications define threat, failure, and test boundaries without inventing public APIs.
6. Root disclosure policy and engineering security model have distinct roles and consistent reporting guidance.
7. Apache License 2.0 is present in canonical form and governance links resolve locally.
8. File-scope, relative-link, required-language, and text-hygiene checks pass.
9. [`../blueprint.md`](../blueprint.md) remains byte-for-byte unchanged.
10. No prohibited implementation or configuration artifact is created and no dependency or generator command is run.

## Wave 1: buildable repository scaffold

**Status:** Explicitly user-authorized and implemented in this working tree under [Proposed ADR 0002](decisions/0002-buildable-workspace-scaffold.md). Local implementation evidence is complete; review, merge, ADR acceptance, and milestone acceptance have not occurred.

### Objective

Create the documented monorepo and baseline build configuration so a supported Windows development environment can reproducibly install, inspect, test, and build a zero-feature workspace. Wave 1 proves repository infrastructure only. It introduces no download-manager behavior and produces no release or publishable artifact.

### Exact workspace members

The Cargo workspace has exactly ten library members under `crates/`, whose package names match the names below, plus package `odm-desktop` at `apps/desktop/src-tauri`:

1. `shared-types`
2. `diagnostics`
3. `protocol-http`
4. `file-manager`
5. `storage`
6. `download-core`
7. `download-scheduler`
8. `ipc`
9. `native-messaging`
10. `media-detection`
11. `odm-desktop` desktop Tauri application package

The pnpm workspace has exactly two private application packages: `@odm/desktop` at `apps/desktop` and `@odm/browser-extension` at `apps/browser-extension`. The private root command package is the workspace root, not a third application; no other child workspace package is permitted. Every Cargo package also sets `publish = false`. Wave 1 adds no publishable or shared package.

### Artifact allowlist

Only these artifact categories are authorized for the Wave 1 implementation change:

1. Root workspace and toolchain metadata: `.nvmrc`, `rust-toolchain.toml`, `Cargo.toml`, `Cargo.lock`, private `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`.
2. Root or app-local configuration strictly required for TypeScript, Vite, Tailwind CSS, Vitest, Playwright, ESLint, formatting, Tauri, and the documented command gates, plus ignore rules for generated local output.
3. The ten named Rust library directories, each limited to its package manifest and a library root with crate-level responsibility/non-responsibility documentation and lint attributes. No dependency, dev-dependency, build-dependency, public item, binary target, example, benchmark, build script, product API, or simulated behavior is allowed.
4. The desktop pnpm application and Tauri package: the minimum HTML, React, style, Rust composition-root, sole base `tauri.conf.json`, build-script, and test files required to render and verify a static pre-alpha shell. Platform/alternate Tauri configuration is forbidden, and the shell must state that downloads are unavailable.
5. The browser-extension pnpm application: the minimum source manifest, create-only build configuration, and version/permission/output-safety policy tests needed to emit only the inert Manifest V3 `manifest.json` defined by Proposed ADR 0002.
6. Scaffold verification under the owning app or `tests/`: React render coverage, manifest-policy fixtures, repository topology/configuration regression coverage, extension-build determinism coverage, and one Playwright web-shell smoke test. Test-only helpers may perform deterministic inspection and temporary-directory cleanup but may not implement product behavior.
7. Documentation changes required to keep current status, commands, architecture, security invariants, and observed validation results accurate.

Any implementation or committed artifact outside these categories requires explicit scope expansion. `node_modules`, Rust `target` output, application `dist` output, Playwright browser caches/reports, temporary build-comparison trees, Tauri bundle output, and other generated build output are never committed. The two lockfiles are the only generated dependency-resolution artifacts required in the repository.

### Explicit exclusions

Wave 1 excludes:

- Download, HTTP client, redirect, DNS, TLS, range, retry, queue, scheduler, filesystem product I/O, persistence, database, migration, recovery, browser-handoff, native-host, local-IPC, media, AI, telemetry, updater, tray, installer, or release behavior.
- Public Rust items, exported macros, invented cross-crate interfaces, internal workspace dependencies, sample product commands, mock success responses, and dummy feature tests.
- Browser permissions, host permissions, optional permissions, background/service-worker code, content scripts, actions, popup/options UI, downloads access, native messaging, externally connectable declarations, and web-accessible resources.
- Tauri custom commands, custom event protocols, application plugins, updater, tray, filesystem, shell, URL-opening, dialog, notification, global-shortcut, native-messaging, IPC product integration, and product network integration.
- Additional Cargo or pnpm workspace members, shared JavaScript packages, network fixture servers, databases, benchmark harnesses, and product test fixtures.
- CI workflows, dependency-update automation, release automation, bundles, installers, signing, publishing, package/store uploads, and release claims. CI is a later reviewed step after the local commands are implemented and verified.

### Binary acceptance criteria

Wave 1 passes only when all of the following are true:

1. Every committed implementation artifact belongs to the allowlist, and every exclusion remains absent.
2. `cargo metadata --locked --no-deps --format-version 1` reports exactly the ten named library packages plus `odm-desktop` at `apps/desktop/src-tauri`, with no additional workspace member.
3. pnpm workspace inspection identifies exactly `@odm/desktop` and `@odm/browser-extension` as apps and no other child package; all three JavaScript manifests are private, every Cargo package has publishing disabled, and the root is identified only as the command orchestrator.
4. `.nvmrc`, root engines/package-manager policy, `rust-toolchain.toml`, Cargo edition/resolver settings, and exact dependency pins match [`DEVELOPMENT.md`](DEVELOPMENT.md), and the topology/configuration test rejects an active Node, pnpm, or Rust version mismatch.
5. `Cargo.lock` and `pnpm-lock.yaml` are committed; frozen pnpm installation and every dependency-resolving Cargo command complete without changing either lockfile. Inside the aggregate topology gate, offline frozen lockfile-only pnpm validation checks every live importer, hashes the pnpm lock before/after, performs no dependency installation, and rejects synthetic manifest drift.
6. Each of the ten libraries has crate-level responsibility documentation, no public or exported item, no direct/dev/build dependency, and no product behavior. The desktop package also has no dependency on a reusable workspace crate in Wave 1.
7. The repository topology/configuration regression suite validates exact Cargo and pnpm membership, rejects synthetic extra/missing members, disallowed edges, and cycles, and confirms the actual Wave 1 graph has no internal edge.
8. The desktop renders only a static pre-alpha/unavailable shell, and its React unit test asserts the identifying text and absence of a download action.
9. The complete root Tauri configuration artifact set contains exactly base `tauri.conf.json`, with no platform overlay or JSON5/TOML alternative. The effective configuration satisfies the zero-feature capability/CSP invariants in [`SECURITY.md`](SECURITY.md), and normalized `src/main.rs` plus `build.rs` match their reviewed minimal forms in addition to semantic checks. Regressions fail broad grants, remote sources, alternate control flow, and build-time filesystem/network/process behavior.
10. The extension build emits one file named `manifest.json`; parsed JSON equals the three-key object in Proposed ADR 0002, including Chromium-valid version `0.0.1`.
11. Extension policy tests accept the exact manifest, independently enforce Chromium version validity, reject all-zero `0.0.0` without input reflection, and reject permission-bearing keys, host access, background, content scripts, action, native messaging, and downloads access.
12. Explicit extension output destinations are absent/create-only and existing files, directories, symlinks, or junctions are preserved. Only the verified package-owned default `dist` may be replaced. Source/root/ancestor guards remain, and two clean builds have identical relative inventories and byte-for-byte identical output.
13. The Playwright smoke test loads the locally built or previewed desktop web shell from the exact loopback origin, blocks service workers, observes its pre-alpha/unavailable text, and uses browser-context HTTP and WebSocket guards to reject non-loopback traffic. It is not a runtime Tauri/WebView test.
14. `corepack pnpm check` and every constituent command listed in [`DEVELOPMENT.md`](DEVELOPMENT.md) exit successfully without a required skip. Cargo format, clippy, test, and build evidence uses the documented forms.
15. On Windows with the documented MSVC, SDK, and WebView2 prerequisites, the locked Tauri `build --no-bundle` command exits successfully and creates no committed bundle or release artifact.
16. Current-status documentation still says product functionality is unavailable, both ADRs remain Proposed until review/merge, all relative links and text-hygiene checks pass, and [`../blueprint.md`](../blueprint.md) retains SHA-256 `57C6C640AFAFE7E55C74A51E1008B4338B1FC3B78CF8DE0642AF8ABA9C3B488D`.

Passing these criteria implements the Wave 1 repository infrastructure only. It does not implement or test a product download capability.

### Observed implementation evidence

On a supported Windows 11 environment on 2026-11-10, the working tree satisfied the Wave 1 binary criteria:

- Locked metadata reported exactly eleven Cargo members and two pnpm applications. All ten libraries were API-free and dependency-free, and the live internal workspace graph had zero edges.
- Frozen pnpm installation passed without lock drift. `Cargo.lock` SHA-256 was `BB7B4118A417CEAEB2581B76BAA1B2AA3402B85C0CFBE251104037B01B90E9B2`; `pnpm-lock.yaml` SHA-256 was `D3153A36A4D3A80E576364B32AB08F17DD16E1D78E1933D5D8400762D649930A`.
- The final `corepack pnpm check` exited zero. Vitest passed 102 scaffold tests across 10 files with no skips; Playwright passed one loopback-only static-shell smoke; Cargo ran 11 harnesses containing zero test cases by intentional API-free design.
- Cargo format, clippy, test, and build passed. Both web applications built, the locked Tauri no-bundle build passed, and the Tauri/extension least-privilege policies passed.
- Generated build/test outputs were cleaned, no distributable or release artifact remained, and the blueprint SHA-256 remained `57C6C640AFAFE7E55C74A51E1008B4338B1FC3B78CF8DE0642AF8ABA9C3B488D`.

This is local implementation evidence for an unmerged change, not approval, acceptance, release, or evidence for any P0, P1, or P2 capability.

## Future product acceptance

A future capability is complete only when its requirements and failure behavior are implemented, relevant automated tests pass, security controls are verified, documentation reflects observed behavior, the workspace builds, and no relevant regression is known. Compiling alone is insufficient.

The first public release additionally requires the gates in [`RELEASE_PLAN.md`](RELEASE_PLAN.md). No release date or feature delivery date is committed by this document.
