import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createTemporaryDirectory,
  pathExists,
  readRequiredBytes,
  readRequiredJson,
  readRequiredUtf8,
  removeTemporaryDirectory,
  REPOSITORY_ROOT,
  repositoryPath,
} from '../support/artifacts';
import { assertExactJsonValue, requireJsonRecord, requireOwnValue } from '../support/json';
import { corepackInvocation, platformExecutable, runCommand } from '../support/process';
import { parseSimpleToml, requireTomlSection, tomlSectionObject } from '../support/simple-toml';

const ROOT_PACKAGE = {
  name: 'open-download-manager',
  version: '0.0.0',
  private: true,
  description: 'Wave 1 workspace command orchestrator for Open Download Manager',
  license: 'Apache-2.0',
  type: 'module',
  packageManager: 'pnpm@12.18.0',
  engines: {
    node: '=24.16.0',
    pnpm: '=12.18.0',
  },
  scripts: {
    'format:check': 'prettier --check . && markdownlint-cli2',
    lint: 'eslint --max-warnings 0 .',
    typecheck:
      'tsc --project tsconfig.base.json --pretty false && corepack pnpm --filter @odm/desktop --fail-if-no-match run typecheck && corepack pnpm --filter @odm/browser-extension --fail-if-no-match run typecheck',
    'test:unit': 'vitest run --config apps/desktop/vitest.config.ts',
    'test:policy':
      'vitest run --config vitest.config.ts apps/browser-extension/tests && vitest run --config vitest.config.ts tests/scaffold/policy',
    'test:topology': 'vitest run --config vitest.config.ts tests/scaffold/topology',
    'test:extension-build': 'vitest run --config vitest.config.ts tests/scaffold/extension-build',
    'test:e2e': 'playwright test --config apps/desktop/playwright.config.ts',
    test: 'corepack pnpm test:unit && corepack pnpm test:policy && corepack pnpm test:topology && corepack pnpm test:extension-build',
    build:
      'corepack pnpm --filter @odm/desktop --fail-if-no-match run build && corepack pnpm --filter @odm/browser-extension --fail-if-no-match run build',
    'rust:fmt': 'cargo fmt --all -- --check',
    'rust:clippy': 'cargo clippy --locked --workspace --all-targets --all-features -- -D warnings',
    'rust:test': 'cargo test --locked --workspace --all-targets --all-features',
    'rust:build': 'cargo build --locked --workspace --all-targets --all-features',
    'tauri:build': 'corepack pnpm --filter @odm/desktop exec tauri build --no-bundle -- --locked',
    'audit:js': 'corepack pnpm audit --audit-level high',
    'licenses:js': 'node scripts/check-js-licenses.mjs --pnpm',
    'audit:rust': 'cargo deny --locked check advisories bans licenses sources',
    check:
      'corepack pnpm format:check && corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm test:e2e && corepack pnpm build && corepack pnpm rust:fmt && corepack pnpm rust:clippy && corepack pnpm rust:test && corepack pnpm rust:build && corepack pnpm tauri:build',
  },
  devDependencies: {
    '@eslint/js': '9.39.5',
    '@playwright/test': '1.65.0',
    '@tailwindcss/vite': '4.3.5',
    '@tauri-apps/cli': '2.12.4',
    '@testing-library/dom': '10.4.2',
    '@testing-library/jest-dom': '7.0.1',
    '@testing-library/react': '16.3.3',
    '@types/node': '24.19.2',
    '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0',
    '@vitejs/plugin-react': '6.3.0',
    eslint: '9.39.5',
    'eslint-plugin-react': '7.37.5',
    'eslint-plugin-react-hooks': '7.1.1',
    'eslint-plugin-react-refresh': '0.5.7',
    globals: '17.14.0',
    jsdom: '31.0.0',
    'markdownlint-cli2': '0.24.0',
    prettier: '3.9.10',
    'prettier-plugin-toml': '4.1.0',
    react: '19.3.1',
    'react-dom': '19.3.1',
    tailwindcss: '4.3.5',
    typescript: '6.0.3',
    'typescript-eslint': '8.72.2',
    vite: '8.3.7',
    vitest: '5.1.0',
  },
} as const;

const DESKTOP_PACKAGE = {
  name: '@odm/desktop',
  version: '0.0.0',
  private: true,
  description: 'Zero-feature desktop shell for Open Download Manager',
  license: 'Apache-2.0',
  type: 'module',
  scripts: {
    dev: 'vite --host 127.0.0.1 --port 1420 --strictPort',
    build: 'tsc --project tsconfig.json --pretty false && vite build',
    typecheck: 'tsc --project tsconfig.json --pretty false',
    'test:unit': 'vitest run --config vitest.config.ts',
    'test:e2e': 'playwright test --config playwright.config.ts',
  },
  dependencies: {
    react: '19.3.1',
    'react-dom': '19.3.1',
  },
  devDependencies: {
    '@playwright/test': '1.65.0',
    '@tailwindcss/vite': '4.3.5',
    '@tauri-apps/cli': '2.12.4',
    '@testing-library/dom': '10.4.2',
    '@testing-library/jest-dom': '7.0.1',
    '@testing-library/react': '16.3.3',
    '@types/node': '24.19.2',
    '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0',
    '@vitejs/plugin-react': '6.3.0',
    jsdom: '31.0.0',
    tailwindcss: '4.3.5',
    typescript: '6.0.3',
    vite: '8.3.7',
    vitest: '5.1.0',
  },
} as const;

const EXTENSION_PACKAGE = {
  name: '@odm/browser-extension',
  version: '0.0.0',
  private: true,
  license: 'Apache-2.0',
  type: 'module',
  scripts: {
    build: 'node scripts/build.mjs',
    typecheck:
      'tsc --noEmit --allowJs --checkJs --strict --exactOptionalPropertyTypes --noImplicitReturns --noUncheckedIndexedAccess --noPropertyAccessFromIndexSignature --noUnusedLocals --noUnusedParameters --module NodeNext --moduleResolution NodeNext --target ES2024 --types node scripts/build.mjs scripts/manifest-policy.mjs tests/manifest-policy.test.ts',
  },
} as const;

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PNPM_LOCK_CHECK_ARGUMENTS = [
  'pnpm',
  'install',
  '--lockfile-only',
  '--frozen-lockfile',
  '--offline',
  '--ignore-scripts',
] as const;

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function runPnpmLockCheck(cwd: string, label: string): Promise<void> {
  const invocation = await corepackInvocation(PNPM_LOCK_CHECK_ARGUMENTS);
  await runCommand(invocation, { cwd, label, timeoutMs: 15_000 });
}

function assertDependencyPins(packageValue: unknown, sectionNames: readonly string[]): void {
  const packageRecord = requireJsonRecord(packageValue, 'Package manifest');

  for (const sectionName of sectionNames) {
    const section = requireJsonRecord(packageRecord[sectionName], `Package ${sectionName}`);
    for (const version of Object.values(section)) {
      expect(typeof version).toBe('string');
      if (typeof version !== 'string') {
        throw new Error('A direct dependency pin is not a string.');
      }
      expect(EXACT_VERSION.test(version)).toBe(true);
    }
  }
}

describe('active Wave 1 toolchains', () => {
  it('uses Node 24.16.0', async () => {
    const result = await runCommand(
      { arguments: ['--version'], executable: process.execPath },
      { cwd: REPOSITORY_ROOT, label: 'Node version check', timeoutMs: 5_000 },
    );

    expect(result.stdout.trim()).toBe('v24.16.0');
  });

  it('uses Corepack pnpm 12.18.0', async () => {
    const invocation = await corepackInvocation(['pnpm', '--version']);
    const result = await runCommand(invocation, {
      cwd: REPOSITORY_ROOT,
      label: 'pnpm version check',
      timeoutMs: 8_000,
    });

    expect(result.stdout.trim()).toBe('12.18.0');
  });

  it('uses rustc 1.99.1', async () => {
    const result = await runCommand(
      { arguments: ['--version'], executable: platformExecutable('rustc') },
      { cwd: REPOSITORY_ROOT, label: 'Rust version check', timeoutMs: 5_000 },
    );

    expect(result.stdout.trim()).toMatch(/^rustc 1\.99\.1(?:\s|$)/);
  });
});

describe('Wave 1 workspace configuration', () => {
  it('pins the Node, pnpm, and Rust toolchain metadata exactly', async () => {
    const [nvmrc, rustToolchainText] = await Promise.all([
      readRequiredUtf8(repositoryPath('.nvmrc'), 'Node version file'),
      readRequiredUtf8(repositoryPath('rust-toolchain.toml'), 'Rust toolchain file'),
    ]);
    expect(nvmrc.replaceAll('\r\n', '\n')).toBe('24.16.0\n');

    const rustToolchain = parseSimpleToml(rustToolchainText);
    expect([...rustToolchain.keys()]).toEqual(['', 'toolchain']);
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(rustToolchain, '', 'Rust toolchain file')),
      {},
      'Rust toolchain root',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(rustToolchain, 'toolchain', 'Rust toolchain file')),
      {
        channel: '1.99.1',
        profile: 'minimal',
        components: ['rustfmt', 'clippy'],
        targets: ['x86_64-pc-windows-msvc'],
      },
      'Rust toolchain policy',
    );
  });

  it('defines exactly two child pnpm applications', async () => {
    const workspaceText = await readRequiredUtf8(
      repositoryPath('pnpm-workspace.yaml'),
      'pnpm workspace file',
    );
    expect(workspaceText.replaceAll('\r\n', '\n')).toBe(`packages:
  - apps/desktop
  - apps/browser-extension
engineStrict: true
failIfNoMatch: true
minimumReleaseAge: 10080
minimumReleaseAgeExcludePrune: true
minimumReleaseAgeIgnoreMissingTime: false
minimumReleaseAgeStrict: true
minimumReleaseAgeExclude:
  - '@eslint-community/regexpp@4.12.3'
  - '@playwright/test@1.65.0'
  - '@rolldown/binding-android-arm-eabi@1.2.18'
  - '@rolldown/binding-android-arm64@1.2.18'
  - '@rolldown/binding-darwin-arm64@1.2.18'
  - '@rolldown/binding-darwin-x64@1.2.18'
  - '@rolldown/binding-freebsd-x64@1.2.18'
  - '@rolldown/binding-linux-arm-gnueabihf@1.2.18'
  - '@rolldown/binding-linux-arm64-gnu@1.2.18'
  - '@rolldown/binding-linux-arm64-musl@1.2.18'
  - '@rolldown/binding-linux-ppc64-gnu@1.2.18'
  - '@rolldown/binding-linux-s390x-gnu@1.2.18'
  - '@rolldown/binding-linux-x64-gnu@1.2.18'
  - '@rolldown/binding-linux-x64-musl@1.2.18'
  - '@rolldown/binding-openharmony-arm64@1.2.18'
  - '@rolldown/binding-win32-arm64-msvc@1.2.18'
  - '@rolldown/binding-win32-x64-msvc@1.2.18'
  - '@rolldown/pluginutils@1.1.0'
  - '@tailwindcss/node@4.3.5'
  - '@tailwindcss/oxide-android-arm64@4.3.5'
  - '@tailwindcss/oxide-darwin-arm64@4.3.5'
  - '@tailwindcss/oxide-darwin-x64@4.3.5'
  - '@tailwindcss/oxide-freebsd-x64@4.3.5'
  - '@tailwindcss/oxide-linux-arm-gnueabihf@4.3.5'
  - '@tailwindcss/oxide-linux-arm64-gnu@4.3.5'
  - '@tailwindcss/oxide-linux-arm64-musl@4.3.5'
  - '@tailwindcss/oxide-linux-x64-gnu@4.3.5'
  - '@tailwindcss/oxide-linux-x64-musl@4.3.5'
  - '@tailwindcss/oxide-wasm32-wasi@4.3.5'
  - '@tailwindcss/oxide-win32-arm64-msvc@4.3.5'
  - '@tailwindcss/oxide-win32-x64-msvc@4.3.5'
  - '@tailwindcss/oxide@4.3.5'
  - '@tailwindcss/vite@4.3.5'
  - '@typescript-eslint/eslint-plugin@8.72.2'
  - '@typescript-eslint/parser@8.72.2'
  - '@typescript-eslint/project-service@8.72.2'
  - '@typescript-eslint/scope-manager@8.72.2'
  - '@typescript-eslint/tsconfig-utils@8.72.2'
  - '@typescript-eslint/type-utils@8.72.2'
  - '@typescript-eslint/types@8.72.2'
  - '@typescript-eslint/typescript-estree@8.72.2'
  - '@typescript-eslint/utils@8.72.2'
  - '@typescript-eslint/visitor-keys@8.72.2'
  - '@vitejs/plugin-react@6.3.0'
  - ansi-regex@6.6.0
  - caniuse-lite@1.0.30001823
  - electron-to-chromium@1.5.478
  - jsdom@31.0.0
  - parse5-parser-stream@8.1.1
  - parse5@8.1.1
  - playwright-core@1.65.0
  - playwright@1.65.0
  - rolldown@1.2.18
  - tailwindcss@4.3.5
  - tough-cookie@6.1.0
  - typescript-eslint@8.72.2
  - undici@8.12.4
  - vite@8.3.7
overrides:
  re2js: 2.8.7
saveExact: true
strictPeerDependencies: true
`);
  });

  it('keeps the root private and pins every root dependency exactly', async () => {
    const manifest = await readRequiredJson(
      repositoryPath('package.json'),
      'Root package manifest',
    );
    assertExactJsonValue(manifest, ROOT_PACKAGE, 'Root package manifest');
    assertDependencyPins(manifest, ['devDependencies']);
  });

  it('keeps the desktop app private with exact dependency pins', async () => {
    const manifest = await readRequiredJson(
      repositoryPath('apps', 'desktop', 'package.json'),
      'Desktop package manifest',
    );
    assertExactJsonValue(manifest, DESKTOP_PACKAGE, 'Desktop package manifest');
    assertDependencyPins(manifest, ['dependencies', 'devDependencies']);
  });

  it('keeps the extension app private and dependency-free', async () => {
    const manifest = await readRequiredJson(
      repositoryPath('apps', 'browser-extension', 'package.json'),
      'Extension package manifest',
    );
    assertExactJsonValue(manifest, EXTENSION_PACKAGE, 'Extension package manifest');
  });

  it('requires both committed lockfiles', async () => {
    const [cargoLock, pnpmLock] = await Promise.all([
      readRequiredUtf8(repositoryPath('Cargo.lock'), 'Cargo lockfile'),
      readRequiredUtf8(repositoryPath('pnpm-lock.yaml'), 'pnpm lockfile'),
    ]);

    expect(cargoLock).toMatch(/^# This file is automatically @generated by Cargo\./);
    expect(pnpmLock.replaceAll('\r\n', '\n')).toMatch(/^---\nlockfileVersion: '9\.0'\n/);
  });

  it('validates every pnpm importer against the frozen lock offline without byte drift', async () => {
    const lockPath = repositoryPath('pnpm-lock.yaml');
    const before = await readRequiredBytes(lockPath, 'pnpm lockfile before consistency check');

    await runPnpmLockCheck(REPOSITORY_ROOT, 'Offline frozen pnpm lock consistency check');

    const after = await readRequiredBytes(lockPath, 'pnpm lockfile after consistency check');
    expect(sha256(after)).toBe(sha256(before));
    expect(after).toEqual(before);
  });

  it('rejects synthetic manifest drift without installing or regenerating', async () => {
    const temporaryRoot = await createTemporaryDirectory('odm-pnpm-lock-drift-');
    const desktopDirectory = resolve(temporaryRoot, 'apps', 'desktop');
    const extensionDirectory = resolve(temporaryRoot, 'apps', 'browser-extension');

    try {
      await Promise.all([
        mkdir(desktopDirectory, { recursive: true }),
        mkdir(extensionDirectory, { recursive: true }),
      ]);
      const [rootManifest, desktopManifest, extensionManifest, workspace, npmrc, lockfile] =
        await Promise.all([
          readRequiredUtf8(repositoryPath('package.json'), 'Root package manifest fixture'),
          readRequiredUtf8(
            repositoryPath('apps', 'desktop', 'package.json'),
            'Desktop package manifest fixture',
          ),
          readRequiredUtf8(
            repositoryPath('apps', 'browser-extension', 'package.json'),
            'Extension package manifest fixture',
          ),
          readRequiredUtf8(repositoryPath('pnpm-workspace.yaml'), 'pnpm workspace fixture'),
          readRequiredUtf8(repositoryPath('.npmrc'), 'pnpm configuration fixture'),
          readRequiredBytes(repositoryPath('pnpm-lock.yaml'), 'pnpm lockfile fixture'),
        ]);
      await Promise.all([
        writeFile(resolve(temporaryRoot, 'package.json'), rootManifest, 'utf8'),
        writeFile(resolve(desktopDirectory, 'package.json'), desktopManifest, 'utf8'),
        writeFile(resolve(extensionDirectory, 'package.json'), extensionManifest, 'utf8'),
        writeFile(resolve(temporaryRoot, 'pnpm-workspace.yaml'), workspace, 'utf8'),
        writeFile(resolve(temporaryRoot, '.npmrc'), npmrc, 'utf8'),
        writeFile(resolve(temporaryRoot, 'pnpm-lock.yaml'), lockfile),
      ]);

      await runPnpmLockCheck(temporaryRoot, 'Synthetic pnpm lock consistency check');
      await expect(
        pathExists(resolve(temporaryRoot, 'node_modules'), 'Synthetic node_modules'),
      ).resolves.toBe(false);
      const stableLock = await readRequiredBytes(
        resolve(temporaryRoot, 'pnpm-lock.yaml'),
        'Synthetic stable pnpm lockfile',
      );
      expect(sha256(stableLock)).toBe(sha256(lockfile));

      const driftedManifest = requireJsonRecord(
        JSON.parse(rootManifest) as unknown,
        'Synthetic root package manifest',
      );
      const devDependencies = requireJsonRecord(
        requireOwnValue(driftedManifest, 'devDependencies', 'Synthetic root package manifest'),
        'Synthetic root devDependencies',
      );
      devDependencies['vitest'] = '5.1.1';
      await writeFile(
        resolve(temporaryRoot, 'package.json'),
        `${JSON.stringify(driftedManifest, null, 2)}\n`,
        'utf8',
      );

      await expect(
        runPnpmLockCheck(temporaryRoot, 'Synthetic drifted pnpm lock consistency check'),
      ).rejects.toMatchObject({ exitCode: 1, kind: 'exit' });
      await expect(
        pathExists(resolve(temporaryRoot, 'node_modules'), 'Synthetic node_modules'),
      ).resolves.toBe(false);
      const unchangedLock = await readRequiredBytes(
        resolve(temporaryRoot, 'pnpm-lock.yaml'),
        'Synthetic unchanged pnpm lockfile',
      );
      expect(sha256(unchangedLock)).toBe(sha256(lockfile));
      expect(unchangedLock).toEqual(lockfile);
    } finally {
      await removeTemporaryDirectory(temporaryRoot);
    }
  });
});
