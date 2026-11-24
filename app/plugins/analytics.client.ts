import { injectAnalytics } from '@vercel/analytics/nuxt/runtime'

/**
 * Visit statistics with Vercel Web Analytics: no cookies, nothing stored in the browser, and only
 * aggregated data (see the privacy page). It does nothing while developing, only on the deployed site.
 * It follows page changes inside the app too.
 */
export default defineNuxtPlugin(() => {
  injectAnalytics({
    // Shared tables travel in the part of the link after «#». Never send that (or any query) to the statistics.
    beforeSend: (event) => {
      const url = new URL(event.url)
      url.hash = ''
      url.search = ''
      return { ...event, url: url.toString() }
    },
  })
})
