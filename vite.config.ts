import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  // Relative base so the built static site works from any S3 bucket path.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Split large, stable vendors into their own cacheable chunks.
        // KaTeX is intentionally omitted — it's lazy-loaded on first typeset.
        manualChunks: {
          react: ['react', 'react-dom'],
          codemirror: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/autocomplete',
            '@codemirror/language',
            '@lezer/highlight',
          ],
        },
      },
    },
  },
  test: {
    // jsdom unit/component tests live under src/. E2E specs (e2e/) run in a real
    // browser via Playwright and are deliberately excluded here.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});