# Contributor and Agent Operating Rules

## Repository state

Open Download Manager (ODM) is at the **buildable repository scaffold / pre-alpha** milestone. Wave 1 repository infrastructure is committed locally at `4b2aca0`, is published as the hosted `main` branch, and was locally verified on a supported Windows 11 environment on 2026-11-10: workspace manifests and locks, ten API-free Rust libraries, a zero-feature React/Tauri shell, an inert Manifest V3 package, scaffold tests, and the root command gates exist and pass. The current Roadmap Phase 0 change adds repository governance and continuous-validation definitions and is locally policy-tested. Hosted `main` and upstream tracking were restored and private vulnerability reporting was enabled on 2026-11-12; independent review, Phase 0 merge, branch enforcement, and hosted workflow results are not yet evidenced. Product functionality remains absent: there is no download engine behavior, persistence, scheduling, filesystem product I/O, browser capture, native messaging, local IPC, media handling, AI, telemetry, updater, tray behavior, installer, release artifact, or publishing. [ADR 0001](docs/decisions/0001-repository-scaffold.md), [ADR 0002](docs/decisions/0002-buildable-workspace-scaffold.md), and [ADR 0003](docs/decisions/0003-continuous-validation-and-governance.md) remain **Proposed**; local or hosted implementation evidence is not approval or acceptance.

Use these terms precisely:

- **Scaffolded** means a documented location, ownership boundary, or future responsibility exists. It does not mean code, configuration, or behavior exists.
- **Implemented** means the behavior is present in source, its required failure and security paths are handled, relevant automated tests pass, and the documentation matches verified behavior.

Never describe a scaffolded capability as implemented, supported, working, tested, or released.

## Authority and conflicts

1. Approved repository documentation describes current behavior, current scope, and operating policy.
2. [`blueprint.md`](blueprint.md) is the preserved source vision and long-range input. Aspirational text in it is not a statement of current behavior.
3. Approved architecture decision records (ADRs) in [`docs/decisions/`](docs/decisions/) capture decisions and their rationale.

For this policy, approved means reviewed and merged into the repository's default branch. A governing legal or conduct document controls its own subject. For technical conflicts, a later approved ADR controls the specific decision, current-scope documentation controls over aspirational blueprint text, and affected general documentation must be reconciled in the same change. Do not silently choose one conflicting instruction or edit `blueprint.md` to remove the conflict.

Explicit user authorization may permit an implementation and its required ADR to be drafted in the same change. That ADR must remain **Proposed** while the change is unmerged, may govern only the exact user-authorized scope during drafting, and cannot override an existing approved document or ADR. Reconcile every affected document in that same change. The ADR becomes **Accepted** only when the complete change is reviewed and merged into the default branch. User authorization to draft or implement is not approval, acceptance, or evidence that a merge occurred.

## Required reading before implementation

Before writing or changing implementation code, read:

1. [`docs/PRD.md`](docs/PRD.md).
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
3. [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).
4. [`docs/SECURITY.md`](docs/SECURITY.md) and [`SECURITY.md`](SECURITY.md).
5. The applicable component specification, approved ADRs, and any Proposed same-change ADR explicitly authorized for the task.
6. [`blueprint.md`](blueprint.md) when interpreting product intent not resolved by current documentation.

Changes to engine behavior also require [`docs/ENGINE_SPEC.md`](docs/ENGINE_SPEC.md), storage changes require [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md), browser changes require [`docs/BROWSER_INTEGRATION.md`](docs/BROWSER_INTEGRATION.md), and media changes require [`docs/MEDIA_SUPPORT.md`](docs/MEDIA_SUPPORT.md).

## Fifteen operational rules

These rules are mandatory and preserve the blueprint's operational requirements:

1. Read the PRD before implementation.
2. Read architecture documentation before modifying core components.
3. Implement one scoped feature at a time.
4. Never rewrite unrelated modules.
5. Never invent API behavior.
6. Follow strict TypeScript.
7. Use Rust error handling rather than `unwrap` in production paths.
8. Write tests alongside new functionality.
9. Run tests before reporting completion.
10. Document architecture decisions.
11. Avoid placeholder implementations presented as finished functionality.
12. Never expose secrets in logs.
13. Do not silently change public interfaces.
14. Update documentation when behavior changes.
15. Keep the application buildable after every milestone.

Rule 15 is mechanically enforceable for the Wave 1 repository infrastructure through the implemented, locally verified root command gate. It does not make any product capability implemented; later milestones must keep the workspace buildable while adding their own behavior, failure-path, security, and test evidence.

## Scope and architecture discipline

- Work only within the requested milestone and do not add speculative public APIs.
- Preserve the acyclic dependency direction in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Application composition roots may wire crates together; reusable crates must not depend on applications.
- Put networking, file writes, scheduling, persistence, and authoritative state in Rust backend components, never in the React frontend.
- Do not grant a browser extension unrestricted filesystem access or expose the engine through an unrestricted local HTTP listener.
- Record a durable cross-component or hard-to-reverse decision in an approved ADR or an explicitly authorized Proposed same-change ADR before implementation. List genuinely open choices under an "Unresolved architectural decisions" section rather than using placeholder markers.
- Do not change a public interface without explicit review, migration impact analysis, tests, and synchronized documentation.
- Do not copy or embed incompatibly licensed implementation code. Review dependency licenses before adopting major dependencies.

## Security requirements

- Treat URLs, redirects, DNS results, response headers, filenames, browser messages, IPC messages, database contents, and downloaded bytes as untrusted.
- Do not bypass TLS validation, DRM, paywalls, authentication, encrypted-media protections, or access controls.
- Never log credentials, cookies, authorization headers, secret material, or sensitive URL query values.
- Minimize permissions and network exposure. Validate schemes, destinations, redirects, message origins, sizes, and filesystem paths at their trust boundaries.
- Never automatically execute a downloaded file.
- Keep telemetry absent unless a later, reviewed decision introduces informed consent. Keep the first release local-first and account-free.
- Follow the private reporting route in [`SECURITY.md`](SECURITY.md) for suspected vulnerabilities; do not place exploit details in public issues.

Security requirements are release-blocking. A successful happy-path test does not waive a missing security control.

## Test and completion requirements

- Follow [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md). Add unit, integration, resilience, and regression coverage appropriate to each behavior change.
- Use controlled local fixtures for network behavior. Every download integration test must compare final bytes or a trustworthy digest with the expected source.
- Test failure paths, cleanup, cancellation, restart/recovery, resource limits, and security boundaries, not only successful paths.
- Run all relevant checks before reporting completion. If a check cannot run, report the exact reason and do not imply it passed.
- A feature is complete only when requirements are implemented, relevant automated tests pass, failure conditions and security concerns are handled, documentation is current, the workspace remains buildable, and no relevant regression is known.

Documentation-only changes must at minimum verify changed-file scope, relative links, required status language, text hygiene, and that `blueprint.md` is unchanged.

## Required task report

Every completed task report must state:

- Files changed.
- Features implemented.
- Tests added.
- Commands executed.
- Test results.
- Known limitations.
- Remaining tasks.

Use "none" where accurate. Distinguish validation checks from automated product tests, and never convert planned work into a completion claim.
