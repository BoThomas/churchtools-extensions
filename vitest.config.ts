import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all extensions and packages.
 * Individual extensions can extend this configuration as needed.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'test-results/coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
        '**/vite-env.d.ts',
      ],
    },
  },
});
