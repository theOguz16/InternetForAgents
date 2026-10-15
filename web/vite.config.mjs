import { defineConfig } from 'vite';
export default defineConfig({
  root: 'web',
  build: { outDir: '../dist/web', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 3000, strictPort: true,
    proxy: { '/v1': 'http://127.0.0.1:4002', '/registry': 'http://127.0.0.1:4002' } },
});
