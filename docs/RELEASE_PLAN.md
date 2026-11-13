# Release Plan

**Current status:** No release process is implemented. Wave 1 local web, Cargo, and Tauri no-bundle builds pass, and Roadmap Phase 0 defines unprivileged repository validation on a review branch. ODM still has no distributable bundle, release version, installer, portable package, packaged extension, signature, checksum set for distribution, update channel, release upload, or published release. Hosted `main`, private vulnerability reporting, exact branch protection, and the initial four hosted checks are verified, but independent review and Phase 0 merge remain pending.

## Wave 0 exclusion

The Wave 0 repository-scaffold milestone was documentation and governance only. It explicitly excluded:

- Building or packaging an application or browser extension.
- Creating release workflows, credentials, signing configuration, or store configuration.
- Code signing, notarization, timestamping, or certificate acquisition.
- Publishing packages, installers, source archives, browser-store submissions, tags, or release uploads.
- Claiming reproducible builds or verified distributable artifacts when Wave 0 had no build.

Wave 0 documented future gates but did not satisfy them on behalf of future code.

Roadmap Phase 0 continuous-validation workflows are a later repository-control slice, not release automation. They hold no signing or publishing permission, produce no distributable artifact, and do not satisfy any promotion, installer, signature, provenance, or publication gate in this document.

## Release principles

- A release is a deliberate promotion of a reviewed commit, not merely a successful local build.
- Security, integrity, privacy, accessibility, licensing, and recovery are release requirements.
- Artifact contents and claims must match tested behavior exactly.
- Signing proves artifact provenance from the signing process; it does not replace tests or security review.
- Browser-store publication is independent from desktop release and requires separate policy/permission review.
- No release process may expose signing, store, or provider credentials to untrusted contributions.

## Planned release scope

The first public release is intended for Windows 11 x64 and local, account-free operation. Candidate artifacts may include:

- A Windows x64 desktop installer.
- A portable desktop package only if update, registration, path, and security behavior can be supported honestly.
- Corresponding source at the released revision.
- Release notes, dependency/license notices, and cryptographic checksums.
- Browser extension source and separately packaged/store-distributed builds after browser readiness gates pass.
- Reproducible build instructions to the extent reproducibility has been demonstrated.

The native messaging host and registration must be versioned and packaged consistently with compatible desktop and extension versions. Artifact names, formats, and versioning are unresolved until the packaging milestone.

## Future release gates

### 1. Scope and product gate

- The release has an approved, bounded feature set and supported-platform statement.
- Every included capability is marked implemented only with source and passing evidence.
- Unsupported behavior and compatibility limits are documented without hidden fallback claims.
- P0 acceptance criteria for the selected release are traceable to tests.
- No incomplete placeholder path is enabled in production.

### 2. Build and quality gate

- Pinned toolchains and reviewed lockfiles reproduce dependency resolution.
- Formatting, linting, strict type checking, Rust lints, unit, integration, resilience, regression, end-to-end, and required build checks pass.
- Download tests verify exact fixture bytes or trustworthy expected digests.
- Supported Windows clean-machine installation and operation are tested.
- Flaky, skipped, or unavailable release-critical tests block promotion.
- Performance claims use the controlled methodology in [`TEST_PLAN.md`](TEST_PLAN.md).

### 3. Security and privacy gate

- Release-blocking controls in [`SECURITY.md`](SECURITY.md) are implemented and verified.
- URL/redirect/DNS, filesystem, persistence, browser/IPC, parser, resource-limit, and secret-redaction suites pass.
- Threat models and permission inventories match packaged behavior.
- Dependency vulnerability results are reviewed and documented; unresolved exploitable findings block release.
- No telemetry or external AI data flow exists unless a later approved, consent-based design and disclosure are implemented.
- Private vulnerability handling and security-fix procedures are ready for the supported release.

### 4. Legal and dependency gate

- Source and distributed artifacts comply with Apache-2.0 obligations.
- Every direct and transitive dependency and bundled asset has a reviewed compatible license and required notices.
- No incompatibly licensed implementation has been copied or embedded.
- Third-party binaries, codecs, fonts, icons, and media fixtures have documented provenance and redistribution rights.
- Browser-store and website claims comply with applicable policies and do not promise access-control circumvention.

### 5. Artifact and reproducibility gate

- Artifacts are built from the reviewed release commit in a defined environment.
- The artifact inventory is explicit, and unexpected files, debug symbols, test credentials, private paths, or development registrations are absent.
- Checksums are generated after final packaging and verified from a separate clean download/copy.
- Reproducibility level and any nondeterministic inputs are measured and documented accurately.
- Software bill of materials and provenance formats are selected, generated, and validated if required by the release policy adopted later.

### 6. Signing and credential gate

- A reviewed ADR defines certificate ownership, hardware/service custody, authorized operators, timestamping, rotation, backup, revocation, and auditability.
- Signing runs only for trusted release commits after tests and artifact inspection.
- Untrusted pull-request code cannot access signing or store credentials.
- Signatures are verified on the exact artifacts that will be published.
- A documented revocation and compromised-key response exists.

No signing operation is permitted merely because a certificate becomes available.

### 7. Installer and lifecycle gate

- Install, per-user/per-machine choices, upgrade, repair, rollback expectations, and uninstall are specified and tested.
- Native host registration uses exact production extension IDs and is cleaned up safely.
- Existing databases, partial downloads, settings, and files survive supported upgrades or receive a safe migration path.
- Uninstall does not remove user downloads unexpectedly and clearly handles retained history/settings.
- The application never auto-executes downloaded files or silently weakens OS security prompts.

### 8. Browser publication gate

- Manifest permissions are minimal, implemented, and explained.
- Privacy disclosure and data-use declarations match observed behavior.
- Manual handoff, native-host absence, version mismatch, crash, permission denial, and fallback suites pass on each listed browser.
- Suggested or automatic capture is listed only if browser/store policy allows it and fallback prevents download loss.
- Store packages are derived from reviewed source with an inspectable content inventory.
- Firefox, Chrome, and Edge compatibility claims remain separate.

### 9. Documentation and support gate

- README, changelog, user-facing limitations, security policy, upgrade/migration notes, license notices, and release notes are current.
- Installation and removal instructions were verified on a clean supported system.
- Checksums and signature-verification instructions match the published artifact.
- Supported versions and vulnerability reporting information are updated without inventing response SLAs.
- Known limitations do not conceal an unresolved release-blocking security or integrity defect.

## Planned promotion flow

Once release infrastructure exists, a candidate will move through these conceptual stages:

1. Freeze a reviewed scope and release revision.
2. Run required checks in trusted, pinned environments.
3. Build candidate artifacts without signing credentials exposed to untrusted jobs.
4. Inspect contents and run clean-machine install, upgrade, browser, recovery, and uninstall suites.
5. Resolve or remove from scope all release-blocking findings.
6. Generate final artifacts from the approved revision.
7. Sign, timestamp, and independently verify signatures under the approved custody process.
8. Generate and verify checksums, notices, provenance, and release notes.
9. Publish through approved channels and verify downloaded artifacts again.
10. Update supported-version documentation and monitor the established private security route.

These are future requirements, not an active automation sequence.

## Release evidence

A release record should retain, without secrets:

- Source revision and version.
- Toolchain and dependency-lock identities.
- Required check names and results.
- Supported Windows/browser matrix.
- Artifact inventory, sizes, and checksums.
- Signature identities and independent verification results.
- Migration and clean-install results.
- Dependency/license/security review outcomes.
- Known non-security limitations and compatibility bounds.
- Approval trail appropriate to the project's governance at that time.

Evidence must not include credentials, private vulnerability details, personal data, or protected build-system information.

## Failure, withdrawal, and recovery

- A failed gate stops promotion; it is not waived by changing documentation to hide the behavior.
- A bad upload is withdrawn or superseded with a clear notice and corrected checksums; artifacts are never replaced silently under the same identity.
- A compromised signing key or malicious artifact triggers credential revocation, channel notification, investigation, and a new trusted build path.
- A migration defect requires a data-preserving recovery plan before another upgrade is promoted.
- Browser and desktop compatibility failures may require disabling publication or narrowing supported versions rather than unsafe protocol fallback.
- Security details follow coordinated disclosure through [`../SECURITY.md`](../SECURITY.md).

## Version and channel policy

No version scheme, stability channel, update protocol, or support window has been adopted. The changelog therefore contains only an Unreleased section. A later ADR must define version semantics, compatibility across desktop/native-host/extension/database protocols, update behavior, support duration, and deprecation policy before the first public version.

## Unresolved architectural decisions

- Installer and optional portable packaging technology.
- Version scheme, release channels, support window, and update mechanism.
- Reproducible Windows build environment, SBOM, and provenance formats.
- Code-signing certificate acquisition and key custody.
- Trusted release runner, approval separation, and artifact retention.
- Browser-store ownership, production extension identifiers, and staged rollout/rollback.
- Native-host/desktop/extension compatibility and upgrade ordering.

Each decision must be resolved before the corresponding gate can pass.
