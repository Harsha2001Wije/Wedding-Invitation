import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` → normal multi-file build (the 3D world is a lazy chunk).
// `npm run build:single` → one self-contained HTML file for quick sharing/preview.
export default defineConfig(({ mode }) => ({
  // Set base to repo name for GitHub Pages; local dev still works fine at /
  base: mode === 'production' ? '/Wedding-Invitation/' : '/',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1600,
    // The one-file build inlines textures; the normal build keeps them as files.
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
}));
