import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createTemporaryDirectory,
  listTreeEntriesIfPresent,
  readRequiredUtf8,
  removeTemporaryDirectory,
  REPOSITORY_ROOT,
} from '../support/artifacts';
import { runCommand } from '../support/process';

const ownedTemporaryDirectories = new Set<string>();

async function createOwnedTemporaryDirectory(): Promise<string> {
  const directory = await createTemporaryDirectory('odm-scaffold-resilience-');
  ownedTemporaryDirectories.add(directory);
  return directory;
}

async function removeOwnedTemporaryDirectory(directory: string): Promise<void> {
  await removeTemporaryDirectory(directory);
  ownedTemporaryDirectories.delete(directory);
}

afterEach(async () => {
  const directories = [...ownedTemporaryDirectories];
  ownedTemporaryDirectories.clear();
  const results = await Promise.allSettled(
    directories.map((directory) => removeTemporaryDirectory(directory)),
  );

  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('A resilience-test temporary directory was not cleaned.');
  }
});

describe('scaffold helper resilience', () => {
  it('sanitizes a command failure without reflecting process output', async () => {
    const execution = runCommand(
      {
        arguments: ['-e', 'process.stderr.write("synthetic-sensitive-detail"); process.exit(7);'],
        executable: process.execPath,
      },
      { cwd: REPOSITORY_ROOT, label: 'Synthetic command', timeoutMs: 2_000 },
    );

    await expect(execution).rejects.toEqual(
      expect.objectContaining({
        exitCode: 7,
        kind: 'exit',
        message: 'Synthetic command failed with exit code 7.',
      }),
    );
    await expect(execution).rejects.not.toHaveProperty(
      'message',
      expect.stringContaining('synthetic-sensitive-detail'),
    );
  });

  it('terminates a command after a finite timeout with a useful error', async () => {
    const execution = runCommand(
      {
        arguments: ['-e', 'setInterval(() => undefined, 1_000);'],
        executable: process.execPath,
      },
      { cwd: REPOSITORY_ROOT, label: 'Synthetic timeout command', timeoutMs: 100 },
    );

    await expect(execution).rejects.toEqual(
      expect.objectContaining({
        exitCode: null,
        kind: 'timeout',
        message: 'Synthetic timeout command timed out after 100 ms.',
      }),
    );
  });

  it('handles an absent optional tree and rejects a required artifact deterministically', async () => {
    const directory = await createOwnedTemporaryDirectory();
    const missingPath = resolve(directory, 'absent.txt');

    try {
      await expect(
        listTreeEntriesIfPresent(missingPath, 'Optional synthetic tree'),
      ).resolves.toEqual([]);
      await expect(readRequiredUtf8(missingPath, 'Required synthetic artifact')).rejects.toThrow(
        'Required synthetic artifact is missing.',
      );
    } finally {
      await removeOwnedTemporaryDirectory(directory);
    }
  });
});
