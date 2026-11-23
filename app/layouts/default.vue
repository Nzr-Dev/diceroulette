<script setup lang="ts">
const { t } = useI18n()

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
    <footer class="text-center text-xs text-muted py-4">{{ t('footer.tagline') }}</footer>
  </div>
</template>
