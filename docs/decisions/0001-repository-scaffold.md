# ADR 0001: Establish a Documentation-First Repository Scaffold

- **Status:** Proposed
- **Date:** 2026-11-10
- **Decision scope:** Wave 0 repository structure, governance, authority, license, and future build baseline
- **Acceptance condition:** This record becomes Accepted only when it is reviewed and merged into the default branch.

## Context

Wave 0 authoring used [`blueprint.md`](../../blueprint.md), a supplied source vision covering a Windows-first Rust/Tauri/React download manager. The blueprint is aspirational: it describes long-range product behavior, but no source, workspace, build, test, security control, installer, or release existed at that stage. This unmerged record does not claim repository-history provenance or prior acceptance.

Moving directly from that vision to product code would leave current scope, dependency direction, trust boundaries, completion language, toolchain policy, and release gates ambiguous. It would also make it easy to present planned capability as implemented or to create incompatible crate interfaces before a concrete caller exists.

Wave 0 was intentionally restricted to Markdown/text documentation and the canonical license. It did not add code, manifests, lockfiles, workflows, tool configuration, dependency installation, or generated output.

## Decision

### 1. Establish a documentation-only milestone

Create the root governance and documentation set indexed by [`../README.md`](../README.md), plus README-only ownership boundaries for the future desktop app, browser extension, and cross-workspace tests.

The milestone was named **repository scaffold / pre-alpha**. Scaffolded means a documented location or responsibility exists. Implemented means source exists, failure and security paths are handled, relevant automated tests pass, and documentation matches verified behavior. No product behavior was implemented in Wave 0.

### 2. Preserve authority layers

- Approved current-scope documents describe current behavior, scope, and policy.
- The blueprint remains byte-for-byte preserved as source vision and long-range input.
- Accepted ADRs record durable decisions and rationale.

A governing legal or conduct document controls its subject. A later accepted ADR controls the specific technical decision it addresses, and affected general documentation must be reconciled. Current-scope documentation controls current status over aspirational blueprint wording. Conflicts are never resolved silently or by editing the blueprint to erase them.

### 3. Adopt Apache License 2.0

The repository adopts the canonical [Apache License 2.0](../../LICENSE). Dependency and bundled-asset licenses must be reviewed before adoption; this decision does not permit copying incompatibly licensed implementation code.

### 4. Define the target monorepo without creating it

The target structure contains:

- `apps/desktop` for the React/Tauri desktop composition root.
- `apps/browser-extension` for the TypeScript browser application.
- Ten planned Rust components for shared types, diagnostics, HTTP, files, storage, core transfer, scheduling, IPC, native messaging, and media detection.
- Root `tests` for cross-workspace fixtures, integration tests, resilience scenarios, and benchmarks.

The exact allowed internal Rust dependency edges, application roots, and workspace membership are defined in [`../ARCHITECTURE.md`](../ARCHITECTURE.md). Unlisted internal edges and circular dependencies are prohibited.

Only the app/test README boundaries and documentation directories were created in Wave 0. The `crates` tree and all manifests remained absent until the Wave 1 work described by Proposed ADR 0002.

### 5. Select a future build baseline

Wave 0 selected this baseline for the later workspace bootstrap:

- Windows 11 x64 as the first platform.
- Node.js 24.
- Corepack-managed pnpm 12.
- Stable Rust 1.99.1 pinned exactly.
- Rust edition 2024 and Cargo resolver 3.
- Tauri 2, React 19, and strict TypeScript, with exact dependency releases selected through review.

The explicitly authorized follow-on, [Proposed ADR 0002](0002-buildable-workspace-scaffold.md), fixes the exact Wave 1 patch versions and command gates. Its infrastructure is now implemented and locally verified in this working tree. It refines this broad baseline without changing Wave 0's historical documentation-only boundary, remains Proposed while unmerged, and becomes Accepted only with review and merge.

[`../DEVELOPMENT.md`](../DEVELOPMENT.md) defines the exact Wave 1 root command contract. The manifests, source, configuration, and tests now implement that contract, and the commands were locally verified on the documented Windows baseline.

### 6. Keep privileged behavior in Rust

Future networking, file writes, scheduling, persistence, secret handling, integrity decisions, and authoritative state belong to Rust backend components. The React frontend is presentation and user intent. The extension has no unrestricted filesystem access and reaches the engine only through a validated native-host and per-user IPC boundary.

### 7. Make tests and security release-blocking

Implementation milestones must add tests with behavior, including failure, cleanup, cancellation, restart, resource-limit, and security boundaries. Download integration tests compare final bytes or a trustworthy expected digest. Security controls in [`../SECURITY.md`](../SECURITY.md) and release gates in [`../RELEASE_PLAN.md`](../RELEASE_PLAN.md) cannot be waived by a passing happy path.

Wave 0 used documentation validation only and reported that no automated product tests or build existed at that stage.

## Consequences

### Positive

- Current status and long-range intent are separated explicitly.
- Future contributors receive one operating contract and a required reading path.
- Crate ownership and dependency direction are set before interfaces can accrete.
- Security, failure, test, storage, browser, media, and release obligations are visible before implementation.
- The repository can adopt Apache-2.0 without implying that distributable software exists.

### Costs

- No runnable demonstration was produced by Wave 0.
- The later bootstrap had to translate documented versions and commands into actual metadata and prove them; Wave 1 now provides that evidence.
- Technical choices intentionally left open require later ADRs before affected implementation.
- Documentation must be reconciled whenever a later decision changes a boundary.

### Risks

- Readers may mistake detailed specifications for shipped behavior. Every entry point therefore carries explicit pre-alpha/not-implemented language.
- Toolchain versions may age before bootstrap. Any change requires scoped compatibility review rather than silent substitution.
- A documented graph may prove impractical. It can be superseded through an ADR with migration impact, not bypassed ad hoc.

## Alternatives considered

### Implement an application skeleton in Wave 0

Rejected because the authorized scope forbids code and manifests, and a skeleton could falsely imply a working build or product behavior.

### Copy the blueprint into current documentation unchanged

Rejected because aspirational imperatives would remain ambiguous as current claims and would not establish conflict, test, security, or completion rules.

### Use one Rust crate for all backend behavior

Rejected because it obscures trust and ownership boundaries and makes browser, storage, filesystem, transport, and scheduler coupling harder to control.

### Finalize every dependency and public interface now

Rejected because no concrete implementation evidence or callers existed in Wave 0. The architecture fixes responsibilities and dependency direction while deliberately deferring public signatures and library choices.

### Add CI and release workflows with the documentation

Rejected because no authoritative commands, manifests, tests, build, secrets model, or artifacts existed in Wave 0. Automation still follows locally verified behavior in a later reviewed milestone.

## Follow-on decisions

Later ADRs are required for durable choices including HTTP and SQLite libraries, private-network enforcement, protected secret storage, IPC protocol/security, filesystem authorization, schema/migration tooling, packaging, signing custody, update/version compatibility, and any external media tool.

Open choices are listed under "Unresolved architectural decisions" in the owning specifications. They are blockers, not placeholders.

## Compliance

This Proposed decision's Wave 0 authoring criteria were satisfied when the requested documentation set was substantive and internally consistent, relative links and text hygiene passed, only authorized files existed, no product/configuration artifact was created, and `blueprint.md` was verified byte-for-byte unchanged. Those checks validated the Wave 0 working-tree scaffold only; they neither accept this ADR nor make any product capability implemented.
