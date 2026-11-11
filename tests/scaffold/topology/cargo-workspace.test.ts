import { dirname, relative, resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { parseCargoMetadata, type CargoMetadata } from '../support/cargo-metadata';
import {
  compareStrings,
  normalizePathSeparators,
  readRequiredUtf8,
  REPOSITORY_ROOT,
  repositoryPath,
} from '../support/artifacts';
import { assertExactJsonValue } from '../support/json';
import { platformExecutable, runCommand } from '../support/process';
import { parseSimpleToml, requireTomlSection, tomlSectionObject } from '../support/simple-toml';
import {
  assertAcyclic,
  assertEdgesWithinCeiling,
  assertExactMembers,
  assertNoInternalEdges,
  ARCHITECTURE_EDGE_CEILING,
  EXPECTED_CARGO_MEMBERS,
  LIBRARY_CONTRACTS,
  type DependencyEdge,
} from '../support/topology';

const EXPECTED_PATHS = new Map<string, string>([
  ...LIBRARY_CONTRACTS.map((contract) => [contract.name, contract.directory] as const),
  ['odm-desktop', 'apps/desktop/src-tauri'],
]);

let cargoMetadata: CargoMetadata | null = null;

function requireMetadata(): CargoMetadata {
  if (cargoMetadata === null) {
    throw new Error('Cargo metadata was not loaded.');
  }

  return cargoMetadata;
}

function packageDirectory(manifestPath: string): string {
  return normalizePathSeparators(relative(REPOSITORY_ROOT, dirname(manifestPath)));
}

function internalEdges(metadata: CargoMetadata): readonly DependencyEdge[] {
  const memberNames = new Set(metadata.packages.map((packageValue) => packageValue.name));
  const edges: DependencyEdge[] = [];

  for (const packageValue of metadata.packages) {
    for (const dependency of packageValue.dependencies) {
      if (memberNames.has(dependency.name)) {
        edges.push({ from: packageValue.name, to: dependency.name });
      }
    }
  }

  return edges;
}

beforeAll(async () => {
  const result = await runCommand(
    {
      arguments: ['metadata', '--locked', '--no-deps', '--format-version', '1'],
      executable: platformExecutable('cargo'),
    },
    { cwd: REPOSITORY_ROOT, label: 'Locked Cargo metadata', timeoutMs: 8_000 },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout) as unknown;
  } catch {
    throw new Error('Locked Cargo metadata did not return valid JSON.');
  }
  cargoMetadata = parseCargoMetadata(parsed);
});

describe('locked Cargo workspace metadata', () => {
  it('contains exactly the eleven expected non-publishable packages', () => {
    const metadata = requireMetadata();
    const names = metadata.packages.map((packageValue) => packageValue.name);
    assertExactMembers(names, EXPECTED_CARGO_MEMBERS);
    expect([...metadata.workspaceMembers].sort(compareStrings)).toEqual(
      metadata.packages.map((packageValue) => packageValue.id).sort(compareStrings),
    );
    expect(resolve(metadata.workspaceRoot)).toBe(REPOSITORY_ROOT);

    for (const packageValue of metadata.packages) {
      expect(packageValue.version).toBe('0.0.0');
      expect(packageValue.edition).toBe('2024');
      expect(packageValue.rustVersion).toBe('1.99.1');
      expect(packageValue.license).toBe('Apache-2.0');
      expect(packageValue.publish).toEqual([]);
      expect(packageDirectory(packageValue.manifestPath)).toBe(
        EXPECTED_PATHS.get(packageValue.name),
      );
    }
  });

  it('keeps all ten reusable packages library-only and dependency-free', () => {
    const packageByName = new Map(
      requireMetadata().packages.map((packageValue) => [packageValue.name, packageValue]),
    );

    for (const contract of LIBRARY_CONTRACTS) {
      const packageValue = packageByName.get(contract.name);
      expect(packageValue, `${contract.name} metadata`).toBeDefined();
      if (packageValue === undefined) {
        throw new Error('Expected Cargo library metadata is missing.');
      }

      expect(packageValue.dependencies).toEqual([]);
      expect(packageValue.targets).toHaveLength(1);
      const target = packageValue.targets[0];
      expect(target).toBeDefined();
      if (target === undefined) {
        throw new Error('Expected Cargo library target metadata is missing.');
      }
      expect(target.kind).toEqual(['lib']);
      expect(target.crateTypes).toEqual(['lib']);
      expect(target.name).toBe(contract.name.replaceAll('-', '_'));
      expect(normalizePathSeparators(relative(REPOSITORY_ROOT, target.sourcePath))).toBe(
        `${contract.directory}/src/lib.rs`,
      );
    }
  });

  it('allows only the desktop binary and build-script targets', () => {
    const desktop = requireMetadata().packages.find(
      (packageValue) => packageValue.name === 'odm-desktop',
    );
    expect(desktop).toBeDefined();
    if (desktop === undefined) {
      throw new Error('Desktop Cargo metadata is missing.');
    }

    expect(
      desktop.targets
        .map((target) => [...target.kind])
        .sort((left, right) => compareStrings(left.join(','), right.join(','))),
    ).toEqual([['bin'], ['custom-build']]);
    expect(
      desktop.dependencies
        .map((dependency) => ({
          kind: dependency.kind,
          name: dependency.name,
          path: dependency.path,
          req: dependency.req,
        }))
        .sort((left, right) => compareStrings(left.name, right.name)),
    ).toEqual([
      { kind: null, name: 'tauri', path: null, req: '=2.12.5' },
      { kind: 'build', name: 'tauri-build', path: null, req: '=2.7.4' },
    ]);
  });

  it('has no live internal workspace dependency edge, including from desktop', () => {
    const metadata = requireMetadata();
    const edges = internalEdges(metadata);
    const members = metadata.packages.map((packageValue) => packageValue.name);

    assertEdgesWithinCeiling(members, edges, ARCHITECTURE_EDGE_CEILING);
    assertAcyclic(members, edges);
    assertNoInternalEdges(edges);
  });
});

describe('root Cargo workspace policy', () => {
  it('pins exact membership, resolver, and inherited package policy', async () => {
    const rootCargo = parseSimpleToml(
      await readRequiredUtf8(repositoryPath('Cargo.toml'), 'Root Cargo manifest'),
    );
    expect([...rootCargo.keys()]).toEqual(['', 'workspace', 'workspace.package']);
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(rootCargo, '', 'Root Cargo manifest')),
      {},
      'Root Cargo document',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(rootCargo, 'workspace', 'Root Cargo manifest')),
      {
        resolver: '3',
        members: [
          'crates/shared-types',
          'crates/diagnostics',
          'crates/protocol-http',
          'crates/file-manager',
          'crates/storage',
          'crates/download-core',
          'crates/download-scheduler',
          'crates/ipc',
          'crates/native-messaging',
          'crates/media-detection',
          'apps/desktop/src-tauri',
        ],
      },
      'Root Cargo workspace',
    );
    assertExactJsonValue(
      tomlSectionObject(requireTomlSection(rootCargo, 'workspace.package', 'Root Cargo manifest')),
      {
        version: '0.0.0',
        edition: '2024',
        'rust-version': '1.99.1',
        license: 'Apache-2.0',
        publish: false,
      },
      'Root Cargo package policy',
    );
  });
});
