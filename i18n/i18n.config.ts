// Texts that are not translated yet fall back to English.
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
}))
