<script setup lang="ts">
const { t } = useI18n()
const store = useTableStore()
const settings = useSettingsStore()

useSeoMeta({ title: () => t('home.title'), description: () => t('home.description') })

// The quick table lives in the browser (IndexedDB), so it is opened on the client only.
const ready = ref(false)
onMounted(async () => {
  await settings.load()
  await store.loadQuick(t('home.quickTable'))
  ready.value = true
})
onBeforeUnmount(() => store.close())
</script>

<template>
  <ClientOnly>
    <TableView v-if="ready" />
    <template #fallback>
      <div class="space-y-3">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-28 w-full" />
        <USkeleton class="h-28 w-full" />
      </div>
    </template>
  </ClientOnly>
</template>
