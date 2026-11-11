import { lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXPECTED_MANIFEST, validateManifest } from './manifest-policy.mjs';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, '..', '..');
const SOURCE_MANIFEST = resolve(PACKAGE_ROOT, 'manifests', 'chromium.json');
const DEFAULT_OUTPUT_DIRECTORY = resolve(PACKAGE_ROOT, 'dist');
const CANONICAL_MANIFEST = `${JSON.stringify(EXPECTED_MANIFEST, null, 2)}\n`;

class BuildFailure extends Error {}

/**
 * @param {string[]} argumentsList
 * @returns {{ readonly isDefault: boolean; readonly outputDirectory: string }}
 */
function selectOutputDirectory(argumentsList) {
  if (argumentsList.length === 0) {
    return { isDefault: true, outputDirectory: DEFAULT_OUTPUT_DIRECTORY };
  }

  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== '--out-dir' ||
    argumentsList[1] === undefined ||
    argumentsList[1].length === 0
  ) {
    throw new BuildFailure('Usage: node scripts/build.mjs [--out-dir <directory>].');
  }

  return { isDefault: false, outputDirectory: resolve(process.cwd(), argumentsList[1]) };
}

/**
 * @param {string} parentDirectory
 * @param {string} candidate
 * @returns {boolean}
 */
function containsPath(parentDirectory, candidate) {
  const relativePath = relative(parentDirectory, candidate);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

/**
 * @param {string} outputDirectory
 * @param {string} repositoryRoot
 * @param {string} allowedBuildRoot
 */
function assertSafeOutputDirectory(outputDirectory, repositoryRoot, allowedBuildRoot) {
  if (outputDirectory === parse(outputDirectory).root) {
    throw new BuildFailure('Output directory must not be a filesystem root.');
  }

  if (containsPath(outputDirectory, repositoryRoot)) {
    throw new BuildFailure('Output directory must not contain the repository.');
  }

  if (
    containsPath(repositoryRoot, outputDirectory) &&
    !containsPath(allowedBuildRoot, outputDirectory)
  ) {
    throw new BuildFailure('Output directory must not overlap repository source directories.');
  }
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissingPathError(error) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
function isSamePath(left, right) {
  return relative(left, right) === '';
}

/**
 * @returns {Promise<{
 *   readonly physicalAllowedBuildRoot: string;
 *   readonly physicalPackageRoot: string;
 *   readonly physicalRepositoryRoot: string;
 * }>}
 */
async function readPhysicalRoots() {
  try {
    const [physicalRepositoryRoot, physicalPackageRoot] = await Promise.all([
      realpath(REPOSITORY_ROOT),
      realpath(PACKAGE_ROOT),
    ]);
    if (!containsPath(physicalRepositoryRoot, physicalPackageRoot)) {
      throw new BuildFailure('Unable to verify output directory safety.');
    }

    return {
      physicalAllowedBuildRoot: resolve(physicalPackageRoot, 'dist'),
      physicalPackageRoot,
      physicalRepositoryRoot,
    };
  } catch (error) {
    if (error instanceof BuildFailure) {
      throw error;
    }
    throw new BuildFailure('Unable to verify output directory safety.');
  }
}

/**
 * @param {string} outputDirectory
 * @returns {Promise<{
 *   readonly expectedPhysicalDirectory: string;
 *   readonly isDefault: false;
 *   readonly outputDirectory: string;
 *   readonly replaceExisting: false;
 * }>}
 */
async function prepareExplicitOutput(outputDirectory) {
  assertSafeOutputDirectory(outputDirectory, REPOSITORY_ROOT, DEFAULT_OUTPUT_DIRECTORY);

  try {
    await lstat(outputDirectory);
    throw new BuildFailure('Explicit output path must not already exist.');
  } catch (error) {
    if (error instanceof BuildFailure) {
      throw error;
    }
    if (!isMissingPathError(error)) {
      throw new BuildFailure('Unable to inspect the explicit output path.');
    }
  }

  try {
    const parentDirectory = dirname(outputDirectory);
    const parentStatus = await lstat(parentDirectory);
    if (parentStatus.isSymbolicLink() || !parentStatus.isDirectory()) {
      throw new BuildFailure('Explicit output parent must be an existing regular directory.');
    }

    const [physicalRoots, physicalParent] = await Promise.all([
      readPhysicalRoots(),
      realpath(parentDirectory),
    ]);
    const expectedPhysicalDirectory = resolve(physicalParent, basename(outputDirectory));
    assertSafeOutputDirectory(
      expectedPhysicalDirectory,
      physicalRoots.physicalRepositoryRoot,
      physicalRoots.physicalAllowedBuildRoot,
    );

    return {
      expectedPhysicalDirectory,
      isDefault: false,
      outputDirectory,
      replaceExisting: false,
    };
  } catch (error) {
    if (error instanceof BuildFailure) {
      throw error;
    }
    throw new BuildFailure('Unable to verify output directory safety.');
  }
}

/**
 * @returns {Promise<{
 *   readonly expectedPhysicalDirectory: string;
 *   readonly isDefault: true;
 *   readonly outputDirectory: string;
 *   readonly replaceExisting: boolean;
 * }>}
 */
async function prepareDefaultOutput() {
  assertSafeOutputDirectory(DEFAULT_OUTPUT_DIRECTORY, REPOSITORY_ROOT, DEFAULT_OUTPUT_DIRECTORY);

  const physicalRoots = await readPhysicalRoots();
  const expectedPhysicalDirectory = physicalRoots.physicalAllowedBuildRoot;
  assertSafeOutputDirectory(
    expectedPhysicalDirectory,
    physicalRoots.physicalRepositoryRoot,
    expectedPhysicalDirectory,
  );

  try {
    const outputStatus = await lstat(DEFAULT_OUTPUT_DIRECTORY);
    if (outputStatus.isSymbolicLink() || !outputStatus.isDirectory()) {
      throw new BuildFailure('Default output path must be a regular package-owned directory.');
    }

    const physicalOutputDirectory = await realpath(DEFAULT_OUTPUT_DIRECTORY);
    if (!isSamePath(physicalOutputDirectory, expectedPhysicalDirectory)) {
      throw new BuildFailure('Default output path must not redirect outside the package.');
    }

    return {
      expectedPhysicalDirectory,
      isDefault: true,
      outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
      replaceExisting: true,
    };
  } catch (error) {
    if (error instanceof BuildFailure) {
      throw error;
    }
    if (!isMissingPathError(error)) {
      throw new BuildFailure('Unable to inspect the default output path.');
    }

    return {
      expectedPhysicalDirectory,
      isDefault: true,
      outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
      replaceExisting: false,
    };
  }
}

/**
 * @returns {Promise<unknown>}
 */
async function readSourceManifest() {
  /** @type {string} */
  let sourceText;
  try {
    sourceText = await readFile(SOURCE_MANIFEST, 'utf8');
  } catch {
    throw new BuildFailure('Unable to read the source manifest.');
  }

  try {
    return JSON.parse(sourceText);
  } catch {
    throw new BuildFailure('Source manifest is not valid JSON.');
  }
}

/**
 * @param {{
 *   readonly expectedPhysicalDirectory: string;
 *   readonly isDefault: boolean;
 *   readonly outputDirectory: string;
 *   readonly replaceExisting: boolean;
 * }} outputPlan
 */
async function writeBuildOutput(outputPlan) {
  let createdOutput = false;

  try {
    if (outputPlan.isDefault) {
      const currentDefault = await prepareDefaultOutput();
      if (currentDefault.replaceExisting) {
        await rm(currentDefault.outputDirectory, { recursive: true });
      }
    }

    await mkdir(outputPlan.outputDirectory, { recursive: false });
    createdOutput = true;

    const outputStatus = await lstat(outputPlan.outputDirectory);
    const physicalOutputDirectory = await realpath(outputPlan.outputDirectory);
    if (
      outputStatus.isSymbolicLink() ||
      !outputStatus.isDirectory() ||
      !isSamePath(physicalOutputDirectory, outputPlan.expectedPhysicalDirectory)
    ) {
      throw new BuildFailure('Created output directory failed ownership verification.');
    }

    await writeFile(resolve(outputPlan.outputDirectory, 'manifest.json'), CANONICAL_MANIFEST, {
      encoding: 'utf8',
      flag: 'wx',
    });
  } catch {
    if (createdOutput) {
      try {
        const outputStatus = await lstat(outputPlan.outputDirectory);
        if (!outputStatus.isSymbolicLink() && outputStatus.isDirectory()) {
          const physicalOutputDirectory = await realpath(outputPlan.outputDirectory);
          if (isSamePath(physicalOutputDirectory, outputPlan.expectedPhysicalDirectory)) {
            await rm(outputPlan.outputDirectory, { recursive: true });
          }
        }
      } catch {
        // Keep the original sanitized build failure and never widen cleanup ownership.
      }
    }
    throw new BuildFailure('Unable to create the extension build output.');
  }
}

async function build() {
  const outputSelection = selectOutputDirectory(process.argv.slice(2));
  const manifest = await readSourceManifest();
  validateManifest(manifest);
  const outputPlan = outputSelection.isDefault
    ? await prepareDefaultOutput()
    : await prepareExplicitOutput(outputSelection.outputDirectory);
  await writeBuildOutput(outputPlan);
}

void build().catch((error) => {
  const message =
    error instanceof BuildFailure
      ? error.message
      : 'Source manifest does not satisfy the exact Wave 1 policy.';
  console.error(`Extension build failed: ${message}`);
  process.exitCode = 1;
});
