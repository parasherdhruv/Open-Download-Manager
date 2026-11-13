import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createTemporaryDirectory,
  listTreeEntries,
  readRequiredUtf8,
  removeTemporaryDirectory,
  REPOSITORY_ROOT,
  repositoryPath,
} from '../support/artifacts';
import { assertExactJsonValue } from '../support/json';
import { corepackInvocation, runCommand } from '../support/process';
import { parseSimpleToml, requireTomlSection, tomlSectionObject } from '../support/simple-toml';

const CHECKOUT_SHA = 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09';
const SETUP_NODE_SHA = '249970729cb0ef3589644e2896645e5dc5ba9c38';
const GITLEAKS_SHA256 = '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb';
const CARGO_DENY_SHA256 = '9f12ed4c49936e09b48bf862b595cde2fe64fcbd9d74dfacac6131ca824c8d5f';
const LICENSE_POLICY_SCRIPT = repositoryPath('scripts', 'check-js-licenses.mjs');

function normalizeNewlines(value: string): string {
  return value.replaceAll('\r\n', '\n');
}

function validateWorkflowPolicy(value: string): void {
  const workflow = normalizeNewlines(value);
  const usesLines = workflow.match(/^\s*uses:\s+.+$/gm) ?? [];
  const pinnedUsesLines =
    workflow.match(/^\s*uses:\s+[^@\s]+@[0-9a-f]{40}(?:\s+#\s+\S+)?\s*$/gm) ?? [];
  if (usesLines.length === 0 || pinnedUsesLines.length !== usesLines.length) {
    throw new Error('Every action must use a full lowercase commit SHA.');
  }

  if (!/^permissions:\n {2}contents: read\n/m.test(workflow)) {
    throw new Error('Workflow permissions must be read-only.');
  }
  if ((workflow.match(/^permissions:/gm) ?? []).length !== 1) {
    throw new Error('Workflow permissions must be declared exactly once at top level.');
  }

  const jobNames = workflow.match(/^ {4}name:\s+\S.+$/gm) ?? [];
  const timeouts = workflow.match(/^ {4}timeout-minutes:\s+[1-9]\d*$/gm) ?? [];
  const runners = workflow.match(/^ {4}runs-on:\s+(?:windows-2025|ubuntu-24\.04)$/gm) ?? [];
  if (jobNames.length === 0 || timeouts.length !== jobNames.length) {
    throw new Error('Every workflow job must have a finite timeout.');
  }
  if (runners.length !== jobNames.length || /runs-on:\s+\S+-latest/.test(workflow)) {
    throw new Error('Every workflow job must use an explicit reviewed runner label.');
  }

  const checkoutCount = (
    workflow.match(new RegExp(`uses: actions/checkout@${CHECKOUT_SHA}`, 'g')) ?? []
  ).length;
  const nonPersistentCheckoutCount = (workflow.match(/persist-credentials:\s+false/g) ?? []).length;
  if (checkoutCount === 0 || nonPersistentCheckoutCount !== checkoutCount) {
    throw new Error('Every checkout must disable persisted credentials.');
  }

  if (!/concurrency:\n[\s\S]*?cancel-in-progress:\s+true/.test(workflow)) {
    throw new Error('Workflow concurrency must cancel superseded runs.');
  }

  const forbiddenPatterns = [
    /pull_request_target:/,
    /workflow_run:/,
    /^\s+environment:/m,
    /\$\{\{\s*secrets\./,
    /^\s+[a-z-]+:\s+write\s*$/m,
    /continue-on-error:/,
    /actions\/cache@/,
    /actions\/upload-artifact@/,
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(workflow))) {
    throw new Error('Workflow contains a privileged or non-gating construct.');
  }
}

async function runLicensePolicyFixture(contents: string) {
  const temporaryRoot = await createTemporaryDirectory('odm-license-policy-');
  const inventoryPath = resolve(temporaryRoot, 'inventory.json');

  try {
    await writeFile(inventoryPath, contents, 'utf8');
    return await runCommand(
      {
        arguments: [LICENSE_POLICY_SCRIPT, '--inventory', inventoryPath],
        executable: process.execPath,
      },
      { cwd: REPOSITORY_ROOT, label: 'JavaScript license policy fixture', timeoutMs: 5_000 },
    );
  } finally {
    await removeTemporaryDirectory(temporaryRoot);
  }
}

describe('Phase 0 workflow policy', () => {
  it('inventories exactly the reviewed GitHub governance and workflow artifacts', async () => {
    const entries = await listTreeEntries(repositoryPath('.github'), 'GitHub configuration');
    expect(entries).toEqual([
      { kind: 'file', relativePath: 'CODEOWNERS' },
      { kind: 'file', relativePath: 'dependabot.yml' },
      { kind: 'file', relativePath: 'pull_request_template.md' },
      { kind: 'directory', relativePath: 'workflows' },
      { kind: 'file', relativePath: 'workflows/continuous-validation.yml' },
      { kind: 'file', relativePath: 'workflows/supply-chain.yml' },
    ]);
  });

  it('keeps every workflow unprivileged, bounded, and commit-pinned', async () => {
    const workflows = await Promise.all([
      readRequiredUtf8(
        repositoryPath('.github', 'workflows', 'continuous-validation.yml'),
        'Continuous-validation workflow',
      ),
      readRequiredUtf8(
        repositoryPath('.github', 'workflows', 'supply-chain.yml'),
        'Supply-chain workflow',
      ),
    ]);

    for (const workflow of workflows) {
      expect(() => validateWorkflowPolicy(workflow)).not.toThrow();
    }
  });

  it('runs the exact frozen Windows scaffold gate and cleans generated output', async () => {
    const workflow = normalizeNewlines(
      await readRequiredUtf8(
        repositoryPath('.github', 'workflows', 'continuous-validation.yml'),
        'Continuous-validation workflow',
      ),
    );

    expect(workflow).toContain(`actions/checkout@${CHECKOUT_SHA}`);
    expect(workflow).toContain(`actions/setup-node@${SETUP_NODE_SHA}`);
    expect(workflow).toContain('runs-on: windows-2025');
    expect(workflow).toContain('corepack pnpm install --frozen-lockfile');
    expect(workflow).toContain('corepack pnpm exec playwright install chromium');
    expect(workflow).toContain('corepack pnpm check');
    expect(workflow).toContain('git diff --exit-code -- Cargo.lock pnpm-lock.yaml blueprint.md');
    expect(workflow).toContain('Remove generated output and verify cleanliness');
    expect(workflow).not.toContain('tauri build --bundle');
  });

  it('pins and verifies every supply-chain tool before gating', async () => {
    const workflow = normalizeNewlines(
      await readRequiredUtf8(
        repositoryPath('.github', 'workflows', 'supply-chain.yml'),
        'Supply-chain workflow',
      ),
    );

    expect(workflow).toContain('GITLEAKS_VERSION: 8.30.1');
    expect(workflow).toContain(`GITLEAKS_SHA256: ${GITLEAKS_SHA256}`);
    expect(workflow).toContain("gitleaks git --redact --no-banner --verbose --log-opts='--all'");
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('CARGO_DENY_VERSION: 0.20.2');
    expect(workflow).toContain(`CARGO_DENY_SHA256: ${CARGO_DENY_SHA256}`);
    expect(workflow).toContain('cargo-deny --locked check advisories bans licenses sources');
    expect(workflow).toContain('corepack pnpm install --frozen-lockfile --ignore-scripts');
    expect(workflow).toContain('corepack pnpm audit:js');
    expect(workflow).toContain('corepack pnpm licenses:js');
    expect(workflow).toContain("cron: '17 4 * * 1'");
  });

  it.each([
    ['floating action', CHECKOUT_SHA, 'v5'],
    ['privileged trigger', '  pull_request:\n', '  pull_request_target:\n'],
    ['write permission', 'contents: read', 'contents: write'],
    ['missing timeout', '    timeout-minutes: 45\n', ''],
    ['persisted credentials', 'persist-credentials: false', 'persist-credentials: true'],
    ['floating runner', 'runs-on: windows-2025', 'runs-on: windows-latest'],
  ])('rejects a synthetic %s regression', async (_label, currentValue, unsafeValue) => {
    const workflow = normalizeNewlines(
      await readRequiredUtf8(
        repositoryPath('.github', 'workflows', 'continuous-validation.yml'),
        'Continuous-validation workflow fixture',
      ),
    );
    const candidate = workflow.replace(currentValue, unsafeValue);
    expect(candidate).not.toBe(workflow);
    expect(() => validateWorkflowPolicy(candidate)).toThrow();
  });
});

describe('Phase 0 ownership and dependency policy', () => {
  it('keeps CODEOWNERS coverage exact and names one hosted owner', async () => {
    const codeowners = normalizeNewlines(
      await readRequiredUtf8(repositoryPath('.github', 'CODEOWNERS'), 'CODEOWNERS file'),
    );
    expect(codeowners).toBe(`* @parasherdhruv

/.github/CODEOWNERS @parasherdhruv
/.github/dependabot.yml @parasherdhruv
/.github/workflows/ @parasherdhruv
/GOVERNANCE.md @parasherdhruv
/SECURITY.md @parasherdhruv
/docs/SECURITY.md @parasherdhruv
/docs/decisions/ @parasherdhruv
/Cargo.toml @parasherdhruv
/Cargo.lock @parasherdhruv
/package.json @parasherdhruv
/pnpm-workspace.yaml @parasherdhruv
/pnpm-lock.yaml @parasherdhruv
/rust-toolchain.toml @parasherdhruv
/deny.toml @parasherdhruv
`);
    expect(codeowners).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  });

  it('documents independent ADR approval and a blocked release role', async () => {
    const governance = await readRequiredUtf8(
      repositoryPath('GOVERNANCE.md'),
      'Repository governance',
    );
    for (const requiredValue of [
      'An independent code owner who did not author the ADR change',
      '`Windows scaffold gate`',
      '`Secret scan`',
      '`Rust dependency policy`',
      '`JavaScript dependency policy`',
      'private vulnerability-reporting feature',
      'local edit does not prove hosted enforcement',
    ]) {
      expect(governance).toContain(requiredValue);
    }
    expect(governance).toMatch(/\|\s+Release approver\s+\|\s+None appointed\s+\|/);
  });

  it('configures exactly weekly npm, Cargo, and GitHub Actions proposals', async () => {
    const dependabot = normalizeNewlines(
      await readRequiredUtf8(
        repositoryPath('.github', 'dependabot.yml'),
        'Dependabot configuration',
      ),
    );
    expect(dependabot).toBe(`version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '04:10'
      timezone: Etc/UTC
    open-pull-requests-limit: 5
    rebase-strategy: auto
    versioning-strategy: increase

  - package-ecosystem: cargo
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '04:20'
      timezone: Etc/UTC
    open-pull-requests-limit: 5
    rebase-strategy: auto
    versioning-strategy: increase

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '04:30'
      timezone: Etc/UTC
    open-pull-requests-limit: 5
    rebase-strategy: auto
`);
    expect(dependabot).not.toMatch(/auto-?merge/i);
  });

  it('keeps the Rust dependency policy default-deny and exception-free', async () => {
    const policyText = await readRequiredUtf8(repositoryPath('deny.toml'), 'cargo-deny policy');
    const policy = parseSimpleToml(policyText);
    expect([...policy.keys()]).toEqual(['', 'graph', 'advisories', 'bans', 'licenses', 'sources']);
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(policy, 'graph', 'cargo-deny policy')),
      { targets: ['x86_64-pc-windows-msvc'], 'all-features': true },
      'cargo-deny graph policy',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(policy, 'advisories', 'cargo-deny policy')),
      {
        'db-urls': ['https://github.com/RustSec/advisory-db'],
        yanked: 'deny',
        unmaintained: 'workspace',
        unsound: 'all',
        ignore: [],
        'maximum-db-staleness': 'P7D',
        'unused-ignored-advisory': 'deny',
      },
      'cargo-deny advisory policy',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(policy, 'bans', 'cargo-deny policy')),
      {
        'multiple-versions': 'warn',
        wildcards: 'deny',
        'allow-wildcard-paths': true,
        highlight: 'all',
      },
      'cargo-deny ban policy',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(policy, 'licenses', 'cargo-deny policy')),
      {
        'confidence-threshold': 0.93,
        'unused-allowed-license': 'warn',
        allow: ['Apache-2.0', 'BSD-3-Clause', 'MIT', 'MPL-2.0', 'Unicode-3.0', 'Zlib'],
        exceptions: [],
      },
      'cargo-deny license policy',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(policy, 'sources', 'cargo-deny policy')),
      {
        'unknown-registry': 'deny',
        'unknown-git': 'deny',
        'required-git-spec': 'rev',
        'allow-registry': ['https://github.com/rust-lang/crates.io-index'],
        'unused-allowed-source': 'deny',
      },
      'cargo-deny source policy',
    );
  });
});

describe('Phase 0 JavaScript license policy', () => {
  it('accepts a reviewed synthetic license inventory', async () => {
    const result = await runLicensePolicyFixture(
      JSON.stringify({ MIT: [{ license: 'MIT', name: 'fixture', versions: ['1.0.0'] }] }),
    );
    expect(result.stdout.trim()).toBe(
      'JavaScript license policy passed for 1 package records across 1 expressions.',
    );
    expect(result.stderr).toBe('');
  });

  it.each([
    [
      'unknown license',
      { 'GPL-3.0-only': [{ license: 'GPL-3.0-only', name: 'fixture', versions: ['1.0.0'] }] },
    ],
    ['empty inventory', {}],
    [
      'mismatched group',
      { MIT: [{ license: 'Apache-2.0', name: 'fixture', versions: ['1.0.0'] }] },
    ],
    ['missing version', { MIT: [{ license: 'MIT', name: 'fixture', versions: [] }] }],
  ])('rejects a synthetic %s', async (_label, inventory) => {
    await expect(runLicensePolicyFixture(JSON.stringify(inventory))).rejects.toMatchObject({
      exitCode: 1,
      kind: 'exit',
    });
  });

  it('rejects invalid inventory JSON', async () => {
    await expect(runLicensePolicyFixture('{')).rejects.toMatchObject({
      exitCode: 1,
      kind: 'exit',
    });
  });

  it('passes the current installed graph without exposing dependency paths', async () => {
    const invocation = await corepackInvocation(['pnpm', 'licenses:js']);
    const result = await runCommand(invocation, {
      cwd: REPOSITORY_ROOT,
      label: 'Live JavaScript license policy',
      timeoutMs: 15_000,
    });
    expect(result.stdout).toMatch(
      /JavaScript license policy passed for \d+ package records across \d+ expressions\./,
    );
    expect(result.stdout).not.toContain(REPOSITORY_ROOT);
    expect(result.stderr).not.toContain(REPOSITORY_ROOT);
  });
});
