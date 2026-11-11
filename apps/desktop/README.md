# Desktop Application Boundary

**Status:** Wave 1's zero-feature React/Tauri build surface is implemented and locally verified. This directory contains a static pre-alpha/downloads-unavailable shell, package and Tauri manifests, local assets, an empty Tauri capability set with restrictive CSP, and scaffold tests. It is not a download manager: it has no product command, state, networking, persistence, scheduler, filesystem product I/O, tray integration, installer, or release artifact.

## Ownership

This directory owns the Wave 1 desktop build boundary and is the planned home of the Windows-first desktop application:

- A React `19.3.1` and strict TypeScript `6.0.3` presentation layer under the authorized `src/` tree.
- A Tauri `2.12.5` Rust package under the authorized `src-tauri/` tree.
- The desktop composition root that constructs backend components and manages lifecycle.
- Desktop-specific accessible views, settings surfaces, progress aggregation, system tray behavior, and notifications when their milestones are authorized.

The target structure and workspace membership are defined in [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). The pinned toolchain and Wave 1 root command contract are defined in [`../../docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md).

## Boundary rules

- React owns rendering, accessibility, local view state, and expression of user intent.
- Rust owns networking, file writes, scheduling, persistence, secret access, integrity decisions, and authoritative download state.
- The Tauri layer is a thin application composition root. Reusable behavior belongs to its owning crate.
- Reusable Rust crates never depend on this application.
- Frontend packages do not reach into backend implementation paths or browser-extension private modules.
- Progress is aggregated at a bounded cadence; raw network chunks are not frontend events.
- Public command/event contracts are introduced only with a concrete caller, validation, failure behavior, security review, and tests.

## Implemented Wave 1 zero-feature baseline

Wave 1 provides only a static local web shell and the minimum Tauri package needed to compile and open it. The shell identifies Open Download Manager as a pre-alpha repository scaffold, states that downloads are unavailable, and renders no download action or simulated product result. Opening a window does not implement downloads, persistence, scheduling, browser integration, media support, tray behavior, installation, or release behavior.

The Tauri package remains an application composition root with no dependency on any reusable workspace crate in Wave 1. The ten API-free crates are compiled and topology-checked independently; they are not wired together merely to demonstrate architecture.

## Wave 1 security invariant

- No custom Tauri command, invoke handler, application event protocol, product state, persisted setting, secret access, or product API.
- No application plugin or integration for updater, tray, filesystem, shell, URL opening, dialog, notification, global shortcut, native messaging, local IPC, telemetry, or product networking.
- No remote asset, CDN, font, analytics endpoint, update endpoint, or public-network request.
- `app.security.capabilities` is an explicit empty array, and no capability file exists.
- The production CSP limits default, script, style, image, and font loads to `'self'`; allows `connect-src 'self' http://ipc.localhost`; and denies object, base, form, and framing capabilities.
- CSP contains no wildcard, remote `http:`/`https:` source, `data:`/`blob:` source, `unsafe-eval`, or unnecessary `unsafe-inline` grant.

The configuration uses the Tauri `2.12.5` schema, an explicit empty capability set, and the policy-tested local-only CSP. The locked no-bundle build passed on the documented Windows environment. The regression inspects effective configuration and dependency metadata and rejects broader capabilities, sources, custom commands, plugins, or integrations. The complete invariant and future product-boundary rules are in [`../../docs/SECURITY.md`](../../docs/SECURITY.md).

## Test ownership

`src/App.test.tsx` covers the static pre-alpha/unavailable render. The root scaffold suite requires the complete Tauri configuration artifact set to contain only base `tauri.conf.json` and validates normalized `src/main.rs` and `build.rs` against their reviewed minimal forms in addition to semantic policy. `e2e/shell.spec.ts` provides one static Vite-preview smoke with service workers blocked and context-wide HTTP/WebSocket loopback guards; it is not a runtime Tauri/WebView test. These scaffold tests passed in the recorded Wave 1 gate and do not exercise a product command. Future product component tests remain near the code they exercise, while cross-workspace desktop-engine journeys belong under [`../../tests/`](../../tests/).
