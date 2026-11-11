import { describe, expect, it } from 'vitest';

import {
  listTreeEntries,
  readRequiredUtf8,
  repositoryPath,
  type TreeEntry,
} from '../support/artifacts';
import { assertExactJsonValue } from '../support/json';
import { parseSimpleToml, requireTomlSection, tomlSectionObject } from '../support/simple-toml';
import { assertApiFreeLibrarySource, LIBRARY_CONTRACTS } from '../support/topology';

const DEFERRED_WORK_PATTERN = new RegExp(
  `\\b(?:${'TO' + 'DO'}|${'FIX' + 'ME'}|${'T' + 'BD'}|${'place' + 'holder'})\\b`,
  'i',
);

function entryDescriptions(entries: readonly TreeEntry[]): readonly string[] {
  return entries.map((entry) => `${entry.relativePath}:${entry.kind}`);
}

describe('Wave 1 API-free Rust crates', () => {
  it('contains exactly the ten documented crate directories', async () => {
    const entries = await listTreeEntries(repositoryPath('crates'), 'Rust crates directory');
    const topLevelEntries = entries.filter((entry) => !entry.relativePath.includes('/'));

    expect([...entryDescriptions(topLevelEntries)].sort()).toEqual(
      LIBRARY_CONTRACTS.map((contract) => `${contract.name}:directory`).sort(),
    );
  });

  it.each(LIBRARY_CONTRACTS)(
    '$name has exact files, inherited package policy, and documentation-only source',
    async (contract) => {
      const crateRoot = repositoryPath(...contract.directory.split('/'));
      const entries = await listTreeEntries(crateRoot, `${contract.name} crate`);
      expect(entryDescriptions(entries)).toEqual([
        'Cargo.toml:file',
        'src:directory',
        'src/lib.rs:file',
      ]);

      const [manifestText, librarySource] = await Promise.all([
        readRequiredUtf8(
          repositoryPath(...contract.directory.split('/'), 'Cargo.toml'),
          `${contract.name} manifest`,
        ),
        readRequiredUtf8(
          repositoryPath(...contract.directory.split('/'), 'src', 'lib.rs'),
          `${contract.name} library root`,
        ),
      ]);
      expect(DEFERRED_WORK_PATTERN.test(manifestText)).toBe(false);

      const manifest = parseSimpleToml(manifestText);
      expect([...manifest.keys()]).toEqual(['', 'package']);
      assertExactJsonValue(
        tomlSectionObject(requireTomlSection(manifest, '', `${contract.name} manifest`)),
        {},
        `${contract.name} manifest root`,
      );
      assertExactJsonValue(
        tomlSectionObject(requireTomlSection(manifest, 'package', `${contract.name} manifest`)),
        {
          name: contract.name,
          'version.workspace': true,
          'edition.workspace': true,
          'rust-version.workspace': true,
          'license.workspace': true,
          'publish.workspace': true,
        },
        `${contract.name} package policy`,
      );
      expect(() => assertApiFreeLibrarySource(librarySource, contract)).not.toThrow();
    },
  );
});
