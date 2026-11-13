import { describe, expect, it } from 'vitest';

import { parseCargoMetadata } from '../support/cargo-metadata';
import { parseSimpleToml, requireTomlSection, tomlSectionObject } from '../support/simple-toml';
import {
  assertAcyclic,
  assertApiFreeLibrarySource,
  assertEdgesWithinCeiling,
  assertExactMembers,
  assertNoInternalEdges,
  ARCHITECTURE_EDGE_CEILING,
  EXPECTED_CARGO_MEMBERS,
  LIBRARY_CONTRACTS,
} from '../support/topology';

describe('synthetic topology regressions', () => {
  it('rejects a missing workspace member', () => {
    expect(() =>
      assertExactMembers(EXPECTED_CARGO_MEMBERS.slice(1), EXPECTED_CARGO_MEMBERS),
    ).toThrow('Workspace membership differs from the Wave 1 contract.');
  });

  it('rejects an extra workspace member', () => {
    expect(() =>
      assertExactMembers([...EXPECTED_CARGO_MEMBERS, 'unexpected-member'], EXPECTED_CARGO_MEMBERS),
    ).toThrow('Workspace membership differs from the Wave 1 contract.');
  });

  it('rejects an edge above the architecture ceiling', () => {
    expect(() =>
      assertEdgesWithinCeiling(
        EXPECTED_CARGO_MEMBERS,
        [{ from: 'shared-types', to: 'download-scheduler' }],
        ARCHITECTURE_EDGE_CEILING,
      ),
    ).toThrow('An internal dependency edge exceeds the architecture ceiling.');
  });

  it('rejects a cyclic graph independently of architecture policy', () => {
    expect(() =>
      assertAcyclic(
        ['alpha', 'beta', 'gamma'],
        [
          { from: 'alpha', to: 'beta' },
          { from: 'beta', to: 'gamma' },
          { from: 'gamma', to: 'alpha' },
        ],
      ),
    ).toThrow('The workspace dependency graph contains a cycle.');
  });

  it('keeps the later architecture ceiling separate from the live edge-free contract', () => {
    const architecturallyAllowedEdge = [{ from: 'diagnostics', to: 'shared-types' }] as const;

    expect(() =>
      assertEdgesWithinCeiling(
        EXPECTED_CARGO_MEMBERS,
        architecturallyAllowedEdge,
        ARCHITECTURE_EDGE_CEILING,
      ),
    ).not.toThrow();
    expect(() => assertNoInternalEdges(architecturallyAllowedEdge)).toThrow(
      'Wave 1 must not contain an internal workspace dependency edge.',
    );
  });

  it('rejects a public item in an otherwise documented library root', () => {
    const contract = LIBRARY_CONTRACTS[0];
    const source = [
      `//! ${contract.responsibility}`,
      '//!',
      `//! ${contract.nonResponsibility}`,
      '//!',
      '//! No behavior or public API is implemented in Wave 1.',
      '',
      '#![forbid(unsafe_code)]',
      '#![deny(missing_docs)]',
      '',
      'pub struct Exported;',
      '',
    ].join('\n');

    expect(() => assertApiFreeLibrarySource(source, contract)).toThrow(
      'A crate source contains a substantive non-documentation line.',
    );
  });

  it('parses formatter-emitted TOML literal strings without splitting their contents', () => {
    const document = parseSimpleToml(
      "[section]\nvalue = 'value#not-a-comment'\nitems = ['first,entry', '[second]']\n",
    );

    expect(tomlSectionObject(requireTomlSection(document, 'section', 'Synthetic TOML'))).toEqual({
      value: 'value#not-a-comment',
      items: ['first,entry', '[second]'],
    });
  });

  it('parses finite decimal values used by repository policy', () => {
    const document = parseSimpleToml('[policy]\nconfidence = 0.93\n');

    expect(tomlSectionObject(requireTomlSection(document, 'policy', 'Synthetic policy'))).toEqual({
      confidence: 0.93,
    });
  });

  it('parses formatter-emitted TOML inline dependency tables', () => {
    const document = parseSimpleToml(
      "[dependencies]\ntauri = { version = '=2.12.5', features = [] }\n",
    );

    expect(
      tomlSectionObject(requireTomlSection(document, 'dependencies', 'Synthetic TOML')),
    ).toEqual({
      tauri: { version: '=2.12.5', features: [] },
    });
  });

  it('normalizes an omitted Cargo registry dependency path to null', () => {
    const metadata = parseCargoMetadata({
      packages: [
        {
          dependencies: [
            {
              kind: null,
              name: 'tauri',
              req: '=2.12.5',
            },
          ],
          edition: '2024',
          id: 'path+file:///synthetic#odm-desktop@0.0.0',
          license: 'Apache-2.0',
          manifest_path: 'C:/synthetic/Cargo.toml',
          name: 'odm-desktop',
          publish: [],
          rust_version: '1.99.1',
          targets: [],
          version: '0.0.0',
        },
      ],
      workspace_members: ['path+file:///synthetic#odm-desktop@0.0.0'],
      workspace_root: 'C:/synthetic',
    });

    expect(metadata.packages[0]?.dependencies).toEqual([
      {
        kind: null,
        name: 'tauri',
        path: null,
        req: '=2.12.5',
      },
    ]);
  });
});
