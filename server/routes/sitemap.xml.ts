import { LOCALES } from '#shared/schemas'

/** Pages that are the same for everybody (the library and the tables are personal and are not listed). */
const PAGES = ['', '/help', '/privacy', '/terms']
const DEFAULT_LOCALE = 'en'

export default defineEventHandler((event) => {
  const site = useRuntimeConfig(event).public.siteUrl
  const url = (locale: string, page: string) => `${site}${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${page}` || `${site}/`

  const entries = PAGES.flatMap((page) =>
    LOCALES.map((locale) => {
      const alternates = LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(l, page)}"/>`).join('\n')
      return `  <url>\n    <loc>${url(locale, page)}</loc>\n${alternates}\n  </url>`
    }),
  )

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`
})
