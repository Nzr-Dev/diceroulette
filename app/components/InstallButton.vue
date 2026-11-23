<script setup lang="ts">
/** Shows «Install» only when the browser says the app can be installed. */
const { t } = useI18n()
const { $pwa } = useNuxtApp()
const toast = useToast()

// Tell the person once that it now works without a connection.
watch(
  () => $pwa?.offlineReady,
  (ready) => {
    if (ready) toast.add({ title: t('pwa.offlineReady'), icon: 'i-lucide-wifi-off', color: 'success' })
  },
)
</script>

<template>
  <UButton
    v-if="$pwa?.showInstallPrompt && !$pwa?.isPWAInstalled"
    size="xs"
    color="neutral"
    variant="subtle"
    icon="i-lucide-download"
    :label="t('pwa.install')"
    @click="$pwa.install()"
  />
</template>
