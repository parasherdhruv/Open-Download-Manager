# Cross-Workspace Test Boundary

**Status:** Wave 1 repository-scaffold tests are implemented and locally verified. This directory contains topology/configuration, API-free crate, regression, resilience, Tauri policy, and extension-build determinism tests plus support helpers. It contains no download fixture server, product integration suite, product resilience suite, benchmark, or generated test output.

## Ownership

This directory owns current cross-workspace scaffold verification and will contain later product tests and resources that cross a production package boundary:

```text
tests/
|-- fixtures/              planned deterministic synthetic inputs
|-- mock-download-server/  planned controlled HTTP behavior
|-- integration/           planned cross-component scenarios
|-- scaffold/              implemented Wave 1 topology/build policy tests
`-- benchmarks/            planned reproducible performance cases
```

Unit tests remain beside the component they own. A test belongs here when it composes multiple crates/apps, requires a local protocol server, validates a process or browser boundary, or measures system-level behavior.

The full strategy, observed scaffold evidence, and documentation-change validation are in [`../docs/TEST_PLAN.md`](../docs/TEST_PLAN.md).

## Wave 1 scaffold-test boundary

Proposed ADR 0002 authorizes only repository-infrastructure coverage before product behavior. The implemented suite covers:

- Exact Cargo and pnpm workspace membership, configuration pins, and absence of disallowed or cyclic Rust edges.
- Dependency-free, API-free Rust library roots containing only crate-level responsibility documentation and lint attributes, with synthetic public-item rejection.
- Positive and negative inert-extension manifest policy, including Chromium version validity and rejection of permission, host, background, content-script, action, native-messaging, and downloads surfaces.
- Tauri complete configuration-artifact, exact `main.rs`/`build.rs`, capability/CSP, and dependency-policy regression.
- Offline frozen pnpm importer/lock consistency with before/after hash and synthetic drift rejection.
- Create-only explicit extension output, isolated verified default replacement, external sentinel preservation, and two clean builds with identical one-file inventories and bytes.
- A local static Playwright web-shell smoke with service workers blocked and context-wide HTTP/WebSocket guards; no Tauri/WebView runtime, network fixture server, or product journey.

These tests are meaningful because they fail concrete topology, permission, configuration, filesystem-safety, lock-consistency, and reproducibility regressions. Across the two app-local scaffold files and eight root scaffold files, Vitest passed 102 tests in 10 files with no skips; Playwright separately passed one loopback-only static-shell smoke. Cargo exercised 11 test harnesses with zero test cases by intentional API-free design, not as unit coverage. Detailed cases, commands, and the bounded Windows descendant-timeout harness risk are in [`../docs/TEST_PLAN.md`](../docs/TEST_PLAN.md).

## Fixture rules

- Use deterministic synthetic data or material with documented test permission.
- Never commit credentials, cookies, signed URLs, private history, personal paths, downloaded private content, or real protected media.
- Generate large deterministic streams during tests rather than storing unnecessary large binaries.
- Record expected bytes or a trustworthy digest independent from the code under test.
- Bound fixture size, parser depth, delays, retries, and total runtime.
- Version protocol and schema fixtures when compatibility behavior is under test.
- Keep malformed/security fixtures non-operational outside the isolated harness and avoid public exploit detail when disclosure is pending.

## Isolation and cleanup

- Use test-owned temporary directories, databases, browser profiles, named pipes, ports, and process identities.
- Never read or write a contributor's actual downloads directory, browser profile, credential store, ODM database, or native-host registration.
- Prevent test services from binding to unrestricted interfaces.
- Do not depend on public websites, public media, external DNS behavior, or unrelated mirrors.
- Clean up on success, assertion failure, cancellation, timeout, and child-process crash.
- Preserve only minimal sanitized diagnostics required to investigate a failure.

## Download integrity rule

Every integration test that downloads or assembles content must compare the final bytes directly or verify a trustworthy expected digest. Status, filename, length, or a local digest with no independent expected value is insufficient.

Partial, cancelled, failed, or crashed scenarios must additionally assert state, temporary-file policy, durable progress bounds, and absence of an incorrectly finalized file.

## Planned suite boundaries

- HTTP fixtures cover valid/invalid ranges, ignored ranges, missing lengths, redirects, rate limits, disconnects, validators, authentication expiry, and slow responses.
- Filesystem fixtures cover collisions, hostile names, reparse points, locks, permissions, disk exhaustion, short writes, and finalization interruption.
- Storage fixtures cover migrations, transactions, busy/WAL behavior, corruption, recovery, and secret absence.
- Browser fixtures cover messages, versions, host/IPC failures, restarts, permissions, fallback, and separate browser compatibility.
- Media fixtures cover narrow clear direct/HLS/DASH profiles, malformed input, protected-content rejection, nested URL policy, and assembly integrity.
- Benchmarks record environment and integrity alongside throughput and resource use.

None of these planned product suites is implemented. The existing `scaffold/` suite is repository-infrastructure evidence only.
