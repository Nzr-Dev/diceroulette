<script setup lang="ts">
import { LIMITS, type DiceGroup } from '#shared/schemas'
import { numberedFaces } from '#shared/editor'

const group = defineModel<DiceGroup>({ required: true })
defineProps<{ index: number; canRemove: boolean }>()
const emit = defineEmits<{ remove: [] }>()
const { t } = useI18n()

const PAGE = 50
const shown = ref(PAGE)
const sides = ref(group.value.faces.length)

function addFace() {
  if (group.value.faces.length >= LIMITS.maxFacesPerDie) return
  const next = group.value.faces.length + 1
  group.value.faces.push({ id: crypto.randomUUID(), label: String(next), value: next })
  shown.value = Math.max(shown.value, group.value.faces.length)
}
function removeFace(i: number) {
  if (group.value.faces.length > 1) group.value.faces.splice(i, 1)
}
function fill() {
  group.value.faces = numberedFaces(sides.value)
  shown.value = PAGE
}
</script>

<template>
  <div class="rounded-lg border border-default p-3 space-y-3">
    <div class="flex items-end gap-2">
      <UFormField :label="t('editor.count')" class="w-28">
        <UInputNumber v-model="group.count" :min="1" :max="LIMITS.maxDicePerGroup" />
      </UFormField>
      <span class="pb-2 text-muted">× d{{ group.faces.length }}</span>
      <UButton v-if="canRemove" class="ms-auto" icon="i-lucide-trash-2" color="error" variant="ghost" :aria-label="t('editor.removeGroup')" @click="emit('remove')" />
    </div>

    <div class="flex items-end gap-2">
      <UFormField :label="t('editor.sides')" class="w-28">
        <UInputNumber v-model="sides" :min="1" :max="LIMITS.maxFacesPerDie" />
      </UFormField>
      <UButton color="neutral" variant="outline" icon="i-lucide-list-ordered" :label="t('editor.fill')" @click="fill" />
    </div>

    <div class="space-y-2">
      <div v-for="(face, i) in group.faces.slice(0, shown)" :key="face.id" class="flex items-center gap-2">
        <UInput v-model="face.label" :placeholder="t('editor.faceLabel')" :aria-label="t('editor.faceLabel')" maxlength="100" class="flex-1 min-w-0" />
        <UInputNumber
          :model-value="face.value ?? undefined"
          :placeholder="t('editor.faceValue')"
          :aria-label="t('editor.faceValue')"
          class="w-28"
          @update:model-value="(v: number | null | undefined) => (face.value = v ?? undefined)"
        />
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" :disabled="group.faces.length <= 1" :aria-label="t('editor.removeFace')" @click="removeFace(i)" />
      </div>
      <div class="flex items-center gap-2">
        <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-plus" :label="t('editor.addFace')" :disabled="group.faces.length >= LIMITS.maxFacesPerDie" @click="addFace" />
        <UButton v-if="group.faces.length > shown" size="sm" color="neutral" variant="ghost" :label="t('editor.showMore', { n: group.faces.length - shown })" @click="shown += PAGE" />
      </div>
    </div>
  </div>
</template>
