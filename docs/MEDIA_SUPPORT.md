# Media Support Specification

**Status:** Media behavior is not implemented. The API-free `media-detection` crate exists as a Wave 1 ownership/build boundary, but ODM has no media detector behavior, playlist parser, segment collector, muxer, site adapter, browser media action, codec support, public media API, or media compatibility claim.

## Purpose

Future media support may help a user download directly accessible media and authorized, clear HLS or MPEG-DASH resources. It is an adapter around the same validated network, file, scheduling, persistence, and security foundations used by ordinary downloads; it is not a bypass system.

The media component remains separate from the generic HTTP engine. `media-detection` may parse supported metadata and produce a bounded transfer plan, while `protocol-http`, `download-core`, `download-scheduler`, and `file-manager` retain their respective transport, lifecycle, scheduling, and filesystem responsibilities.

No public parser, adapter, or transfer API is defined in this milestone.

## Safety and authorization boundary

ODM will not bypass or defeat:

- Digital rights management or encrypted-media protections.
- Paywalls, authentication requirements, or subscription controls.
- Signed-URL restrictions, origin policy, access controls, or authorization expiry.
- Browser sandboxing or website controls used to prevent access.

The user is responsible for having authorization to access and save a resource. User intent alone does not make an inaccessible resource eligible. The software must reject protected or unsupported content clearly and must not advertise universal website compatibility.

The initial planned HLS and DASH boundary is clear, non-DRM content. Encrypted playlist/media forms are unsupported until a later reviewed specification can distinguish legitimate handling without enabling circumvention; no such support is assumed here.

## Planned stages

### Stage A: direct media

Directly downloadable HTTP or HTTPS resources may include explicitly supported MP4, WebM, MP3, WAV, OGG, and later reviewed formats. Eligibility is based on verified response behavior, not just a file extension or page label.

Direct-media handling must:

- Reuse engine URL, redirect, range, validator, path, and integrity controls.
- Treat MIME type, extension, and Content-Disposition as untrusted hints.
- Preserve bytes without transcoding unless a separate reviewed feature introduces it.
- Avoid claiming a format is playable merely because its bytes downloaded.
- Reject `blob:`, `data:`, media-source, and inaccessible in-memory browser references as ordinary direct URLs.

A browser context-menu action may be offered only when the browser exposes a usable source URL and the user explicitly invokes it.

### Stage B: clear HLS

The initial design target is authorized, clear HLS described by `.m3u8` playlists. A staged implementation should start with bounded video-on-demand fixtures before considering live/event playlists.

Planned processing responsibilities include:

- Parse master and media playlists with strict input-size, line-length, item-count, and nesting limits.
- Resolve relative URIs against the validated playlist URL.
- Select a supported variant using explicit user choice or a documented deterministic policy.
- Preserve media sequence order and handle initialization maps and byte ranges only when implemented and tested.
- Revalidate every playlist, initialization, key, and segment URL through network policy.
- Bound segment count, total expected size, concurrent requests, retries, and aggregate duration.
- Detect discontinuities and unsupported tags instead of silently producing corrupt output.
- Assemble output only with a format-aware strategy proven valid for the selected segment/container combination.

Any encryption indication other than an explicitly clear state is unsupported by the initial scope. Unsupported tags or rendition structures must produce a precise compatibility outcome rather than be ignored when they affect correctness.

### Stage C: clear MPEG-DASH

The later DASH target is authorized, clear, static MPEG-DASH described by an MPD. Initial work should use a deliberately limited, documented MPD profile rather than claiming general DASH support.

Planned processing responsibilities include:

- Parse XML with external entities, DTD processing, and unbounded expansion disabled.
- Bound document size, depth, element count, timelines, and resolved URLs.
- Resolve BaseURL values and segment references under the same redirect and destination policy as other requests.
- Select supported representations deterministically and expose user choice where useful.
- Associate audio and video tracks without silently mixing incompatible periods, codecs, or timelines.
- Collect initialization and media segments in validated order.
- Detect content protection descriptors and reject protected content.
- Assemble or mux output using a separately reviewed, licensed, and sandbox-conscious strategy.

Dynamic/live MPDs, multi-period edge cases, uncommon addressing modes, and codec/container combinations remain unsupported until individually specified and tested.

## Variant and representation selection

Selection policy must consider only metadata the implementation understands: bandwidth, dimensions, codecs, language, role, container, and compatibility. Missing or contradictory metadata must not be guessed into a false compatibility claim.

An automatic default must be deterministic and explainable. If the highest-bandwidth representation cannot be assembled safely, ODM should offer supported alternatives or reject it, not silently return a different result under the requested label.

Selection cannot authorize content. A valid manifest and selectable representation still pass all URL, origin, authentication, and protection checks.

## Fetch and assembly invariants

- Every fetched URI passes scheme, redirect, DNS, network-destination, size, and retry policy independently.
- Manifest authorization data is never exposed in logs or forwarded to unrelated origins.
- The transfer plan has bounded work and stable ordering before execution where the format permits.
- Segment identity, expected order, and representation membership are recorded for recovery.
- Repeated, missing, truncated, changed, or unexpectedly encoded segments are explicit failures or reviewed retry cases.
- Temporary files remain non-final until assembly and integrity checks complete.
- Raw concatenation is permitted only for a combination where format rules and tests prove it correct.
- Muxing or external tooling is not assumed; adopting it requires license, binary-distribution, update, sandbox, and command-injection review.
- A completed transfer is not automatically a playable or standards-conformant media file; validation depth must be stated accurately.

## Authentication and sensitive URLs

Playlists and segment URLs may contain expiring or signed query values. They are sensitive even when no explicit authorization header exists.

- Store the minimum needed for recovery and protect it according to storage policy.
- Redact query values from ordinary diagnostics and UI exports.
- Do not send cookies or authorization headers from one origin to another without an explicit origin-scoped policy.
- Treat expiry as an authentication/authorization outcome, not an invitation to bypass controls.
- Do not send media URLs, browsing context, or manifest content to an AI provider.

Authenticated media support is blocked until the engine and browser specifications define a reviewed credential flow.

## Threat and failure boundaries

| Threat or failure                                        | Required behavior                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Manifest points to loopback/private or forbidden network | Reject each resolved URI under network policy                                  |
| Recursive, oversized, or expansion-heavy manifest        | Stop at parser/resource limits without partial finalization                    |
| Path traversal or hostile media title                    | Sanitize through `file-manager`; manifest text never chooses an arbitrary path |
| Protection/encryption descriptor                         | Reject as unsupported; do not acquire or derive decryption material            |
| Playlist or MPD changes during transfer                  | Revalidate identity/timeline and prevent cross-version assembly                |
| Missing or reordered segment                             | Retry only when eligible, then fail without finalizing corrupt output          |
| Signed URL expires                                       | Return a sanitized authorization-expired outcome                               |
| Mixed origins                                            | Apply redirect/header/credential policy to every request independently         |
| Codec or container is unsupported                        | Reject before claiming a successful playable result                            |
| External muxer fails or emits unexpected output          | Preserve diagnostics without shell injection or false completion               |
| Disk fills during collection/assembly                    | Stop safely, record recoverable state where valid, and clean up by policy      |

## Site-specific adapters

Site adapters are not part of the initial media scope. Any future adapter requires:

- A lawful, documented supported use and review of site terms and access boundaries.
- Narrow ownership and permissions rather than arbitrary page scripting.
- Deterministic fixtures that do not depend on scraping a live third-party site in CI.
- A maintenance and deprecation policy.
- Compatibility claims tied to tested versions and dates.
- Immediate removal or disablement if it would facilitate access-control circumvention.

Community contribution does not waive these requirements.

## Test boundaries

Controlled local fixtures must cover:

- Direct resources with accurate and misleading MIME types/extensions.
- Valid and malformed HLS master/media playlists, relative URLs, variants, maps, byte ranges, discontinuities, duplicate/missing segments, and explicit encryption rejection.
- Bounded static DASH profiles, BaseURL resolution, representation selection, timelines, initialization segments, multi-track association, XML entity/expansion rejection, and content-protection rejection.
- Redirects, forbidden network destinations, signed-value redaction, authorization expiry, retry exhaustion, and resource limits for every nested request.
- Interrupted collection, restart, changed manifest/segment identity, disk-full, cancellation, cleanup, and assembly failure.
- Exact output bytes or trustworthy fixture digests, plus format-level validation appropriate to the claimed result.
- Browser action behavior only for accessible sources and honest handling of blob/protected/unsupported content.

No test may depend on downloading copyrighted or protected media from a public service. Fixtures must be synthetic or clearly licensed for the test purpose.

## Compatibility claims

A format or profile may be listed as supported only when:

- Its accepted input subset is documented.
- Success, malformed input, interruption, and protection boundaries have automated coverage.
- Output integrity and claimed format validity are verified.
- Required codecs, muxers, or external binaries have compatible distribution terms.
- Security and resource limits are enforced.

Downloading one sample is not sufficient evidence.

## Unresolved architectural decisions

- Exact direct-media MIME/extension allowlist and validation depth.
- Initial HLS tag/profile subset and whether live/event playlists are ever in scope.
- Initial DASH profile, addressing modes, period support, and representation-selection UI.
- Format-aware assembly and muxing strategy, including whether an external tool is acceptable.
- Codec/container validation strategy and the definition of a playable-output claim.
- Persistence model for manifests, segment identity, expiry, and media-specific recovery.
- Whether any authenticated media flow can meet the browser and secret-storage constraints.

The affected capability remains out of scope until its decision is resolved and tested.
