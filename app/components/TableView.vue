<script setup lang="ts">
import { createCounter, createStandardDie, createTimer, createWheel, STANDARD_SIDES } from '#shared/engine'

const { t } = useI18n()
const store = useTableStore()
const toast = useToast()


// Saves before the tab is hidden or closed (phones kill tabs without warning).
function onHide() {
  if (document.visibilityState === 'hidden') void store.flush()
}
onMounted(() => document.addEventListener('visibilitychange', onHide))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onHide))

// One tick per second for the timers; the time itself comes from Date.now().
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  interval = setInterval(() => {
    for (const id of store.tick()) {
      const name = store.table?.elements.find((e) => e.id === id)?.name
      toast.add({ title: t('play.timeUp'), description: name, color: 'warning', icon: 'i-lucide-bell-ring' })
    }
  }, 1000)
})
onBeforeUnmount(() => clearInterval(interval))

const library = useLibraryStore()
const localePath = useLocalePath()
const editing = computed(() => store.mode === 'edit')

function addDie(sides: number) {
  store.addElement(createStandardDie(sides))
}
function addWheel() {
  store.addElement(createWheel(t('add.wheel'), [1, 2, 3, 4].map((n) => `${t('add.option')} ${n}`)))
}
function addCounter() {
  store.addElement(createCounter(t('add.counter'), 0))
}
function addTimer() {
  store.addElement(createTimer(t('add.timer'), 60))
}
function addStopwatch() {
  store.addElement(createTimer(t('add.stopwatch')))
}

async function rollEverything() {
  const result = await store.rollEverything()
  if (result.rolled === 0) toast.add({ title: t('home.nothingToRoll'), color: 'warning', icon: 'i-lucide-triangle-alert' })
}

async function saveToLibrary() {
  if (!store.table) return
  await store.flush()
  const result = await library.duplicate(store.table.id, store.table.name)
  if (result.ok) {
    toast.add({ title: t('library.saved'), color: 'success', icon: 'i-lucide-circle-check', actions: [{ label: t('library.open'), onClick: () => navigateTo(localePath(`/table/${result.table.id}`)) }] })
  } else {
    toast.add({ title: result.error, color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>

    <div v-if="store.table" class="space-y-4">
      <div v-if="!store.table.isQuick" class="flex items-center gap-2">
        <UButton :to="localePath('/library')" icon="i-lucide-arrow-left" color="neutral" variant="ghost" :aria-label="t('library.back')" />
        <UInput v-if="editing" :model-value="store.table.name" maxlength="100" class="flex-1" :aria-label="t('editor.name')" @update:model-value="(v: string) => store.rename(v)" />
        <h1 v-else class="text-xl font-semibold truncate">{{ store.table.name }}</h1>
      </div>
      <!-- Every page needs a heading for screen readers; the quick table and the edit-mode name field have none visible. -->
      <h1 v-if="store.table.isQuick || editing" class="sr-only">{{ store.table.isQuick ? t('home.quickTable') : store.table.name }}</h1>

      <TableToolbar @roll-all="rollEverything" />

      <UButton v-if="store.table.isQuick && !editing" size="sm" color="neutral" variant="subtle" icon="i-lucide-save" :label="t('library.saveToLibrary')" @click="saveToLibrary" />

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
        <UButton :label="`+ ${t('add.wheel')}`" size="sm" color="neutral" variant="outline" @click="addWheel" />
        <UButton :label="`+ ${t('add.counter')}`" size="sm" color="neutral" variant="outline" @click="addCounter" />
        <UButton :label="`+ ${t('add.timer')}`" size="sm" color="neutral" variant="outline" @click="addTimer" />
        <UButton :label="`+ ${t('add.stopwatch')}`" size="sm" color="neutral" variant="outline" @click="addStopwatch" />
      </div>

      <div v-if="store.table.elements.length === 0" class="text-center text-muted py-12 space-y-3">
        <UIcon name="i-lucide-dices" class="size-10 mx-auto" />
        <p>{{ t('home.empty') }}</p>
        <UButton v-if="!editing" :label="t('toolbar.edit')" icon="i-lucide-pencil" color="neutral" @click="store.setMode('edit')" />
      </div>

      <ElementCard v-for="element in store.table.elements" :key="element.id" :element="element" />

      <HistoryBox />
      <EditorElementEditor />
    </div>
</template>
