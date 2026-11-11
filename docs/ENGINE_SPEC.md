# Download Engine Specification

**Status:** Download behavior is not implemented; this is design guidance only. The named Wave 1 crates exist as API-free, dependency-free ownership/build boundaries, but there is no download engine behavior, scheduler behavior, protocol client, persistence layer, file writer, public product API, or automated engine test.

## Purpose and ownership

The future engine is responsible for producing correct local bytes from supported HTTP or HTTPS resources while maintaining explicit state, safe recovery, and honest failure behavior. Performance is subordinate to integrity.

Responsibilities are split according to [`ARCHITECTURE.md`](ARCHITECTURE.md):

- `download-core` owns lifecycle, state validation, segment coordination, and integrity decisions.
- `protocol-http` owns HTTP inspection, redirects, request construction, and response validation.
- `file-manager` owns safe paths, temporary output, positioned writes, and finalization.
- `storage` owns durable records and transactions.
- `download-scheduler` owns queue order, concurrency, fairness, retry timing, and shutdown coordination.

The React frontend displays aggregated state and expresses user intent. It never performs transfer networking or authoritative file/state work.

This document deliberately defines no public Rust or IPC method signatures.

## Supported transfer boundary

The initial engine scope is ordinary HTTP and HTTPS resources that the user is authorized to access. Unsupported schemes fail before network access. FTP, SFTP, BitTorrent, data URLs, arbitrary local file copying, and site mirroring are outside the initial engine.

Authorized clear-media workflows are separately constrained by [`MEDIA_SUPPORT.md`](MEDIA_SUPPORT.md). Browser handoff is governed by [`BROWSER_INTEGRATION.md`](BROWSER_INTEGRATION.md).

## Core concepts

- **Resource:** The requested logical content after approved redirects.
- **Representation:** The exact byte sequence selected by request headers and server negotiation.
- **Validator:** A strong ETag or, with documented limitations, Last-Modified metadata used to detect representation changes.
- **Segment:** A non-overlapping inclusive byte interval with expected and received lengths, state, retry count, and diagnostic outcome.
- **Temporary output:** A non-final path owned by an unfinished download.
- **Finalization:** The atomic or otherwise crash-safe transition from verified temporary output to the chosen final name.

All server metadata is untrusted, including length, type, disposition, ranges, validators, names, redirect locations, and checksums.

## Planned lifecycle

### 1. Intake and validation

Before queuing, the backend will:

1. Parse the URL without logging sensitive query values.
2. Permit only explicitly supported HTTP or HTTPS schemes.
3. Apply destination and filename policy through `file-manager`.
4. Reject invalid limits, impossible ranges, oversized metadata, and unsupported options.
5. Separate sensitive request material from ordinary download metadata.
6. Create a unique internal identity and durable queued record in one coordinated operation once storage exists.

URL, DNS, redirect, and destination checks must follow [`SECURITY.md`](SECURITY.md). A syntactically valid URL is not automatically an allowed destination.

### 2. Metadata inspection

Inspection may begin with `HEAD`, but the result is advisory. Missing, contradictory, or unsupported `HEAD` behavior must not make a download fail when a safe `GET` can proceed.

The engine will evaluate:

- Final URL after each independently validated redirect.
- Status and response framing.
- Content length, when valid.
- Content type as a hint, never executable authority.
- Content-Disposition filename after strict parsing and sanitization.
- Accept-Ranges as a hint only.
- Strong ETag and Last-Modified validators.
- Content encoding and whether byte identity can be preserved.

When appropriate, a small range probe will verify that the server returns `206 Partial Content`, a matching and parseable Content-Range, the requested interval, a coherent total length, and a compatible representation. Merely seeing `Accept-Ranges: bytes` is insufficient.

### 3. Transfer-mode decision

Segmented mode is eligible only when:

- A stable total size is known.
- A range probe proves byte-range behavior.
- Response encoding permits consistent byte offsets.
- Resource validators and response metadata are coherent enough to prevent cross-version assembly.
- File and application resource limits permit safe concurrency.

Otherwise the engine uses one streaming connection. Fallback is normal behavior, not a degraded integrity mode. If a server ignores a range or returns inconsistent metadata after segmented work begins, the engine must stop accepting segment data, preserve only provably safe state, and either restart in single-stream mode or fail with an actionable reason.

Initial connection heuristics may use one connection for small files, two to four for medium files, and four to eight for large files, bounded by user and application limits. Size thresholds and hard limits require measured values before implementation.

### 4. Segment planning and requests

Every byte from zero through total length minus one belongs to exactly one planned segment. There are no overlaps or gaps. Empty resources bypass segment planning.

Before accepting a segment response, the protocol layer validates:

- Status is appropriate for the requested range.
- Content-Range start, end, and total match the plan.
- Received bytes do not exceed the interval.
- Representation validators remain compatible.
- Content encoding does not invalidate offsets.
- Redirect policy and final origin remain allowed.

Short reads, extra bytes, invalid `206` responses, `416` responses, or validator changes are explicit protocol outcomes. They are never silently appended.

### 5. Concurrent file writing

The file manager will use positioned writes or an equivalent platform abstraction. Workers may not race on one mutable file cursor. Each write is checked against the assigned interval and temporary-file boundary.

Required properties:

- No overlapping assignments or writes.
- No bytes outside the planned resource length.
- Consistent handling of short writes, disk-full conditions, permission loss, file replacement, and device removal.
- No final-name exposure before verification.
- Finalization that cannot silently overwrite an unrelated file.
- Cleanup or explicit retention policy for partial files on cancellation and failure.

The engine must account for Windows file locking, reserved names, path normalization, long paths, and rename behavior.

### 6. Progress and persistence

Received-byte counters become durable only after corresponding file writes succeed. Persisted progress must never be ahead of durable output. Checkpoints group related download, segment, and validator updates transactionally according to [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

Progress sent to the UI is aggregated at a controlled interval and may be eventually consistent. The UI does not infer completion. Unknown total length produces indeterminate progress rather than a fabricated percentage or remaining time.

### 7. Verification and finalization

Before completion, the engine will:

1. Stop transfer workers and flush required output.
2. Confirm all planned intervals are complete for segmented transfers.
3. Confirm final size when a trustworthy expected size is known.
4. Compute and compare an expected checksum when the user or a trustworthy source supplied one.
5. Record whether integrity was size-checked, digest-verified, or only transfer-complete.
6. Resolve duplicate naming without unapproved overwrite.
7. Finalize the temporary file and persist completion consistently.

ODM must not use words such as "cryptographically verified" when no trustworthy expected digest was available. A locally computed digest alone identifies the produced bytes; it does not prove they match an external expectation.

## State model

Planned states are:

```text
QUEUED -> INSPECTING -> DOWNLOADING -> VERIFYING -> COMPLETED
                         |      |
                         |      `-> RETRY_WAIT
                         `-> PAUSING -> PAUSED -> RESUMING

Active nonterminal states may also reach FAILED or CANCELLED.
```

Allowed transition families are:

| From          | Allowed destinations                                             |
| ------------- | ---------------------------------------------------------------- |
| `QUEUED`      | `INSPECTING`, `CANCELLED`                                        |
| `INSPECTING`  | `DOWNLOADING`, `RETRY_WAIT`, `FAILED`, `CANCELLED`               |
| `DOWNLOADING` | `PAUSING`, `VERIFYING`, `RETRY_WAIT`, `FAILED`, `CANCELLED`      |
| `PAUSING`     | `PAUSED`, `FAILED`, `CANCELLED`                                  |
| `PAUSED`      | `RESUMING`, `CANCELLED`                                          |
| `RESUMING`    | `INSPECTING`, `DOWNLOADING`, `RETRY_WAIT`, `FAILED`, `CANCELLED` |
| `RETRY_WAIT`  | `INSPECTING`, `DOWNLOADING`, `PAUSED`, `FAILED`, `CANCELLED`     |
| `VERIFYING`   | `COMPLETED`, `FAILED`, `CANCELLED`                               |
| `FAILED`      | `QUEUED`, `CANCELLED` after an explicit retry decision           |
| `COMPLETED`   | None                                                             |
| `CANCELLED`   | None                                                             |

Each transition validates the current state and required durable facts in a transaction. Duplicate, stale, or concurrent commands must not produce two active workers or regress a terminal state. Recovery may map an interrupted transient state to a safe resumable state only through documented recovery logic, not by pretending the prior operation completed.

## Pause, resume, cancellation, and recovery

### Pause

Pause stops new work, signals active workers, waits for or safely abandons in-flight operations, persists progress no further than durable bytes, and releases resources. If a server cannot support valid continuation, the UI must say that resume may restart rather than promise byte-level continuation.

### Resume

Resume revalidates the temporary file, interval ledger, URL policy, resource metadata, and validators. A changed or unverifiable representation cannot be merged with old bytes. Depending on reviewed policy, the engine will restart from zero with user-visible explanation or fail without destroying evidence needed for recovery.

### Cancellation

Cancellation is idempotent, prevents new work, stops workers, records the terminal state, and applies an explicit partial-file cleanup/retention policy. It never deletes a path not proven to belong to that download.

### Process recovery

On startup, the backend will identify unfinished records, validate temporary files and segment bounds, reconcile durable byte counts, reject impossible states, and reinspect remote resources when required. Recovery tests must terminate the process at controlled points around writes, checkpoints, verification, and finalization.

## Retry policy

Retries are classified, bounded, cancellable, and independently tracked per segment where appropriate.

- Transient connection failures, selected server errors, and bounded rate limiting may retry.
- Invalid input, unsupported schemes, policy blocks, deterministic protocol violations, disk-full errors, and permission errors do not spin indefinitely.
- Authentication expiry requires a separate user-facing path and must not expose credentials.
- A representation change invalidates incompatible partial work rather than consuming retry budget blindly.
- Backoff uses exponential growth with random jitter and honors trustworthy bounded `Retry-After` guidance.
- The blueprint's suggested maximum of five retries per segment is an initial policy candidate, not a fixed guarantee until resilience tests justify it.

The scheduler owns retry timing so sleeping tasks do not occupy active-transfer capacity.

## Failure classification

Structured internal failures must distinguish at least:

- Input or policy rejection.
- DNS, connection, TLS, timeout, and redirect failure.
- Authentication or authorization failure without exposing secret material.
- HTTP status and range-protocol failure.
- Resource change or validator mismatch.
- Queue, cancellation, and shutdown outcome.
- Filesystem, capacity, permission, and finalization failure.
- Database, checkpoint, and recovery inconsistency.
- Integrity or expected-checksum mismatch.
- Application resource-limit exhaustion.

User-facing messages may be simpler but must retain correlation to a sanitized diagnostic record. Unknown errors remain explicit unknowns, not false network diagnoses.

## Security and resource boundaries

- Validate every redirect and resolved destination against scheme and network policy; guard against loopback/private-network abuse and DNS rebinding according to the engineering security model.
- Never disable certificate or hostname validation.
- Do not forward sensitive headers across origins unless an explicit policy allows it.
- Bound redirect count, response-header bytes, filename length, segment count, active connections, queued work, retry count, diagnostic size, and disk use.
- Sanitize server-provided names and prevent traversal, alternate data streams, reserved-device names, and unsafe final paths.
- Store secrets outside ordinary records using protected local storage.
- Never execute, open, or otherwise trust downloaded bytes automatically.

Exact numeric resource limits are unresolved and must be established with security tests before release.

## Observability

Diagnostics may include a random request/download correlation identifier, sanitized host, state, failure class, retry count, and bounded timing information. They must exclude authorization and proxy headers, cookies, secret values, full sensitive query strings, private downloaded content, and protected storage payloads. File paths shown in exported diagnostics require deliberate minimization or redaction.

No telemetry leaves the device unless a future reviewed design introduces explicit informed consent. Local logs still follow retention and redaction policy.

## Test boundaries

Before any engine capability is called implemented, tests must cover:

- State-transition validity, idempotency, and concurrent commands.
- Segment partitioning, exact offsets, short/extra writes, and no overlaps or gaps.
- Valid and invalid range behavior, missing length, ignored ranges, `416`, redirects, validator changes, encodings, and single-stream fallback.
- Independent retries, jitter bounds, rate limiting, cancellation during backoff, and exhausted budgets.
- Pause/resume and restart at controlled write/checkpoint/finalization points.
- Disk-full, permission, file-lock, rename, database transaction, and cleanup failures.
- URL and redirect policy, malicious names, oversized metadata, secret redaction, and resource limits.
- Final bytes or a trustworthy digest for every integration download.

All network integration cases use the controlled local fixture described in [`TEST_PLAN.md`](TEST_PLAN.md). Public internet endpoints are not test dependencies.

## Unresolved architectural decisions

- HTTP client selection and the precise redirect/DNS enforcement layer.
- Segment size thresholds, adaptive behavior, and hard concurrency/resource limits.
- Preallocation, sparse-file, flush, and crash-durability policy on Windows.
- Checkpoint cadence and write-amplification tradeoffs.
- Treatment of weak ETags and Last-Modified-only resume.
- Trust policy for server-advertised checksums.
- Partial-file retention on cancel, terminal failure, and representation change.
- Proxy and authentication credential flows and their protected-storage integration.

These decisions require implementation evidence and, where durable or cross-component, an ADR. They do not justify speculative APIs.
