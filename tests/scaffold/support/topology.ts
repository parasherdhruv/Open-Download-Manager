import { compareStrings } from './artifacts';

export interface DependencyEdge {
  readonly from: string;
  readonly to: string;
}

export interface LibraryContract {
  readonly directory: string;
  readonly name: string;
  readonly nonResponsibility: string;
  readonly responsibility: string;
}

export const LIBRARY_CONTRACTS = [
  {
    directory: 'crates/shared-types',
    name: 'shared-types',
    nonResponsibility: 'This crate must not own I/O, orchestration, or framework integration.',
    responsibility:
      'Future responsibility: stable domain values and explicitly reviewed cross-boundary data shapes.',
  },
  {
    directory: 'crates/diagnostics',
    name: 'diagnostics',
    nonResponsibility:
      'This crate must not own product state, network operations, or file operations.',
    responsibility:
      'Future responsibility: structured internal diagnostics, error classification, and mandatory redaction policy.',
  },
  {
    directory: 'crates/protocol-http',
    name: 'protocol-http',
    nonResponsibility: 'This crate must not own scheduling, final paths, or database policy.',
    responsibility:
      'Future responsibility: HTTP/HTTPS inspection, redirects, range requests, and response validation.',
  },
  {
    directory: 'crates/file-manager',
    name: 'file-manager',
    nonResponsibility: 'This crate must not own network requests, queues, or UI.',
    responsibility:
      'Future responsibility: safe destination resolution, temporary files, positioned writes, and finalization.',
  },
  {
    directory: 'crates/storage',
    name: 'storage',
    nonResponsibility: 'This crate must not own network transfer, UI, or scheduling policy.',
    responsibility:
      'Future responsibility: SQLite persistence, transactions, migrations, and recovery records.',
  },
  {
    directory: 'crates/download-core',
    name: 'download-core',
    nonResponsibility: 'This crate must not own UI, browser protocol, or global queue fairness.',
    responsibility:
      'Future responsibility: transfer lifecycle, state validation, segment coordination, and integrity decisions.',
  },
  {
    directory: 'crates/download-scheduler',
    name: 'download-scheduler',
    nonResponsibility: 'This crate must not own HTTP parsing, direct file writes, or UI.',
    responsibility:
      'Future responsibility: queue ordering, global and per-host limits, retry timing, fairness, and shutdown coordination.',
  },
  {
    directory: 'crates/ipc',
    name: 'ipc',
    nonResponsibility: 'This crate must not own download policy, browser APIs, or persistence.',
    responsibility:
      'Future responsibility: authenticated local IPC framing, transport limits, and protocol validation.',
  },
  {
    directory: 'crates/native-messaging',
    name: 'native-messaging',
    nonResponsibility:
      'This crate must not own engine state or unrestricted network or filesystem access.',
    responsibility:
      'Future responsibility: the browser native-host executable boundary and a validated bridge to IPC.',
  },
  {
    directory: 'crates/media-detection',
    name: 'media-detection',
    nonResponsibility:
      'This crate must not own DRM circumvention, browser UI, or generic scheduling.',
    responsibility:
      'Future responsibility: detection and planning for explicitly supported authorized clear media.',
  },
] as const satisfies readonly LibraryContract[];

export const EXPECTED_CARGO_MEMBERS = [
  ...LIBRARY_CONTRACTS.map((contract) => contract.name),
  'odm-desktop',
] as const;

export const ARCHITECTURE_EDGE_CEILING = [
  { from: 'diagnostics', to: 'shared-types' },
  { from: 'protocol-http', to: 'shared-types' },
  { from: 'protocol-http', to: 'diagnostics' },
  { from: 'file-manager', to: 'shared-types' },
  { from: 'file-manager', to: 'diagnostics' },
  { from: 'storage', to: 'shared-types' },
  { from: 'storage', to: 'diagnostics' },
  { from: 'ipc', to: 'shared-types' },
  { from: 'ipc', to: 'diagnostics' },
  { from: 'download-core', to: 'shared-types' },
  { from: 'download-core', to: 'diagnostics' },
  { from: 'download-core', to: 'protocol-http' },
  { from: 'download-core', to: 'file-manager' },
  { from: 'download-core', to: 'storage' },
  { from: 'media-detection', to: 'shared-types' },
  { from: 'media-detection', to: 'diagnostics' },
  { from: 'media-detection', to: 'protocol-http' },
  { from: 'native-messaging', to: 'shared-types' },
  { from: 'native-messaging', to: 'diagnostics' },
  { from: 'native-messaging', to: 'ipc' },
  { from: 'download-scheduler', to: 'shared-types' },
  { from: 'download-scheduler', to: 'diagnostics' },
  { from: 'download-scheduler', to: 'download-core' },
] as const satisfies readonly DependencyEdge[];

function edgeKey(edge: DependencyEdge): string {
  return `${edge.from}\u0000${edge.to}`;
}

export function assertExactMembers(
  actualMembers: readonly string[],
  expectedMembers: readonly string[],
): void {
  const actual = [...actualMembers].sort(compareStrings);
  const expected = [...expectedMembers].sort(compareStrings);

  if (new Set(actualMembers).size !== actualMembers.length) {
    throw new Error('Workspace membership contains a duplicate.');
  }
  if (
    actual.length !== expected.length ||
    actual.some((member, index) => member !== expected[index])
  ) {
    throw new Error('Workspace membership differs from the Wave 1 contract.');
  }
}

export function assertEdgesWithinCeiling(
  members: readonly string[],
  edges: readonly DependencyEdge[],
  allowedEdges: readonly DependencyEdge[],
): void {
  const memberSet = new Set(members);
  const allowedSet = new Set(allowedEdges.map((edge) => edgeKey(edge)));

  for (const edge of edges) {
    if (!memberSet.has(edge.from) || !memberSet.has(edge.to)) {
      throw new Error('An internal dependency edge names a non-member.');
    }
    if (!allowedSet.has(edgeKey(edge))) {
      throw new Error('An internal dependency edge exceeds the architecture ceiling.');
    }
  }
}

export function assertAcyclic(members: readonly string[], edges: readonly DependencyEdge[]): void {
  const adjacency = new Map<string, string[]>();
  for (const member of members) {
    adjacency.set(member, []);
  }
  for (const edge of edges) {
    const destinations = adjacency.get(edge.from);
    if (destinations === undefined || !adjacency.has(edge.to)) {
      throw new Error('A dependency edge names a non-member.');
    }
    destinations.push(edge.to);
  }

  const states = new Map<string, 'active' | 'complete'>();
  const visit = (member: string): void => {
    const state = states.get(member);
    if (state === 'active') {
      throw new Error('The workspace dependency graph contains a cycle.');
    }
    if (state === 'complete') {
      return;
    }

    states.set(member, 'active');
    const destinations = adjacency.get(member);
    if (destinations === undefined) {
      throw new Error('The workspace graph is incomplete.');
    }
    for (const destination of destinations) {
      visit(destination);
    }
    states.set(member, 'complete');
  };

  for (const member of members) {
    visit(member);
  }
}

export function assertNoInternalEdges(edges: readonly DependencyEdge[]): void {
  if (edges.length !== 0) {
    throw new Error('Wave 1 must not contain an internal workspace dependency edge.');
  }
}

const DISALLOWED_MARKER_PATTERN = new RegExp(
  `\\b(?:${'TO' + 'DO'}|${'FIX' + 'ME'}|${'T' + 'BD'}|${'place' + 'holder'})\\b`,
  'i',
);
const ALLOWED_LINT_ATTRIBUTES = ['#![deny(missing_docs)]', '#![forbid(unsafe_code)]'] as const;
const NO_API_STATEMENT = 'No behavior or public API is implemented in Wave 1.';

export function assertApiFreeLibrarySource(source: string, contract: LibraryContract): void {
  if (DISALLOWED_MARKER_PATTERN.test(source)) {
    throw new Error('A crate source contains a deferred-work marker.');
  }

  const documentationLines: string[] = [];
  const lintAttributes: string[] = [];

  for (const sourceLine of source.replaceAll('\r\n', '\n').split('\n')) {
    const line = sourceLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith('//!')) {
      documentationLines.push(line.slice(3).trim());
      continue;
    }
    if (ALLOWED_LINT_ATTRIBUTES.includes(line as (typeof ALLOWED_LINT_ATTRIBUTES)[number])) {
      lintAttributes.push(line);
      continue;
    }

    throw new Error('A crate source contains a substantive non-documentation line.');
  }

  const normalizedDocumentation = documentationLines.join(' ').replaceAll(/\s+/g, ' ').trim();
  for (const requiredStatement of [
    contract.responsibility,
    contract.nonResponsibility,
    NO_API_STATEMENT,
  ]) {
    if (!normalizedDocumentation.includes(requiredStatement)) {
      throw new Error('A crate source is missing its Wave 1 ownership statement.');
    }
  }

  const actualLintAttributes = lintAttributes.sort(compareStrings);
  const expectedLintAttributes = [...ALLOWED_LINT_ATTRIBUTES].sort(compareStrings);
  if (
    actualLintAttributes.length !== expectedLintAttributes.length ||
    actualLintAttributes.some((attribute, index) => attribute !== expectedLintAttributes[index])
  ) {
    throw new Error('A crate source has an unexpected crate-level lint policy.');
  }
}
