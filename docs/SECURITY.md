# Engineering Security Model

**Status:** Wave 1's zero-feature Tauri capability/CSP and inert-extension permission baselines are implemented and policy-tested. They constrain only the current build scaffold. All product security controls below remain requirements, and no product security claim or supported feature follows from the scaffold evidence.

The root [`../SECURITY.md`](../SECURITY.md) defines how to report a suspected vulnerability. This document defines engineering threats, boundaries, and release-blocking controls. It is not a disclosure mailbox or a claim of current protection.

## Security objectives

1. Download only resources the user requested and policy permits.
2. Write only to an authorized destination without traversal, unintended overwrite, or automatic execution.
3. Preserve byte integrity across concurrency, retries, pause/resume, and recovery.
4. Keep credentials, private URLs, browsing context, paths, and downloaded content confidential from logs and unauthorized processes.
5. Limit browser, IPC, parser, network, disk, memory, CPU, and queue attack surface.
6. Keep the first release local-first, account-free, and free of telemetry unless informed consent is later designed.
7. Ship only reviewed, traceable artifacts after dependency, signing, privacy, and security gates pass.

## Protected assets

- User files, destinations, free disk space, and existing data.
- Credentials, cookies, authorization headers, proxy secrets, signed URLs, AI provider tokens, and signing keys.
- Download history, browsing context, filenames, local paths, categories, and schedules.
- Integrity of final and partial files, database records, settings, updates, and release artifacts.
- Availability of the desktop app, scheduler, browser, network, database, and host system.
- Trust in status, checksum, compatibility, privacy, and release claims.

## Threat actors and assumptions

The design considers malicious or compromised origin servers, redirect targets, web pages, browser messages, local unprivileged processes, malformed database contents, hostile downloaded bytes, and compromised dependencies or build inputs. Accidental failures such as disk exhaustion, power loss, process termination, stale registrations, and user misconfiguration are also security-relevant.

ODM does not claim to remain secure if the operating-system account or administrator is fully compromised. Even so, components must use least privilege, avoid unnecessary persistence, and not make local compromise easier.

## Trust boundaries

```text
Internet / DNS / remote server
  -> HTTP protocol validation
  -> download core
  -> file manager and SQLite
  -> local filesystem

Untrusted web page
  -> extension content boundary
  -> extension background boundary
  -> browser native messaging
  -> native host process
  -> per-user named pipe
  -> desktop composition root

React webview
  -> constrained Tauri command/event boundary
  -> Rust backend

Build inputs and dependencies
  -> build/release environment
  -> signed distributable artifact
```

Validation at one boundary never substitutes for validation at the next. Values read back from local storage are untrusted because files can be corrupt or modified outside the application.

## Network security

### Schemes and TLS

- Initial transfers accept only reviewed HTTP and HTTPS schemes; privileged or local schemes are rejected.
- HTTPS certificate chain and hostname validation remain enabled.
- TLS errors are surfaced; there is no insecure retry or user setting that silently disables validation.
- Protocol libraries and trust stores must have an update and vulnerability-response path.

### Redirects, DNS, and server-side request forgery

Every initial URL and redirect hop requires policy validation. The network layer must guard against loopback, link-local, private, multicast, unspecified, metadata-service, and otherwise disallowed destinations according to an explicit user-facing policy.

Controls must account for:

- Literal IPv4/IPv6, unusual textual forms, embedded credentials, internationalized names, and mixed-scheme redirects.
- DNS answers that change between validation and connection.
- Multiple resolved addresses, proxy behavior, IPv4/IPv6 differences, and connection reuse.
- Redirect chains that cross origins or downgrade from HTTPS.
- Host headers and TLS server names that disagree with the validated destination.

DNS and destination enforcement must be bound to the actual connection path, not implemented as a one-time string check. Exact private-network policy requires an ADR before network implementation.

### HTTP inputs

- Bound status lines, headers, redirect count, lengths, range metadata, encodings, and diagnostic capture.
- Treat Content-Length, Content-Range, Content-Disposition, MIME types, validators, retry guidance, and checksums as untrusted.
- Do not forward credentials or sensitive headers across an origin change without an explicit scoped policy.
- Prevent decompression or representation negotiation from invalidating byte-range assumptions or exhausting resources.
- Rate-limit and bound retries so a server cannot retain resources indefinitely.

## Filesystem security

- Interpret server or browser filenames only as candidate filename components, never full paths.
- Reject traversal, absolute/device/UNC paths where not explicitly selected, alternate data streams, reserved device names, invalid trailing characters, control characters, and unsafe normalization results.
- Resolve destinations under an authorized directory and defend against symlink, junction, reparse-point, and time-of-check/time-of-use changes.
- Use engine-owned temporary files with restrictive permissions and unpredictable identities.
- Use positioned writes with validated bounds; do not let a segment overwrite another interval or unrelated file.
- Do not overwrite an existing destination without the explicit duplicate-name policy and user intent.
- Finalize only after required integrity checks and crash-safe reconciliation.
- Prove ownership before deleting a partial file.
- Never mark downloaded files executable, launch them, open them, or invoke a shell automatically.

Windows-specific tests must cover case-insensitive collisions, reserved names, reparse points, long paths, locks, antivirus interference, ACL failures, and rename semantics.

## Browser and local IPC security

The detailed model is in [`BROWSER_INTEGRATION.md`](BROWSER_INTEGRATION.md). Release-blocking requirements include:

- Least-privilege extension permissions and explicit production extension IDs.
- Strict validation of page/content/background/native-host messages.
- Versioned, size-limited, correlated native and IPC protocols.
- Protocol-only stdout from the native host.
- A per-user named pipe with restrictive ACLs and peer/authentication checks.
- No unrestricted local HTTP listener and no assumption that loopback implies trust.
- Safe behavior for host absence, crash, incompatibility, replay, duplicate requests, and service-worker restart.
- No ordinary transfer of cookies, authorization headers, complete browsing history, or page content.

Browser capture must remain optional and fail back to safe browser behavior where possible.

## Desktop frontend and Tauri boundary

The webview is presentation, not a trusted backend. Future product slices expose only narrowly scoped commands needed by implemented UI behavior, validate every field and authorization in Rust, render untrusted values as text, bound event payload/rate, and keep secrets and full sensitive URLs out of frontend state and diagnostics.

### Wave 1 zero-feature Tauri baseline

Wave 1 opens one desktop window containing the static local pre-alpha shell. That technical window does not authorize a product action or backend protocol. The implemented baseline is exact:

- No custom Tauri command, invoke handler, application event protocol, product state, persisted setting, secret access, or simulated operation.
- No application plugin or integration for updater, tray, filesystem, shell, URL opening, dialog, notification, global shortcut, native messaging, local IPC, telemetry, or product networking.
- No remote frontend asset, CDN, remote font, analytics endpoint, update endpoint, or public-network request.
- The effective capability set is explicitly empty through `app.security.capabilities: []`; no capability artifact or broad core/plugin grant exists.
- The complete root configuration artifact set contains exactly base `tauri.conf.json`. A platform overlay, JSON5/TOML alternative, symlinked replacement, or other mergeable Tauri configuration artifact is forbidden in Wave 1.
- Normalized `src/main.rs` and `build.rs` are exact policy inputs matching their reviewed minimal forms. Semantic checks additionally reject early/alternate control flow, `unwrap`/`expect`, and unreviewed build-time filesystem, network, or process behavior.
- A production CSP whose default, script, style, image, and font loading is limited to the packaged application's own origin. Object, base, form, and framing capabilities are denied.
- `connect-src` is exactly `'self' http://ipc.localhost`; no unused `ipc:` or remote transport source is granted.
- No wildcard, remote `http:`/`https:` source, `data:`/`blob:` source, `unsafe-eval`, or unnecessary `unsafe-inline` grant. A broader source cannot be justified by convenience, development tooling, or a future feature.

The implementation uses the Tauri `2.12.5` schema location and syntax confirmed by the successful locked no-bundle build. The policy regression inventories configuration artifacts, parses the sole effective base configuration and dependency metadata, and validates both Rust roots. It fails if the capability/CSP invariant is absent, invalid, or broadened, if a mergeable override exists, if an exact root drifts, or if a forbidden command/plugin/integration appears. The no-bundle build is additional schema evidence, not a replacement for the regression test. The loopback Playwright smoke exercises only the static Vite preview and is not a runtime Tauri/WebView security test.

A future product command, permission, plugin, event, or remote source requires its owning authorized slice, validation/failure semantics, a security review, and synchronized policy tests. Wave 1 grants none in anticipation.

## Persistence and secret protection

The logical storage model is in [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

- Use foreign keys, constraints, expected-state updates, and transactions to preserve invariants.
- Treat database and migration input as hostile or corrupt on read.
- Keep secrets separate from ordinary SQLite rows using a reviewed Windows protected-storage design.
- Define encryption key scope, rotation, backup, deletion, and decryption-failure behavior before storing protected values.
- Limit database/WAL file access to the user and avoid plaintext secrets in WAL, backups, exports, fixtures, or migration logs.
- Do not trust a stored path, URL, state, validator, or byte count without revalidation during recovery.

Encryption at rest does not hide all metadata and must not be marketed as complete history privacy.

## Media and parser security

Media requirements are in [`MEDIA_SUPPORT.md`](MEDIA_SUPPORT.md).

- Reject DRM, protected/encrypted media, and access-control bypass.
- Bound playlist/XML input, recursion, element count, segment count, URL count, duration, and total work.
- Disable XML external entities and expansion-prone features.
- Revalidate every nested URI; a trusted top-level manifest does not make its children trusted.
- Treat muxers and codec parsers as high-risk native input processors requiring sandbox, update, license, and fuzzing consideration.
- Do not invoke external tools through a shell or with untrusted argument construction.

## Logging, diagnostics, and privacy

### Data classes

| Class       | Examples                                                                               | Default handling                                                    |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Secret      | Credentials, cookies, authorization headers, tokens, signed query values, signing keys | Never log; protect separately; transmit only to intended boundary   |
| Sensitive   | Full URLs, local paths, filenames, history, browser origin, error body                 | Minimize, redact, bound, and exclude from routine export by default |
| Operational | Random correlation ID, sanitized host, state, error class, bounded timing              | May appear in local diagnostics under retention policy              |
| Public      | Version, documented feature/status information                                         | Safe for ordinary reporting if accurate                             |

- Redaction happens before data enters a log event, not only at final display.
- Unknown headers and query keys are treated as sensitive rather than relying on a short denylist.
- Response bodies and downloaded bytes are not diagnostic payloads.
- Diagnostic export requires user intent, preview/redaction, size limits, and documented retention.
- There is no telemetry in the initial release. Any future telemetry requires an ADR, informed opt-in consent, data inventory, retention, deletion, and an offline-safe path.

## AI boundary

AI is P2 scope and cannot precede engine reliability. If later introduced:

- Default to disabled and provide a local-only mode.
- Never send cookies, authorization tokens, signed URL query values, raw browsing history, downloaded private content, or protected database values.
- Show and obtain consent for data sent to an external provider.
- Treat model output as untrusted advice and validate every proposed action.
- Require confirmation for destructive actions.
- Never grant arbitrary shell, file, network, database, or download-control capability to a model.
- Keep deterministic rules responsible for integrity, scheduling safety, security policy, and essential error handling.

No AI provider or abstraction exists in the current Wave 1 scaffold.

## Resource and availability controls

Every parser, queue, protocol, and process boundary requires measured limits, including:

- Concurrent downloads, per-host connections, segments, queued jobs, and browser clients.
- URL, header, message, filename, manifest, XML, diagnostic, and database value sizes.
- Redirects, retries, backoff, outstanding requests, parser depth, and nested media references.
- Memory buffers, temporary disk allocation, log growth, database/WAL growth, and idle connection lifetime.

Limits must fail explicitly, be cancellable, and avoid integer overflow. User configuration cannot raise a value beyond a safe hard maximum. Exact values are unresolved until fixture and stress testing.

## Supply chain and release security

- Review necessity, license, provenance, maintenance, transitive impact, build scripts, and advisories before adopting dependencies.
- Lock dependency resolution and review every manifest or lockfile change.
- Run the pinned Rust and JavaScript vulnerability, license, source, and secret checks defined by [Proposed ADR 0003](decisions/0003-continuous-validation-and-governance.md). Unknown licenses and Rust sources fail closed; no advisory is silently ignored.
- Pin and protect release environments; minimize credentials and separate untrusted pull-request execution from signing.
- Generate provenance, checksums, and release notes from the reviewed commit.
- Sign public Windows artifacts only through a documented key-custody process.
- Verify packaged contents, native-host registration, permissions, updates, uninstall, and clean-machine installation.
- Never expose signing, store, or provider credentials to untrusted builds or logs.

Wave 1 added no CI. Roadmap Phase 0 now defines read-only continuous-validation and supply-chain workflows with immutable action/tool pins, bounded jobs, no privileged untrusted-code trigger, and no release credentials. Hosted `main`, private vulnerability reporting, exact branch protection, and the initial four hosted checks are verified; independent review and Phase 0 merge remain pending. No signing, publishing, installer, update, or release mechanism exists. Future release gates are in [`RELEASE_PLAN.md`](RELEASE_PLAN.md).

## Security verification matrix

| Boundary                | Minimum evidence before implementation claim                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| URL/TLS/redirect/DNS    | Unit policy tests plus controlled integration cases bound to actual connection destinations       |
| HTTP/ranges             | Malformed/contradictory response fixtures, representation-change tests, bounded resource tests    |
| Filesystem              | Traversal, reparse, collision, permission, disk-full, lock, cleanup, and crash tests on Windows   |
| State/storage           | Invalid transitions, concurrency, migration, corruption, WAL, recovery, and secret-absence tests  |
| Browser/native host/IPC | Origin/ID, framing, size, replay, ACL/peer, restart, fallback, and redaction tests                |
| Media parsers           | Malformed, recursive, oversized, protected-content, nested-URL, fuzz/property, and assembly tests |
| Frontend/Tauri          | Command validation, capability/CSP review, injection-safe rendering, event-limit tests            |
| Supply chain/release    | Reproducible inputs, advisory/license review, artifact inventory, checksum/signature verification |

A happy-path test does not satisfy a security requirement. Security findings block the affected release until fixed or explicitly removed from scope; accepting a known unsafe boundary as a hidden limitation is not allowed.

## Vulnerability handling

Suspected vulnerabilities follow the private route in [`../SECURITY.md`](../SECURITY.md). Public issues and pull requests must not contain exploit details or sensitive evidence. Remediation must add a regression test where safe, update affected threat documentation, and identify supported/released impact accurately.

## Unresolved architectural decisions

- Private-network/localhost policy and how DNS validation binds to connections and proxies.
- Windows path authorization and reparse-point defense strategy.
- Protected secret storage, key scope, rotation, recovery, and backup.
- Native-pipe peer authentication and protocol security properties.
- Numeric resource limits and diagnostic retention/export defaults.
- Tauri capability, command, and CSP expansion for the first product UI slice beyond Wave 1's empty baseline.
- Provenance format, update mechanism, and signing-key custody beyond the Phase 0 repository-only dependency policy.

The related feature cannot be released until its open security decisions are resolved and verified.
