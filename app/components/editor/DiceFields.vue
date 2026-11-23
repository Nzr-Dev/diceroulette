<script setup lang="ts">
import { LIMITS, OPERATIONS, SHAPES, WINNER_MODES, type DiceElement } from '#shared/schemas'
import { addGroup } from '#shared/editor'

const draft = defineModel<DiceElement>({ required: true })
const { t } = useI18n()

const shapeItems = computed(() => SHAPES.map((value) => ({ value, label: t(`shapes.${value}`) })))
const operationItems = computed(() => OPERATIONS.map((value) => ({ value, label: t(`ops.${value}`) })))
const winnerItems = computed(() => WINNER_MODES.map((value) => ({ value, label: t(`editor.winner_${value}`) })))
const formatItems = computed(() => [
  { value: 'integer', label: t('editor.integer') },
  { value: 'decimal', label: t('editor.decimal') },
])
const roundingItems = computed(() => [
  { value: 'down', label: t('editor.roundDown') },
  { value: 'up', label: t('editor.roundUp') },
])

function addGroupHere() {
  draft.value = addGroup(draft.value)
}
function removeGroupHere(id: string) {
  if (draft.value.groups.length > 1) draft.value.groups = draft.value.groups.filter((g) => g.id !== id)
}
function addModifier() {
  if (draft.value.modifiers.length < LIMITS.maxModifiersPerElement) draft.value.modifiers.push({ id: crypto.randomUUID(), label: '', value: 1 })
}
const optional = (v: number | null | undefined) => v ?? undefined
</script>

<template>
  <div class="space-y-6">
    <!-- Appearance -->
    <section class="space-y-3">
      <h3 class="font-semibold">{{ t('editor.appearance') }}</h3>
      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="t('editor.shape')">
          <USelect v-model="draft.appearance.shape" :items="shapeItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField :label="t('editor.borderWidth')">
          <UInputNumber v-model="draft.appearance.borderWidth" :min="0" :max="8" />
        </UFormField>
        <EditorColorField v-model="draft.appearance.color" :label="t('editor.color')" />
        <EditorColorField v-model="draft.appearance.borderColor" :label="t('editor.borderColor')" />
      </div>
    </section>

    <!-- Groups -->
    <section class="space-y-3">
      <h3 class="font-semibold">{{ t('editor.groups') }}</h3>
      <EditorGroupEditor
        v-for="(group, i) in draft.groups"
        :key="group.id"
        v-model="draft.groups[i]!"
        :index="i"
        :can-remove="draft.groups.length > 1"
        @remove="removeGroupHere(group.id)"
      />
      <UButton color="neutral" variant="outline" icon="i-lucide-plus" :label="t('editor.addGroup')" :disabled="draft.groups.length >= LIMITS.maxGroupsPerElement" @click="addGroupHere" />
    </section>

    <!-- Operation, format, modifiers -->
    <section class="space-y-3">
      <h3 class="font-semibold">{{ t('editor.operation') }}</h3>
      <USelect v-model="draft.operation" :items="operationItems" value-key="value" class="w-full" />

      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="t('editor.format')">
          <USelect v-model="draft.numberFormat.mode" :items="formatItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField v-if="draft.numberFormat.mode === 'integer'" :label="t('editor.rounding')">
          <USelect v-model="draft.numberFormat.rounding" :items="roundingItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField v-else :label="t('editor.decimals')">
          <UInputNumber v-model="draft.numberFormat.decimals" :min="1" :max="4" />
        </UFormField>
      </div>

      <h3 class="font-semibold pt-2">{{ t('editor.modifiers') }}</h3>
      <div v-for="(m, i) in draft.modifiers" :key="m.id" class="flex items-center gap-2">
        <UInput v-model="m.label" :placeholder="t('editor.modifierLabel')" :aria-label="t('editor.modifierLabel')" maxlength="100" class="flex-1 min-w-0" />
        <UInputNumber v-model="m.value" class="w-28" :aria-label="t('editor.faceValue')" />
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="t('editor.removeModifier')" @click="draft.modifiers.splice(i, 1)" />
      </div>
      <UButton color="neutral" variant="outline" icon="i-lucide-plus" :label="t('editor.addModifier')" :disabled="draft.modifiers.length >= LIMITS.maxModifiersPerElement" @click="addModifier" />
    </section>

    <!-- Highlights -->
    <section class="space-y-3">
      <h3 class="font-semibold">{{ t('editor.highlights') }}</h3>

      <div class="flex items-center gap-3">
        <USwitch v-model="draft.highlights.winner.enabled" :label="t('editor.winner')" />
        <USelect v-if="draft.highlights.winner.enabled" v-model="draft.highlights.winner.mode" :items="winnerItems" value-key="value" class="ms-auto w-48" />
      </div>
      <div class="flex items-center gap-3">
        <USwitch v-model="draft.highlights.critical.enabled" :label="t('editor.critical')" />
        <UInputNumber
          v-if="draft.highlights.critical.enabled"
          class="ms-auto w-40"
          :model-value="draft.highlights.critical.value ?? undefined"
          :placeholder="t('editor.criticalAt')"
          :aria-label="t('editor.criticalAt')"
          @update:model-value="(v: number | null | undefined) => (draft.highlights.critical.value = optional(v))"
        />
      </div>
      <div class="flex items-center gap-3">
        <USwitch v-model="draft.highlights.fumble.enabled" :label="t('editor.fumble')" />
        <UInputNumber
          v-if="draft.highlights.fumble.enabled"
          class="ms-auto w-40"
          :model-value="draft.highlights.fumble.value ?? undefined"
          :placeholder="t('editor.fumbleAt')"
          :aria-label="t('editor.fumbleAt')"
          @update:model-value="(v: number | null | undefined) => (draft.highlights.fumble.value = optional(v))"
        />
      </div>
      <UFormField :label="t('editor.difficulty')">
        <UInputNumber
          :model-value="draft.highlights.difficulty ?? undefined"
          @update:model-value="(v: number | null | undefined) => (draft.highlights.difficulty = optional(v))"
        />
      </UFormField>
    </section>

    <!-- Exclusion -->
    <section class="space-y-2">
      <USwitch v-model="draft.exclusion.enabled" :label="t('editor.exclusion')" />
      <p class="text-sm text-muted">{{ t('editor.exclusionHelp') }}</p>
    </section>
  </div>
</template>
