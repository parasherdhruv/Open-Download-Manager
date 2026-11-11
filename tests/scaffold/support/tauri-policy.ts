import { compareStrings } from './artifacts';
import {
  assertExactJsonValue,
  assertExactKeys,
  requireJsonArray,
  requireJsonRecord,
  requireOwnValue,
  requireString,
} from './json';
import { parseSimpleToml, requireTomlSection, tomlSectionObject } from './simple-toml';

export interface CapabilityArtifact {
  readonly relativePath: string;
  readonly value: unknown;
}

export interface TauriConfigurationArtifact {
  readonly kind: 'directory' | 'file' | 'other' | 'symbolic-link';
  readonly relativePath: string;
}

export interface TauriPolicyInput {
  readonly buildScript: string;
  readonly capabilities: readonly CapabilityArtifact[];
  readonly cargoManifest: string;
  readonly configuration: unknown;
  readonly configurationArtifacts: readonly TauriConfigurationArtifact[];
  readonly rustMain: string;
}

const PROVEN_LOCAL_IPC_SOURCE = 'http://ipc.localhost';
const REQUIRED_CSP = new Map<string, readonly string[]>([
  ['default-src', ["'self'"]],
  ['script-src', ["'self'"]],
  ['style-src', ["'self'"]],
  ['img-src', ["'self'"]],
  ['font-src', ["'self'"]],
  ['connect-src', ["'self'", PROVEN_LOCAL_IPC_SOURCE]],
  ['object-src', ["'none'"]],
  ['base-uri', ["'none'"]],
  ['form-action', ["'none'"]],
  ['frame-src', ["'none'"]],
  ['frame-ancestors', ["'none'"]],
]);
const REVIEWED_RUST_MAIN = `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if tauri::Builder::default()
        .run(tauri::generate_context!())
        .is_err()
    {
        eprintln!("Application startup failed.");
        std::process::exit(1);
    }
}
`;
const REVIEWED_BUILD_SCRIPT = `fn main() {
    tauri_build::build();
}
`;

export function isTauriConfigurationArtifactPath(relativePath: string): boolean {
  if (relativePath.includes('/') || relativePath.includes('\\')) {
    return false;
  }

  return /^tauri(?:\.[a-z0-9_-]+)?(?:\.conf)?\.(?:json|json5|toml)$/i.test(relativePath);
}

function validateConfigurationArtifacts(artifacts: readonly TauriConfigurationArtifact[]): void {
  if (
    artifacts.length !== 1 ||
    artifacts[0]?.relativePath !== 'tauri.conf.json' ||
    artifacts[0].kind !== 'file'
  ) {
    throw new Error('Wave 1 permits only the base tauri.conf.json configuration artifact.');
  }
}

function parseCsp(csp: string): ReadonlyMap<string, readonly string[]> {
  const directives = new Map<string, readonly string[]>();

  for (const rawDirective of csp.split(';')) {
    const directive = rawDirective.trim();
    if (!directive) {
      continue;
    }

    const [rawName, ...sources] = directive.split(/\s+/);
    if (rawName === undefined || !rawName) {
      throw new Error('The production CSP contains an invalid directive.');
    }
    const name = rawName.toLowerCase();
    if (directives.has(name)) {
      throw new Error('The production CSP contains a duplicate directive.');
    }
    if (sources.length === 0) {
      throw new Error('The production CSP contains a directive without a source policy.');
    }
    directives.set(name, sources);
  }

  return directives;
}

function assertSameSources(
  actualSources: readonly string[],
  expectedSources: readonly string[],
  directive: string,
): void {
  const actual = [...actualSources].sort(compareStrings);
  const expected = [...expectedSources].sort(compareStrings);

  if (
    actual.length !== expected.length ||
    actual.some((source, index) => source !== expected[index])
  ) {
    throw new Error(`The production CSP broadens ${directive}.`);
  }
}

export function validateProductionCsp(csp: string): void {
  const directives = parseCsp(csp);

  for (const [directive, sources] of directives) {
    for (const source of sources) {
      const normalized = source.toLowerCase();
      if (source.includes('*')) {
        throw new Error('The production CSP contains a wildcard source.');
      }
      if (normalized === "'unsafe-eval'" || normalized === "'unsafe-inline'") {
        throw new Error('The production CSP contains an unsafe directive.');
      }
      if (
        normalized === 'data:' ||
        normalized.startsWith('data:') ||
        normalized === 'blob:' ||
        normalized.startsWith('blob:')
      ) {
        throw new Error('The production CSP contains a data or blob source.');
      }
      if (
        (normalized === 'http:' ||
          normalized === 'https:' ||
          normalized.startsWith('http://') ||
          normalized.startsWith('https://')) &&
        normalized !== PROVEN_LOCAL_IPC_SOURCE
      ) {
        throw new Error('The production CSP contains a remote HTTP(S) source.');
      }
    }

    const expectedSources = REQUIRED_CSP.get(directive);
    if (expectedSources === undefined) {
      throw new Error('The production CSP contains an unreviewed directive.');
    }
    assertSameSources(sources, expectedSources, directive);
  }

  if (directives.size !== REQUIRED_CSP.size) {
    throw new Error('The production CSP is missing a required directive.');
  }
  for (const requiredDirective of REQUIRED_CSP.keys()) {
    if (!directives.has(requiredDirective)) {
      throw new Error('The production CSP is missing a required directive.');
    }
  }
}

function validateConfiguration(configuration: unknown): void {
  const root = requireJsonRecord(configuration, 'Tauri configuration');
  assertExactKeys(
    root,
    ['$schema', 'productName', 'version', 'identifier', 'build', 'app', 'bundle'],
    'Tauri configuration',
  );
  assertExactJsonValue(
    requireOwnValue(root, '$schema', 'Tauri configuration'),
    'https://schema.tauri.app/config/2.12.5',
    'Tauri schema',
  );
  assertExactJsonValue(
    requireOwnValue(root, 'productName', 'Tauri configuration'),
    'Open Download Manager',
    'Tauri product name',
  );
  assertExactJsonValue(
    requireOwnValue(root, 'version', 'Tauri configuration'),
    '0.0.0',
    'Tauri version',
  );
  assertExactJsonValue(
    requireOwnValue(root, 'identifier', 'Tauri configuration'),
    'org.opendownloadmanager.desktop',
    'Tauri identifier',
  );
  assertExactJsonValue(
    requireOwnValue(root, 'build', 'Tauri configuration'),
    {
      beforeBuildCommand: 'corepack pnpm run build',
      beforeDevCommand: 'corepack pnpm run dev',
      devUrl: 'http://127.0.0.1:1420',
      frontendDist: '../dist',
    },
    'Tauri build configuration',
  );
  assertExactJsonValue(
    requireOwnValue(root, 'bundle', 'Tauri configuration'),
    { active: false },
    'Tauri bundle configuration',
  );

  const app = requireJsonRecord(requireOwnValue(root, 'app', 'Tauri configuration'), 'Tauri app');
  assertExactKeys(app, ['security', 'windows'], 'Tauri app');
  assertExactJsonValue(
    requireOwnValue(app, 'windows', 'Tauri app'),
    [
      {
        label: 'main',
        title: 'Open Download Manager',
        width: 960,
        height: 680,
        minWidth: 360,
        minHeight: 520,
        resizable: true,
        fullscreen: false,
      },
    ],
    'Tauri windows',
  );

  const security = requireJsonRecord(
    requireOwnValue(app, 'security', 'Tauri app'),
    'Tauri security',
  );
  assertExactKeys(security, ['capabilities', 'csp'], 'Tauri security');
  const capabilities = requireJsonArray(
    requireOwnValue(security, 'capabilities', 'Tauri security'),
    'Tauri security capabilities',
  );
  if (capabilities.length !== 0) {
    throw new Error('Tauri security capabilities must be explicitly empty.');
  }
  validateProductionCsp(
    requireString(requireOwnValue(security, 'csp', 'Tauri security'), 'Tauri production CSP'),
  );
}

function validateCargoManifest(cargoManifest: string): void {
  const document = parseSimpleToml(cargoManifest);
  const sectionNames = [...document.keys()].sort(compareStrings);
  const expectedSections = ['', 'build-dependencies', 'dependencies', 'package'].sort(
    compareStrings,
  );
  if (
    sectionNames.length !== expectedSections.length ||
    sectionNames.some((name, index) => name !== expectedSections[index])
  ) {
    throw new Error('The desktop Cargo manifest contains an unreviewed section.');
  }

  assertExactJsonValue(
    tomlSectionObject(requireTomlSection(document, '', 'Desktop Cargo manifest')),
    {},
    'Desktop Cargo root section',
  );
  assertExactJsonValue(
    tomlSectionObject(requireTomlSection(document, 'package', 'Desktop Cargo manifest')),
    {
      name: 'odm-desktop',
      'version.workspace': true,
      'edition.workspace': true,
      'rust-version.workspace': true,
      'license.workspace': true,
      'publish.workspace': true,
      build: 'build.rs',
    },
    'Desktop Cargo package',
  );
  assertExactJsonValue(
    tomlSectionObject(requireTomlSection(document, 'dependencies', 'Desktop Cargo manifest')),
    { tauri: { version: '=2.12.5', features: [] } },
    'Desktop Cargo dependencies',
  );
  assertExactJsonValue(
    tomlSectionObject(requireTomlSection(document, 'build-dependencies', 'Desktop Cargo manifest')),
    { 'tauri-build': { version: '=2.7.4', features: [] } },
    'Desktop Cargo build dependencies',
  );
}

function rawStringOpening(
  source: string,
  index: number,
): { readonly end: string; readonly length: number } | null {
  let cursor = index;
  if (source[cursor] === 'b') {
    cursor += 1;
  }
  if (source[cursor] !== 'r') {
    return null;
  }
  cursor += 1;
  let hashes = '';
  while (source[cursor] === '#') {
    hashes += '#';
    cursor += 1;
  }
  if (source[cursor] !== '"') {
    return null;
  }

  return { end: `"${hashes}`, length: cursor - index + 1 };
}

function maskRustNonCode(source: string): string {
  let output = '';
  let index = 0;

  const maskCharacter = (character: string): void => {
    output += character === '\n' ? '\n' : ' ';
  };

  while (index < source.length) {
    if (source.startsWith('//', index)) {
      while (index < source.length && source[index] !== '\n') {
        maskCharacter(source[index] ?? ' ');
        index += 1;
      }
      continue;
    }
    if (source.startsWith('/*', index)) {
      let depth = 0;
      while (index < source.length) {
        if (source.startsWith('/*', index)) {
          depth += 1;
          maskCharacter('/');
          maskCharacter('*');
          index += 2;
          continue;
        }
        if (source.startsWith('*/', index)) {
          depth -= 1;
          maskCharacter('*');
          maskCharacter('/');
          index += 2;
          if (depth === 0) {
            break;
          }
          continue;
        }
        maskCharacter(source[index] ?? ' ');
        index += 1;
      }
      continue;
    }

    const rawOpening = rawStringOpening(source, index);
    if (rawOpening !== null) {
      for (let offset = 0; offset < rawOpening.length; offset += 1) {
        maskCharacter(source[index + offset] ?? ' ');
      }
      index += rawOpening.length;
      const closingIndex = source.indexOf(rawOpening.end, index);
      const endIndex = closingIndex === -1 ? source.length : closingIndex + rawOpening.end.length;
      while (index < endIndex) {
        maskCharacter(source[index] ?? ' ');
        index += 1;
      }
      continue;
    }

    if (source[index] === '"') {
      maskCharacter('"');
      index += 1;
      let escaped = false;
      while (index < source.length) {
        const character = source[index] ?? ' ';
        maskCharacter(character);
        index += 1;
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          break;
        }
      }
      continue;
    }

    output += source[index] ?? '';
    index += 1;
  }

  return output;
}

function normalizeReviewedRustSource(source: string): string {
  return source.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

export function validateRustMainPolicy(rustMain: string): void {
  const code = maskRustNonCode(rustMain);
  if (
    /\b(?:pub|mod|use|extern|static|const|let|struct|enum|union|trait|impl|async|unsafe|loop|while|for|match|return|break|continue)\b/.test(
      code,
    )
  ) {
    throw new Error('The Tauri composition root contains an unreviewed declaration.');
  }

  const functions = [...code.matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  if (functions.length !== 1 || functions[0] !== 'main') {
    throw new Error('The Tauri composition root must define only main.');
  }

  const allowedMacros = new Set(['eprintln', 'tauri::generate_context']);
  for (const match of code.matchAll(
    /\b([A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*)\s*!/g,
  )) {
    const macroName = match[1];
    if (macroName === undefined || !allowedMacros.has(macroName)) {
      throw new Error('The Tauri composition root invokes an unreviewed macro.');
    }
  }

  const allowedCalls = new Set(['cfg_attr', 'not', 'main', 'default', 'run', 'is_err', 'exit']);
  for (const match of code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
    const callName = match[1];
    if (callName === undefined || !allowedCalls.has(callName)) {
      throw new Error('The Tauri composition root invokes an unreviewed operation.');
    }
  }

  if (!/tauri\s*::\s*Builder\s*::\s*default\s*\(\s*\)/.test(code)) {
    throw new Error('The Tauri composition root is missing the zero-feature builder.');
  }
  if (!/\.\s*run\s*\(\s*tauri\s*::\s*generate_context\s*!/.test(code)) {
    throw new Error('The Tauri composition root is missing the generated local context.');
  }

  if (normalizeReviewedRustSource(rustMain) !== REVIEWED_RUST_MAIN) {
    throw new Error('The Tauri composition root differs from the reviewed Wave 1 source.');
  }
}

export function validateRustBuildPolicy(buildScript: string): void {
  const code = maskRustNonCode(buildScript);
  if (
    /\b(?:pub|mod|use|extern|static|const|let|struct|enum|union|trait|impl|async|unsafe|if|else|loop|while|for|match|return|break|continue)\b/.test(
      code,
    )
  ) {
    throw new Error('The Tauri build script contains an unreviewed declaration or control flow.');
  }

  const functions = [...code.matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  if (functions.length !== 1 || functions[0] !== 'main') {
    throw new Error('The Tauri build script must define only main.');
  }

  if (/\b[A-Za-z_][A-Za-z0-9_:]*\s*!/g.test(code)) {
    throw new Error('The Tauri build script invokes an unreviewed macro.');
  }

  const allowedCalls = new Set(['main', 'build']);
  for (const match of code.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
    const callName = match[1];
    if (callName === undefined || !allowedCalls.has(callName)) {
      throw new Error('The Tauri build script invokes an unreviewed operation.');
    }
  }

  if (!/tauri_build\s*::\s*build\s*\(\s*\)/.test(code)) {
    throw new Error('The Tauri build script is missing the reviewed Tauri build call.');
  }

  if (normalizeReviewedRustSource(buildScript) !== REVIEWED_BUILD_SCRIPT) {
    throw new Error('The Tauri build script differs from the reviewed Wave 1 source.');
  }
}

export function validateTauriPolicy(input: TauriPolicyInput): void {
  validateConfigurationArtifacts(input.configurationArtifacts);
  validateConfiguration(input.configuration);
  validateCargoManifest(input.cargoManifest);
  validateRustMainPolicy(input.rustMain);
  validateRustBuildPolicy(input.buildScript);

  if (input.capabilities.length !== 0) {
    throw new Error('Tauri capability files are not permitted in the effective Wave 1 baseline.');
  }
}
