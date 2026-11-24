<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

// Automatic sync with the account (does nothing if there is no account). Only in the browser.
onMounted(() => useSync().start())

useHead({
  titleTemplate: (title) => (title ? `${title} · DiceRoulette` : 'DiceRoulette'),
})
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <AppHeader />
    <main class="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 py-4">
      <slot />
    </main>
    <footer class="flex flex-col items-center gap-2 text-center text-xs text-muted py-4">
      <ClientOnly><InstallButton /></ClientOnly>
      <nav class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <NuxtLink v-for="page in ['help', 'privacy', 'terms']" :key="page" :to="localePath(`/${page}`)" class="underline underline-offset-2">{{ t(`footer.${page}`) }}</NuxtLink>
      </nav>
      <span>{{ t('footer.tagline') }}</span>
    </footer>
  </div>
</template>
