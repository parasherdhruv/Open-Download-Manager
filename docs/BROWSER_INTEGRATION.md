# Browser Integration Specification

**Status:** Browser integration is not implemented. Wave 1 contains a private manifest-only package, exact inert three-key Manifest V3 source/build, permission-policy tests, and deterministic-build evidence. It contains no runtime extension code, browser permission, native messaging host, host registration, local IPC protocol, installer, browser-store listing, or browser integration test.

## Purpose

The planned browser integration gives a user an explicit, least-privilege path to hand supported download metadata from a browser to the local ODM engine. It must fail safely when any component is unavailable and must never imply universal download interception.

Chrome and Edge are the initial planned browsers through Manifest V3. Firefox is a later compatibility phase with its own manifest, registration, and integration test suite.

## Goals

- Let a user send an eligible link or directly accessible media URL to ODM.
- Show whether the desktop integration is available without exposing sensitive engine state.
- Provide manual, suggested, and explicitly opt-in automatic modes within browser policy.
- Preserve ordinary browser downloading when safe handoff cannot be completed.
- Minimize host permissions, data collection, message size, and native attack surface.

## Non-goals

- Capturing every network request or defeating browser security controls.
- Accessing unrestricted local files from the extension.
- Bypassing authentication, paywalls, DRM, encrypted-media protections, or site controls.
- Scraping inaccessible page state or promising compatibility with every website.
- Exposing the engine through a general local HTTP listener.
- Treating webpage-provided names, URLs, headers, or media hints as trusted.

## Planned components

```text
Web page / browser UI (untrusted content)
  -> content script or explicit extension action
  -> Manifest V3 background service worker
  -> browser native-messaging channel
  -> ODM native messaging host
  -> per-user access-controlled Windows named pipe
  -> desktop composition root
  -> scheduler and download engine
```

- **Content scripts** may identify user-visible candidate links or media elements on explicitly matched pages. They do not establish engine trust.
- **Background service worker** owns browser API access, settings, request correlation, and native-port lifecycle.
- **Popup/options UI** presents connection state and capture preferences without holding authoritative download state.
- **Native messaging host** validates framing, browser identity, protocol version, message kind, sizes, and fields before forwarding.
- **IPC component** authenticates the local peer, enforces per-user access, and exposes only the constrained ODM protocol.
- **Desktop composition root** performs final authorization and maps accepted intent to engine behavior.

The browser extension is never a durable queue or download database. Every component in this section is future product scope; Wave 1 contains no background process, content script, extension UI, native host, or IPC connection.

## Capture modes

### Manual mode

The user invokes a context-menu, toolbar, or page action to send a selected eligible URL. This is the minimum initial mode and has the clearest user intent.

### Suggested mode

The extension may identify a likely supported download and offer a non-blocking prompt. Dismissal leaves browser behavior unchanged. Detection is a hint and must be rate-limited to avoid disruptive UI.

### Automatic mode

Automatic takeover is future, opt-in behavior only for supported direct downloads where browser APIs and store policy permit reliable interception and fallback. It requires clear settings, site exclusions, loop prevention, and proof that a failed handoff does not lose the user's download.

No mode authorizes hidden collection of browsing history. Manual mode should precede broader capture in implementation and security review.

## Candidate detection

Detection may use an explicit link, anchor download attribute, content-disposition observed through permitted APIs, direct media element source, filename extension, or content type available to the extension. Each is untrusted and potentially misleading.

Detection must:

- Accept only schemes and contexts allowed by the engine policy.
- Resolve page-relative URLs using browser-provided URL semantics.
- Avoid extracting credentials from page content.
- Avoid sending cookies or authorization data by default.
- Mark inferred metadata as hints so the backend reinspects the resource.
- Bound page scanning, candidate count, string lengths, and message size.
- Respect frames, sandboxing, origin boundaries, and browser permission scope.

Blob URLs, media-source buffers, encrypted media, dynamically protected resources, and inaccessible request bodies are not direct download URLs and must not be presented as generally supported.

## Native messaging boundary

### Registration

The future installer will register a native host per browser using the operating-system and browser-supported mechanism. Registration will use the exact installed executable path and an explicit allowlist of production extension origins/IDs. Development identifiers and production identifiers must not be conflated.

Uninstall and upgrade must remove or update stale registration without taking over unrelated entries. The extension must not write arbitrary host registrations itself.

### Protocol properties

The protocol will be versioned and will include, conceptually, a request identifier, message kind, bounded payload, and correlated success or structured error response. This is a requirement set, not a public wire schema.

The host must:

- Follow browser native-messaging length framing exactly.
- Reject unsupported protocol versions and unknown message kinds.
- Reject duplicate, malformed, oversized, deeply nested, or trailing data.
- Validate every field again even if the extension performed validation.
- Correlate responses without allowing the caller to select engine-internal identities.
- Apply backpressure and bound outstanding requests.
- Emit protocol frames only on stdout; diagnostics go to stderr or a redacted local sink.
- Close cleanly on EOF, framing error, browser disconnect, or shutdown.

Exact schema, version compatibility, and numeric limits require a later ADR before implementation.

### Local IPC

The native host will connect to a per-user Windows named pipe with restrictive access controls. The IPC layer must authenticate or otherwise establish the intended local peer, prevent cross-user access, validate protocol/version independently, and limit connection count, frame size, and idle lifetime.

The engine must not listen on an unrestricted local HTTP port. Loopback is not an authentication mechanism, and permissive named-pipe access is not acceptable merely because the host is local.

## Data minimization

An ordinary handoff should contain only the information necessary for the backend to reinspect and queue a request, such as the candidate URL, user-selected disposition, limited referrer/origin context when justified, and non-authoritative filename/category hints.

Cookies, authorization headers, complete browsing history, page HTML, form data, local paths, and arbitrary request headers are excluded by default. A future authenticated-download design requires a separate threat review, explicit consent, origin-scoped transfer, protected storage, strict redaction, and expiry behavior.

The extension and host must not log full sensitive URLs. Display may use a sanitized host and bounded path hint where appropriate.

## Permission policy

- Request only browser permissions used by implemented, user-visible behavior.
- Prefer optional host permissions for site-specific access where feasible.
- Keep content-script match patterns narrow and justified.
- Do not request broad browsing-history access for convenience.
- Explain each permission before browser-store publication.
- Treat permission denial or revocation as a normal recoverable state.
- Review manifest changes, content-script expansion, externally connectable settings, and web-accessible resources as security-sensitive changes.

The current browser manifest exists and requests no permissions. It is exactly the three-key Manifest V3 document in [`../apps/browser-extension/README.md`](../apps/browser-extension/README.md): manifest version 3, name `Open Download Manager`, and version `0.0.1`. [Chrome's authoritative manifest version reference](https://developer.chrome.com/docs/extensions/reference/manifest/version) forbids an all-zero version; the policy independently enforces that browser rule and rejects `0.0.0` without reflecting candidate input.

That Wave 1 manifest has no permission-bearing key, host access, background process, content script, action, native messaging, downloads access, or other browser behavior. Explicit build destinations are absent/create-only, and only the verified package-owned default `dist` may be replaced. Its policy, output-safety, and deterministic-build tests are repository-scaffold evidence, not browser integration tests.

## Connection and fallback behavior

- The extension may expose disconnected, connecting, connected-compatible, and incompatible states without claiming the engine is healthy based only on an open native port.
- Requests are bounded and correlated; reconnection does not blindly replay an uncertain automatic takeover.
- When the host is missing, crashes, times out, returns an incompatible version, or rejects a request, the user receives a concise non-secret error.
- In manual mode, the browser remains unchanged after a rejected handoff.
- In automatic mode, future implementation must prove safe fallback to the ordinary browser download or avoid taking over at all.
- Service-worker suspension and restart must not create duplicate engine jobs. Idempotency semantics require protocol design before automatic retry.

## Threat and failure boundaries

| Threat or failure                           | Required response                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Malicious page sends crafted URL/name       | Revalidate scheme, size, encoding, and all fields at extension and backend boundaries                |
| Unapproved extension invokes native host    | Browser registration allowlist plus host and IPC validation reject it                                |
| Forged or replayed message                  | Correlation, bounded lifetime, peer checks, and idempotency policy prevent unintended duplicate work |
| Oversized/deep JSON or frame                | Reject before unbounded allocation or recursion                                                      |
| Host stdout contamination                   | Treat as protocol failure; diagnostics never use stdout                                              |
| Named-pipe access from another user/process | Restrictive ACL and peer/authentication checks deny access                                           |
| Engine absent or incompatible               | Report disconnected/incompatible and preserve browser fallback                                       |
| Service worker restarts                     | Re-establish state without assuming an uncertain request succeeded                                   |
| Permission revoked                          | Disable dependent behavior and explain the setting                                                   |
| Redirect reaches forbidden destination      | Engine revalidates every hop; extension approval does not bypass policy                              |
| Sensitive data appears in logs              | Redaction tests fail the change; rotate exposed secrets if real data escaped                         |

## Browser policy and store readiness

Before distribution, the extension requires a reviewed privacy disclosure, accurate permissions explanation, supported-use description, data retention statement, store-policy review, reproducible package contents, and evidence that listed behavior matches implementation. Store publication is governed by [`RELEASE_PLAN.md`](RELEASE_PLAN.md).

## Test boundaries

Automated tests must cover:

- Link and direct-media candidate detection across top-level pages, frames, malformed markup, relative URLs, and unsupported schemes.
- Context-menu, toolbar, popup, settings, and permission-denied behavior.
- Content-to-background message origin and field validation.
- Native host missing, malformed frames, oversized frames, unsupported versions, host crash, timeout, and stdout contamination.
- Named-pipe access control, peer validation, engine unavailable, and incompatible engine protocol.
- Service-worker suspension/restart, native-port reconnect, duplicate request prevention, and multiple browser connections.
- Manual fallback and any future automatic-mode fallback without download loss.
- Secret redaction and absence of cookies/authorization data from ordinary handoff.
- Separate Chrome, Edge, and later Firefox compatibility suites.

Tests use synthetic profiles, extension IDs, URLs, and credentials. They must not modify a developer's real browser profile or native-host registration. Browser behavior claims require supported browser versions and repeatable test evidence.

## Unresolved architectural decisions

- Exact Manifest V3 permission and host-permission set for the first manual feature.
- Wire schema, serialization constraints, maximum frame sizes, protocol versioning, and replay/idempotency semantics.
- Named-pipe identity, peer-authentication mechanism, ACL construction, and connection lifecycle.
- Production extension identifiers and separation of development registration.
- Installer ownership of registration, upgrade, repair, and uninstall.
- Whether any authenticated request context can be handed off safely; it is excluded until decided.
- Technical feasibility and browser-store acceptability of suggested or automatic modes.
- Firefox compatibility abstraction and packaging.

These open decisions block the affected implementation and must not be replaced with permissive defaults.
