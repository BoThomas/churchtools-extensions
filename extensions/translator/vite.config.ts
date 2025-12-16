import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { versionInfoPlugin } from '@churchtools-extensions/build-tools/version-info-plugin';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  // Load environment variables based on mode
  // When mode is 'e2e', Vite will automatically load .env.e2e
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    base: `/ccm/${env.VITE_KEY}/`,
    server: {
      port: Number(env.VITE_PORT) || 5173,
      https: {
        key: fs.readFileSync(
          path.resolve(__dirname, '../../certs/localhost-key.pem'),
        ),
        cert: fs.readFileSync(
          path.resolve(__dirname, '../../certs/localhost.pem'),
        ),
      },
      proxy: {
        '/api': {
          target: env.VITE_EXTERNAL_API_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    plugins: [vue(), tailwindcss(), versionInfoPlugin()],
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
    },
  });
};
