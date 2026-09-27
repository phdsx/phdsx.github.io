import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'play', emptyOutDir: true, chunkSizeWarningLimit: 1700 },
});
