# Open Download Manager (ODM)
## Master Product Requirements & Engineering Implementation Blueprint

**Document type:** Product specification + technical implementation roadmap  
**Platform:** Windows 11 first  
**Architecture:** Rust + Tauri + React  
**Development approach:** Codex-assisted, test-driven, modular  
**License recommendation:** Apache-2.0  
**Project status:** Planning

---

# 1. Product vision

Build a modern, high-performance, open-source download manager inspired by the capabilities of Internet Download Manager.

The product must provide:

1. High-speed segmented downloads.
2. Reliable pause, resume and crash recovery.
3. Browser integration.
4. Audio and video download detection for supported, authorized resources.
5. Intelligent download scheduling.
6. Automatic file categorization.
7. Advanced download queues.
8. A desktop application with a polished interface.
9. AI-powered troubleshooting and file organization.
10. An open-source development and distribution ecosystem.

The first release must work entirely locally without requiring an account, cloud server or subscription.

## Product principles

- Performance first.
- Reliability before feature quantity.
- Privacy by default.
- No unnecessary background network communication.
- No DRM or paywall circumvention.
- No telemetry without informed consent.
- Modular architecture.
- Transparent open-source development.

# 2. Functional scope

## P0 — Essential MVP functionality

- Add download from URL.
- Download HTTP and HTTPS resources.
- Concurrent segmented downloading.
- Single-connection fallback.
- Accurate download progress.
- Pause and resume.
- Cancel and retry.
- Download queue.
- Global and individual speed limits.
- Automatic filename detection.
- Automatic category detection.
- Choose destination folder.
- Download history.
- Persistent download state.
- Crash recovery.
- Duplicate filename handling.
- System tray integration.
- Chrome and Edge integration.

## P1 — Advanced functionality

- Firefox integration.
- Browser context-menu actions.
- Supported media detection.
- Non-DRM HLS/DASH processing.
- Download scheduler.
- Bandwidth scheduling.
- Queue priorities.
- Website-specific download rules.
- File checksum verification.
- Duplicate file detection.
- Export and import download history.
- Advanced download filters.
- Configurable retry policies.
- Proxy configuration.
- HTTP authentication.
- Diagnostics and logging.

## P2 — AI and power-user functionality

- AI download assistant.
- AI-generated categories.
- Natural-language download search.
- Smart filename suggestions.
- Intelligent duplicate detection.
- Download error explanations.
- Local LLM integration.
- Optional external AI provider.
- Smart download scheduling.
- Batch organization.
- Rules-based website grabbing.
- Advanced analytics.

# 3. Technical architecture

Use a Rust workspace with separate application, engine, protocol, storage, and integration components.

The desktop frontend must never directly implement download networking.

The Rust engine owns all networking, file writes, scheduling, persistence and state management.

The browser extension must never have direct access to unrestricted filesystem operations.

## Technology stack

### Desktop application
- Tauri 2
- React 19
- TypeScript strict mode
- Vite
- Tailwind CSS 4
- shadcn/ui
- TanStack Query where useful
- Lucide icons

### Backend
- Rust stable
- Tokio
- reqwest or hyper
- SQLite
- SQLx or rusqlite
- Serde
- Tracing
- SHA-256 implementation

### Browser extension
- TypeScript
- Chrome Manifest V3
- Chrome Downloads API
- Context Menus API
- Native Messaging API
- Content scripts
- Firefox compatibility layer

### Testing and infrastructure
- Vitest
- React Testing Library
- Playwright
- Rust unit and integration tests
- GitHub Actions
- Cargo audit/dependency checks
- Automated release builds

# 4. Repository design

Create a monorepo.

```text
open-download-manager/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   │
│   │   └── src-tauri/
│   │
│   └── browser-extension/
│       ├── src/
│       │   ├── background/
│       │   ├── content/
│       │   ├── popup/
│       │   ├── options/
│       │   ├── messaging/
│       │   └── detection/
│       │
│       ├── manifests/
│       └── tests/
│
├── crates/
│   ├── download-core/
│   ├── download-scheduler/
│   ├── protocol-http/
│   ├── storage/
│   ├── file-manager/
│   ├── native-messaging/
│   ├── ipc/
│   ├── media-detection/
│   ├── diagnostics/
│   └── shared-types/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── ENGINE_SPEC.md
│   ├── BROWSER_INTEGRATION.md
│   ├── MEDIA_SUPPORT.md
│   ├── SECURITY.md
│   ├── DATABASE_SCHEMA.md
│   ├── TEST_PLAN.md
│   ├── RELEASE_PLAN.md
│   └── ROADMAP.md
│
├── tests/
│   ├── fixtures/
│   ├── mock-download-server/
│   ├── integration/
│   └── benchmarks/
│
├── scripts/
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── Cargo.toml
├── pnpm-workspace.yaml
├── package.json
├── LICENSE
└── README.md
```

Every Rust crate must have an explicit responsibility and public interface.

Do not create circular dependencies.

# 5. Download engine implementation

This is the most important component of the entire product.

## 5.1 Download creation

Input:

- URL
- Destination directory
- Optional filename
- Optional request headers
- Connection limit
- Queue priority
- Category
- Download options

Processing:

1. Validate URL scheme.
2. Reject unsupported protocols.
3. Sanitize user-provided options.
4. Generate a unique download ID.
5. Create a database record.
6. Set download state to QUEUED.
7. Add the job to the scheduler.
8. Start metadata inspection when scheduled.

Never log authorization headers or URL query parameters containing credentials.

## 5.2 Metadata inspection

Implement a download inspection pipeline.

First attempt a HEAD request.

Read:

- Content-Length
- Content-Type
- Content-Disposition
- Accept-Ranges
- ETag
- Last-Modified
- Final redirected URL

HEAD may fail or return incomplete metadata.

Next, perform a small GET request using Range when appropriate.

Verify that the server actually returns a valid 206 Partial Content response with a matching Content-Range.

Never enable segmented downloading merely because an Accept-Ranges header is present.

If range support cannot be established, use single-stream downloading.

## 5.3 Segmented downloading

Implement a configurable segment scheduler.

Initial defaults:

- Small files: single connection.
- Medium files: 2–4 connections.
- Large files: 4–8 connections.
- Configurable user maximum.
- Hard application-level concurrency limits.

The numbers are starting policies, not guarantees of optimal speed.

Each segment must have:

- Segment ID
- Starting byte
- Ending byte
- Expected size
- Received size
- Current state
- Retry count
- Error details

Example:

```text
File: example.zip
Size: 100 MB

Segment 1: 0–25 MB
Segment 2: 25–50 MB
Segment 3: 50–75 MB
Segment 4: 75–100 MB
```

All segment requests must use the correct byte ranges.

Before accepting segment data, validate:

- HTTP status
- Content-Range
- Expected byte count
- Representation validator when available

Prevent segments from different versions of the same resource from being merged.

Use appropriate conditional requests with strong ETags or Last-Modified validators.

Use an identity content-encoding policy for byte-range transfers where appropriate.

## 5.4 Concurrent file writing

Implement offset-based file writes.

Do not allow multiple tasks to race on one shared mutable file cursor.

Each segment must write its bytes to the exact assigned file offset.

Use platform-specific positioned-write functionality behind a portable file-writer abstraction.

Requirements:

- Correct byte ordering.
- No overlapping segment boundaries.
- No missing bytes.
- No accidental overwrites.
- Safe finalization.
- Consistent write error handling.

## 5.5 Retry engine

Implement independent retries per segment.

Suggested initial policy:

- Maximum five retries per segment.
- Exponential backoff.
- Random jitter.
- Retry transient network failures.
- Retry eligible server errors.
- Avoid retrying invalid URLs indefinitely.
- Handle expired authentication separately.
- Reset download when validators show that the resource changed.

Every error must have a structured internal error code.

## 5.6 Single-stream fallback

If the resource cannot support segmented requests:

- Start one streaming GET request.
- Write incrementally.
- Report accurate progress when length is known.
- Support pause where practical.
- Save progress for resumable responses.
- Disable unsupported resume operations honestly.

A failed segmented transfer must never silently corrupt the final file.

## 5.7 Download state machine

Implement explicit states:

```text
QUEUED
  |
  v
INSPECTING
  |
  v
DOWNLOADING
  |
  +----> PAUSING ---> PAUSED
  |                    |
  |                    v
  +---------------- RESUMING
  |
  +----> VERIFYING
  |          |
  |          v
  |      COMPLETED
  |
  +----> RETRY_WAIT
  |
  +----> FAILED
  |
  +----> CANCELLED
```

Every state transition must be validated.

Implement state-transition unit tests.

## 5.8 Recovery and persistence

Use SQLite as the source of truth.

Persist:

- Download metadata
- Destination path
- Current state
- Total bytes
- Received bytes
- Segment definitions
- Completed segments
- Retry counts
- Resource validators
- Creation and completion times
- Failure diagnostics

Use SQLite WAL mode and explicit transactions.

Checkpoint segment progress periodically.

Upon application restart:

1. Read unfinished downloads.
2. Validate their partial files.
3. Validate stored resource metadata.
4. Discard unsafe or inconsistent segment states.
5. Reinspect resources where needed.
6. Restore valid unfinished jobs.
7. Allow the user to resume.

Use temporary file names until verification is complete.

Rename to the final name only after successful completion.

## 5.9 Integrity verification

Implement:

- Final file size verification.
- Optional SHA-256 verification.
- Server-provided checksum verification where trustworthy.
- Optional expected checksum supplied by the user.
- Partial-download detection.
- Corruption diagnostics.

Do not claim a file is cryptographically verified when no trustworthy checksum is available.

# 6. Download scheduler

Create a dedicated scheduler crate.

Responsibilities:

- Global active-download limit.
- Per-host active-download limit.
- Per-download connection limit.
- Queue priority.
- Retry scheduling.
- Bandwidth management.
- Pause/resume coordination.
- Fair allocation.
- Shutdown handling.

Add priority levels:

```text
URGENT
HIGH
NORMAL
LOW
BACKGROUND
```

Implement configurable queues:

- General
- Documents
- Software
- Videos
- Audio
- Archives
- Custom queues

Add download start/end scheduling.

Never allow multiple scheduler workers to start the same job concurrently.

# 7. Browser integration

## Phase 1: Chrome and Edge

Develop a Manifest V3 extension.

Required functionality:

- Detect ordinary downloadable links.
- Detect direct media links where accessible.
- Show a Download with ODM action.
- Add context-menu actions.
- Provide toolbar popup.
- Send download metadata to the native host.
- Display application connection status.
- Show recent download status.

Implement content scripts for appropriate page-level detection.

Use Chrome's supported downloads API where applicable.

Do not promise automatic interception of every network transfer.

## Phase 2: Native Messaging

Create a dedicated native messaging host executable.

Communication architecture:

```text
Chrome / Edge extension
          |
          v
Native Messaging Host
          |
          v
Windows Named Pipe
          |
          v
Download Engine
```

Requirements:

- Strict native host registration.
- Explicit allowed extension IDs.
- Request validation.
- Protocol versioning.
- Request IDs.
- Response correlation.
- Connection recovery.
- Message size limits.
- Structured error responses.

Use a per-user Windows named pipe with appropriate access controls.

Never expose the engine through an unrestricted local HTTP server.

Native messaging stdout must contain protocol messages only. Send diagnostics to stderr or a log file.

## Phase 3: Browser capture

Implement three modes:

1. Manual mode: user clicks Download with ODM.
2. Suggested mode: show a prompt for supported downloads.
3. Automatic mode: opt-in takeover for supported direct downloads where browser APIs permit it.

Fallback to ordinary browser downloads whenever the engine is unavailable or a transfer cannot be safely handed off.

## Phase 4: Firefox

Implement a Firefox-specific manifest and registration configuration.

Reuse shared detection and messaging logic where browser APIs are compatible.

Run a separate integration test suite.

# 8. Video and media downloader

Build this module separately from the HTTP engine.

## Stage A: Direct media

Support directly downloadable:

- MP4
- WebM
- MP3
- WAV
- OGG
- Other explicitly supported formats

Provide a browser context-menu action for video and audio elements when a downloadable source is accessible.

## Stage B: HLS

Support authorized, clear HLS streams.

Implement:

- Master playlist parsing.
- Variant selection.
- Media playlist parsing.
- Segment collection.
- Segment ordering.
- Initialization segment handling where applicable.
- Output assembly.
- Network retry.
- Metadata extraction.

Support `.m3u8` playlists.

## Stage C: DASH

Add support for authorized, clear MPEG-DASH content.

Implement:

- MPD parsing.
- Representation selection.
- Segment URL resolution.
- Segment collection.
- Audio/video track association.
- Output assembly.

## Safety and compatibility boundaries

Do not bypass DRM, paywalls, authentication restrictions, encrypted media protections or site access controls.

Do not promise that every streaming website will be supported.

Some sites use dynamically generated URLs, protected content, blob-based media, custom authorization or rapidly changing playback logic.

For site-specific adapters, establish a support policy and tests before publishing compatibility claims.

# 9. Desktop application design

Build an interface inspired by the usability of established download managers, but with a modern design system.

## Primary screens

### Dashboard
- Total downloads.
- Active downloads.
- Completed downloads.
- Failed downloads.
- Global current speed.
- Recent activity.
- Storage usage.

### Downloads
- All downloads.
- Active.
- Queued.
- Completed.
- Failed.
- Paused.

### Download details
- Filename.
- URL host.
- Destination.
- Progress.
- Current speed.
- Average speed.
- Remaining time.
- Segment progress.
- Connection details.
- Retry status.
- Error information.

### Queue manager
- Create queues.
- Edit priorities.
- Schedule downloads.
- Control concurrency.
- Pause and resume queues.

### Categories
- Documents.
- Software.
- Video.
- Audio.
- Archives.
- Other.

### Browser integration
- Installed browser status.
- Extension connection status.
- Permissions.
- Capture mode.
- Supported website rules.

### Settings
- General.
- Download locations.
- Connections.
- Speed limits.
- Scheduling.
- Browser integration.
- Notifications.
- Appearance.
- Privacy.
- Advanced diagnostics.

### AI assistant
- Explain download errors.
- Suggest categories.
- Find duplicates.
- Search download history.
- Recommend organization rules.

## UI requirements

- Responsive layout.
- Dark and light themes.
- Native Windows interactions.
- Keyboard shortcuts.
- Accessible labels.
- Virtualized download list.
- Non-blocking progress updates.
- Smooth progress indicators.
- System tray support.
- Notification support.

Do not send every network chunk as a frontend event.

Aggregate progress updates at a controlled interval to avoid unnecessary UI rendering.

# 10. AI assistant

Build the AI integration after the download engine is stable.

Use a provider abstraction.

```text
AI Provider
   |
   +-- Disabled
   |
   +-- Local LLM
   |
   +-- OpenAI-compatible API
   |
   +-- Other approved providers
```

Initial AI features:

1. Intelligent file categorization.
2. Suggested filenames.
3. Natural-language download search.
4. Download error explanation.
5. Duplicate detection assistance.
6. Download organization suggestions.
7. Queue recommendations.
8. Natural-language commands.

Example commands:

- Find all PDFs downloaded last month.
- Show failed downloads.
- Organize my completed software downloads.
- Explain why this download failed.
- Create a queue for large files.
- Show duplicate files.

AI security rules:

- Never send cookies to AI providers.
- Never send authorization tokens.
- Redact signed URL query parameters.
- Do not send browsing history without explicit consent.
- Keep a local-only mode.
- Require confirmation for destructive actions.
- Never let an AI model arbitrarily execute shell commands.

Use conventional rules and metadata first. AI must enhance the product rather than control essential download reliability.

# 11. Database design

Create migrations from the beginning.

### downloads

- id
- original_url_encrypted
- sanitized_host
- filename
- destination
- mime_type
- file_size
- downloaded_bytes
- download_state
- etag
- last_modified
- created_at
- updated_at
- completed_at
- error_code

### download_segments

- id
- download_id
- start_byte
- end_byte
- received_bytes
- segment_state
- retry_count
- updated_at

### queues

- id
- name
- priority
- max_concurrency
- enabled

### categories

- id
- name
- folder_path
- matching_rules

### settings

- key
- value

Sensitive headers, cookies, and authentication data must be stored separately using protected local storage, with Windows DPAPI considered for Windows-specific secret protection.

# 12. Security requirements

Security is a release-blocking requirement.

Implement:

- HTTPS certificate validation.
- URL scheme validation.
- Redirect validation.
- Safe filename sanitization.
- Destination path validation.
- Resource limits.
- IPC authentication and access control.
- Browser extension origin validation.
- Secret redaction.
- Secure temporary-file handling.
- Database protection.
- Dependency vulnerability checks.
- Signed release artifacts.
- Permission minimization.

Guard against malicious URLs that redirect to localhost, private-network endpoints or unexpected resources. Implement appropriate DNS and redirect checks.

Do not disable TLS validation to make a failed download work.

Do not automatically execute downloaded programs.

Never trust file names, server headers or browser messages.

# 13. Test strategy

Build a local mock download server before optimizing the engine.

It must simulate:

1. Normal HTTP 200 downloads.
2. Valid HTTP 206 responses.
3. Servers without range support.
4. Servers ignoring Range requests.
5. Missing Content-Length.
6. Unexpected connection termination.
7. Invalid Content-Range.
8. ETag changes.
9. HTTP 416 responses.
10. Redirects.
11. Rate limiting.
12. Server errors.
13. Expired authentication.
14. Slow connections.
15. Large files.
16. Filename collisions.
17. Application crash during downloading.
18. Disk write failures.

Every integration test must verify file integrity against the expected source.

## Browser tests

Test:

- Link detection.
- Context-menu creation.
- Toolbar actions.
- Native host unavailable.
- Native host crashes.
- Extension service worker restart.
- Invalid messages.
- Unsupported websites.
- Permissions denied.
- Multiple browsers connected.

## Performance benchmarks

Compare ODM against:

- Internet Download Manager.
- Chrome's native downloader.
- Firefox's native downloader.
- aria2.

Use controlled test servers and identical network conditions.

Measure:

- Total download duration.
- Average throughput.
- Peak throughput.
- CPU utilization.
- RAM utilization.
- Number of connections.
- Retry count.
- File integrity.
- Resume reliability.

Never compare downloads from unrelated mirrors and claim that one tool is faster based on a single run.

# 14. Open-source development and release strategy

Use Apache-2.0 as the initial license recommendation.

Maintain:

- README.md
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- SECURITY.md
- LICENSE
- CHANGELOG.md
- Architecture documentation
- Development setup documentation

Use dependency license checks before accepting major dependencies.

Study aria2 as a reference implementation, but do not copy or embed its GPL-licensed code without first making the licensing decision and complying with the applicable license obligations.

Publish:

- Windows x64 installer.
- Portable build where practical.
- Source code.
- Checksums.
- Release notes.
- Extension source.
- Reproducible build instructions.

Use GitHub Actions for CI and release automation.

Plan code signing before public distribution.

Publish the browser extension through the relevant browser stores only after privacy disclosures, permissions, functionality and policies are reviewed.

# 15. Codex execution rules

Create a root AGENTS.md with the following requirements:

1. Read the PRD before implementation.
2. Read architecture documentation before modifying core components.
3. Implement one scoped feature at a time.
4. Never rewrite unrelated modules.
5. Never invent API behavior.
6. Follow strict TypeScript.
7. Use Rust error handling rather than unwrap in production paths.
8. Write tests alongside new functionality.
9. Run tests before reporting completion.
10. Document architecture decisions.
11. Avoid placeholder implementations presented as finished functionality.
12. Never expose secrets in logs.
13. Do not silently change public interfaces.
14. Update documentation when behavior changes.
15. Keep the application buildable after every milestone.

For every task, Codex must report:

- Files changed.
- Features implemented.
- Tests added.
- Commands executed.
- Test results.
- Known limitations.
- Remaining tasks.

# 16. Definition of Done

A feature is not complete simply because it compiles.

A feature is complete when:

- Its requirements are implemented.
- Relevant automated tests pass.
- Failure conditions are handled.
- Security considerations are addressed.
- Documentation is updated.
- The application still builds.
- There are no known regressions in the relevant functionality.

# 17. Future roadmap

After the first public release, consider:

- FTP and SFTP.
- BitTorrent through a separately evaluated protocol module.
- Advanced website mirroring.
- Cross-device synchronization.
- Linux desktop support.
- macOS support.
- Remote download management.
- Advanced plugins.
- Community-maintained website adapters.
- More AI providers.
- Advanced analytics.

Do not introduce these features until the core download engine has demonstrated production-level reliability.

---

**Final engineering principle:** The download engine is the product's foundation. The browser extension, AI system, media detection and desktop interface are layers around it. Build and test the foundation first.