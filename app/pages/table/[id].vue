<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const store = useTableStore()
const settings = useSettingsStore()

useSeoMeta({ robots: 'noindex' })

const state = ref<'loading' | 'ready' | 'missing'>('loading')
onMounted(async () => {
  await settings.load()
  const found = await store.load(String(route.params.id))
  state.value = found ? 'ready' : 'missing'
})
onBeforeUnmount(() => store.close())
</script>

<template>
  <ClientOnly>
    <TableView v-if="state === 'ready'" />
    <div v-else-if="state === 'missing'" class="text-center py-16 space-y-4">
      <UIcon name="i-lucide-search-x" class="size-10 text-muted" />
      <p>{{ t('library.notFound') }}</p>
      <UButton :to="localePath('/library')" icon="i-lucide-library" :label="t('nav.library')" />
    </div>
    <USkeleton v-else class="h-40 w-full" />
    <template #fallback><USkeleton class="h-40 w-full" /></template>
  </ClientOnly>
</template>
