# Changelog

All notable changes to Open Download Manager will be documented in this file.

The project has not published a version or release. Entries under **Unreleased** describe repository changes only and must not be interpreted as product availability.

## [Unreleased]

### Added

- Documentation-only Wave 0 repository scaffold.
- Product, architecture, development, security, storage, testing, release, and roadmap specifications.
- Contribution, conduct, vulnerability disclosure, licensing, and pull request governance.
- Documented ownership boundaries for the future desktop app, browser extension, and cross-workspace tests.
- Wave 1 buildable repository infrastructure: exact Cargo/pnpm membership, pinned tools and stable locks, ten API-free Rust libraries, static desktop shell, inert extension manifest, least-privilege policy tests, and locally passing command gates.
- Local Windows 11 scaffold evidence recorded for local commit `4b2aca0`; ADRs 0001 and 0002 remain Proposed because hosted review and default-branch merge are not evidenced.
- Roadmap Phase 0 governance and continuous-validation definitions: Proposed ADR 0003, explicit ownership roles, CODEOWNERS, pinned Windows CI, secret/dependency/license/source policy, and reviewed dependency-update configuration.
- Hosted `main` and upstream tracking restored from scaffold commit `4b2aca0`; private vulnerability reporting, exact branch protection, and the initial four hosted checks verified. Independent review and Phase 0 merge remain pending.

### Product functionality

- None. Downloads, networking, persistence, scheduling, filesystem product I/O, browser integration, native messaging, local IPC, media handling, AI, telemetry, updater/tray behavior, installers, publishing, and release artifacts are not implemented. Workflow definitions are repository infrastructure, not product functionality, and hosted execution is not yet evidenced.
