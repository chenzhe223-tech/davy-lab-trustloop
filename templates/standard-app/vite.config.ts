import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const basePath = process.env.BASE_PATH?.trim() || '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
