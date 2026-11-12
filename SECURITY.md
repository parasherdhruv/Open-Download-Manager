# Vulnerability Disclosure Policy

## Project status and supported versions

Open Download Manager is a buildable repository scaffold at a pre-alpha milestone. A static zero-feature desktop shell, inert extension manifest, and their least-privilege policy tests exist, but no download-manager service, installer, distributable product artifact, or released version exists. Consequently, there is no supported software version or deployed product security boundary.

Security defects in the specifications, repository governance, build scaffold, or zero-feature policy baseline can still be reported. This policy will be updated with supported-version information before any release support claim is made.

Repository security-response ownership is documented in [`GOVERNANCE.md`](GOVERNANCE.md). That ownership identifies who coordinates the existing private route; it does not create a support SLA or a released security boundary.

## Reporting a vulnerability

Do not publish vulnerability details, proof-of-concept material, credentials, sensitive URLs, or personal data in an issue, pull request, discussion, or other public channel.

Use the repository hosting service's **private vulnerability reporting** feature, verified enabled on 2026-11-12. This instruction points to a platform capability rather than an unpublished email address; the repository currently has no dedicated security mailbox.

If no private vulnerability-reporting feature is available, open a public issue titled **Private security report channel requested**. Include only a request for a private channel and no technical details or identifying information. A maintainer can then provide an available private route. Do not send details until that route is established.

Conduct concerns that do not involve a vulnerability follow [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## What to include privately

When a private route is available, provide only the information needed to understand and reproduce the concern:

- Affected document, component, version, commit, or release, if one exists.
- The security property that may be violated and the likely impact.
- Minimal reproduction steps or a carefully scoped proof of concept.
- Relevant environment details and preconditions.
- Suggested mitigation, if known.
- Whether any details have already been shared and with whom.

Remove credentials, authorization headers, cookies, signed URL parameters, tokens, unrelated user data, and downloaded private content. Use synthetic data whenever possible.

## Handling and disclosure

Maintainers will assess reports through the available private channel and coordinate remediation and disclosure appropriate to the project's maturity. This repository does not promise a response or remediation service-level agreement. Lack of an immediate response does not authorize public disclosure of secrets or third-party data.

Reporters should allow reasonable time for investigation and coordinate public disclosure when a product vulnerability exists. A future release process must publish security-relevant fixes without overstating the affected or supported versions.

## Research expectations

Good-faith research must stay within systems and data the researcher owns or is explicitly authorized to test. Do not:

- Access, modify, retain, or disclose another person's data.
- Use social engineering, phishing, physical intrusion, or credential attacks.
- Degrade third-party services or perform denial-of-service testing.
- Test unrelated infrastructure or browser-store systems.
- Circumvent DRM, paywalls, authentication, encrypted-media protections, or other access controls.
- Upload malicious binaries or cause downloaded content to execute.

The project cannot authorize testing against third-party systems. This policy does not waive applicable law or create permission on behalf of others.

## Engineering requirements

The security architecture, trust boundaries, threat model, and release-blocking product controls are documented in [`docs/SECURITY.md`](docs/SECURITY.md). Only the zero-feature Tauri capability/CSP and inert-extension permission baselines are implemented and policy-tested; no product security control or feature follows from them.
