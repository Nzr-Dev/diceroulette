<script setup lang="ts">
import { formulaOf } from '#shared/editor'
import type { Element } from '#shared/schemas'

defineProps<{ element: Element }>()
const { t } = useI18n()
const store = useTableStore()
const editing = computed(() => store.mode === 'edit')
const { open: openEditor } = useEditor()

const icons = { dice: 'i-lucide-dice-5', wheel: 'i-lucide-circle-dot-dashed', counter: 'i-lucide-hash', timer: 'i-lucide-timer' } as const
</script>

<template>
  <UCard :ui="{ body: 'p-3 sm:p-4' }" :class="{ 'opacity-50': !element.enabled }">
    <div class="flex items-center gap-3">
      <UIcon :name="icons[element.type]" class="size-5 shrink-0 text-muted" />
      <span v-if="element.emoji" aria-hidden="true">{{ element.emoji }}</span>
      <h2 class="font-medium truncate">{{ element.name }}</h2>
      <span v-if="element.type === 'dice'" class="text-sm text-muted truncate">{{ formulaOf(element) }}</span>
      <div v-if="editing" class="ms-auto flex items-center gap-1">
        <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" :aria-label="t('element.edit')" @click="openEditor(element.id)" />
        <USwitch :model-value="element.enabled" :aria-label="t('element.enabled')" @update:model-value="store.toggleEnabled(element.id)" />
        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" :aria-label="t('element.remove')" @click="store.removeElement(element.id)" />
      </div>
    </div>

    <ElementDice v-if="element.type === 'dice'" :element="element" />
    <ElementWheel v-else-if="element.type === 'wheel'" :element="element" />
    <ElementCounter v-else-if="element.type === 'counter'" :element="element" />
    <ElementTimer v-else :element="element" />
  </UCard>
</template>
