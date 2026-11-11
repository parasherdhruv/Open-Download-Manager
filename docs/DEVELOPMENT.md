# Development Policy

**Current status:** Wave 1 repository infrastructure is implemented and locally verified. The exact Cargo/pnpm workspaces, toolchain metadata, stable lockfiles, zero-feature sources, scaffold tests, and root commands exist. Product functionality and CI do not. [ADR 0002](decisions/0002-buildable-workspace-scaffold.md) remains Proposed until review and merge.

## Baseline toolchain policy

| Area                       | Exact Wave 1 baseline                               | Repository policy                                                                           |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Operating system           | Windows 11 x64 first                                | Other desktop targets are future scope                                                      |
| Node.js                    | `24.16.0`                                           | `.nvmrc` contains `24.16.0`; root `engines.node` requires that exact version                |
| JavaScript package manager | Corepack pnpm `12.18.0`                             | Root `packageManager` and `engines.pnpm` select the exact version; no unrelated global pnpm |
| Rust                       | Stable `1.99.1` with `rustfmt` and `clippy`         | `rust-toolchain.toml` pins the channel and components                                       |
| Rust language/workspace    | Edition 2024; Cargo resolver 3                      | Set centrally and inherited by every Wave 1 package                                         |
| Desktop shell              | Tauri `2.12.5`; `tauri-build` `2.7.4`; CLI `2.12.4` | Zero-feature, no-bundle baseline only                                                       |
| Frontend runtime           | React and React DOM `19.3.1`                        | Static pre-alpha shell; no product state or action                                          |
| Type system                | TypeScript `6.0.3`                                  | Strict checking with no emit for the type gate                                              |
| Web build/style            | Vite `8.3.7`; Tailwind CSS `4.3.5`                  | Local static assets only                                                                    |
| Unit tests                 | Vitest `5.1.0`                                      | React and policy/configuration coverage                                                     |
| Browser smoke              | Playwright `1.65.0`                                 | One local web-shell smoke test; no public network                                           |
| Lint                       | ESLint `9.39.5`                                     | Flat configuration with compatible plugins pinned exactly                                   |

Wave 1 metadata encodes these pins without interpretation:

- `.nvmrc` contains the single version line `24.16.0`.
- Root `package.json` contains `"version": "0.0.0"`, `"packageManager": "pnpm@12.18.0"`, `"engines": { "node": "=24.16.0", "pnpm": "=12.18.0" }`, and `"private": true`; both app package manifests also use version `0.0.0` and `private: true`. The emitted Chromium extension manifest independently uses the smallest valid three-component value, `0.0.1`.
- `rust-toolchain.toml` selects channel `1.99.1`, profile `minimal`, components `rustfmt` and `clippy`, and target `x86_64-pc-windows-msvc`.
- The virtual root `Cargo.toml` sets resolver `"3"` and workspace package values `version = "0.0.0"`, `edition = "2024"`, `rust-version = "1.99.1"`, `license = "Apache-2.0"`, and `publish = false`; every Cargo member inherits them.
- The named pins apply to Cargo packages `tauri` and `tauri-build` and JavaScript packages `@tauri-apps/cli`, `react`, `react-dom`, `typescript`, `vite`, `tailwindcss`, `vitest`, `@playwright/test`, and `eslint` respectively.

Every direct JavaScript dependency and supporting tool must use an exact version without `^`, `~`, wildcard, tag, or workspace-range ambiguity. Compatible support packages such as React testing, DOM emulation, Vite React/Tailwind integration, ESLint plugins, and formatting tools must likewise be pinned exactly in manifests and locks. Cargo requirements for Tauri and `tauri-build` use exact `=` requirements rather than Cargo-compatible ranges.

A named exact pin may be adjusted only when lockfile resolution proves a documented incompatibility. The implementation change must record the attempted version, exact resolver error, replacement version, and successful lockfile evidence, then reconcile this document and Proposed ADR 0002 before completion. Selecting a newer or preferred version is not sufficient.

## Windows and Tauri prerequisites

A supported Wave 1 Windows environment must provide:

- A supported Windows 11 x64 installation with current security updates.
- Git and PowerShell suitable for repository and validation tasks.
- Node.js `24.16.0` with Corepack available.
- Rustup with toolchain `1.99.1`, components `rustfmt` and `clippy`, and the MSVC target selected by `rust-toolchain.toml`.
- Microsoft C++ Build Tools with the Desktop development with C++ workload.
- A compatible Windows SDK.
- Microsoft Edge WebView2 Runtime for Tauri desktop execution.
- Any additional system prerequisite documented by Tauri `2.12.5`.
- Playwright's Chromium build installed with `corepack pnpm exec playwright install chromium` after the frozen dependency install.

This repository does not provide or run an installer for these prerequisites. Contributors must obtain system tools from their official sources and follow organizational security policy.

## Implemented Wave 1 workspace bootstrap

The user-authorized Wave 1 change implements only the contract in [Proposed ADR 0002](decisions/0002-buildable-workspace-scaffold.md):

- Root Cargo metadata for exactly ten API-free libraries plus `apps/desktop/src-tauri`, using edition 2024 and resolver 3.
- `rust-toolchain.toml` pinning `1.99.1` with `rustfmt` and `clippy`.
- A private root JavaScript command package with `packageManager` set to `pnpm@12.18.0` and exact Node/pnpm engines.
- A pnpm workspace containing exactly private packages `@odm/desktop` and `@odm/browser-extension`; all Cargo packages set `publish = false`.
- Minimal static desktop, inert extension-manifest, configuration, and scaffold-test files that make every command below meaningful.
- Committed `Cargo.lock` and `pnpm-lock.yaml`, generated by the selected tools and attributable to reviewed manifest changes.

Wave 1 does not add product behavior under the guise of configuration. Dependency choices require license, maintenance, security, and necessity review. Generated lockfile entries are never hand-edited. The local commands exist and pass; CI, release, and publishing automation remain out of scope.

## Wave 1 root command contract

These names are the implemented and locally verified root developer interface for Wave 1. A missing required command or test is a failure, not a permitted skip.

### Environment provisioning

| Command                                          | Required result                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile`        | Install the reviewed JavaScript graph without changing `pnpm-lock.yaml`            |
| `corepack pnpm exec playwright install chromium` | Provision the Playwright `1.65.0` Chromium binary in the external Playwright cache |

Provisioning is explicit and is not hidden inside `check`. The Chromium cache, `node_modules`, Cargo registry/cache, and compiler output are not committed.

### Required root scripts

| Root command                         | Required responsibility                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm format:check`         | Check authored Wave 1 source, configuration, tests, and maintained documentation without rewriting; exclude the byte-preserved blueprint and canonical license                                                                 |
| `corepack pnpm lint`                 | Run ESLint across both apps, test code, and JavaScript/TypeScript configuration                                                                                                                                                |
| `corepack pnpm typecheck`            | Run strict TypeScript checking without emit for every TypeScript project                                                                                                                                                       |
| `corepack pnpm test:unit`            | Run the React static-shell render test and other same-module scaffold tests                                                                                                                                                    |
| `corepack pnpm test:policy`          | Run extension version/permission policy plus complete Tauri configuration-artifact, capability/CSP, and exact Rust-root policy tests                                                                                           |
| `corepack pnpm test:topology`        | Validate active tool versions, exact Cargo/pnpm membership, offline frozen pnpm importer/lock consistency, package configuration, API-free crates, and absence of internal Rust edges; exercise rejecting synthetic violations |
| `corepack pnpm test:extension-build` | Verify explicit/default output safety, external-sentinel preservation, source/root guards, and two byte-identical one-file extension builds                                                                                    |
| `corepack pnpm test:e2e`             | Run the static local Playwright web-shell smoke with service workers blocked and browser-context HTTP/WebSocket guards; this is not a Tauri/WebView runtime test                                                               |
| `corepack pnpm test`                 | Run `test:unit`, `test:policy`, `test:topology`, and `test:extension-build` in that order                                                                                                                                      |
| `corepack pnpm build`                | Explicitly build both `@odm/desktop` and `@odm/browser-extension`; the extension output contains only `manifest.json`                                                                                                          |
| `corepack pnpm rust:fmt`             | Run the exact Cargo formatting command below                                                                                                                                                                                   |
| `corepack pnpm rust:clippy`          | Run the exact locked Cargo clippy command below                                                                                                                                                                                |
| `corepack pnpm rust:test`            | Run the exact locked Cargo test command below                                                                                                                                                                                  |
| `corepack pnpm rust:build`           | Run the exact locked Cargo build command below                                                                                                                                                                                 |
| `corepack pnpm tauri:build`          | Run the locked Tauri no-bundle build below on the supported Windows environment                                                                                                                                                |
| `corepack pnpm check`                | Run the complete non-release gate defined below                                                                                                                                                                                |

This table is the complete public root-script surface for Wave 1. App-local scripts and test helpers may back these commands but do not add product behavior; any additional root command requires a synchronized contract change.

`check` must execute, in order, `format:check`, `lint`, `typecheck`, `test`, `test:e2e`, `build`, `rust:fmt`, `rust:clippy`, `rust:test`, `rust:build`, and `tauri:build`. Because `test` expands to its four named constituents, every command in the table is required. The aggregate stops nonzero on the first failure and must not use permissive filters, `--if-present`, ignored exit codes, or platform detection that reports a skipped required step as success.

Within `test:topology`, Corepack pnpm runs `install --lockfile-only --frozen-lockfile --offline --ignore-scripts` through an argument array. The test hashes `pnpm-lock.yaml` before/after and requires success with identical bytes; a synthetic changed importer must fail without creating `node_modules` or regenerating the lock. This exact form was experimentally verified after frozen provisioning and performs validation only.

`check` does not install dependencies or Playwright browsers, modify source, regenerate locks, run dependency lifecycle scripts, create a bundle, publish a package, or contact a public/product network service. On a Windows machine missing the documented Tauri prerequisites, `tauri:build` must fail or be reported as not run; Wave 1 completion cannot claim `check` passed in that environment.

### Exact Cargo and Tauri invocations

| Command                                                                         | Required responsibility                                                                 |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `cargo metadata --locked --no-deps --format-version 1`                          | Supply locked metadata to topology verification                                         |
| `cargo fmt --all -- --check`                                                    | Verify Rust formatting without modification                                             |
| `cargo clippy --locked --workspace --all-targets --all-features -- -D warnings` | Reject warnings across every workspace target and feature                               |
| `cargo test --locked --workspace --all-targets --all-features`                  | Build and run all Rust test targets under the committed lock                            |
| `cargo build --locked --workspace --all-targets --all-features`                 | Compile the complete Cargo workspace under the committed lock                           |
| `corepack pnpm --filter @odm/desktop exec tauri build --no-bundle -- --locked`  | Build the Tauri application without a distributable bundle and without Cargo lock drift |

`cargo fmt` is intentionally the only Cargo command without `--locked`: rustfmt does not resolve dependencies and does not accept Cargo's lock-resolution option. All Cargo commands that read dependency resolution or compile use `--locked`.

### Observed local verification

On 2026-11-10, the complete contract was verified on Windows 11 with exact Node `24.16.0`, pnpm `12.18.0`, and Rust/Cargo `1.99.1`. The observed machine had MSVC `14.44.35229`, Windows SDK `10.0.26100.0`, and WebView2 present. Those MSVC and SDK values record the successful machine; they do not replace the supported prerequisite policy above with universal exact pins.

`corepack pnpm install --frozen-lockfile` and the final `corepack pnpm check` exited zero without lock drift or required skips. The final pass followed fixes to real TOML-policy test defects rather than suppressing them. Both web applications and the complete Cargo workspace built, and the locked Tauri no-bundle command passed. Generated build/test output was then cleaned; no bundle or release artifact exists. Exact scaffold-test counts and lock/blueprint digests are recorded in [`TEST_PLAN.md`](TEST_PLAN.md).

## Environment policy

### Reproducibility

- Use Node `24.16.0`, Corepack pnpm `12.18.0`, and Rust `1.99.1` from repository metadata.
- Use frozen pnpm and locked Cargo resolution in every required gate.
- Commit `Cargo.lock` and `pnpm-lock.yaml`; never hand-edit generated lockfile entries.
- Keep builds independent of developer-specific absolute paths, profiles, or undeclared global tools.
- Record required external system libraries and runner images before a build is called reproducible.

### Configuration and secrets

- Commit safe, non-secret defaults only after their owning behavior exists.
- Keep credentials, cookies, authorization headers, signing keys, provider tokens, and private URLs out of source, manifests, fixtures, snapshots, logs, and command examples.
- Use operating-system protected storage for runtime secrets; environment variables are not a durable secret store.
- Use synthetic values in tests. Never sanitize a real secret after committing it; follow incident response and rotate it.
- Do not disable TLS verification or security checks to make local development pass.

### Network and test isolation

- Unit tests must not require the public internet.
- Download integration tests must use a controlled local server and deterministic fixtures.
- Tests involving redirects, DNS, authentication, or private-address blocking must isolate and document the network boundary.
- Dependency downloads during an explicit install step are distinct from product network behavior and must come from reviewed registries.

### Filesystem behavior

- Tests write only beneath test-owned temporary directories and clean up on success, failure, and cancellation.
- Extension build tests may also create the exact package-owned default output only inside an isolated copied package fixture; they never replace a contributor-selected external path.
- Never use a contributor's actual downloads directory, browser profile, credential store, or production database as a test fixture.
- Windows path, reserved-name, case, separator, long-path, permission, and file-lock behavior require dedicated coverage.

### Logging and diagnostics

- Development logging follows the same redaction rules as production logging.
- Sensitive URL query values, headers, cookies, paths containing private user information, and downloaded content must not appear in ordinary diagnostics.
- Debug-only behavior must not weaken validation or become a release default.

## Quality expectations

- Treat compiler, type-checker, linter, and test warnings as actionable; suppressions require a narrow documented reason.
- Add tests in the owning component and cross-boundary tests under [`../tests/`](../tests/) where appropriate.
- Validate failure, cleanup, cancellation, restart, resource-limit, and security behavior, not only happy paths.
- Keep the now-buildable workspace buildable after every implementation milestone.
- Report the exact commands and outcomes; do not convert "not run" into a pass.

## Dependency policy

Before adopting a major dependency, review:

- Necessity and fit with the owning component.
- License compatibility with Apache-2.0 distribution.
- Maintenance health and vulnerability history.
- Transitive dependency and native-binary impact.
- Permission, network, telemetry, and data-handling behavior.
- Windows support and testability.

Reference implementations may inform design, but implementation code with incompatible license obligations must not be copied or embedded. In particular, studying aria2 does not authorize copying GPL-licensed source into ODM.

## Unresolved architectural decisions

- CI job and runner matrices, caching, credential isolation, and automation policy after local gates are verified.
- Dependency-audit and license-scanner selection, update cadence, and triage policy.
- Reproducible Windows packaging environment and signing-key custody.
- Toolchain and platform support beyond the pinned Windows-first Wave 1 baseline.

These are future automation, release, or support decisions. None changes or defers the exact Wave 1 local command contract.
