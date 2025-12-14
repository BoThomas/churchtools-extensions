import { mergeConfig } from 'vitest/config';
import viteConfig from '../vite.config';
import rootConfig from '../../../vitest.config';

export default mergeConfig(
  mergeConfig(viteConfig({ mode: 'test' }), rootConfig),
  {
    test: {
      include: ['tests/integration/**/*.test.ts'],
      name: 'integration',
      environment: 'jsdom',
      setupFiles: ['./tests/integration/setup.ts'],
      testTimeout: 10000, // Longer for integration tests
    },
  },
);
