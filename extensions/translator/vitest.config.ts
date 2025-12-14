import { mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import rootConfig from '../../vitest.config';

const baseConfig = mergeConfig(viteConfig({ mode: 'test' }), rootConfig);

export default mergeConfig(baseConfig, {
	test: {
		projects: [
			{
				name: 'unit',
				test: {
					include: ['src/**/*.{test,spec}.{ts,tsx}'],
				},
			},
			{
				name: 'integration',
				test: {
					include: ['tests/integration/**/*.test.ts'],
					setupFiles: ['tests/integration/setup.ts'],
					testTimeout: 10000,
				},
			},
		],
	},
});
