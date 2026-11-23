<script setup lang="ts">
// Tells browsers and screen readers the language of the page (the prerendered shell has no lang).
const { locale, locales } = useI18n()
const lang = computed(() => locales.value.find((l) => l.code === locale.value)?.language ?? locale.value)
useHead({ htmlAttrs: { lang: () => lang.value } })
</script>

<template>
  <UApp>
    <!-- Adds the manifest link and registers the service worker (installable, works offline). -->
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
