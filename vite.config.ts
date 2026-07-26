import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell plus the KaTeX chunk + fonts, so maths still
      // typesets offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,ttf}'],
      },
      manifest: {
        name: 'acalc — a keyboard-first calculator',
        short_name: 'acalc',
        description:
          'A keyboard-first browser calculator: reference earlier results with $n, live recompute, units, dates and number bases.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
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