# Test Plan

**Current status:** Wave 1 scaffold tests and local command gates are implemented at `4b2aca0`, published as hosted `main`, and locally verified. Roadmap Phase 0 adds locally passing repository-automation and license-policy regressions plus pinned workflow definitions on a review branch. Private vulnerability reporting, exact branch protection, and the initial four hosted checks are verified; independent review and merge remain pending. No download fixture server, product integration/resilience test, benchmark, or product behavior exists.

## Objectives

- Prove correctness at the smallest owning boundary and across real composition boundaries.
- Exercise failure, cleanup, cancellation, restart, resource-limit, and security behavior, not only success.
- Keep network tests deterministic and independent of public services.
- Verify downloaded output byte-for-byte or against a trustworthy expected digest.
- Make compatibility and performance claims reproducible.
- Prevent a skipped, unavailable, or flaky check from being reported as a pass.

## Test layers

### Unit

Unit tests live beside the owning Rust crate or TypeScript package. They cover pure state transitions, parsing, validation, range math, path policy, scheduling decisions, redaction, serialization constraints, and UI behavior with external boundaries replaced by controlled fakes.

Unit tests may not weaken production validation to simplify setup. Property-based or fuzz testing should supplement example cases for parsers, interval planning, state machines, and path handling.

### Integration

Integration tests use real boundaries within an isolated local environment: HTTP client to mock server, engine to temporary files and disposable SQLite, extension to a test native host, IPC over test-owned endpoints, and composition roots to their packages. They validate protocol, persistence, concurrency, and lifecycle behavior.

Every integration test that downloads bytes compares the final file with the fixture source by exact bytes or a trustworthy digest. A status code or expected length alone is not success.

### Resilience

Resilience tests inject interruption and scarcity at controlled points: connection loss, slow or malformed responses, process termination, cancellation, retry exhaustion, database locks/corruption, disk full, permission loss, file locks, service-worker restart, host crash, and shutdown. They verify bounded recovery, cleanup, idempotency, and honest state.

### Regression

Every corrected defect receives the narrowest durable automated reproduction at the owning layer plus cross-boundary coverage when the defect crossed a boundary. Regression fixtures contain synthetic data and a reference to the behavior they protect, without embedding confidential vulnerability details.

### Security and abuse

Security cases validate hostile inputs, origin/peer checks, traversal/reparse defenses, SSRF controls, redirect/DNS behavior, protocol/message limits, parser limits, secret absence, least privilege, and release boundaries. These cases are release-blocking and are not replaced by ordinary unit coverage.

### End-to-end

Product end-to-end tests cover a small number of critical user journeys on supported Windows environments after a runnable product workflow exists. The current loopback-only static-shell smoke is scaffold evidence, not a product journey. End-to-end tests do not duplicate every parser edge case and do not rely on a developer's browser profile, downloads directory, credentials, or network.

### Performance

Benchmarks use controlled servers, identical bytes, stable machine/network conditions, warm-up policy, multiple runs, and recorded tool versions. They measure duration, throughput, CPU, memory, connections, retries, integrity, and resume reliability. One transfer from unrelated public mirrors cannot support a performance claim.

## Documentation-change validation map

Documentation-only changes use the following read-only checks in addition to the existing scaffold evidence. They validate documentation scope and consistency, not product behavior:

| Validation area | Evidence                                                                                    | Pass condition                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Inventory       | Markdown inventory, Git status/diff, and generated-output scan                              | Only scoped documentation is edited; implementation/config/locks and protected paths are unchanged; output is absent |
| Status          | Current-state and ADR-language scan                                                         | Wave 1 infrastructure is implemented; product behavior is unavailable; all three ADRs remain Proposed                |
| Integration     | Relative Markdown links and cross-document authority/version/ownership consistency          | Every local link resolves and governing statements do not conflict                                                   |
| Regression      | Blueprint/lock digests, command consistency, placeholder-token, whitespace, and diff checks | Preserved inputs match expected values and text hygiene passes                                                       |

These checks are not Rust, TypeScript, browser, engine, or release tests. Their success cannot be cited as product functionality or as a rerun of the implementation gates.

## Documentation-change validation commands

Run from the repository root with Git and Windows PowerShell 5.1. They read repository content and status; they do not install, generate, build, format, or rewrite files.

### Scope and status

```powershell
git status --short
git ls-files | Sort-Object
git ls-files '*.md'
git diff --name-only
git diff --check
```

Compare the changed-path list with the task scope and a pre-edit baseline when the worktree already contains unrelated changes. `git diff --check` does not replace the text-hygiene command below.

### Required language

```powershell
$statusText = [IO.File]::ReadAllText('AGENTS.md') + [IO.File]::ReadAllText('README.md')
foreach ($pattern in @('buildable repository scaffold', 'pre-alpha', 'Wave 1', 'implemented', 'product functionality')) { if ($statusText -notmatch $pattern) { throw "Missing status text: $pattern" } }
$development = [IO.File]::ReadAllText('docs/DEVELOPMENT.md')
$toolPatterns = @('24\.16\.0', '12\.18\.0', '1\.99\.1', 'edition 2024', 'resolver 3', '2\.12\.5', '2\.7\.4', '2\.12\.4', '19\.3\.1', '6\.0\.3', '8\.3\.7', '4\.3\.5', '5\.1\.0', '1\.65\.0', '9\.39\.5')
foreach ($pattern in $toolPatterns) { if ($development -notmatch $pattern) { throw "Missing toolchain text: $pattern" } }
$adrPaths = @('docs/decisions/0001-repository-scaffold.md', 'docs/decisions/0002-buildable-workspace-scaffold.md', 'docs/decisions/0003-continuous-validation-and-governance.md')
foreach ($path in $adrPaths) {
  $adr = [IO.File]::ReadAllText($path)
  if ($adr -notmatch '(?m)^- \*\*Status:\*\* Proposed\r?$') { throw "ADR is not Proposed: $path" }
}
$markerPattern = '\b(T' + 'ODO|T' + 'BD|FIX' + 'ME)\b'
$docs = @(git ls-files '*.md')
$marked = @($docs | Where-Object { [regex]::IsMatch([IO.File]::ReadAllText($_), $markerPattern) })
if ($marked.Count) { $marked; throw 'Placeholder markers found' }
```

### Whitespace and encoding hygiene

```powershell
$root = (Get-Location).Path
$paths = @(git ls-files '*.md') + @('LICENSE')
$files = @($paths | Where-Object { $_ -ne 'blueprint.md' } | ForEach-Object { Join-Path $root $_ })
$issues = @()
foreach ($file in $files) {
  $bytes = [IO.File]::ReadAllBytes($file)
  $text = [IO.File]::ReadAllText($file)
  if ($bytes -contains 0) { $issues += "$file contains a NUL byte" }
  if (-not $text.EndsWith("`n")) { $issues += "$file has no final newline" }
  if ([regex]::IsMatch($text, '(?m)[ \t]+$')) { $issues += "$file has trailing whitespace" }
  try { $null = [Text.UTF8Encoding]::new($false, $true).GetString($bytes) } catch { $issues += "$file is not valid UTF-8" }
}
if ($issues.Count) { $issues; throw 'Text hygiene failed' }
```

`blueprint.md` is excluded from cleanup because this milestone must preserve its existing bytes, including any pre-existing text-hygiene characteristics. Its digest is checked separately below.

### Relative links

```powershell
$root = (Get-Location).Path
$files = @(git ls-files '*.md' | ForEach-Object { Join-Path $root $_ })
$missing = @()
foreach ($file in $files) {
  $text = [IO.File]::ReadAllText($file)
  foreach ($match in [regex]::Matches($text, '(?!!)\[[^\]]+\]\(([^)]+)\)')) {
    $target = $match.Groups[1].Value.Split('#')[0]
    if (-not $target -or $target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:') { continue }
    $path = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($file)) ([Uri]::UnescapeDataString($target))))
    if (-not (Test-Path -LiteralPath $path)) { $missing += "$file -> $target" }
  }
}
if ($missing.Count) { $missing; throw 'Broken relative links' }
```

### Blueprint and lock integrity

```powershell
$expected = '57C6C640AFAFE7E55C74A51E1008B4338B1FC3B78CF8DE0642AF8ABA9C3B488D'
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath 'blueprint.md').Hash
if ($actual -ne $expected) { throw "blueprint.md SHA-256 mismatch: $actual" }
git diff -- blueprint.md
git diff -- Cargo.lock pnpm-lock.yaml
```

The blueprint digest originated with Wave 0 task provenance and remains a protected byte-level invariant. The historical Wave 1 lock digests were Cargo `BB7B4118A417CEAEB2581B76BAA1B2AA3402B85C0CFBE251104037B01B90E9B2` and pnpm `D3153A36A4D3A80E576364B32AB08F17DD16E1D78E1933D5D8400762D649930A`. Phase 0 intentionally changes pnpm policy and remediates a transitive advisory, so current lock review uses the scoped diff, frozen installation, offline importer validation, and advisory/license results rather than pretending the historical pnpm digest remains current.

## Phase 0 repository-control evidence

Phase 0 adds scaffold policy coverage, not product tests:

| Evidence area         | Required automated evidence                                               | Pass condition                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow security     | Inventory and inspect every workflow plus synthetic violations            | Only full action SHAs, read-only permissions, non-persisted credentials, unprivileged triggers, explicit runner labels, finite timeouts, locked/frozen commands, and pinned downloaded-tool digests pass |
| Governance ownership  | Inspect CODEOWNERS, governance, and required paths                        | One syntactically valid default owner covers workflows, security, ADRs, manifests, locks, toolchains, and dependency policy; independent ADR and blocked release approval are explicit                   |
| Dependency automation | Inspect Dependabot and pnpm workspace policy                              | Exactly npm, Cargo, and GitHub Actions receive weekly proposals; no auto-merge exists; release age is nonzero and exclusions/overrides are exact                                                         |
| JavaScript licenses   | Synthetic allowed/unknown/malformed inventories plus live installed graph | Only reviewed expressions pass; malformed or unknown expressions fail without printing dependency paths                                                                                                  |
| Rust dependencies     | cargo-deny `0.20.2` over locked Windows-target metadata                   | Advisories, disallowed licenses, wildcard requirements, and unknown registry/Git sources fail; no ignore entry hides an advisory                                                                         |
| Secrets               | Gitleaks `8.30.1` over full Git history                                   | No detected secret; redaction is enabled and no baseline suppresses a finding                                                                                                                            |

Policy-test success proves the repository definitions reject sampled regressions. Only a hosted run can prove GitHub accepted and executed a workflow, and only hosted administrative inspection can prove branch rules or private reporting are active.

### Observed local Phase 0 results on 2026-11-11

The supported Windows environment used Node `24.16.0`, pnpm `12.18.0`, Rust/Cargo `1.99.1`, the installed MSVC/SDK/WebView2 prerequisites, actionlint `1.7.7`, Gitleaks `8.30.1`, and cargo-deny `0.20.2`.

| Command or category                                          | Observed result                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile --ignore-scripts`   | Passed after the reviewed lock update; pnpm installed 518 packages while enforcing the strict seven-day release-age policy against the loaded lockfile                                                                                 |
| `corepack pnpm check`                                        | Passed; Vitest ran 124 tests across 11 files with no skips, Playwright ran one loopback-only smoke, Cargo ran 11 intentionally empty harnesses, both web apps built, and locked Tauri no-bundle build passed                           |
| `corepack pnpm audit:js`                                     | High/critical gate passed after overriding `re2js` to patched `2.8.7`; one low KaTeX advisory (`GHSA-238p-pmpm-9mq7`) and one moderate minimatch advisory (`GHSA-g3hv-75wg-m249`) remain in dev-only tooling below the configured gate |
| `corepack pnpm licenses:js`                                  | Passed for 435 package records across 11 reviewed license expressions; synthetic unknown, empty, malformed, mismatched, and missing-version inventories failed                                                                         |
| `cargo-deny --locked check advisories bans licenses sources` | Passed with no advisory, license, ban, or source error; duplicate-version warnings remain for `getrandom`, `hashbrown`, `indexmap`, `miniz_oxide`, and `syn` in the locked Tauri graph                                                 |
| actionlint `1.7.7`                                           | Passed both workflow files after the downloaded Windows binary matched its published SHA-256                                                                                                                                           |
| Gitleaks `8.30.1`                                            | Full tracked history and every Git-selected changed/untracked nonignored source file passed with redaction and no detected secret; the Linux workflow archive and local Windows archive matched their published SHA-256 values         |
| Protected inputs                                             | `Cargo.lock` and `blueprint.md` retained their historical hashes; `pnpm-lock.yaml` changed only for the reviewed `re2js` security resolution and workspace policy snapshot                                                             |

The broad preliminary local `gitleaks dir .` invocation traversed ignored `target/` compiler output and reported one binary false positive in a Rust metadata file. That invocation is not used as pass evidence. The hosted definition scans complete tracked history, while the local current-change scan used Git's nonignored source inventory; neither policy adds a secret baseline or source allowlist.

The two remaining JavaScript advisories are development-only and have no product-runtime path because no product JavaScript is shipped. They remain tracked debt rather than hidden exceptions: Dependabot proposes updates, finite workflow timeouts bound denial-of-service impact, and release review must resolve or explicitly reassess them. No release claim exists.

### Observed hosted Phase 0 results on 2026-11-12

Draft pull request [#1](https://github.com/parasherdhruv/Open-Download-Manager/pull/1) ran the initial workflow revision at commit `c747844`:

| Required check                 | Hosted result    |
| ------------------------------ | ---------------- |
| `Windows scaffold gate`        | Passed in 10m07s |
| `Secret scan`                  | Passed in 5s     |
| `Rust dependency policy`       | Passed in 20s    |
| `JavaScript dependency policy` | Passed in 41s    |

GitHub `main` protection was verified with strict up-to-date status, all four exact required contexts, one approving review, required code-owner review, last-push approval, stale-review dismissal, conversation resolution, administrator enforcement, and force-push/deletion denial. Private vulnerability reporting was independently read back as enabled. These controls keep every later pull-request revision gated; they do not replace the still-missing independent reviewer or prove a merge.

## Wave 1 scaffold evidence

Wave 1's implemented tests validate repository infrastructure and the zero-feature security posture only. They do not validate product behavior.

| Evidence area                       | Required automated evidence                                                                                                                           | Pass condition                                                                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React unit render                   | Vitest renders the desktop root                                                                                                                       | Visible pre-alpha and downloads-unavailable text is present; no download action is rendered                                                                                                                                            |
| Extension manifest policy           | Positive exact-object case plus Chromium-version and forbidden top-level/permission negatives                                                         | Only the Chromium-valid three-key Manifest V3 baseline passes                                                                                                                                                                          |
| Tauri policy                        | Complete root configuration-artifact inventory, effective base configuration, Cargo metadata, and exact/semantic `main.rs` plus `build.rs` inspection | Only base `tauri.conf.json`; no override, custom command/plugin/product integration, broad capability, alternate control flow, or build-time filesystem/network/process behavior; CSP remains local-only                               |
| Repository topology/configuration   | Actual metadata/config inspection plus synthetic violation cases                                                                                      | Exact eleven non-publishable Cargo members, exact two private pnpm apps, exact pins, dependency-free API-free library roots, and no internal Rust edge; extra/missing members, disallowed edges, and cycles fail                       |
| Web-shell smoke                     | Playwright opens the locally built or previewed shell with service workers blocked and context-wide HTTP/WebSocket routing                            | Pre-alpha/unavailable text is visible, every exact-origin HTTP request is fetched without following redirects, all redirect responses are rejected, and no non-loopback WebSocket is created; this is not a Tauri/WebView runtime test |
| Extension output safety/determinism | Existing-destination/link sentinels, source/root guards, isolated default replacement, and two clean builds                                           | Explicit outputs are create-only and preserve existing content; only verified package-owned default output is replaceable; each clean inventory contains byte-identical `manifest.json` only                                           |
| Dependency resolution               | Frozen pnpm provisioning, aggregate offline frozen importer/lock validation with before/after hash, and locked Cargo metadata/build commands          | Committed lockfiles are accepted and remain unchanged; synthetic pnpm importer drift fails without install/regeneration                                                                                                                |
| Rust quality/build                  | rustfmt, clippy, test, and build across the workspace                                                                                                 | Every exact command exits zero with warnings denied where configured                                                                                                                                                                   |
| Tauri build                         | Locked Tauri `build --no-bundle` on supported Windows prerequisites                                                                                   | Command exits zero without producing or committing a distributable bundle                                                                                                                                                              |

### Observed results on 2026-11-10

The supported Windows 11 verification used Node `24.16.0`, pnpm `12.18.0`, Rust/Cargo `1.99.1`, MSVC `14.44.35229`, Windows SDK `10.0.26100.0`, and an installed WebView2 runtime. The MSVC and SDK versions identify the observed machine; the prerequisite policy remains the compatible baseline in [`DEVELOPMENT.md`](DEVELOPMENT.md).

| Command or category                                                    | Observed result                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile`                              | Passed; `pnpm-lock.yaml` remained stable                                                                                                                                                                                                                                                       |
| `corepack pnpm test`                                                   | Vitest passed 102 tests across 10 files with no skips: static-shell render, extension version/permission/output safety, Tauri effective-artifact/exact-root policy, topology/configuration/lock consistency, API-free crates, synthetic regression/resilience, and extension-build determinism |
| `corepack pnpm test:e2e`                                               | Playwright passed 1 loopback-only static-shell smoke with no skip or public-network request                                                                                                                                                                                                    |
| `corepack pnpm rust:fmt`, `rust:clippy`, `rust:test`, and `rust:build` | Passed; Cargo test ran 11 harnesses containing zero test cases by intentional API-free design, so this is compile/harness evidence rather than Rust unit coverage                                                                                                                              |
| `corepack pnpm build`                                                  | Passed for both `@odm/desktop` and `@odm/browser-extension`; extension output policy allowed only `manifest.json`                                                                                                                                                                              |
| `corepack pnpm tauri:build`                                            | Locked Tauri `build --no-bundle -- --locked` passed; no distributable bundle was produced                                                                                                                                                                                                      |
| Final `corepack pnpm check`                                            | Exited zero after real TOML-policy test defects were corrected; no required constituent was skipped                                                                                                                                                                                            |
| Integrity and cleanup                                                  | Cargo and pnpm locks stayed stable at the recorded hashes, the blueprint digest stayed exact, generated build/test output was cleaned, and no release artifact exists                                                                                                                          |

### Required command gate

Provision the environment explicitly:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
```

The required root scripts are:

```powershell
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:policy
corepack pnpm test:topology
corepack pnpm test:extension-build
corepack pnpm test:e2e
corepack pnpm test
corepack pnpm build
corepack pnpm rust:fmt
corepack pnpm rust:clippy
corepack pnpm rust:test
corepack pnpm rust:build
corepack pnpm tauri:build
corepack pnpm check
```

`corepack pnpm check` is the required aggregate gate. It expands to every constituent in the exact order defined by [`DEVELOPMENT.md`](DEVELOPMENT.md); `test` expands to its four documented scaffold suites. Every named constituent is required even when invoked through an aggregate. A missing script, missing workspace, required skip, ignored exit code, permissive `--if-present`, or silent platform skip fails the gate.

The separate Phase 0 dependency-policy commands are:

```powershell
corepack pnpm audit:js
corepack pnpm licenses:js
corepack pnpm audit:rust
```

The networked advisory commands are not `check` constituents. They require explicit registry/advisory provisioning and are independently gated by the supply-chain workflow. The deterministic license command operates on the installed frozen graph.

The topology constituent runs `corepack pnpm install --lockfile-only --frozen-lockfile --offline --ignore-scripts` through an argument array, hashes `pnpm-lock.yaml` before/after, and requires byte identity. Despite pnpm's `install` subcommand name, `--lockfile-only` performs no dependency installation; `--frozen-lockfile` forbids regeneration, `--offline` forbids public registry access, and `--ignore-scripts` forbids lifecycle execution. A synthetic exact-workspace copy proves the command succeeds without creating `node_modules`, then proves a changed importer fails without changing the lock.

The underlying locked Rust/Tauri forms are also contractual:

```powershell
cargo metadata --locked --no-deps --format-version 1
cargo fmt --all -- --check
cargo clippy --locked --workspace --all-targets --all-features -- -D warnings
cargo test --locked --workspace --all-targets --all-features
cargo build --locked --workspace --all-targets --all-features
corepack pnpm --filter @odm/desktop exec tauri build --no-bundle -- --locked
```

`cargo fmt` has no `--locked` because it does not resolve dependencies and does not accept that Cargo option. After the gate, both committed lockfiles must remain byte-for-byte unchanged. Tauri no-bundle evidence is required on Windows when the documented MSVC, SDK, and WebView2 prerequisites exist; a missing prerequisite is reported as not run and is not a pass.

### Scaffold test requirements

- The React unit test asserts the static shell identifies Open Download Manager as pre-alpha, states downloads are unavailable, and exposes no download action.
- The manifest positive case compares parsed JSON keys and values exactly with `manifest_version: 3`, name `Open Download Manager`, and Chromium-valid version `0.0.1`. Independent validity policy rejects all-zero `0.0.0` without reflecting candidate input.
- Manifest negative cases independently add `permissions`, `optional_permissions`, `host_permissions`, `optional_host_permissions`, `background`, `content_scripts`, `action`, `externally_connectable`, and `web_accessible_resources`; permission fixtures include `nativeMessaging` and `downloads`. Every case must fail policy validation, including an empty forbidden key.
- The topology regression checks active Node, pnpm, and Rust versions, reads locked Cargo metadata and pnpm workspace configuration, verifies every pnpm importer against the frozen lock offline, verifies the exact member sets, and confirms the real workspace has no internal Rust edge. Synthetic manifest drift, missing-member, extra-member, disallowed-edge, and cyclic-edge fixtures prove the test fails rather than merely snapshots the current tree.
- Each Rust library root is accepted only when every substantive line is crate-level documentation or a permitted crate-level lint attribute. A synthetic public item must fail the API-free policy.
- The Tauri regression inventories every root configuration artifact and permits exactly base `tauri.conf.json`; platform overlays and JSON5/TOML alternatives fail. It inspects the effective version-appropriate schema/configuration and dependency metadata, and validates normalized `src/main.rs` plus `build.rs` against reviewed minimal forms in addition to semantic checks. It rejects early return, extra build-time filesystem/network/process behavior, wildcard/remote source, broad permission, custom command, application plugin, updater, tray, filesystem, shell, URL-opening, native-messaging, local-IPC, or product-network integration.
- The Playwright smoke uses only a test-owned local server, blocks service workers, asserts the static unavailable state, fails on console/page errors, and routes the complete browser context rather than one page. It pre-aborts requests outside the exact loopback origin, fetches accepted local requests with `maxRedirects: 0`, inspects status and `Location`, aborts every 3xx response before browser follow-up, fulfills only non-redirect local responses, and closes/fails any non-loopback WebSocket. A deterministic in-test policy step covers the complete 3xx range and proves that redirect decisions retain only status and sanitized origin. It does not exercise the Tauri runtime or WebView.
- Extension output-safety regressions prove an existing external directory/file and default symlink/junction preserve their sentinels, an absent source-overlapping destination is rejected, filesystem/repository ancestor guards remain, a path with spaces succeeds through argument arrays, and default stale output is replaced only in an isolated package fixture. The deterministic-build test removes both test-owned temporary output trees, performs two independent create-only builds, sorts normalized relative paths, and compares every file byte-for-byte.

### Deliberately deferred tests

Crash, restart/recovery, cancellation, download integrity, HTTP/network, DNS/redirect, filesystem product I/O, database/migration, scheduler, native-host/IPC, browser-capture, media, installer, updater, and release tests are deferred because Wave 1 implements none of those behaviors. Adding empty or simulated tests for absent behavior would create misleading evidence, not coverage.

The controlled network fixture and product resilience plans below begin with their owning product slices. Packaging and release gates remain later reviewed work. Roadmap Phase 0 defines dependency audit, license/secret scanning, and CI for the scaffold; its initial hosted execution is evidenced above, and branch protection requires every later pull-request revision to pass before merge.

## Component coverage plan

| Component            | Unit focus                              | Integration focus                | Resilience/security focus                            |
| -------------------- | --------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `shared-types`       | Validation and serialization invariants | Version compatibility            | Oversized/unknown values                             |
| `diagnostics`        | Classification and redaction            | Cross-boundary sanitization      | Secret canaries, bounded output                      |
| `protocol-http`      | URL, redirect, range, header parsing    | Controlled HTTP server           | SSRF, TLS, malformed framing, timeouts               |
| `file-manager`       | Names, paths, intervals                 | Temporary/final files on Windows | Reparse, disk full, locks, permissions, crash        |
| `storage`            | Row/state invariants                    | SQLite migrations and recovery   | Corruption, busy/WAL, secret absence, interruption   |
| `download-core`      | State machine and segment math          | Protocol/file/storage lifecycle  | cancellation, changed resource, integrity failure    |
| `download-scheduler` | Priority, fairness, limits              | Multiple jobs/hosts              | duplicate starts, starvation, retry storms, shutdown |
| `ipc`                | Envelope and limit validation           | Per-user named pipe              | peer/ACL, replay, malformed/oversized frames         |
| `native-messaging`   | Native frame parsing                    | Test browser/IPC bridge          | stdout contamination, crash, incompatible version    |
| `media-detection`    | Bounded HLS/DASH parsing                | Synthetic segment assembly       | expansion, protected content, nested URL policy      |
| Desktop frontend     | Accessible state rendering              | Tauri contract                   | injection-safe text, event flood, denied operation   |
| Browser extension    | Detection and message validation        | Browser/native test host         | permission denial, restart, fallback, malicious page |

No product-coverage row is implemented today. Current scaffold tests verify package boundaries and policy only.

## Controlled mock download server plan

Before optimizing or claiming engine behavior, a local fixture server must deterministically simulate:

1. Normal `200` transfers and empty files.
2. Valid `206` byte ranges.
3. No range support.
4. Ignored Range requests.
5. Missing or contradictory Content-Length.
6. Connection termination at controlled byte offsets.
7. Invalid, overlapping, short, or excessive Content-Range data.
8. Strong/weak ETag and Last-Modified changes.
9. `416` responses.
10. Relative, cross-origin, looping, downgrade, and forbidden-destination redirects.
11. Rate limiting and bounded Retry-After behavior.
12. Transient and permanent server errors.
13. Missing, invalid, and expired authentication.
14. Slow headers/body and stalled connections.
15. Large deterministic streams without large repository fixtures.
16. Filename collisions and hostile disposition names.
17. Process termination at controlled transfer/finalization points.
18. Disk write, flush, rename, permission, and capacity failures through a controlled filesystem boundary.

Fixture routes must have fixed seeds or explicit scripts, bounded runtime, and no public network dependency.

## Engine behavior tests are deferred

State-machine, range, segmentation, fallback, retry, pause/resume, recovery, integrity, and scheduler tests described in [`ENGINE_SPEC.md`](ENGINE_SPEC.md) begin only when their owning implementation milestone creates the relevant source and harness. Their presence in this plan is not a test result.

The first engine slice must establish the local mock server and exact-output assertion before throughput optimization. Segmented transfer cannot be marked implemented from unit math alone; it requires end-to-end byte integrity under concurrency and failure.

## Browser, media, storage, and UI suites

- Browser suites use synthetic profiles and registrations and cover Chrome/Edge separately; Firefox receives a separate future suite.
- Media suites use synthetic or clearly licensed direct, HLS, and DASH fixtures and verify explicit protected-content rejection.
- Storage suites test fresh creation, every supported migration path, recovery, corruption, protected-data boundaries, and cleanup.
- UI suites cover accessible names, keyboard operation, focus, readable state, non-color error communication, loading/empty/error states, and bounded progress updates.
- Installer/release suites use clean Windows environments and verify install, upgrade, repair, uninstall, registration cleanup, packaged contents, checksums, and signatures.

## Test data and cleanup

- Fixtures contain no real credentials, cookies, signed URLs, browser history, private paths, or copyrighted content without clear permission.
- Temporary directories, databases, pipes, browser profiles, and processes have test-specific identities and bounded cleanup.
- A failed test preserves only the minimum sanitized artifact needed for diagnosis.
- Time, randomness, network behavior, and large data generation are controlled where determinism matters.
- Tests are parallel-safe or explicitly serialized for a documented resource reason.

## Flake and failure policy

- A failing required test blocks completion.
- A flaky test is a defect, not permission to rerun until green. Quarantine requires ownership, a bounded justification, and must not remove coverage from a release-critical path.
- Timeouts are finite and chosen from the behavior being tested, not indefinite sleeps.
- Skipped tests are reported and reviewed; a required skipped test is not a pass.
- Security regressions are handled privately when public details would increase risk.

Wave 1 retains one bounded test-harness risk: `tests/scaffold/support/process.ts` uses Node `execFile` with a finite timeout, which reliably reports and terminates the direct child but does not independently enumerate and kill every Windows descendant the child may have started. A deterministic cross-platform process-tree replacement would be materially larger and OS-specific, so this audit does not destabilize the runner. A timeout remains a hard test failure; future harness work must add controlled descendant-process coverage before claiming tree-wide Windows cleanup.

## Exit criteria for a behavior

A behavior can be called implemented only when:

- Requirements and state/failure semantics are present in source.
- Relevant unit, integration, resilience, regression, and security tests pass.
- Exact output/integrity is checked where bytes are downloaded or transformed.
- Documentation matches observed behavior.
- Required workspace checks and builds pass on supported environments.
- No known relevant regression or release-blocking security gap remains.

## Unresolved architectural decisions

- Property-test, fuzzing, and risk-based product coverage tooling for later parsers and state machines.
- Mock server implementation language and fault-injection boundary.
- Safe, deterministic disk-full and process-crash injection on Windows runners.
- Product browser-compatibility versions and clean-machine environment matrix beyond the Wave 1 local Chromium smoke.
- Coverage thresholds based on risk rather than an arbitrary repository-wide percentage.
- Benchmark hardware/network baselines and regression tolerances.
- Hosted runner/branch-rule evidence and advisory triage history after the Phase 0 definitions are activated.

These are genuine future product, resilience, compatibility, and release-test decisions. They do not defer any Wave 1 scaffold test or gate defined above.
