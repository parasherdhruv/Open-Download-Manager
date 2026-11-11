# Open Download Manager

Open Download Manager (ODM) is a planned, local-first download manager for Windows. The long-range product vision includes reliable HTTP/HTTPS downloads, pause and resume, segmented transfers, scheduling, browser integration, authorized clear-media handling, and optional privacy-preserving assistance.

## Current status

**Buildable repository scaffold / pre-alpha. Wave 1 infrastructure is implemented and locally verified; product functionality is unavailable.**

The working tree contains locked Cargo and pnpm workspaces, exact toolchain metadata, ten API-free Rust libraries, a static React/Tailwind desktop pre-alpha shell, a zero-feature Tauri composition root, an inert three-key Manifest V3 package, and automated scaffold checks. The shell explicitly states that downloads are unavailable. These artifacts implement repository infrastructure only: there is no download/network engine, persistence, scheduler, filesystem product I/O, browser capture, native messaging, local IPC, media handling, AI, telemetry, updater, tray, installer, release, CI, or publishing.

The unchanged [`blueprint.md`](blueprint.md) is the source vision. The current working-tree ADRs remain Proposed; [ADR 0002](docs/decisions/0002-buildable-workspace-scaffold.md) records the exact user-authorized Wave 1 scope and local implementation evidence without claiming approval, acceptance, review, or merge. See [`AGENTS.md`](AGENTS.md) for the complete precedence and same-change ADR policy.

## Planned product principles

- Reliability before feature count.
- Performance measured under controlled conditions.
- Local-first operation without a required account or cloud service.
- Privacy by default and no telemetry without informed consent.
- No DRM, paywall, authentication, or access-control circumvention.
- A modular backend with explicit trust and ownership boundaries.

These are design requirements, not claims about current behavior.

## Wave 1 scaffold stack

The implemented scaffold pins:

- Windows 11 first.
- Rust `1.99.1` with rustfmt/clippy, edition 2024, and Cargo resolver 3.
- Tauri `2.12.5`, tauri-build `2.7.4`, and Tauri CLI `2.12.4`.
- React `19.3.1` and TypeScript `6.0.3` for the static desktop shell.
- Node.js `24.16.0` with Corepack-managed pnpm `12.18.0`.
- No persistence dependency; SQLite remains a future product decision boundary.
- An inert Manifest V3 browser package with no permissions or behavior.

These dependencies support the build and scaffold tests only. They do not implement a product capability. The exact pins and future product technology boundaries are in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Local verification

Use Windows 11 with the repository-pinned Node, pnpm, and Rust versions and the documented compatible Microsoft C++ Build Tools, Windows SDK, WebView2, and Playwright Chromium prerequisites. From the repository root:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm check
```

This sequence was observed to pass on 2026-11-10 with Node `24.16.0`, pnpm `12.18.0`, and Rust/Cargo `1.99.1`. `check` verifies formatting, linting, strict types, scaffold tests, the loopback-only shell smoke, both web builds, Cargo formatting/clippy/test/build, and the locked Tauri no-bundle build. It does not produce a release artifact or test download behavior. Detailed evidence is in [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md).

## Repository map

| Path                                                 | Current contents                                                                 | Boundary                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`apps/desktop/`](apps/desktop/)                     | Static React/Tailwind shell, zero-feature Tauri package, and scaffold tests      | Future desktop composition root; no download-manager behavior  |
| [`apps/browser-extension/`](apps/browser-extension/) | Inert manifest source/build and permission-policy tests                          | Future least-privilege extension; no runtime browser behavior  |
| [`crates/`](crates/)                                 | Ten dependency-free, API-free library packages                                   | Documented future Rust ownership boundaries                    |
| [`tests/`](tests/)                                   | Topology, policy, resilience, regression, and deterministic-build scaffold tests | Future cross-workspace product fixtures and integration tests  |
| [`docs/`](docs/)                                     | Product, architecture, security, test, and release specifications                | Current working-tree documentation; review and merge still due |
| [`docs/decisions/`](docs/decisions/)                 | Two Proposed architecture decisions                                              | Durable decisions only after acceptance by review and merge    |
| [`blueprint.md`](blueprint.md)                       | Byte-preserved source vision                                                     | Long-range product input                                       |

The exact eleven-member Cargo workspace, two-application pnpm workspace, current edge-free graph, and allowed future graph are defined in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

- [Documentation index and authority](docs/README.md)
- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development policy](docs/DEVELOPMENT.md)
- [Download engine specification](docs/ENGINE_SPEC.md)
- [Browser integration specification](docs/BROWSER_INTEGRATION.md)
- [Media support specification](docs/MEDIA_SUPPORT.md)
- [Engineering security model](docs/SECURITY.md)
- [Logical database schema](docs/DATABASE_SCHEMA.md)
- [Test plan](docs/TEST_PLAN.md)
- [Release plan](docs/RELEASE_PLAN.md)
- [Roadmap](docs/ROADMAP.md)

## Governance

- [Contributing](CONTRIBUTING.md)
- [Contributor Code of Conduct](CODE_OF_CONDUCT.md)
- [Vulnerability disclosure policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Agent and contributor operating rules](AGENTS.md)

## License

ODM is licensed under the [Apache License 2.0](LICENSE).
