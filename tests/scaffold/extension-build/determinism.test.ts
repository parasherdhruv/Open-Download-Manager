import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createTemporaryDirectory,
  listTreeEntries,
  pathExists,
  readRequiredBytes,
  readRequiredJson,
  removeTemporaryDirectory,
  REPOSITORY_ROOT,
  repositoryPath,
  type TreeEntry,
} from '../support/artifacts';
import { assertExactJsonValue } from '../support/json';
import { runCommand } from '../support/process';

interface SnapshotEntry {
  readonly bytes: readonly number[] | null;
  readonly kind: TreeEntry['kind'];
  readonly relativePath: string;
}

interface TreeSnapshot {
  readonly entries: readonly SnapshotEntry[];
  readonly exists: boolean;
}

const EXPECTED_MANIFEST = {
  manifest_version: 3,
  name: 'Open Download Manager',
  version: '0.0.1',
} as const;
const ownedTemporaryDirectories = new Set<string>();

async function createOwnedTemporaryDirectory(): Promise<string> {
  const directory = await createTemporaryDirectory('odm-extension-build-');
  ownedTemporaryDirectories.add(directory);
  return directory;
}

async function removeOwnedTemporaryDirectory(directory: string): Promise<void> {
  await removeTemporaryDirectory(directory);
  ownedTemporaryDirectories.delete(directory);
}

async function snapshotTree(absolutePath: string, label: string): Promise<TreeSnapshot> {
  if (!(await pathExists(absolutePath, label))) {
    return { entries: [], exists: false };
  }

  const entries = await listTreeEntries(absolutePath, label);
  const snapshots = await Promise.all(
    entries.map(async (entry): Promise<SnapshotEntry> => ({
      bytes:
        entry.kind === 'file'
          ? Array.from(
              await readRequiredBytes(
                resolve(absolutePath, entry.relativePath),
                `${label} file ${entry.relativePath}`,
              ),
            )
          : null,
      kind: entry.kind,
      relativePath: entry.relativePath,
    })),
  );

  return { entries: snapshots, exists: true };
}

afterEach(async () => {
  const directories = [...ownedTemporaryDirectories];
  ownedTemporaryDirectories.clear();
  const results = await Promise.allSettled(
    directories.map((directory) => removeTemporaryDirectory(directory)),
  );

  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('An extension-build temporary directory was not cleaned.');
  }
});

describe('deterministic extension build', () => {
  it('produces one byte-identical manifest in two independent clean directories', async () => {
    const firstParent = await createOwnedTemporaryDirectory();
    const secondParent = await createOwnedTemporaryDirectory();
    const firstOutput = resolve(firstParent, 'output');
    const secondOutput = resolve(secondParent, 'output');
    const repositoryOutput = repositoryPath('apps', 'browser-extension', 'dist');
    const repositoryOutputBefore = await snapshotTree(
      repositoryOutput,
      'Repository extension output',
    );

    try {
      await expect(pathExists(firstOutput, 'First extension output')).resolves.toBe(false);
      await expect(pathExists(secondOutput, 'Second extension output')).resolves.toBe(false);

      const buildScript = repositoryPath('apps', 'browser-extension', 'scripts', 'build.mjs');
      await runCommand(
        {
          arguments: [buildScript, '--out-dir', firstOutput],
          executable: process.execPath,
        },
        { cwd: REPOSITORY_ROOT, label: 'First extension build', timeoutMs: 3_000 },
      );
      await runCommand(
        {
          arguments: [buildScript, '--out-dir', secondOutput],
          executable: process.execPath,
        },
        { cwd: REPOSITORY_ROOT, label: 'Second extension build', timeoutMs: 3_000 },
      );

      const [firstSnapshot, secondSnapshot] = await Promise.all([
        snapshotTree(firstOutput, 'First extension output'),
        snapshotTree(secondOutput, 'Second extension output'),
      ]);
      expect(firstSnapshot.exists).toBe(true);
      expect(
        firstSnapshot.entries.map((entry) => ({
          kind: entry.kind,
          relativePath: entry.relativePath,
        })),
      ).toEqual([{ kind: 'file', relativePath: 'manifest.json' }]);
      const firstManifestEntry = firstSnapshot.entries[0];
      expect(firstManifestEntry).toBeDefined();
      if (firstManifestEntry === undefined || firstManifestEntry.bytes === null) {
        throw new Error('The first extension manifest bytes are missing.');
      }
      expect(firstManifestEntry.bytes.length).toBeGreaterThan(0);
      expect(secondSnapshot).toEqual(firstSnapshot);

      const [firstManifest, secondManifest] = await Promise.all([
        readRequiredJson(resolve(firstOutput, 'manifest.json'), 'First built manifest'),
        readRequiredJson(resolve(secondOutput, 'manifest.json'), 'Second built manifest'),
      ]);
      assertExactJsonValue(firstManifest, EXPECTED_MANIFEST, 'First built manifest');
      assertExactJsonValue(secondManifest, EXPECTED_MANIFEST, 'Second built manifest');

      const repositoryOutputAfter = await snapshotTree(
        repositoryOutput,
        'Repository extension output',
      );
      expect(repositoryOutputAfter).toEqual(repositoryOutputBefore);
    } finally {
      await Promise.all([
        removeOwnedTemporaryDirectory(firstParent),
        removeOwnedTemporaryDirectory(secondParent),
      ]);
    }
  });
});
