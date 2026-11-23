<script setup lang="ts">
import { sanitizeDice, validateElement } from '#shared/editor'
import type { Element } from '#shared/schemas'
import { plain } from '~/stores/context'

const { t } = useI18n()
const store = useTableStore()
const { editingId, close } = useEditor()

const draft = ref<Element | null>(null)
const errors = ref<string[]>([])

const open = computed({
  get: () => editingId.value !== null,
  set: (value: boolean) => {
    if (!value) close()
  },
})

// A copy to edit: nothing changes in the table until «Save».
watch(
  editingId,
  (id) => {
    errors.value = []
    const element = id ? store.table?.elements.find((e) => e.id === id) : undefined
    draft.value = element ? plain(element) : null
  },
  { immediate: true },
)

function save() {
  if (!draft.value) return
  const candidate = draft.value.type === 'dice' ? sanitizeDice(plain(draft.value)) : plain(draft.value)
  const result = validateElement(candidate)
  if (!result.ok) {
    errors.value = result.errors
    return
  }
  const saved = store.updateElement(result.element)
  if (saved.ok) close()
  else errors.value = [saved.error]
}
</script>

<template>
  <USlideover v-model:open="open" side="right" :title="t('editor.title')" :description="draft?.name" :ui="{ content: 'w-full max-w-full sm:max-w-lg' }">
    <template #body>
      <div v-if="draft" class="space-y-6">
        <div class="grid grid-cols-[1fr_6rem] gap-3">
          <UFormField :label="t('editor.name')">
            <UInput v-model="draft.name" maxlength="100" class="w-full" />
          </UFormField>
          <UFormField :label="t('editor.emoji')">
            <UInput v-model="draft.emoji" maxlength="16" class="w-full" />
          </UFormField>
        </div>
        <EditorDiceFields v-if="draft.type === 'dice'" v-model="draft" />
      </div>
    </template>
    <template #footer>
      <div class="w-full space-y-3">
        <UAlert v-if="errors.length" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="t('editor.errors')">
          <template #description>
            <ul class="list-disc ps-4"><li v-for="e in errors" :key="e">{{ e }}</li></ul>
          </template>
        </UAlert>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" :label="t('play.cancel')" @click="close()" />
          <UButton icon="i-lucide-check" :label="t('editor.save')" @click="save" />
        </div>
      </div>
    </template>
  </USlideover>
</template>
