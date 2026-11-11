export const EXPECTED_MANIFEST = Object.freeze({
  manifest_version: 3,
  name: 'Open Download Manager',
  version: '0.0.1',
});

const EXPECTED_KEYS = Object.freeze(Object.keys(EXPECTED_MANIFEST));
const FORBIDDEN_TOP_LEVEL_KEYS = Object.freeze([
  'permissions',
  'optional_permissions',
  'host_permissions',
  'optional_host_permissions',
  'background',
  'content_scripts',
  'action',
  'externally_connectable',
  'web_accessible_resources',
]);
const PERMISSION_KEYS = Object.freeze(['permissions', 'optional_permissions']);
const FORBIDDEN_PERMISSION_VALUES = Object.freeze(['nativeMessaging', 'downloads']);

/**
 * Apply Chromium's one-to-four integer version rules without reflecting input.
 *
 * @param {unknown} version
 * @throws {Error} When the version is not valid for a Chromium extension.
 */
function validateChromiumVersion(version) {
  if (typeof version !== 'string') {
    throw new Error('Manifest version does not satisfy Chromium version requirements.');
  }

  const components = version.split('.');
  if (components.length < 1 || components.length > 4) {
    throw new Error('Manifest version does not satisfy Chromium version requirements.');
  }

  let hasNonzeroComponent = false;
  for (const component of components) {
    if (!/^(?:0|[1-9][0-9]*)$/.test(component)) {
      throw new Error('Manifest version does not satisfy Chromium version requirements.');
    }

    const numericComponent = Number(component);
    if (numericComponent > 65_535) {
      throw new Error('Manifest version does not satisfy Chromium version requirements.');
    }
    hasNonzeroComponent ||= numericComponent !== 0;
  }

  if (!hasNonzeroComponent) {
    throw new Error('Manifest version does not satisfy Chromium version requirements.');
  }
}

// Keep the exact policy constant subject to the same browser rule as candidate manifests.
validateChromiumVersion(EXPECTED_MANIFEST.version);

/**
 * Validate the Wave 1 inert extension manifest.
 *
 * @param {unknown} candidate
 * @throws {Error} When the candidate differs from the exact Wave 1 manifest.
 */
export function validateManifest(candidate) {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Manifest must be a JSON object.');
  }

  const manifest = /** @type {Record<string, unknown>} */ (candidate);

  for (const permissionKey of PERMISSION_KEYS) {
    const permissionList = manifest[permissionKey];
    if (!Array.isArray(permissionList)) {
      continue;
    }

    for (const forbiddenPermission of FORBIDDEN_PERMISSION_VALUES) {
      if (permissionList.includes(forbiddenPermission)) {
        throw new Error(`Manifest permission "${forbiddenPermission}" is forbidden.`);
      }
    }
  }

  for (const forbiddenKey of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (Object.hasOwn(manifest, forbiddenKey)) {
      throw new Error(`Manifest key "${forbiddenKey}" is forbidden.`);
    }
  }

  for (const expectedKey of EXPECTED_KEYS) {
    if (!Object.hasOwn(manifest, expectedKey)) {
      throw new Error(`Manifest key "${expectedKey}" is required.`);
    }
  }

  validateChromiumVersion(manifest['version']);

  const actualKeys = Object.keys(manifest);
  if (actualKeys.length !== EXPECTED_KEYS.length) {
    throw new Error(
      `Manifest must contain exactly ${EXPECTED_KEYS.length} top-level keys; found ${actualKeys.length}.`,
    );
  }

  for (const [expectedKey, expectedValue] of Object.entries(EXPECTED_MANIFEST)) {
    if (manifest[expectedKey] !== expectedValue) {
      const expectedDescription =
        typeof expectedValue === 'string' ? `"${expectedValue}"` : String(expectedValue);
      throw new Error(`Manifest key "${expectedKey}" must equal ${expectedDescription}.`);
    }
  }
}
