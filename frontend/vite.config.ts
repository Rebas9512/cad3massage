import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the SW ourselves in main.tsx so we can poll for updates on a
      // long-lived standalone PWA (staff iPad) — disable the auto-injected script
      // to avoid a double registration.
      injectRegister: false,
      includeAssets: ['images/logo-mark.png'],
      // App shell is precached; API requests are NOT cached (must stay live).
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
        // A new deploy takes over immediately (no "close every tab" wait) and old
        // precaches are purged, so a device always ends up on the latest bundle.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'CAD3 Massage',
        short_name: 'CAD3',
        description: 'Book personalized chair, foot, and full-body massage in Plano, TX.',
        theme_color: '#6B8F71',
        background_color: '#F5F1E8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/images/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/images/logo-mark.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
