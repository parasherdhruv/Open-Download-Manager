import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const nodeFiles = [
  '**/*.config.{js,mjs,cjs,ts,mts,cts}',
  '**/scripts/**/*.{js,mjs,cjs,ts,mts,cts}',
  '**/tests/**/*.{js,mjs,cjs,ts,mts,cts}',
  '**/*.{test,spec}.{js,jsx,mjs,cjs,ts,tsx,mts,cts}',
  'tests/**/*.{js,mjs,cjs,ts,mts,cts}',
];

const reactFiles = ['apps/desktop/src/**/*.{jsx,tsx}'];
const reactRefreshConfig = reactRefresh.configs.vite();

export default defineConfig([
  {
    ignores: [
      '.git/**',
      '.kilo/**',
      '**/node_modules/**',
      '**/target/**',
      '**/gen/schemas/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/blob-report/**',
      '**/.cache/**',
      '**/.vite/**',
      '**/.playwright/**',
      '**/*.min.js',
      '**/*.tsbuildinfo',
      'Cargo.lock',
      'pnpm-lock.yaml',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      'apps/desktop/src/**/*.{js,jsx,ts,tsx}',
      'apps/browser-extension/src/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: reactFiles,
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/prop-types': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['apps/desktop/src/**/*.{jsx,tsx}'],
    ignores: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh.plugin,
    },
    rules: reactRefreshConfig.rules,
  },
]);
