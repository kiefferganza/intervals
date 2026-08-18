export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-08-19',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Interval Timer',
      short_name: 'Intervals',
      description: 'Offline-first warmup/work/rest interval timer',
      theme_color: '#111827',
      background_color: '#111827',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}']
    }
  }
})
