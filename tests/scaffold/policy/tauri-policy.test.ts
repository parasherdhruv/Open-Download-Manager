import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  listTreeEntriesIfPresent,
  readRequiredJson,
  readRequiredUtf8,
  repositoryPath,
} from '../support/artifacts';
import { requireJsonRecord, requireOwnValue } from '../support/json';
import {
  type CapabilityArtifact,
  isTauriConfigurationArtifactPath,
  type TauriConfigurationArtifact,
  type TauriPolicyInput,
  validateRustMainPolicy,
  validateTauriPolicy,
} from '../support/tauri-policy';

type LivePolicyArtifacts = TauriPolicyInput;

let liveArtifacts: LivePolicyArtifacts | null = null;

function requireLiveArtifacts(): LivePolicyArtifacts {
  if (liveArtifacts === null) {
    throw new Error('The live Tauri policy artifacts were not loaded.');
  }

  return liveArtifacts;
}

async function loadCapabilities(): Promise<readonly CapabilityArtifact[]> {
  const capabilitiesDirectory = repositoryPath('apps', 'desktop', 'src-tauri', 'capabilities');
  const entries = await listTreeEntriesIfPresent(
    capabilitiesDirectory,
    'Tauri capabilities directory',
  );
  const files = entries.filter((entry) => entry.kind === 'file');

  return Promise.all(
    files.map(async (entry) => ({
      relativePath: entry.relativePath,
      value: await readRequiredJson(
        resolve(capabilitiesDirectory, entry.relativePath),
        `Tauri capability ${entry.relativePath}`,
      ),
    })),
  );
}

async function loadConfigurationArtifacts(
  tauriRoot: string,
): Promise<readonly TauriConfigurationArtifact[]> {
  const entries = await readdir(tauriRoot, { withFileTypes: true });

  return entries
    .filter((entry) => isTauriConfigurationArtifactPath(entry.name))
    .map((entry): TauriConfigurationArtifact => {
      const kind: TauriConfigurationArtifact['kind'] = entry.isFile()
        ? 'file'
        : entry.isDirectory()
          ? 'directory'
          : entry.isSymbolicLink()
            ? 'symbolic-link'
            : 'other';
      return { kind, relativePath: entry.name };
    });
}

function cloneConfiguration(): Record<string, unknown> {
  return requireJsonRecord(
    structuredClone(requireLiveArtifacts().configuration),
    'Cloned Tauri configuration',
  );
}

function securityRecord(configuration: Record<string, unknown>): Record<string, unknown> {
  const app = requireJsonRecord(
    requireOwnValue(configuration, 'app', 'Tauri configuration'),
    'Tauri app',
  );
  return requireJsonRecord(requireOwnValue(app, 'security', 'Tauri app'), 'Tauri security');
}

function policyWithConfiguration(configuration: unknown): TauriPolicyInput {
  const live = requireLiveArtifacts();
  return { ...live, configuration };
}

function configurationWithCsp(csp: string): unknown {
  const configuration = cloneConfiguration();
  securityRecord(configuration)['csp'] = csp;
  return configuration;
}

beforeAll(async () => {
  const tauriRoot = repositoryPath('apps', 'desktop', 'src-tauri');
  const [
    configuration,
    cargoManifest,
    rustMain,
    buildScript,
    capabilities,
    configurationArtifacts,
  ] = await Promise.all([
    readRequiredJson(resolve(tauriRoot, 'tauri.conf.json'), 'Tauri configuration'),
    readRequiredUtf8(resolve(tauriRoot, 'Cargo.toml'), 'Desktop Cargo manifest'),
    readRequiredUtf8(resolve(tauriRoot, 'src', 'main.rs'), 'Tauri Rust main'),
    readRequiredUtf8(resolve(tauriRoot, 'build.rs'), 'Tauri Rust build script'),
    loadCapabilities(),
    loadConfigurationArtifacts(tauriRoot),
  ]);

  liveArtifacts = {
    buildScript,
    capabilities,
    cargoManifest,
    configuration,
    configurationArtifacts,
    rustMain,
  };
});

describe('Wave 1 Tauri zero-feature policy', () => {
  it('accepts the effective local, no-bundle, single-window baseline', () => {
    expect(() => validateTauriPolicy(requireLiveArtifacts())).not.toThrow();
  });

  it.each([
    {
      label: 'a wildcard source',
      csp: "default-src *; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' http://ipc.localhost; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
    },
    {
      label: 'a remote source',
      csp: "default-src 'self'; script-src 'self' https://cdn.example.invalid; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' http://ipc.localhost; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
    },
    {
      label: 'unsafe evaluation',
      csp: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' http://ipc.localhost; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
    },
    {
      label: 'unsafe inline execution',
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' http://ipc.localhost; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
    },
    {
      label: 'a data source',
      csp: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://ipc.localhost; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
    },
    {
      label: 'a blob source',
      csp: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self' http://ipc.localhost; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
    },
  ])('rejects $label in the production CSP', ({ csp }) => {
    expect(() => validateTauriPolicy(policyWithConfiguration(configurationWithCsp(csp)))).toThrow();
  });

  it('rejects a missing explicit capability invariant', () => {
    const configuration = cloneConfiguration();
    const app = requireJsonRecord(
      requireOwnValue(configuration, 'app', 'Tauri configuration'),
      'Tauri app',
    );
    const security = securityRecord(configuration);
    app['security'] = Object.fromEntries(
      Object.entries(security).filter(([key]) => key !== 'capabilities'),
    );

    expect(() => validateTauriPolicy(policyWithConfiguration(configuration))).toThrow();
  });

  it('rejects a nonempty effective capability set', () => {
    const configuration = cloneConfiguration();
    securityRecord(configuration)['capabilities'] = ['main'];

    expect(() => validateTauriPolicy(policyWithConfiguration(configuration))).toThrow(
      'Tauri security capabilities must be explicitly empty.',
    );
  });

  it('rejects a broad capability artifact', () => {
    const input: TauriPolicyInput = {
      ...requireLiveArtifacts(),
      capabilities: [
        {
          relativePath: 'capabilities/broad.json',
          value: { identifier: 'broad', permissions: ['core:default'], windows: ['*'] },
        },
      ],
    };

    expect(() => validateTauriPolicy(input)).toThrow(
      'Tauri capability files are not permitted in the effective Wave 1 baseline.',
    );
  });

  it.each(['tauri.windows.conf.json', 'tauri.conf.json5', 'Tauri.toml', 'Tauri.windows.toml'])(
    'rejects an additional Tauri configuration artifact named %s',
    (relativePath) => {
      const live = requireLiveArtifacts();
      const input: TauriPolicyInput = {
        ...live,
        configurationArtifacts: [...live.configurationArtifacts, { kind: 'file', relativePath }],
      };

      expect(() => validateTauriPolicy(input)).toThrow(
        'Wave 1 permits only the base tauri.conf.json configuration artifact.',
      );
    },
  );

  it.each([
    'plugins',
    'updater',
    'trayIcon',
    'fs',
    'shell',
    'opener',
    'dialog',
    'notification',
    'globalShortcut',
    'nativeMessaging',
    'localIpc',
    'productNetwork',
  ])('rejects an unreviewed %s configuration surface', (key) => {
    const configuration = cloneConfiguration();
    configuration[key] = {};

    expect(() => validateTauriPolicy(policyWithConfiguration(configuration))).toThrow();
  });

  it('rejects a Tauri plugin dependency', () => {
    const live = requireLiveArtifacts();
    const cargoManifest = live.cargoManifest.replace(
      '[dependencies]',
      '[dependencies]\ntauri-plugin-shell = "=2.3.3"',
    );

    expect(() => validateTauriPolicy({ ...live, cargoManifest })).toThrow();
  });

  it.each([
    {
      label: 'a custom command',
      source: '#[tauri::command]\nfn hidden_command() {}\n',
    },
    {
      label: 'an invoke handler',
      source: 'fn configure() { tauri::Builder::default().invoke_handler(()); }\n',
    },
    {
      label: 'product state',
      source: 'fn configure() { tauri::Builder::default().manage(()); }\n',
    },
    {
      label: 'an application event setup',
      source: 'fn configure() { tauri::Builder::default().setup(|_| Ok(())); }\n',
    },
  ])('rejects $label in Rust source', ({ source }) => {
    expect(() => validateRustMainPolicy(`${requireLiveArtifacts().rustMain}\n${source}`)).toThrow();
  });

  it('rejects even comment-only drift from the reviewed composition root', () => {
    const explanatoryComment =
      '// .plugin(), .invoke_handler(), https://remote.example.invalid, and unsafe-eval are not code.\n';

    expect(() =>
      validateRustMainPolicy(`${requireLiveArtifacts().rustMain}\n${explanatoryComment}`),
    ).toThrow('The Tauri composition root differs from the reviewed Wave 1 source.');
  });

  it('rejects an early return in the composition root', () => {
    const live = requireLiveArtifacts();
    const rustMain = live.rustMain.replace('fn main() {', 'fn main() {\n    return;');

    expect(() => validateTauriPolicy({ ...live, rustMain })).toThrow(
      'The Tauri composition root contains an unreviewed declaration.',
    );
  });

  it.each([
    {
      label: 'filesystem behavior',
      statement: 'std::fs::write("synthetic", "value");',
    },
    {
      label: 'network behavior',
      statement: 'std::net::TcpStream::connect("127.0.0.1:1");',
    },
    {
      label: 'process behavior',
      statement: 'std::process::Command::new("synthetic");',
    },
  ])('rejects extra build-time $label', ({ statement }) => {
    const live = requireLiveArtifacts();
    const buildScript = live.buildScript.replace(
      '    tauri_build::build();',
      `    ${statement}\n    tauri_build::build();`,
    );

    expect(() => validateTauriPolicy({ ...live, buildScript })).toThrow(
      'The Tauri build script invokes an unreviewed operation.',
    );
  });
});
