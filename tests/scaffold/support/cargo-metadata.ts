import {
  requireJsonArray,
  requireJsonRecord,
  requireNullableString,
  requireOwnValue,
  requireString,
  requireStringArray,
} from './json';

export interface CargoDependency {
  readonly kind: string | null;
  readonly name: string;
  readonly path: string | null;
  readonly req: string;
}

export interface CargoTarget {
  readonly crateTypes: readonly string[];
  readonly kind: readonly string[];
  readonly name: string;
  readonly sourcePath: string;
}

export interface CargoPackage {
  readonly dependencies: readonly CargoDependency[];
  readonly edition: string;
  readonly id: string;
  readonly license: string | null;
  readonly manifestPath: string;
  readonly name: string;
  readonly publish: readonly string[] | null;
  readonly rustVersion: string | null;
  readonly targets: readonly CargoTarget[];
  readonly version: string;
}

export interface CargoMetadata {
  readonly packages: readonly CargoPackage[];
  readonly workspaceMembers: readonly string[];
  readonly workspaceRoot: string;
}

function parseDependency(value: unknown, index: number): CargoDependency {
  const label = `Cargo dependency ${String(index)}`;
  const record = requireJsonRecord(value, label);
  const pathValue = Object.hasOwn(record, 'path') ? record['path'] : null;

  return {
    kind: requireNullableString(requireOwnValue(record, 'kind', label), `${label}.kind`),
    name: requireString(requireOwnValue(record, 'name', label), `${label}.name`),
    path: requireNullableString(pathValue, `${label}.path`),
    req: requireString(requireOwnValue(record, 'req', label), `${label}.req`),
  };
}

function parseTarget(value: unknown, index: number): CargoTarget {
  const label = `Cargo target ${String(index)}`;
  const record = requireJsonRecord(value, label);

  return {
    crateTypes: requireStringArray(
      requireOwnValue(record, 'crate_types', label),
      `${label}.crate_types`,
    ),
    kind: requireStringArray(requireOwnValue(record, 'kind', label), `${label}.kind`),
    name: requireString(requireOwnValue(record, 'name', label), `${label}.name`),
    sourcePath: requireString(requireOwnValue(record, 'src_path', label), `${label}.src_path`),
  };
}

function parsePackage(value: unknown, index: number): CargoPackage {
  const label = `Cargo package ${String(index)}`;
  const record = requireJsonRecord(value, label);
  const publishValue = requireOwnValue(record, 'publish', label);
  const publish =
    publishValue === null ? null : requireStringArray(publishValue, `${label}.publish`);
  const dependencies = requireJsonArray(
    requireOwnValue(record, 'dependencies', label),
    `${label}.dependencies`,
  ).map((dependency, dependencyIndex) => parseDependency(dependency, dependencyIndex));
  const targets = requireJsonArray(
    requireOwnValue(record, 'targets', label),
    `${label}.targets`,
  ).map((target, targetIndex) => parseTarget(target, targetIndex));

  return {
    dependencies,
    edition: requireString(requireOwnValue(record, 'edition', label), `${label}.edition`),
    id: requireString(requireOwnValue(record, 'id', label), `${label}.id`),
    license: requireNullableString(requireOwnValue(record, 'license', label), `${label}.license`),
    manifestPath: requireString(
      requireOwnValue(record, 'manifest_path', label),
      `${label}.manifest_path`,
    ),
    name: requireString(requireOwnValue(record, 'name', label), `${label}.name`),
    publish,
    rustVersion: requireNullableString(
      requireOwnValue(record, 'rust_version', label),
      `${label}.rust_version`,
    ),
    targets,
    version: requireString(requireOwnValue(record, 'version', label), `${label}.version`),
  };
}

export function parseCargoMetadata(value: unknown): CargoMetadata {
  const record = requireJsonRecord(value, 'Cargo metadata');
  const packages = requireJsonArray(
    requireOwnValue(record, 'packages', 'Cargo metadata'),
    'Cargo metadata packages',
  ).map((packageValue, index) => parsePackage(packageValue, index));

  return {
    packages,
    workspaceMembers: requireStringArray(
      requireOwnValue(record, 'workspace_members', 'Cargo metadata'),
      'Cargo metadata workspace_members',
    ),
    workspaceRoot: requireString(
      requireOwnValue(record, 'workspace_root', 'Cargo metadata'),
      'Cargo metadata workspace_root',
    ),
  };
}
