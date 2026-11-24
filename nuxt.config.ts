// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  // Dark by default; the user can switch to light and the browser remembers it.
  colorMode: { preference: 'dark', fallback: 'dark' },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [{ name: 'theme-color', content: '#0b0b0d' }],
    },
  },

  // The home page is built ahead of time: it is the offline fallback and loads faster.
  routeRules: { '/': { prerender: true } },
  // An empty app shell: any other page opened offline starts from it and the app draws the right page.
  nitro: { prerender: { routes: ['/200.html'] } },

  // Installable and usable offline. The tables live on the device, so once the app files
  // are cached everything works without a connection.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'DiceRoulette',
      short_name: 'DiceRoulette',
      description: 'Dice, wheels, counters and timers for board games, RPGs and card games.',
      lang: 'en',
      theme_color: '#0b0b0d',
      background_color: '#0b0b0d',
      display: 'standalone',
      orientation: 'any',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    generateSW: {
      navigateFallback: '/200.html',
      manifestTransforms: [
        (entries) => ({
          manifest: entries.map((e) => (e.url === '200' ? { ...e, url: '200.html' } : e)),
          warnings: [],
        }),
      ],
      // /api/ must reach the server: Google sends the person back to /api/auth/callback/google.
      navigateFallbackDenylist: [/^\/api\//, /^\/_nuxt\//, /^\/_i18n\//, /\.\w+$/],
      // The module already adds Nuxt's own build files; the translations are added here.
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}', '_i18n/**/*.json'],
      cleanupOutdatedCaches: true,
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
  },

  // The `shared/` folder is also used by the server later, so it keeps no Vue code.
  // Public address of the site (no final slash). Set NUXT_PUBLIC_SITE_URL in Vercel; used for links in search engines.
  runtimeConfig: { public: { siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000' } },

  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    vueI18n: 'i18n.config.ts',
    lazy: true,
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'ca', language: 'ca-ES', name: 'Català', file: 'ca.json' },
      { code: 'pt-BR', language: 'pt-BR', name: 'Português (Brasil)', file: 'pt-BR.json' },
      { code: 'pt-PT', language: 'pt-PT', name: 'Português (Portugal)', file: 'pt-PT.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.json' },
      { code: 'pl', language: 'pl-PL', name: 'Polski', file: 'pl.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
      { code: 'uk', language: 'uk-UA', name: 'Українська', file: 'uk.json' },
      { code: 'el', language: 'el-GR', name: 'Ελληνικά', file: 'el.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
  },
})
