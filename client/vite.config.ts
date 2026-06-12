import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Force new SW to activate immediately without waiting for tabs to close.
      // Without this, mobile users stay on the OLD cached version until they
      // manually close all tabs — which they never do.
      injectManifest: undefined,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/super-admin/, /^\/api/],
        // Take control immediately on update
        skipWaiting: true,
        clientsClaim: true,
        // API calls: network-first — never serve stale API responses from cache
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Medicos EMR',
        short_name: 'MedicosEMR',
        description: 'Offline-first hospital EMR system',
        theme_color: '#1d4ed8',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
