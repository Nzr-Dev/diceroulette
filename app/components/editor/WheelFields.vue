<script setup lang="ts">
import { LIMITS, type WheelElement } from '#shared/schemas'
import { addSectors, sectorsFromLines } from '#shared/editor'

const draft = defineModel<WheelElement>({ required: true })
const { t } = useI18n()

const PAGE = 50
const shown = ref(PAGE)
const bulk = ref('')

function addOne() {
  if (draft.value.sectors.length >= LIMITS.maxSectorsPerWheel) return
  draft.value.sectors.push({ id: crypto.randomUUID(), label: `${t('add.option')} ${draft.value.sectors.length + 1}`, weight: 1 })
  shown.value = Math.max(shown.value, draft.value.sectors.length)
}
function addMany() {
  draft.value = addSectors(draft.value, sectorsFromLines(bulk.value))
  bulk.value = ''
  shown.value = Math.max(shown.value, PAGE)
}
function remove(i: number) {
  if (draft.value.sectors.length > 1) draft.value.sectors.splice(i, 1)
}
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-2">
      <USwitch v-model="draft.noRepeat" :label="t('editor.noRepeat')" />
      <p class="text-sm text-muted">{{ t('editor.noRepeatHelp') }}</p>
      <EditorColorField v-model="draft.borderColor" :label="t('editor.borderColor')" />
    </section>

    <section class="space-y-3">
      <h3 class="font-semibold">{{ t('editor.sectors') }} ({{ draft.sectors.length }})</h3>
      <div v-for="(sector, i) in draft.sectors.slice(0, shown)" :key="sector.id" class="flex items-center gap-2">
        <input
          type="color"
          :value="sector.color ?? '#71717a'"
          class="h-9 w-9 shrink-0 rounded border border-default bg-transparent p-0.5 cursor-pointer"
          :aria-label="t('editor.color')"
          @input="sector.color = ($event.target as HTMLInputElement).value"
        />
        <UInput v-model="sector.label" :placeholder="t('editor.sectorLabel')" :aria-label="t('editor.sectorLabel')" maxlength="100" class="flex-1 min-w-0" />
        <UInputNumber v-model="sector.weight" :min="0.1" :max="1000" :step="1" class="w-28" :aria-label="t('editor.weight')" />
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" :disabled="draft.sectors.length <= 1" :aria-label="t('editor.removeSector')" @click="remove(i)" />
      </div>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="outline" icon="i-lucide-plus" :label="t('editor.addSector')" :disabled="draft.sectors.length >= LIMITS.maxSectorsPerWheel" @click="addOne" />
        <UButton v-if="draft.sectors.length > shown" size="sm" color="neutral" variant="ghost" :label="t('editor.showMore', { n: draft.sectors.length - shown })" @click="shown += PAGE" />
      </div>
    </section>

    <section class="space-y-2">
      <h3 class="font-semibold">{{ t('editor.bulkAdd') }}</h3>
      <UTextarea v-model="bulk" :rows="4" :placeholder="t('editor.bulkPlaceholder')" class="w-full" />
      <UButton color="neutral" variant="outline" icon="i-lucide-list-plus" :label="t('editor.bulkButton')" :disabled="!bulk.trim()" @click="addMany" />
    </section>
  </div>
</template>
