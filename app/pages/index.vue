<script setup lang="ts">
import { createStandardDie, STANDARD_SIDES } from '#shared/engine'

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

// Saves before the tab is hidden or closed (phones kill tabs without warning).
function onHide() {
  if (document.visibilityState === 'hidden') void store.flush()
}
onMounted(() => document.addEventListener('visibilitychange', onHide))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onHide))

// One tick per second for the timers; the time itself comes from Date.now().
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  interval = setInterval(() => store.tick(), 1000)
})
onBeforeUnmount(() => clearInterval(interval))

const editing = computed(() => store.mode === 'edit')
const toast = useToast()

function addDie(sides: number) {
  store.addElement(createStandardDie(sides))
}

async function rollEverything() {
  const result = await store.rollEverything()
  if (result.rolled === 0) toast.add({ title: t('home.nothingToRoll'), color: 'warning', icon: 'i-lucide-triangle-alert' })
}
</script>

<template>
  <ClientOnly>
    <div v-if="ready && store.table" class="space-y-4">
      <TableToolbar @roll-all="rollEverything" />

      <div v-if="editing" class="flex flex-wrap gap-2">
        <UButton
          v-for="sides in STANDARD_SIDES"
          :key="sides"
          :label="`+ d${sides}`"
          size="sm"
          color="neutral"
          variant="outline"
          @click="addDie(sides)"
        />
      </div>

      <div v-if="store.table.elements.length === 0" class="text-center text-muted py-12 space-y-3">
        <UIcon name="i-lucide-dices" class="size-10 mx-auto" />
        <p>{{ t('home.empty') }}</p>
        <UButton v-if="!editing" :label="t('toolbar.edit')" icon="i-lucide-pencil" color="neutral" @click="store.setMode('edit')" />
      </div>

      <ElementCard v-for="element in store.table.elements" :key="element.id" :element="element" />

      <HistoryBox />
    </div>
    <template #fallback>
      <div class="space-y-3">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-28 w-full" />
        <USkeleton class="h-28 w-full" />
      </div>
    </template>
  </ClientOnly>
</template>
