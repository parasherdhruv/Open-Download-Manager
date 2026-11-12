# ADR 0002: Establish the Buildable Workspace Scaffold

- **Status:** Proposed
- **Date:** 2026-11-10
- **Decision scope:** Wave 1 build metadata, zero-feature application shells, API-free Rust libraries, scaffold tests, and local command gates
- **Acceptance condition:** This record becomes Accepted only when the complete Wave 1 change is reviewed and merged into the default branch.

## Context

Wave 0 defined repository ownership and long-range product requirements but did not provide manifests, lockfiles, source, automated tests, or an executable command contract. The user explicitly authorized the next scope as **Repository scaffold**, meaning creation of the documented monorepo and baseline build configuration. That authorization permits this ADR and its implementation to be drafted in the same change; it does not approve this ADR, prove a merge, authorize product behavior, or authorize publishing.

The authorized Wave 1 infrastructure is implemented, locally verified, and committed locally at `4b2aca0`. No automated product test or product behavior exists. Both this ADR and [ADR 0001](0001-repository-scaffold.md) remain Proposed because no hosted review or default-branch merge is evidenced. [Proposed ADR 0003](0003-continuous-validation-and-governance.md) governs the separately authorized follow-on automation and governance slice.

The supplied [`blueprint.md`](../../blueprint.md) was read before Wave 0 authoring. The Wave 0 author reported SHA-256 `57C6C640AFAFE7E55C74A51E1008B4338B1FC3B78CF8DE0642AF8ABA9C3B488D` after writing the documentation. This is task provenance and an integrity expectation, not a claim about Git history.

## Decision

### 1. Bound Wave 1 to a buildable, zero-feature repository

Wave 1 creates the smallest monorepo that proves the selected Rust, Node, pnpm, React, Tauri, browser-manifest, lint, test, and build tools can work together under reproducible local commands. It implements repository infrastructure only.

Wave 1 does not implement downloading, networking, destination or file management, persistence, migrations, scheduling, browser capture, native messaging, local IPC, media handling, AI, updater behavior, tray behavior, installer behavior, telemetry, publishing, or any public product API. A static desktop shell and an inert browser manifest are build evidence, not product features.

### 2. Fix exact workspace membership

The Cargo workspace contains exactly eleven members: ten library crates and one desktop Tauri application package.

The ten library crates are:

1. `crates/shared-types`
2. `crates/diagnostics`
3. `crates/protocol-http`
4. `crates/file-manager`
5. `crates/storage`
6. `crates/download-core`
7. `crates/download-scheduler`
8. `crates/ipc`
9. `crates/native-messaging`
10. `crates/media-detection`

Each library package name matches its listed directory name. The eleventh Cargo member is package `odm-desktop` at `apps/desktop/src-tauri`. Every Cargo package sets `publish = false`. No other Cargo package, example, benchmark package, binary package, or workspace member is permitted in Wave 1. The `native-messaging` member is an API-free library in this wave; its possible future executable role does not exist yet.

The pnpm workspace contains exactly two application packages:

1. `apps/desktop`, named `@odm/desktop`
2. `apps/browser-extension`, named `@odm/browser-extension`

The root and both app `package.json` files set `private: true`. The root is a command orchestrator and is not a third application package. No shared JavaScript package is permitted in Wave 1.

### 3. Keep Rust libraries API-free and edge-free

Each of the ten Rust library roots contains crate-level Rust documentation stating its future responsibility and explicit non-responsibilities. A library root may contain lint attributes, but it contains no public item, exported macro, product type, product function, trait, module API, dummy symbol, simulated behavior, direct dependency, dev-dependency, build-dependency, or build script.

These API-free crates are meaningful infrastructure: they prove exact Cargo membership, package naming, edition and resolver policy, compiler/lint compatibility, documentation ownership, and topology enforcement without inventing interfaces before a caller exists.

The allowed dependency graph in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) is a ceiling for later product work, not a requirement to add dependencies. Wave 1 has no code that requires an internal crate dependency, so its ten libraries and desktop package have no internal workspace dependency edges. The topology regression rejects missing or extra members, cycles, and every internal edge in the Wave 1 tree. A later feature may introduce only an edge allowed by the architecture and only with concrete code, tests, and synchronized documentation.

### 4. Pin the baseline exactly

Wave 1 uses:

- Node.js `24.16.0`, recorded in `.nvmrc` and exact root `engines` policy.
- Corepack-managed pnpm `12.18.0`, recorded in the root `packageManager` field and exact root `engines` policy.
- Rust `1.99.1` with `rustfmt` and `clippy`, Rust edition 2024, and Cargo resolver 3.
- Tauri runtime `2.12.5`, `tauri-build` `2.7.4`, and Tauri CLI `2.12.4`.
- React and React DOM `19.3.1`.
- TypeScript `6.0.3`.
- Vite `8.3.7`.
- Tailwind CSS `4.3.5`.
- Vitest `5.1.0`.
- Playwright `1.65.0`.
- ESLint `9.39.5`.

All direct dependency versions and supporting-tool versions are exact: JavaScript manifests use no range prefix and Cargo uses exact `=` requirements for Tauri and `tauri-build`. An exact pin named above may change only if lockfile resolution proves a documented incompatibility. The same change must record the attempted pin, exact resolver error, compatible replacement, and resulting lockfile evidence before the contract is amended. Preference or availability of a newer version is not sufficient.

### 5. Commit reproducible metadata and locks

Wave 1 commits the root Cargo and pnpm workspace manifests, `.nvmrc`, `rust-toolchain.toml`, `Cargo.lock`, and `pnpm-lock.yaml`. `Cargo.lock` and `pnpm-lock.yaml` are reviewed repository inputs after generation and must not be hand-edited.

The artifact categories allowed for Wave 1 are defined exhaustively in [`../PRD.md`](../PRD.md). Generated dependency directories, compiler output, Vite output, Playwright reports, temporary comparison directories, and Tauri target output remain uncommitted.

### 6. Establish a zero-feature desktop security baseline

The desktop application renders only a static pre-alpha shell that states downloads are unavailable. Its Tauri boundary has:

- no custom Tauri command or event protocol;
- no application plugin, updater, tray, filesystem, shell, URL-opening, dialog, notification, global-shortcut, native-messaging, local-IPC, or product-network integration;
- no product state, secret, persisted setting, download action, or simulated success path;
- an explicit empty `app.security.capabilities` array and no capability file; and
- exactly one Tauri configuration artifact, base `tauri.conf.json`, with every platform overlay and JSON5/TOML alternative forbidden; and
- a production content security policy limited to local application assets, with `connect-src 'self' http://ipc.localhost` as the only connection sources.

The implementation uses the Tauri 2.12.5 configuration schema confirmed by a successful locked no-bundle build. A regression test inspects the complete root configuration artifact set, parses the sole effective base configuration, and rejects wildcard sources, remote HTTP/HTTPS sources, broad capability grants, `unsafe-eval`, unnecessary `unsafe-inline`, a platform/alternate configuration, and any permission or integration outside this list. Normalized `src/main.rs` and `build.rs` must match their reviewed minimal forms in addition to passing semantic checks; this prevents alternate control flow and unreviewed build-time filesystem, network, or process behavior.

### 7. Establish an inert Manifest V3 baseline

The browser application build emits exactly one file, `manifest.json`. Its semantic JSON object is exactly:

```json
{
  "manifest_version": 3,
  "name": "Open Download Manager",
  "version": "0.0.1"
}
```

The browser version follows [Chrome's authoritative manifest version rule](https://developer.chrome.com/docs/extensions/reference/manifest/version): one to four dot-separated integers in the inclusive range 0–65535, no leading zero on a nonzero integer, and not all zero. `0.0.1` is the smallest valid three-component pre-alpha value. Root/npm/Cargo/Tauri versions remain `0.0.0` under their separate contracts. The policy validates the exact constant against the Chromium rule and rejects the formerly used invalid `0.0.0` without reflecting candidate input.

No `permissions`, `optional_permissions`, `host_permissions`, `optional_host_permissions`, `background`, `content_scripts`, `action`, `externally_connectable`, or `web_accessible_resources` key is permitted. Therefore native messaging, downloads access, host access, service workers, page injection, and extension UI behavior are absent. Policy tests accept the exact baseline and reject fixtures containing every forbidden key, including `nativeMessaging` or `downloads` within a permission list.

An explicit extension `--out-dir` is create-only: its parent must be an existing verified regular directory, and any existing destination type is rejected before mutation. The no-argument build may replace only the exact package-owned `apps/browser-extension/dist` after rejecting symlink/junction/reparse redirection and verifying its physical location. Filesystem roots, repository ancestors, and source overlap remain forbidden. Failure cleanup is limited to a directory created and still physically owned by the invocation. Sentinel regressions cover existing external directories/files and a default link to external content. Two clean extension builds also produce identical relative file inventories and identical bytes. Build output is temporary evidence and is not committed or published.

### 8. Make local gates authoritative before CI

The root private package exposes the exact commands in [`../DEVELOPMENT.md`](../DEVELOPMENT.md). The aggregate `corepack pnpm check` command and every documented constituent command are required. They fail on a missing workspace, missing test, skipped required step, manifest/pnpm-lock importer drift, formatting or lint error, type error, test failure, topology violation, unsafe or nondeterministic extension output, build failure, or Tauri security-policy violation.

The topology constituent invokes Corepack pnpm through an argument array as `install --lockfile-only --frozen-lockfile --offline --ignore-scripts`, hashes `pnpm-lock.yaml` before and after, and requires success with identical bytes. The validated form performs no dependency installation, lock regeneration, lifecycle script, or public-network access after the documented frozen provisioning step; a synthetic importer drift regression must fail without creating `node_modules` or changing the lock. Cargo commands that resolve or compile dependencies use `--locked`. `cargo fmt` is the sole exception because it does not perform dependency resolution and does not accept Cargo's resolution flag.

The required Wave 1 evidence includes:

- a React unit render test for the static unavailable/pre-alpha shell;
- positive and negative extension-manifest permission-policy tests;
- repository topology and configuration integration regression tests;
- a Playwright smoke test of the built or previewed web shell;
- deterministic repeated extension-build comparison;
- frozen pnpm and locked Cargo resolution;
- Cargo format, clippy, test, and build gates; and
- a Tauri `build --no-bundle` on Windows when the documented MSVC, SDK, and WebView2 prerequisites are present.

The Playwright evidence is the static web shell served from an exact loopback origin with service workers blocked and context-wide HTTP/WebSocket guards. It is not a runtime Tauri/WebView test.

These are scaffold tests. They do not test or establish product download, network, crash-recovery, persistence, browser-handoff, or release behavior.

### 9. Defer CI, packaging, and publication

Wave 1 does not add a CI workflow. Its local commands exist and pass; a later reviewed change may automate them. Runner selection, caching, credentials, audit tooling, and matrices remain future decisions.

Wave 1 also excludes bundles, installers, signing, checksums for distribution, update feeds, store packages, release uploads, package publication, and browser-store submission. A successful no-bundle build is not a release artifact.

## Consequences

### Positive

- The repository gains reproducible, locally verifiable build infrastructure without implying product behavior.
- Exact workspace membership and an edge-free initial graph prevent speculative coupling.
- API-free libraries make ownership and toolchain checks real without creating dummy exports.
- The static desktop and inert extension establish measurable least-privilege baselines.
- Lockfiles and exact local gates provide evidence that later CI can automate rather than invent.

### Costs

- Eleven Rust packages compile without offering a product API.
- The desktop toolchain is intentionally heavier than the static behavior it proves.
- Playwright and Tauri require external browser and Windows prerequisites beyond dependency installation.
- Exact pins may require a documented contract revision if the package graph proves incompatible.

### Risks

- A buildable shell may be mistaken for a working download manager. Status text and tests must state that downloads are unavailable.
- Generated defaults may grant more Tauri or browser authority than intended. Policy tests must reject broad defaults rather than accepting generator output blindly.
- Aggregate scripts can appear green while skipping work. Every required constituent must be explicit and absence must fail.
- Empty-looking crates can attract dummy APIs. Crate-level responsibility documentation and public-item regression checks prohibit that response.

## Alternatives considered

### Add one crate and split it later

Rejected because Wave 0 already established ten durable ownership boundaries, and Wave 1 must prove the documented topology without inventing shared APIs.

### Add dummy exported functions so every crate has a unit test

Rejected because dummy symbols create false product interfaces and meaningless behavior. Topology, documentation, lint, compile, and public-item checks are the meaningful evidence for API-free crates.

### Implement a sample download or Tauri command

Rejected because the authorized scope is repository infrastructure only. Even a demonstration command would create product/security semantics before the owning feature decision and tests.

### Give the extension a toolbar action without permissions

Rejected because Wave 1 needs manifest and packaging evidence, not a browser user interface. The exact three-key manifest is easier to audit and cannot imply capture behavior.

### Add CI with the first manifests

Rejected because CI would have encoded commands and platform assumptions before their local behavior was verified. Automation remains a later reviewed step.

## Implementation evidence

The complete Wave 1 gate was observed on a supported Windows 11 environment on 2026-11-10 with Node `24.16.0`, pnpm `12.18.0`, Rust/Cargo `1.99.1`, MSVC `14.44.35229`, Windows SDK `10.0.26100.0`, and WebView2 present:

- Locked metadata reported exactly eleven Cargo members and two private pnpm applications. The ten libraries were API-free/dependency-free, and the live graph had zero internal workspace edges.
- `corepack pnpm install --frozen-lockfile` passed. `Cargo.lock` SHA-256 was `BB7B4118A417CEAEB2581B76BAA1B2AA3402B85C0CFBE251104037B01B90E9B2`; `pnpm-lock.yaml` SHA-256 was `D3153A36A4D3A80E576364B32AB08F17DD16E1D78E1933D5D8400762D649930A`.
- The final `corepack pnpm check` exited zero. Vitest passed 102 tests across 10 files with no skips, and Playwright passed one loopback-only static-shell smoke.
- Cargo format, clippy, test, and build passed. Cargo test exercised 11 harnesses with zero test cases by intentional API-free design; this is not Rust unit coverage.
- Both web applications built. Tauri `build --no-bundle -- --locked` passed, and the Tauri capability/CSP and inert-extension permission policies passed.
- Generated build/test output was cleaned and no release artifact exists. The blueprint SHA-256 remained `57C6C640AFAFE7E55C74A51E1008B4338B1FC3B78CF8DE0642AF8ABA9C3B488D`.

## Compliance

The local evidence satisfies every binary criterion in the Wave 1 section of [`../PRD.md`](../PRD.md) and every required gate in [`../TEST_PLAN.md`](../TEST_PLAN.md) for this working tree. It implements repository infrastructure only.

This ADR remains Proposed until the complete change is reviewed and merged into the default branch. Local success does not accept this ADR, accept the Wave 1 milestone, prove a merge, create a release, or implement any product capability. ADR 0001 likewise remains Proposed.
