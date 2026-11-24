<script setup lang="ts">
const { t, locale, locales } = useI18n()
const config = useRuntimeConfig()

// Tells browsers and screen readers the language of the page (the prerendered shell has no lang).
const lang = computed(() => locales.value.find((l) => l.code === locale.value)?.language ?? locale.value)

// Links to the same page in the other languages and the canonical address, for search engines.
const localeHead = useLocaleHead({ seo: true })
useHead(() => ({
  htmlAttrs: { lang: lang.value },
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}))

useSeoMeta({
  description: () => t('seo.description'),
  ogTitle: 'DiceRoulette',
  ogDescription: () => t('seo.description'),
  ogType: 'website',
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <UApp>
    <NuxtPwaManifest />
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </UApp>
</template>
