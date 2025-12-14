import { mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import rootConfig from '../../vitest.config';

// Merge Vite config (for Vue plugin, aliases, etc.) with root Vitest config
export default mergeConfig(viteConfig({ mode: 'test' }), rootConfig);
