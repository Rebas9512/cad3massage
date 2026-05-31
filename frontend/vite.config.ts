import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/logo-mark.png'],
      // App shell is precached; API requests are NOT cached (must stay live).
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
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
