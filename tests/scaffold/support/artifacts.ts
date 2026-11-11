import type { Dirent } from 'node:fs';
import { lstat, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

export interface TreeEntry {
  readonly kind: 'directory' | 'file';
  readonly relativePath: string;
}

export function compareStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function normalizePathSeparators(value: string): string {
  return value.replaceAll('\\', '/');
}

export function repositoryPath(...segments: readonly string[]): string {
  return resolve(REPOSITORY_ROOT, ...segments);
}

export function toRepositoryRelativePath(absolutePath: string): string {
  const candidate = normalizePathSeparators(relative(REPOSITORY_ROOT, absolutePath));

  if (candidate === '..' || candidate.startsWith('../')) {
    throw new Error('The inspected path is outside the repository.');
  }

  return candidate;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export async function readRequiredBytes(
  absolutePath: string,
  artifactLabel: string,
): Promise<Uint8Array> {
  try {
    return await readFile(absolutePath);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      throw new Error(`${artifactLabel} is missing.`);
    }

    throw new Error(`${artifactLabel} could not be read.`);
  }
}

export async function readRequiredUtf8(
  absolutePath: string,
  artifactLabel: string,
): Promise<string> {
  const bytes = await readRequiredBytes(absolutePath, artifactLabel);

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${artifactLabel} is not valid UTF-8.`);
  }
}

export async function readRequiredJson(
  absolutePath: string,
  artifactLabel: string,
): Promise<unknown> {
  const text = await readRequiredUtf8(absolutePath, artifactLabel);

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${artifactLabel} is not valid JSON.`);
  }
}

async function assertDirectory(absolutePath: string, artifactLabel: string): Promise<void> {
  try {
    const status = await lstat(absolutePath);

    if (status.isSymbolicLink() || !status.isDirectory()) {
      throw new Error(`${artifactLabel} is not a regular directory.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(artifactLabel)) {
      throw error;
    }
    if (hasErrorCode(error, 'ENOENT')) {
      throw new Error(`${artifactLabel} is missing.`);
    }

    throw new Error(`${artifactLabel} could not be inspected.`);
  }
}

async function walkTree(
  absolutePath: string,
  relativePrefix: string,
  artifactLabel: string,
  entries: TreeEntry[],
): Promise<void> {
  let directoryEntries: Dirent<string>[];

  try {
    directoryEntries = await readdir(absolutePath, { withFileTypes: true });
  } catch {
    throw new Error(`${artifactLabel} could not be enumerated.`);
  }

  directoryEntries.sort((left, right) => compareStrings(left.name, right.name));

  for (const directoryEntry of directoryEntries) {
    const relativePath = relativePrefix
      ? `${relativePrefix}/${directoryEntry.name}`
      : directoryEntry.name;

    if (directoryEntry.isSymbolicLink()) {
      throw new Error(`${artifactLabel} contains a symbolic link.`);
    }
    if (directoryEntry.isDirectory()) {
      entries.push({ kind: 'directory', relativePath });
      await walkTree(
        resolve(absolutePath, directoryEntry.name),
        relativePath,
        artifactLabel,
        entries,
      );
      continue;
    }
    if (directoryEntry.isFile()) {
      entries.push({ kind: 'file', relativePath });
      continue;
    }

    throw new Error(`${artifactLabel} contains an unsupported filesystem entry.`);
  }
}

export async function listTreeEntries(
  absolutePath: string,
  artifactLabel: string,
): Promise<readonly TreeEntry[]> {
  await assertDirectory(absolutePath, artifactLabel);
  const entries: TreeEntry[] = [];
  await walkTree(absolutePath, '', artifactLabel, entries);
  return entries;
}

export async function listTreeEntriesIfPresent(
  absolutePath: string,
  artifactLabel: string,
): Promise<readonly TreeEntry[]> {
  try {
    await lstat(absolutePath);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return [];
    }

    throw new Error(`${artifactLabel} could not be inspected.`);
  }

  return listTreeEntries(absolutePath, artifactLabel);
}

export async function createTemporaryDirectory(prefix: string): Promise<string> {
  try {
    return await mkdtemp(resolve(tmpdir(), prefix));
  } catch {
    throw new Error('A test-owned temporary directory could not be created.');
  }
}

export async function removeTemporaryDirectory(absolutePath: string): Promise<void> {
  try {
    await rm(absolutePath, { force: true, recursive: true });
  } catch {
    throw new Error('A test-owned temporary directory could not be removed.');
  }
}

export async function pathExists(absolutePath: string, artifactLabel: string): Promise<boolean> {
  try {
    await lstat(absolutePath);
    return true;
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return false;
    }

    throw new Error(`${artifactLabel} could not be inspected.`);
  }
}
