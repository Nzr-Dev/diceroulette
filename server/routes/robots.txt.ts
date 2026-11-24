// Search engines may read everything public. Private pages (library, tables) already ask not to be indexed.
export default defineEventHandler((event) => {
  const site = useRuntimeConfig(event).public.siteUrl
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`
})
