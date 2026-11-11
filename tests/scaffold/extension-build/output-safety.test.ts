import { copyFile, lstat, mkdir, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, parse, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createTemporaryDirectory,
  listTreeEntries,
  pathExists,
  readRequiredJson,
  removeTemporaryDirectory,
  REPOSITORY_ROOT,
  repositoryPath,
} from '../support/artifacts';
import { assertExactJsonValue } from '../support/json';
import { runCommand } from '../support/process';

const BUILD_SCRIPT = repositoryPath('apps', 'browser-extension', 'scripts', 'build.mjs');
const EXPECTED_MANIFEST = {
  manifest_version: 3,
  name: 'Open Download Manager',
  version: '0.0.1',
} as const;
const ownedTemporaryDirectories = new Set<string>();

interface IsolatedPackage {
  readonly buildScript: string;
  readonly defaultOutput: string;
  readonly repositoryRoot: string;
  readonly temporaryRoot: string;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

async function createOwnedTemporaryDirectory(): Promise<string> {
  const directory = await createTemporaryDirectory('odm-extension-safety-');
  ownedTemporaryDirectories.add(directory);
  return directory;
}

async function removeOwnedTemporaryDirectory(directory: string): Promise<void> {
  await removeTemporaryDirectory(directory);
  ownedTemporaryDirectories.delete(directory);
}

async function runBuild(buildScript: string, cwd: string, outputDirectory?: string): Promise<void> {
  const argumentsList =
    outputDirectory === undefined ? [buildScript] : [buildScript, '--out-dir', outputDirectory];
  await runCommand(
    { arguments: argumentsList, executable: process.execPath },
    { cwd, label: 'Extension safety build', timeoutMs: 3_000 },
  );
}

async function createIsolatedPackage(): Promise<IsolatedPackage> {
  const temporaryRoot = await createOwnedTemporaryDirectory();
  const repositoryRoot = resolve(temporaryRoot, 'repository');
  const packageRoot = resolve(repositoryRoot, 'apps', 'browser-extension');
  const scriptsDirectory = resolve(packageRoot, 'scripts');
  const manifestsDirectory = resolve(packageRoot, 'manifests');
  await Promise.all([
    mkdir(scriptsDirectory, { recursive: true }),
    mkdir(manifestsDirectory, { recursive: true }),
  ]);
  await Promise.all([
    copyFile(BUILD_SCRIPT, resolve(scriptsDirectory, 'build.mjs')),
    copyFile(
      repositoryPath('apps', 'browser-extension', 'scripts', 'manifest-policy.mjs'),
      resolve(scriptsDirectory, 'manifest-policy.mjs'),
    ),
    copyFile(
      repositoryPath('apps', 'browser-extension', 'manifests', 'chromium.json'),
      resolve(manifestsDirectory, 'chromium.json'),
    ),
  ]);

  return {
    buildScript: resolve(scriptsDirectory, 'build.mjs'),
    defaultOutput: resolve(packageRoot, 'dist'),
    repositoryRoot,
    temporaryRoot,
  };
}

async function removeLinkIfPresent(linkPath: string): Promise<void> {
  try {
    if ((await lstat(linkPath)).isSymbolicLink()) {
      await unlink(linkPath);
    }
  } catch (error) {
    if (!hasErrorCode(error, 'ENOENT')) {
      throw error;
    }
  }
}

afterEach(async () => {
  const directories = [...ownedTemporaryDirectories];
  ownedTemporaryDirectories.clear();
  const results = await Promise.allSettled(
    directories.map((directory) => removeTemporaryDirectory(directory)),
  );

  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('An extension-safety temporary directory was not cleaned.');
  }
});

describe('extension build output safety', () => {
  it('creates an absent explicit destination beneath an existing path with spaces', async () => {
    const temporaryRoot = await createOwnedTemporaryDirectory();
    const parentDirectory = resolve(temporaryRoot, 'parent with spaces');
    const outputDirectory = resolve(parentDirectory, 'output with spaces');

    try {
      await mkdir(parentDirectory);
      await runBuild(BUILD_SCRIPT, REPOSITORY_ROOT, outputDirectory);

      expect(await listTreeEntries(outputDirectory, 'Explicit extension output')).toEqual([
        { kind: 'file', relativePath: 'manifest.json' },
      ]);
      assertExactJsonValue(
        await readRequiredJson(resolve(outputDirectory, 'manifest.json'), 'Built manifest'),
        EXPECTED_MANIFEST,
        'Built manifest',
      );
    } finally {
      await removeOwnedTemporaryDirectory(temporaryRoot);
    }
  });

  it('rejects and preserves an existing external directory', async () => {
    const temporaryRoot = await createOwnedTemporaryDirectory();
    const outputDirectory = resolve(temporaryRoot, 'existing-output');
    const sentinelPath = resolve(outputDirectory, 'sentinel.txt');
    const sentinel = 'external-directory-sentinel';

    try {
      await mkdir(outputDirectory);
      await writeFile(sentinelPath, sentinel, 'utf8');

      await expect(runBuild(BUILD_SCRIPT, REPOSITORY_ROOT, outputDirectory)).rejects.toMatchObject({
        exitCode: 1,
        kind: 'exit',
      });
      await expect(readFile(sentinelPath, 'utf8')).resolves.toBe(sentinel);
      expect(await listTreeEntries(outputDirectory, 'Existing external directory')).toEqual([
        { kind: 'file', relativePath: 'sentinel.txt' },
      ]);
    } finally {
      await removeOwnedTemporaryDirectory(temporaryRoot);
    }
  });

  it('rejects and preserves an existing external file', async () => {
    const temporaryRoot = await createOwnedTemporaryDirectory();
    const outputPath = resolve(temporaryRoot, 'existing-output.txt');
    const sentinel = 'external-file-sentinel';

    try {
      await writeFile(outputPath, sentinel, 'utf8');

      await expect(runBuild(BUILD_SCRIPT, REPOSITORY_ROOT, outputPath)).rejects.toMatchObject({
        exitCode: 1,
        kind: 'exit',
      });
      await expect(readFile(outputPath, 'utf8')).resolves.toBe(sentinel);
    } finally {
      await removeOwnedTemporaryDirectory(temporaryRoot);
    }
  });

  it('replaces stale output only at an isolated package-owned default directory', async () => {
    const fixture = await createIsolatedPackage();

    try {
      await mkdir(fixture.defaultOutput);
      await writeFile(resolve(fixture.defaultOutput, 'stale.txt'), 'stale-output', 'utf8');

      await runBuild(fixture.buildScript, fixture.repositoryRoot);

      expect(await listTreeEntries(fixture.defaultOutput, 'Default extension output')).toEqual([
        { kind: 'file', relativePath: 'manifest.json' },
      ]);
      assertExactJsonValue(
        await readRequiredJson(
          resolve(fixture.defaultOutput, 'manifest.json'),
          'Default built manifest',
        ),
        EXPECTED_MANIFEST,
        'Default built manifest',
      );
    } finally {
      await removeOwnedTemporaryDirectory(fixture.temporaryRoot);
    }
  });

  it('rejects a default symlink or junction and preserves its external sentinel', async () => {
    const fixture = await createIsolatedPackage();
    const externalTarget = await createOwnedTemporaryDirectory();
    const sentinelPath = resolve(externalTarget, 'sentinel.txt');
    const sentinel = 'external-link-target-sentinel';

    try {
      await writeFile(sentinelPath, sentinel, 'utf8');
      await symlink(
        externalTarget,
        fixture.defaultOutput,
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      expect((await lstat(fixture.defaultOutput)).isSymbolicLink()).toBe(true);

      await expect(runBuild(fixture.buildScript, fixture.repositoryRoot)).rejects.toMatchObject({
        exitCode: 1,
        kind: 'exit',
      });
      await expect(readFile(sentinelPath, 'utf8')).resolves.toBe(sentinel);
      expect((await lstat(fixture.defaultOutput)).isSymbolicLink()).toBe(true);
    } finally {
      await removeLinkIfPresent(fixture.defaultOutput);
      await Promise.all([
        removeOwnedTemporaryDirectory(fixture.temporaryRoot),
        removeOwnedTemporaryDirectory(externalTarget),
      ]);
    }
  });

  it('rejects an absent destination that overlaps repository source', async () => {
    const outputDirectory = repositoryPath(
      'apps',
      'browser-extension',
      'manifests',
      'synthetic-output',
    );
    const existedBefore = await pathExists(outputDirectory, 'Synthetic source output');
    expect(existedBefore).toBe(false);

    try {
      await expect(runBuild(BUILD_SCRIPT, REPOSITORY_ROOT, outputDirectory)).rejects.toMatchObject({
        exitCode: 1,
        kind: 'exit',
      });
      await expect(pathExists(outputDirectory, 'Synthetic source output')).resolves.toBe(false);
    } finally {
      if (!existedBefore && (await pathExists(outputDirectory, 'Synthetic source output'))) {
        await rm(outputDirectory, { force: true, recursive: true });
      }
    }
  });

  it('retains filesystem-root and repository-ancestor guards', async () => {
    const guardedPaths = [parse(REPOSITORY_ROOT).root, dirname(REPOSITORY_ROOT), REPOSITORY_ROOT];

    for (const guardedPath of guardedPaths) {
      await expect(runBuild(BUILD_SCRIPT, REPOSITORY_ROOT, guardedPath)).rejects.toMatchObject({
        exitCode: 1,
        kind: 'exit',
      });
    }
  });
});
