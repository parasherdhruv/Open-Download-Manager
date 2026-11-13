import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { delimiter, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const MAX_INVENTORY_BYTES = 32 * 1024 * 1024;
const PNPM_TIMEOUT_MS = 60_000;
const execFileAsync = promisify(execFile);
const ALLOWED_LICENSES = new Set([
  'Apache-2.0',
  'Apache-2.0 OR MIT',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC-BY-4.0',
  'ISC',
  'MIT',
  'MPL-2.0',
  'PSF-2.0',
  'Python-2.0',
]);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function isRegularFile(absolutePath) {
  try {
    return (await stat(absolutePath)).isFile();
  } catch {
    return false;
  }
}

async function corepackInvocation() {
  const argumentsList = ['pnpm', 'licenses', 'list', '--json', '--long'];
  if (process.platform !== 'win32') {
    return { arguments: argumentsList, executable: 'corepack' };
  }

  const pathValue = process.env['PATH'] ?? process.env['Path'] ?? '';
  const searchDirectories = new Set([dirname(process.execPath), ...pathValue.split(delimiter)]);
  for (const directory of searchDirectories) {
    if (!directory) {
      continue;
    }
    const entryPoint = resolve(directory, 'node_modules', 'corepack', 'dist', 'corepack.js');
    if (await isRegularFile(entryPoint)) {
      return {
        arguments: [entryPoint, ...argumentsList],
        executable: process.execPath,
      };
    }
  }

  throw new Error('Corepack could not be started.');
}

async function readPnpmInventory() {
  const invocation = await corepackInvocation();
  try {
    const result = await execFileAsync(invocation.executable, invocation.arguments, {
      encoding: 'utf8',
      maxBuffer: MAX_INVENTORY_BYTES,
      timeout: PNPM_TIMEOUT_MS,
      windowsHide: true,
    });
    return Buffer.from(result.stdout, 'utf8');
  } catch {
    throw new Error('The pnpm license inventory command failed.');
  }
}

export function validateLicenseInventory(inventory) {
  if (!isRecord(inventory)) {
    throw new Error('The license inventory must be a JSON object.');
  }

  const expressions = Object.keys(inventory).sort();
  if (expressions.length === 0) {
    throw new Error('The license inventory is empty.');
  }

  const disallowed = expressions.filter((expression) => !ALLOWED_LICENSES.has(expression));
  if (disallowed.length > 0) {
    throw new Error(`Disallowed license expressions: ${disallowed.join(', ')}.`);
  }

  let packageCount = 0;
  for (const expression of expressions) {
    const packages = inventory[expression];
    if (!Array.isArray(packages) || packages.length === 0) {
      throw new Error('A license expression has no package records.');
    }

    for (const packageValue of packages) {
      if (!isRecord(packageValue)) {
        throw new Error('A package license record is malformed.');
      }
      if (typeof packageValue.name !== 'string' || packageValue.name.length === 0) {
        throw new Error('A package license record has no valid name.');
      }
      if (
        !Array.isArray(packageValue.versions) ||
        packageValue.versions.length === 0 ||
        packageValue.versions.some((version) => typeof version !== 'string' || version.length === 0)
      ) {
        throw new Error('A package license record has no valid version.');
      }
      if (packageValue.license !== expression) {
        throw new Error('A package license record does not match its expression group.');
      }
      packageCount += 1;
    }
  }

  return { expressionCount: expressions.length, packageCount };
}

async function readInventory(argumentsList) {
  let bytes;
  if (argumentsList.length === 1 && argumentsList[0] === '--pnpm') {
    bytes = await readPnpmInventory();
  } else if (argumentsList.length === 2 && argumentsList[0] === '--inventory') {
    try {
      bytes = await readFile(argumentsList[1]);
    } catch {
      throw new Error('The license inventory file could not be read.');
    }
    if (bytes.length > MAX_INVENTORY_BYTES) {
      throw new Error('The license inventory exceeds the size limit.');
    }
  } else {
    throw new Error('Usage: check-js-licenses.mjs (--pnpm | --inventory <path>).');
  }

  if (bytes.length === 0) {
    throw new Error('The license inventory is empty.');
  }

  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('The license inventory is not valid JSON.');
  }
}

try {
  const inventory = await readInventory(process.argv.slice(2));
  const result = validateLicenseInventory(inventory);
  console.log(
    `JavaScript license policy passed for ${String(result.packageCount)} package records across ${String(result.expressionCount)} expressions.`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown license-policy failure.';
  console.error(`JavaScript license policy failed: ${message}`);
  process.exitCode = 1;
}
