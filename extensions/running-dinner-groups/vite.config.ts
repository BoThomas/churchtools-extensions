import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { versionInfoPlugin } from '@churchtools-extensions/build-tools/version-info-plugin';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return defineConfig({
    base: `/ccm/${process.env.VITE_KEY}/`,
    server: {
      port: Number(process.env.VITE_PORT) || 5174,
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
          target: process.env.VITE_EXTERNAL_API_URL,
          changeOrigin: true,
          secure: true,
        },
        // Proxy for legacy AJAX endpoints (email sending, etc.)
        '/': {
          target: process.env.VITE_EXTERNAL_API_URL,
          changeOrigin: true,
          secure: true,
          // Only proxy requests with ?q= query parameter (legacy AJAX)
          bypass: (req) => {
            if (req.url?.includes('?q=')) {
              return null; // Proxy this request
            }
            return req.url; // Don't proxy, serve locally
          },
        },
      },
    },
    plugins: [vue(), tailwindcss(), versionInfoPlugin()],
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
    },
  });
};
