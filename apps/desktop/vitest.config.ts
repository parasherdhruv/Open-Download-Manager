import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    allowOnly: false,
    clearMocks: true,
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.vite/**',
    ],
    fileParallelism: false,
    globals: false,
    hookTimeout: 10_000,
    include: ['src/**/*.test.{ts,tsx}'],
    isolate: true,
    maxConcurrency: 1,
    maxWorkers: 1,
    mockReset: true,
    passWithNoTests: false,
    pool: 'forks',
    restoreMocks: true,
    retry: 0,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10_000,
    unstubEnvs: true,
    unstubGlobals: true,
    watch: false,
  },
});
