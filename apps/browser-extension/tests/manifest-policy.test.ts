import { describe, expect, it } from 'vitest';

import { validateManifest } from '../scripts/manifest-policy.mjs';

const EXACT_MANIFEST = {
  manifest_version: 3,
  name: 'Open Download Manager',
  version: '0.0.1',
} as const;

describe('Wave 1 extension manifest policy', () => {
  it('accepts only the exact inert Manifest V3 object', () => {
    expect(Object.keys(EXACT_MANIFEST)).toEqual(['manifest_version', 'name', 'version']);
    expect(() => validateManifest(EXACT_MANIFEST)).not.toThrow();
  });

  const forbiddenSurfaceCases = [
    {
      label: 'an empty permissions key',
      manifest: { ...EXACT_MANIFEST, permissions: [] },
      expectedMessage: 'Manifest key "permissions" is forbidden.',
    },
    {
      label: 'optional_permissions',
      manifest: { ...EXACT_MANIFEST, optional_permissions: ['tabs'] },
      expectedMessage: 'Manifest key "optional_permissions" is forbidden.',
    },
    {
      label: 'host_permissions',
      manifest: { ...EXACT_MANIFEST, host_permissions: ['https://example.invalid/*'] },
      expectedMessage: 'Manifest key "host_permissions" is forbidden.',
    },
    {
      label: 'optional_host_permissions',
      manifest: { ...EXACT_MANIFEST, optional_host_permissions: ['https://example.invalid/*'] },
      expectedMessage: 'Manifest key "optional_host_permissions" is forbidden.',
    },
    {
      label: 'background',
      manifest: { ...EXACT_MANIFEST, background: { service_worker: 'background.js' } },
      expectedMessage: 'Manifest key "background" is forbidden.',
    },
    {
      label: 'content_scripts',
      manifest: { ...EXACT_MANIFEST, content_scripts: [] },
      expectedMessage: 'Manifest key "content_scripts" is forbidden.',
    },
    {
      label: 'action',
      manifest: { ...EXACT_MANIFEST, action: {} },
      expectedMessage: 'Manifest key "action" is forbidden.',
    },
    {
      label: 'externally_connectable',
      manifest: { ...EXACT_MANIFEST, externally_connectable: {} },
      expectedMessage: 'Manifest key "externally_connectable" is forbidden.',
    },
    {
      label: 'web_accessible_resources',
      manifest: { ...EXACT_MANIFEST, web_accessible_resources: [] },
      expectedMessage: 'Manifest key "web_accessible_resources" is forbidden.',
    },
  ] as const;

  it.each(forbiddenSurfaceCases)('rejects $label', ({ manifest, expectedMessage }) => {
    expect(() => validateManifest(manifest)).toThrow(expectedMessage);
  });

  it.each([
    {
      label: 'nativeMessaging permission',
      permission: 'nativeMessaging',
    },
    {
      label: 'downloads permission',
      permission: 'downloads',
    },
  ] as const)('rejects the $label', ({ permission }) => {
    expect(() => validateManifest({ ...EXACT_MANIFEST, permissions: [permission] })).toThrow(
      `Manifest permission "${permission}" is forbidden.`,
    );
  });

  it('rejects a missing required key', () => {
    const manifestWithoutVersion = {
      manifest_version: EXACT_MANIFEST.manifest_version,
      name: EXACT_MANIFEST.name,
    };

    expect(() => validateManifest(manifestWithoutVersion)).toThrow(
      'Manifest key "version" is required.',
    );
  });

  it('rejects an extra key without reflecting its value', () => {
    expect(() =>
      validateManifest({ ...EXACT_MANIFEST, description: 'synthetic-sensitive-value' }),
    ).toThrow('Manifest must contain exactly 3 top-level keys; found 4.');
  });

  it("rejects Chromium's invalid all-zero version without reflecting it", () => {
    const invalidVersion = '0.0.0';
    const validation = (): void => validateManifest({ ...EXACT_MANIFEST, version: invalidVersion });

    expect(validation).toThrow('Manifest version does not satisfy Chromium version requirements.');
    expect(validation).not.toThrow(expect.stringContaining(invalidVersion));
  });

  it.each([
    {
      label: 'manifest_version',
      manifest: { ...EXACT_MANIFEST, manifest_version: 2 },
      expectedMessage: 'Manifest key "manifest_version" must equal 3.',
    },
    {
      label: 'name',
      manifest: { ...EXACT_MANIFEST, name: 'Other Name' },
      expectedMessage: 'Manifest key "name" must equal "Open Download Manager".',
    },
    {
      label: 'version',
      manifest: { ...EXACT_MANIFEST, version: '1.0.0' },
      expectedMessage: 'Manifest key "version" must equal "0.0.1".',
    },
  ] as const)('rejects a wrong $label value', ({ manifest, expectedMessage }) => {
    expect(() => validateManifest(manifest)).toThrow(expectedMessage);
  });
});
