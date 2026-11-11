# Logical Database Schema

**Status:** Persistence is not implemented; this is planned design only. The API-free `storage` crate exists as a Wave 1 ownership/build boundary, but it has no SQLite dependency, database file, schema, table, migration, query, public API, behavior, or persistence test.

## Purpose

The future local database will be the durable source of truth for download metadata, queue membership, segment progress, categories, and non-secret settings. It supports crash recovery and history; it does not replace validation of temporary files or remote resource identity.

This document defines logical records and invariants without committing to SQL syntax, Rust types, a migration library, or public storage APIs. Physical types and indexes must be selected with measured queries and migration tests.

## Storage principles

- Use SQLite with foreign-key enforcement, explicit transactions, and WAL mode after implementation verifies Windows behavior.
- Persist only facts needed for product behavior, recovery, diagnostics, and user-visible history.
- Keep credentials, cookies, authorization headers, signing material, and provider tokens out of ordinary tables.
- Treat database values as untrusted on every read; corruption or a locally modified file must fail safely.
- Never persist progress ahead of successfully written durable bytes.
- Use UTC instants for machine ordering and convert to local display time at the presentation layer.
- Evolve schema only through reviewed, tested migrations once a schema exists.

## Logical relationships

```text
queues      1 ---- * downloads * ---- 1 categories
                         |
                         `---- * download_segments

settings is an independent validated key/value collection.
```

A download may use a default queue or category according to product policy; the exact null/default representation remains a physical-schema decision. Deleting a queue or category must not silently delete download history.

## Planned records

### `downloads`

One row represents one logical download across retries and process restarts.

| Logical field            | Meaning and invariant                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `id`                     | Immutable, locally unique identifier not chosen by an untrusted caller                                             |
| `original_url_encrypted` | Protected representation of the original URL when persistence is necessary; encryption/key mechanism is unresolved |
| `sanitized_host`         | Bounded display/index hint with credentials and sensitive query information removed; not authorization evidence    |
| `filename`               | Sanitized final filename component, never an arbitrary path                                                        |
| `destination`            | Validated destination identity; potentially sensitive and minimized in exports/logs                                |
| `mime_type`              | Optional bounded server/detection hint, not executable authority                                                   |
| `file_size`              | Optional non-negative expected byte length                                                                         |
| `downloaded_bytes`       | Non-negative durable byte count no greater than known file size                                                    |
| `download_state`         | One value from the validated engine state model                                                                    |
| `etag`                   | Optional bounded resource validator with strength retained                                                         |
| `last_modified`          | Optional parsed resource validator with original ambiguity handled conservatively                                  |
| `queue_id`               | Relationship to scheduling queue according to deletion/default policy                                              |
| `category_id`            | Relationship to category according to deletion/default policy                                                      |
| `created_at`             | Immutable creation instant                                                                                         |
| `updated_at`             | Latest committed logical change instant, not used alone for concurrency correctness                                |
| `completed_at`           | Present only for a valid completed state                                                                           |
| `error_code`             | Optional structured, non-secret internal failure classification                                                    |

Recovery also requires a safe way to identify the engine-owned temporary output and relevant representation metadata. Whether that is stored directly in `downloads` or in a separate internal record is unresolved; implementation may not derive or accept an unsafe path merely to avoid the decision.

Download invariants include:

- Terminal completion requires successful finalization and verification facts.
- `completed_at` and completed state agree.
- Unknown size remains null rather than zero; an actual empty file has size zero.
- Received/durable bytes cannot be negative or exceed a known total.
- State transitions follow [`ENGINE_SPEC.md`](ENGINE_SPEC.md), including stale-command and recovery checks.
- A sanitized host cannot reconstruct or authorize a request.

### `download_segments`

One row represents one planned byte interval for a segmented representation.

| Logical field    | Meaning and invariant                                            |
| ---------------- | ---------------------------------------------------------------- |
| `id`             | Immutable locally unique segment identity                        |
| `download_id`    | Required relationship to owning download                         |
| `start_byte`     | Inclusive non-negative interval start                            |
| `end_byte`       | Inclusive end greater than or equal to start                     |
| `received_bytes` | Durable bytes in this interval, between zero and interval length |
| `segment_state`  | Validated segment lifecycle value                                |
| `retry_count`    | Non-negative count updated with retry scheduling transactionally |
| `updated_at`     | Latest committed segment change instant                          |

Within a download/representation, segment intervals must not overlap, must not extend beyond known total length, and collectively cover the planned range exactly. The storage and engine layers both validate these properties; database constraints should enforce the subset SQLite can express reliably.

Changing validators or total length invalidates incompatible segment records. Orphan segments are prohibited by foreign-key policy and recovery checks.

### `queues`

| Logical field     | Meaning and invariant                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `id`              | Immutable locally unique queue identity                               |
| `name`            | Non-empty bounded user-visible name under a defined comparison policy |
| `priority`        | Validated scheduling priority, not arbitrary code or SQL              |
| `max_concurrency` | Positive bounded limit consistent with global limits                  |
| `enabled`         | Whether new work may start from the queue                             |

Built-in names such as General, Documents, Software, Videos, Audio, and Archives are product defaults, not separate hard-coded tables. A queue mutation cannot allow two workers to claim the same job.

### `categories`

| Logical field    | Meaning and invariant                                              |
| ---------------- | ------------------------------------------------------------------ |
| `id`             | Immutable locally unique category identity                         |
| `name`           | Non-empty bounded display name under a defined comparison policy   |
| `folder_path`    | Validated destination policy input, never trusted on database read |
| `matching_rules` | Versioned, bounded declarative rules parsed without code execution |

Matching rules cannot contain scripts or unrestricted regular expressions without explicit resource controls. A category cannot silently redirect an existing download to an unsafe or unavailable path.

### `settings`

| Logical field | Meaning and invariant                                               |
| ------------- | ------------------------------------------------------------------- |
| `key`         | Known, versioned setting identifier                                 |
| `value`       | Validated serialized value with per-key type, size, and range rules |

Unknown or malformed settings fall back according to documented policy without disabling security controls. The table is not a generic secret store and cannot be used to add hidden feature flags or arbitrary executable configuration.

### Migration ledger

The selected SQLite library or migration mechanism will maintain an applied-version ledger. Its exact table and checksum format belong to the later storage decision. Application business logic must not edit migration history manually.

## Secret storage boundary

Sensitive request material is stored separately from the ordinary database using an approved protected local storage design, with Windows DPAPI evaluated for the Windows-first release. Database rows may hold opaque references or protected blobs only after key scope, rotation, deletion, backup, and failure behavior are specified.

Required rules:

- Bind protected material to the intended local user or stronger approved scope.
- Never include plaintext secrets in WAL pages, migration copies, logs, exports, fixtures, or error strings.
- Apply origin and request scope when retrieving credentials.
- Expiry and deletion remove usable references and handle protected data by policy.
- A decryption failure becomes a recoverable authentication outcome, not a reason to weaken protection.

Storing an encrypted original URL still leaks metadata such as timing, row count, sanitized host, destination, and file size. Privacy claims must account for that residual data.

## Transaction boundaries

At minimum, the design must make these operations internally consistent:

- Create a download record and its initial queue/category relationship.
- Install or replace a segment plan only after validating complete non-overlapping coverage.
- Advance segment and aggregate durable progress after successful file writes.
- Claim scheduled work exactly once across concurrent workers.
- Record retry count, next scheduling decision, and failure class coherently.
- Transition state with an expected-current-state condition to reject stale commands.
- Finalize output and completion metadata without exposing a completed record for an incomplete file.
- Cancel/delete history without deleting an unrelated or unowned path.

SQLite transactions cannot make a filesystem rename and database commit atomic together. The engine must use an explicit recoverable ordering and startup reconciliation, with tests for a crash between every step.

## Durability and concurrency

- Use a bounded connection strategy appropriate to SQLite rather than one connection per segment.
- Keep transactions short and do not hold a database write transaction across network I/O.
- Configure busy handling with bounded cancellation-aware behavior; do not spin indefinitely.
- Validate WAL and synchronous settings against the promised recovery semantics.
- Checkpoint policy must avoid unbounded WAL growth without turning each byte update into a disk sync.
- On corruption or failed integrity checks, preserve evidence safely, stop unsafe writes, and present recovery options without silently recreating history.

The database does not prove temporary-file contents. Startup recovery reconciles both.

## Migration rules

Once the first schema is introduced:

1. Every schema change receives a monotonically ordered migration and automated upgrade tests.
2. Applied migrations are immutable; corrections use a new migration.
3. Migrations run before components use the new schema and fail closed on unsupported versions.
4. A migration is transactional where SQLite permits. Non-transactional file/protected-store work uses a resumable staged design.
5. Upgrade tests cover the oldest supported schema and every release-to-release path promised by policy.
6. Interruption tests stop migration at controlled points and verify safe retry or documented recovery.
7. Destructive transforms require backup/space analysis, explicit user impact, and a restore strategy.
8. Downgrade is not assumed. If unsupported, newer data must be detected rather than opened by an older binary.
9. Migration logs contain versions and sanitized outcomes, never row contents or secrets.
10. Release packaging must not ship a schema change that lacks fixture-based upgrade and fresh-create coverage.

No migrations were created in Wave 0 or Wave 1.

## Deletion, export, and retention

History deletion and partial-file deletion are separate user decisions. Deleting a record must not follow an untrusted path or remove a completed file unexpectedly. Export/import is P1 scope and requires a versioned, validated, size-limited format that excludes secrets by default.

Diagnostic and history retention defaults require later product decisions. "Local" does not mean "non-sensitive"; destinations and URLs may reveal private activity.

## Failure handling

- Schema newer than supported: refuse write access and explain incompatibility.
- Migration failure: roll back where possible and preserve the original database/recovery path.
- Disk full or read-only filesystem: stop mutation without claiming checkpoint/completion.
- Busy/locked database: apply bounded retry and cancellation, then surface a storage failure.
- Corrupt or impossible row: quarantine or fail the affected recovery path; never trust it into a file/network operation.
- Protected value cannot decrypt: require reauthorization and avoid logging the value.
- Missing temporary file: reconcile state explicitly; do not mark received bytes as present.
- Orphan temporary file: do not delete until ownership is established.

## Test boundaries

Storage tests must include:

- Fresh schema creation and all supported migration paths.
- Constraint and invariant violations for sizes, bytes, states, intervals, relationships, settings, and rules.
- Concurrent work claiming and stale expected-state updates.
- Transaction rollback, process interruption, busy database, WAL recovery, disk full, read-only paths, and corruption handling.
- Reconciliation between database checkpoints and temporary file lengths/content.
- Secret absence from ordinary tables, WAL-aware test artifacts, logs, exports, and fixtures.
- Windows path, lock, user-profile, and protected-storage failure behavior.
- Deletion that proves ownership before removing partial output.

Test databases and profiles are disposable synthetic fixtures. Tests never open a user's real ODM database.

## Unresolved architectural decisions

- SQLx versus rusqlite and the migration/checksum mechanism.
- Physical SQLite types, identifiers, constraints, indexes, and timestamp representation.
- Temporary-output identity and representation metadata layout.
- Original URL protection, secret references, DPAPI scope, key rotation, and backup behavior.
- Queue/category default and deletion semantics.
- Settings serialization and category matching-rule format.
- SQLite synchronous, WAL checkpoint, integrity-check, backup, and corruption-recovery policy.
- Supported schema compatibility window and export/import versioning.

These choices block the first migration. There is no default schema to infer from this logical document.
