<script setup lang="ts">
import { LIMITS, type CounterElement } from '#shared/schemas'

const draft = defineModel<CounterElement>({ required: true })
const { t } = useI18n()

const orNull = (v: number | null | undefined) => v ?? null

function addAlert() {
  if (draft.value.alerts.length < LIMITS.maxAlertsPerCounter) draft.value.alerts.push({ id: crypto.randomUUID(), value: 0, message: '' })
}
</script>

<template>
  <div class="space-y-6">
    <section class="grid grid-cols-2 gap-3">
      <UFormField :label="t('editor.initial')">
        <UInputNumber v-model="draft.initial" :step="draft.step" />
      </UFormField>
      <UFormField :label="t('editor.step')">
        <UInputNumber v-model="draft.step" :min="0.0001" :step="draft.allowDecimals ? 0.5 : 1" />
      </UFormField>
      <UFormField :label="t('editor.min')">
        <UInputNumber :model-value="draft.min ?? undefined" :placeholder="t('editor.noLimit')" @update:model-value="(v: number | null | undefined) => (draft.min = orNull(v))" />
      </UFormField>
      <UFormField :label="t('editor.max')">
        <UInputNumber :model-value="draft.max ?? undefined" :placeholder="t('editor.noLimit')" @update:model-value="(v: number | null | undefined) => (draft.max = orNull(v))" />
      </UFormField>
    </section>

    <section class="space-y-3">
      <USwitch v-model="draft.allowNegative" :label="t('editor.allowNegative')" />
      <USwitch v-model="draft.allowDecimals" :label="t('editor.allowDecimals')" />
    </section>

    <section class="space-y-3">
      <h3 class="font-semibold">{{ t('editor.alerts') }}</h3>
      <div v-for="(alert, i) in draft.alerts" :key="alert.id" class="flex items-center gap-2">
        <UInputNumber v-model="alert.value" class="w-28" :aria-label="t('editor.alertValue')" />
        <UInput v-model="alert.message" :placeholder="t('editor.alertMessage')" :aria-label="t('editor.alertMessage')" maxlength="100" class="flex-1 min-w-0" />
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="t('editor.removeAlert')" @click="draft.alerts.splice(i, 1)" />
      </div>
      <p class="text-sm text-muted">{{ t('editor.alertHelp') }}</p>
      <UButton color="neutral" variant="outline" icon="i-lucide-plus" :label="t('editor.addAlert')" :disabled="draft.alerts.length >= LIMITS.maxAlertsPerCounter" @click="addAlert" />
    </section>
  </div>
</template>
