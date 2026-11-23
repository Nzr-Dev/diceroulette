<script setup lang="ts">
import { decodeShare } from '#shared/share'
import { parseTable } from '#shared/schemas'

const { t } = useI18n()
const localePath = useLocalePath()
const library = useLibraryStore()
const settings = useSettingsStore()

useSeoMeta({ title: () => t('import.title'), robots: 'noindex' })

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; text: string; name: string; elements: number }
  | { kind: 'invalid'; error: string }
const state = ref<State>({ kind: 'loading' })
const adding = ref(false)

// The data is in the part after «#»: it never reaches the server. It is shown to the person
// for confirmation before anything is saved.
onMounted(async () => {
  await settings.load()
  const data = new URLSearchParams(location.hash.slice(1)).get('t')
  if (!data) return void (state.value = { kind: 'invalid', error: t('import.invalid') })
  try {
    const text = await decodeShare(data)
    const parsed = parseTable(JSON.parse(text))
    state.value = parsed.success
      ? { kind: 'ready', text, name: parsed.data.name, elements: parsed.data.elements.length }
      : { kind: 'invalid', error: t('import.invalid') }
  } catch {
    state.value = { kind: 'invalid', error: t('import.invalid') }
  }
})

async function add() {
  if (state.value.kind !== 'ready') return
  adding.value = true
  const result = await library.importFromText(state.value.text)
  adding.value = false
  if (result.ok) await navigateTo(localePath(`/table/${result.table.id}`))
  else state.value = { kind: 'invalid', error: result.error }
}
</script>

<template>
  <ClientOnly>
    <h1 class="sr-only">{{ t('import.title') }}</h1>
    <UCard v-if="state.kind === 'ready'">
      <div class="space-y-4 text-center">
        <UIcon name="i-lucide-download" class="size-10" />
        <p>{{ t('import.confirm', { name: state.name, n: state.elements }) }}</p>
        <div class="flex justify-center gap-2">
          <UButton color="neutral" variant="outline" :to="localePath('/')" :label="t('play.cancel')" />
          <UButton icon="i-lucide-check" :loading="adding" :label="t('import.add')" @click="add" />
        </div>
      </div>
    </UCard>
    <UAlert v-else-if="state.kind === 'invalid'" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="state.error" />
    <USkeleton v-else class="h-32 w-full" />
    <template #fallback><USkeleton class="h-32 w-full" /></template>
  </ClientOnly>
</template>
