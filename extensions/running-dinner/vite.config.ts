import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return defineConfig({
    base: `/ccm/${process.env.VITE_KEY}/`,
    server: {
      port: Number(process.env.VITE_PORT) || 5173,
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
      },
    },
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
    },
  });
};
