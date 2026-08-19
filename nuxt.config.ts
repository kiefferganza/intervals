export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-08-19',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt', '@vueuse/nuxt'],
  // ssr: false means component-level useHead() only runs after hydration, so
  // anything the browser must see on first parse - the manifest link, the
  // safe-area viewport, the status-bar color - has to live in the app shell.
  app: {
    head: {
      title: 'Interval Timer',
      // viewport-fit=cover is what makes env(safe-area-inset-*) resolve to real
      // values; SetupScreen and TimerScreen both pad with it.
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        { name: 'theme-color', content: '#0a0b0d' }
      ],
      link: [
        // Matches pwa.manifestFilename below (defaults to manifest.webmanifest).
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Interval Timer',
      short_name: 'Intervals',
      description: 'Offline-first interval timer with a custom step sequence',
      // Must match --bg in app.vue and the theme-color meta it sets.
      theme_color: '#0a0b0d',
      background_color: '#0a0b0d',
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
