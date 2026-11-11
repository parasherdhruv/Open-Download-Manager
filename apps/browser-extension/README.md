# Browser Extension Boundary

**Status:** Wave 1's manifest-only MV3 build surface is implemented and locally verified. This directory contains a private package manifest, the exact inert three-key manifest source, deterministic create-only build logic, and version/permission-policy tests. It has no runtime extension code, permission, host access, content script, service worker, UI, native-messaging connection, packaged distribution, store listing, or browser-capture behavior.

## Ownership

This directory owns the inert Wave 1 package/build boundary and is the planned home of the least-privilege TypeScript browser application for:

- Explicit user actions on eligible links or directly accessible media sources.
- Candidate detection that treats page data as untrusted hints.
- Popup/options presentation and capture-mode preferences.
- Browser API integration and native-messaging port lifecycle.
- Chrome and Edge Manifest V3 packaging first, with a separately tested Firefox layer later.

Detailed behavior and trust boundaries are in [`../../docs/BROWSER_INTEGRATION.md`](../../docs/BROWSER_INTEGRATION.md). Media eligibility is constrained by [`../../docs/MEDIA_SUPPORT.md`](../../docs/MEDIA_SUPPORT.md).

## Boundary rules

- The extension never receives unrestricted filesystem access and never writes download output.
- The extension is not authoritative for engine state, integrity, queueing, completion, or path safety.
- Page, frame, content-script, background, native-host, and IPC messages are validated at every boundary.
- Ordinary handoff excludes cookies, authorization headers, complete browsing history, page HTML, local paths, and arbitrary request headers.
- A browser-approved URL still passes backend scheme, redirect, DNS, destination, and credential policy.
- The extension does not connect to an unrestricted local HTTP listener.
- Browser fallback is preserved when a safe handoff cannot be completed.
- DRM, paywall, authentication, encrypted-media, or access-control circumvention is prohibited.

## Implemented Wave 1 manifest-only baseline

Wave 1 implements only the package/build boundary and an inert Manifest V3 document. A clean build emits exactly one file, `manifest.json`; generated output is cleaned and is not committed or published. Parsed JSON is exactly:

```json
{
  "manifest_version": 3,
  "name": "Open Download Manager",
  "version": "0.0.1"
}
```

[`version`](https://developer.chrome.com/docs/extensions/reference/manifest/version) follows Chromium's one-to-four integer rule: every component is between 0 and 65535, a nonzero component has no leading zero, and the components are not all zero. `0.0.1` is the smallest valid three-component pre-alpha value. This browser manifest version is independent of the package, Cargo, and Tauri scaffold versions, which remain `0.0.0`.

No other top-level key is allowed. In particular, the manifest has no `permissions`, `optional_permissions`, `host_permissions`, `optional_host_permissions`, `background`, `content_scripts`, `action`, `externally_connectable`, or `web_accessible_resources`. It therefore has no native-messaging permission, downloads permission, host access, service worker, injected page code, toolbar action, popup, options page, or externally reachable surface.

The positive policy test accepts only that exact semantic object and independently enforces Chromium version validity. Negative fixtures reject the invalid all-zero `0.0.0` value without reflecting candidate data, add each forbidden key, and include empty permission keys and `permissions` values containing `nativeMessaging` or `downloads`.

An explicit `--out-dir` is create-only: the destination must be absent beneath a verified existing regular parent. A directory, file, symlink, or junction already at that path is rejected without mutation. The no-argument build may replace only the exact package-owned `dist` directory after link/reparse-redirection and physical-path checks. Filesystem roots, repository ancestors, and source overlap are rejected; failure cleanup removes only a directory created and still physically owned by that invocation. Regression tests preserve external directory/file/link sentinels, while two clean builds in separate temporary directories produce the same one-path inventory and byte-identical `manifest.json`. These are version, permission, filesystem-safety, and build-policy tests, not browser-integration behavior tests.

Any browser UI, permission, background process, content script, host access, native connection, or capture behavior requires a later authorized product slice and synchronized changes to [`../../docs/BROWSER_INTEGRATION.md`](../../docs/BROWSER_INTEGRATION.md).

## Future native integration boundary

In a later authorized product slice, the extension may reach ODM only through the browser-supported native-messaging channel. A separately packaged host will enforce explicit production extension IDs, versioned bounded messages, protocol-only stdout, and a constrained per-user IPC connection. The extension cannot register the host or relax local IPC security.

Wave 1 has no native-messaging permission, runtime code, host, connection, or registration.

## Test ownership

Wave 1 manifest positive/negative policy tests live with this application, and repeated-build determinism lives under [`../../tests/`](../../tests/). Both passed in the recorded scaffold gate. Later browser/native-host integration scenarios require their own authorized behavior and may live here or under the cross-workspace test boundary.

Future browser tests use synthetic profiles and registration and never modify a contributor's real browser profile. The current tests validate only manifest permission policy and deterministic output; they are not browser-integration tests.
