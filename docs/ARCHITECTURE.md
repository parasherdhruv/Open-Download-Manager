# Architecture

**Status:** Buildable repository scaffold / pre-alpha. Wave 1's exact workspace, zero-feature applications, API-free crates, scaffold tests, and local gates are committed at `4b2aca0`, published as hosted `main`, and locally verified. Roadmap Phase 0 governance and continuous-validation definitions exist on a review branch; private vulnerability reporting is enabled, but independent review, merge, branch enforcement, and hosted workflow results are not yet evidenced. No product protocol or download-manager behavior exists. ADRs 0001, 0002, and 0003 remain Proposed.

## Architectural goals

- Keep privileged and authoritative work in Rust backend components.
- Separate transfer, scheduling, storage, filesystem, protocol, browser, media, IPC, and presentation responsibilities.
- Keep current and allowed future dependency direction explicit and acyclic.
- Keep application packages as thin composition roots rather than reusable dependency targets.
- Introduce public interfaces only with a concrete use case, tests, and synchronized documentation.
- Preserve local-first operation and minimize permissions and network exposure.

## Current and planned monorepo tree

`(current Wave 1)` marks committed and locally verified repository infrastructure. `(current Phase 0)` marks the authorized governance/automation follow-on in the current change. `(current)` marks maintained governance or documentation. `(future)` means neither the artifact nor its behavior necessarily exists.

```text
open-download-manager/
|-- .github/
|   |-- workflows/                     (current Phase 0 continuous-validation definitions)
|   |-- CODEOWNERS                     (current Phase 0 review ownership)
|   |-- dependabot.yml                 (current Phase 0 update proposals)
|   `-- pull_request_template.md       (current)
|-- apps/
|   |-- desktop/
|   |   |-- README.md                  (current)
|   |   |-- package.json               (current Wave 1 pnpm app manifest)
|   |   |-- index.html                 (current Wave 1 local shell entry)
|   |   |-- src/                       (current Wave 1 static React shell/test)
|   |   |-- e2e/                       (current Wave 1 local shell smoke)
|   |   `-- src-tauri/                 (current Wave 1 zero-feature Tauri package)
|   `-- browser-extension/
|       |-- README.md                  (current)
|       |-- package.json               (current Wave 1 pnpm app manifest)
|       |-- manifests/                 (current Wave 1 inert Manifest V3 source)
|       |-- scripts/                   (current Wave 1 build/policy logic)
|       `-- tests/                     (current Wave 1 manifest policy tests)
|-- crates/                            (current Wave 1 API-free libraries)
|   |-- shared-types/
|   |-- diagnostics/
|   |-- protocol-http/
|   |-- file-manager/
|   |-- storage/
|   |-- download-core/
|   |-- download-scheduler/
|   |-- ipc/
|   |-- native-messaging/
|   `-- media-detection/
|-- docs/                              (current specifications)
|   `-- decisions/                     (current ADRs)
|-- tests/
|   |-- README.md                      (current)
|   |-- fixtures/                      (future)
|   |-- mock-download-server/          (future)
|   |-- integration/                   (future)
|   |-- scaffold/                      (current Wave 1 scaffold tests/helpers)
|   `-- benchmarks/                    (future)
|-- scripts/                           (current Phase 0 JavaScript license policy)
|-- AGENTS.md                          (current)
|-- CHANGELOG.md                       (current)
|-- CODE_OF_CONDUCT.md                 (current)
|-- CONTRIBUTING.md                    (current)
|-- GOVERNANCE.md                      (current Phase 0 ownership and approval policy)
|-- LICENSE                            (current)
|-- README.md                          (current)
|-- SECURITY.md                        (current)
|-- blueprint.md                       (current, preserved source vision)
|-- .editorconfig                      (current Wave 1 text policy)
|-- .gitattributes                     (current Wave 1 attribute policy)
|-- .gitignore                         (current Wave 1 generated-output policy)
|-- .markdownlint-cli2.jsonc           (current Wave 1 Markdown policy)
|-- .markdownlintignore                (current Wave 1 Markdown exclusions)
|-- .npmrc                             (current Wave 1 pnpm policy)
|-- .nvmrc                             (current Wave 1 exact Node pin)
|-- .prettierignore                    (current Wave 1 format exclusions)
|-- .prettierrc.json                   (current Wave 1 format policy)
|-- Cargo.toml                         (current Wave 1 workspace manifest)
|-- Cargo.lock                         (current Wave 1 committed Cargo lockfile)
|-- deny.toml                          (current Phase 0 Rust dependency policy)
|-- eslint.config.mjs                  (current Wave 1 lint policy)
|-- package.json                       (current Wave 1 private root manifest)
|-- pnpm-workspace.yaml                (current Wave 1 workspace manifest)
|-- pnpm-lock.yaml                     (current Wave 1 committed pnpm lockfile)
|-- rust-toolchain.toml                (current Wave 1 toolchain pin)
|-- tsconfig.base.json                 (current Wave 1 root type-check policy)
`-- vitest.config.ts                   (current Wave 1 scaffold-test config)
```

CI was not part of Wave 1. The separately authorized Roadmap Phase 0 change now defines Windows continuous validation and supply-chain checks under [Proposed ADR 0003](decisions/0003-continuous-validation-and-governance.md). Those definitions automate scaffold evidence only and do not create product or release evidence. Hosted execution remains unverified until a default branch and reviewed workflow run exist. Release automation remains future scope.

## Repository automation boundary

The primary workflow provisions the exact repository toolchains on `windows-2025` and invokes the existing `corepack pnpm check` composition rather than duplicating its internal commands. Separate unprivileged jobs scan Git history for secrets and validate Rust/JavaScript dependency advisories, licenses, and sources.

Automation may read repository contents and public dependency/advisory services. It may not mutate the repository, publish artifacts, access release environments, receive signing/store/provider credentials, or execute proposed code through a privileged event. Full action SHAs, downloaded-tool digests, frozen/locked dependency resolution, finite timeouts, and cleanup policy are architecture inputs covered by scaffold policy tests.

CODEOWNERS identifies reviewers but is not an authorization or enforcement mechanism by itself. Hosted branch rules and independent review remain required external controls under [`../GOVERNANCE.md`](../GOVERNANCE.md).

## Ownership boundaries

### Desktop frontend

The React frontend currently renders only a static pre-alpha/downloads-unavailable shell with no product action. Its planned product ownership is presentation, accessibility, local view state, and user intent. Later product slices may request backend operations and render aggregated status. The frontend must not own download networking, direct arbitrary filesystem writes, scheduling, persistence, secret storage, authoritative transfer state, or integrity decisions.

### Desktop Rust backend

The zero-feature Tauri package is the desktop application composition root. Wave 1 proves only the local window/build boundary and has no custom command, product event, application plugin integration, product state, or internal workspace dependency. Its policy input is the complete root Tauri configuration artifact set, which must contain only `tauri.conf.json`, plus the exact normalized `src/main.rs` and `build.rs` composition roots. Platform overlays and alternate JSON5/TOML configuration are forbidden. Later slices may add reviewed process lifecycle, dependency construction, command authorization, event aggregation, graceful shutdown, and mapping between frontend requests and domain operations. No reusable crate may depend on the app.

### Browser extension

The extension is a separate TypeScript application boundary. Wave 1 implements manifest build/policy code but emits only the inert three-key manifest with Chromium-valid version `0.0.1` and has no runtime code, permission, background process, UI, or handoff. Explicit output directories are create-only; replacement is confined to the verified package-owned default `dist`. Later reviewed slices may detect eligible user-visible links, gather the minimum approved metadata, and request handoff through native messaging. The extension receives no unrestricted filesystem access, does not connect to an unrestricted local HTTP service, and is never the source of truth for download state.

### Rust components

| Component            | Planned single responsibility                                                         | Must not own                                            |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `shared-types`       | Stable domain values and explicitly reviewed cross-boundary data shapes               | I/O, orchestration, framework integration               |
| `diagnostics`        | Structured internal diagnostics, error classification, and mandatory redaction policy | Product state, network or file operations               |
| `protocol-http`      | HTTP/HTTPS inspection, redirects, range requests, and response validation             | Scheduling, final paths, database policy                |
| `file-manager`       | Safe destination resolution, temporary files, positioned writes, finalization         | Network requests, queues, UI                            |
| `storage`            | SQLite persistence, transactions, migrations, and recovery records                    | Network transfer, UI, scheduling policy                 |
| `download-core`      | Transfer lifecycle, state validation, segment coordination, integrity decisions       | UI, browser protocol, global queue fairness             |
| `download-scheduler` | Queue ordering, global/per-host limits, retry timing, fairness, shutdown coordination | HTTP parsing, direct file writes, UI                    |
| `ipc`                | Authenticated local IPC framing, transport limits, and protocol validation            | Download policy, browser APIs, persistence              |
| `native-messaging`   | Browser native-host executable boundary and validated bridge to IPC                   | Engine state, unrestricted network or filesystem access |
| `media-detection`    | Detection and planning for explicitly supported authorized clear media                | DRM circumvention, browser UI, generic scheduling       |

These are ownership descriptions, not public API definitions.

In Wave 1 each component is an API-free, dependency-free library whose root contains crate-level documentation of the corresponding responsibility and non-responsibilities, plus permitted lint attributes only. No dummy public symbol, build script, dev dependency, or product behavior is introduced to make the crate appear non-empty.

## Current Wave 1 Rust dependency graph

Locked Cargo metadata reports the ten library packages and `odm-desktop` with **zero internal workspace dependency edges**. Every Wave 1 node therefore has `(none)` as its current internal dependency set. The libraries are also free of direct, development, and build dependencies; the desktop package has only its external Tauri runtime/build dependencies.

The topology suite verifies the live edge-free graph and rejects a synthetic missing member, extra member, internal edge, disallowed edge, or cycle. This current graph is deliberately smaller than the allowed future graph below.

## Allowed future Rust dependency graph

The following graph is the complete upper bound of allowed **internal Rust workspace dependency edges** for later product slices. `A -> B` means component `A` may depend on component `B` when concrete code requires that edge; it does not require or justify the edge. External third-party dependencies are not selected by this graph.

```text
shared-types       -> (none)
diagnostics        -> shared-types
protocol-http      -> shared-types, diagnostics
file-manager       -> shared-types, diagnostics
storage            -> shared-types, diagnostics
ipc                -> shared-types, diagnostics
download-core      -> shared-types, diagnostics, protocol-http, file-manager, storage
media-detection    -> shared-types, diagnostics, protocol-http
native-messaging   -> shared-types, diagnostics, ipc
download-scheduler -> shared-types, diagnostics, download-core
```

The allowed graph is acyclic by construction. If all allowed edges were eventually justified, its topological layers would be:

1. `shared-types`.
2. `diagnostics`.
3. `protocol-http`, `file-manager`, `storage`, and `ipc`.
4. `download-core`, `media-detection`, and `native-messaging`.
5. `download-scheduler`.
6. Application composition roots.

An internal edge not listed above is prohibited until architecture review updates this graph. An allowed edge remains optional and must not be added before a concrete caller requires it. In particular, lower layers must not call the scheduler, reusable crates must not depend on an app, `download-core` must not depend on browser/native messaging, and `protocol-http` must not depend on storage or filesystem policy.

Workspace checks must inspect locked Cargo metadata and fail on missing or extra members, a disallowed edge, or a cycle. The Wave 1 regression also fails on any actual internal workspace edge. Tests may inspect production components for verification but must not become a production dependency.

## Application composition roots

### Desktop composition root

In later product slices, `apps/desktop/src-tauri` may depend on the scheduler, core, storage, IPC, media, diagnostics, and shared types needed to assemble the desktop process. Wave 1 has no internal workspace dependency and exposes no custom Tauri command or product event. Future composition will construct concrete adapters, start and stop services in a defined order, expose a narrow Tauri boundary, and aggregate backend events for the UI. Business rules stay in owning crates.

### Native messaging host composition root

Wave 1 creates `native-messaging` as an API-free library package solely to prove workspace topology and ownership. A later reviewed browser slice may add its executable integration boundary to read and write browser native-messaging frames, validate the allowed browser origin and protocol envelope, and forward approved requests through the `ipc` component. No other production crate may depend on `native-messaging`.

### Browser extension composition root

A future extension background process may compose browser APIs, detection policy, user settings, and native messaging. Wave 1 has no background process. A future process cannot directly instantiate Rust components or bypass the native-host trust boundary.

Composition roots may select implementations and lifecycle policy. They must not turn cross-component wiring into an alternate business-logic layer.

## Workspace boundaries

### Wave 1 Cargo workspace

The root Cargo workspace includes exactly the ten library packages under `crates/`, named for their directories, and package `odm-desktop` under `apps/desktop/src-tauri`. It uses Rust edition 2024 and Cargo resolver 3 and commits `Cargo.lock`. The ten libraries contain crate-level responsibility documentation but no public items. Wave 1 uses no internal workspace dependency; workspace dependency declarations never grant an unlisted edge.

### Wave 1 pnpm workspace

The pnpm workspace includes exactly `@odm/desktop` and `@odm/browser-extension`. A private root package orchestrates formatting, linting, type checking, tests, and builds but is not a third application. Browser code must not import desktop private modules by relative path. No shared TypeScript package exists or is permitted in Wave 1.

### Cross-workspace tests

Root `tests/` currently owns scaffold topology/configuration, Tauri effective-artifact and exact-root policy, pnpm importer/lock consistency, resilience/regression, extension output safety, and deterministic-build verification authorized by the PRD. It will eventually own controlled network fixtures, the mock download server, product integration scenarios, and benchmarks that cross a package boundary. Unit tests remain beside their owning component. Test helpers must not leak test-only behavior into production packages.

## Planned data and control flow

```text
User intent
  -> React presentation
  -> constrained Tauri command boundary
  -> scheduler and download core
  -> HTTP, storage, and file adapters
  -> aggregated state/events
  -> React presentation

Browser user action
  -> extension validation
  -> native messaging host validation
  -> per-user authenticated local IPC
  -> desktop composition root
  -> scheduler and download core
```

The backend is authoritative. Frontend or extension caches may improve rendering but cannot decide that a download completed, that bytes are valid, or that a path is safe.

## State, concurrency, and failure rules

- State transitions are validated in `download-core`; invalid transitions fail explicitly.
- `storage` is the durable source of truth after persistence is implemented, while in-flight workers hold only coordinated runtime state.
- A single scheduler decision may start a job; concurrent workers must not start the same job twice.
- Segment writes use non-overlapping offsets and never share an unsynchronized mutable file cursor.
- Cancellation and shutdown flow from composition roots toward workers and persistence checkpoints.
- Adapter failures become structured internal errors with secrets redacted before diagnostics or UI exposure.
- A boundary outage degrades safely: browser handoff returns to an ordinary browser download where possible, and incomplete files never masquerade as completed files.

## Interface evolution

- Do not create interfaces in anticipation of hypothetical consumers.
- A cross-crate interface requires an owning requirement, caller, failure semantics, security review, and tests.
- Cross-process protocols require explicit versioning, size limits, request correlation, validation, and compatibility policy before implementation.
- Public interface changes require migration impact analysis and synchronized documentation; silent changes are prohibited.
- Shared types remain minimal so they do not become a dependency dumping ground.

## Security architecture

Trust boundaries and required controls are defined in [`SECURITY.md`](SECURITY.md). In summary, all network, browser, IPC, path, database, and downloaded inputs are untrusted; TLS stays enabled; secrets are redacted and separately protected; local IPC is per-user and access-controlled; and downloaded files are never executed automatically.

## Unresolved architectural decisions

The following choices require later ADRs or explicit resolution in an implementation milestone:

- Selection between `reqwest` and lower-level HTTP clients, based on range control, redirect policy, streaming, proxy, TLS, and testability needs.
- Selection between SQLx and rusqlite, including migration tooling and compile-time/offline implications.
- Exact secret-storage abstraction and Windows DPAPI integration.
- Local IPC framing, peer authentication mechanism, protocol schema, and compatibility window.
- Event aggregation cadence and backpressure strategy between Rust and the desktop frontend.
- Packaging details for the native messaging host and its browser registration installer.
- Whether any shared TypeScript package is justified; none is assumed by the initial tree.

None of these open choices authorizes a placeholder interface or a dependency addition before review.
