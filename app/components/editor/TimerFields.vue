<script setup lang="ts">
import { joinDuration, splitDuration } from '#shared/editor'
import { TIMER_MODES, type TimerElement } from '#shared/schemas'

const draft = defineModel<TimerElement>({ required: true })
const { t } = useI18n()

const modeItems = computed(() => TIMER_MODES.map((value) => ({ value, label: t(`editor.${value}`) })))
const parts = computed(() => splitDuration(draft.value.durationSeconds ?? 60))

function setMode(mode: 'countdown' | 'stopwatch') {
  draft.value.mode = mode
  if (mode === 'countdown' && draft.value.durationSeconds === undefined) draft.value.durationSeconds = 60
}
function setMinutes(v: number | null | undefined) {
  draft.value.durationSeconds = Math.max(joinDuration(v ?? 0, parts.value.seconds), 1)
}
function setSeconds(v: number | null | undefined) {
  draft.value.durationSeconds = Math.max(joinDuration(parts.value.minutes, v ?? 0), 1)
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="t('editor.timerMode')">
      <USelect :model-value="draft.mode" :items="modeItems" value-key="value" class="w-full" @update:model-value="(v: string) => setMode(v as 'countdown' | 'stopwatch')" />
    </UFormField>
    <div v-if="draft.mode === 'countdown'" class="grid grid-cols-2 gap-3">
      <UFormField :label="t('editor.minutes')">
        <UInputNumber :model-value="parts.minutes" :min="0" :max="1440" @update:model-value="setMinutes" />
      </UFormField>
      <UFormField :label="t('editor.seconds')">
        <UInputNumber :model-value="parts.seconds" :min="0" :max="59" @update:model-value="setSeconds" />
      </UFormField>
    </div>
    <p class="text-sm text-muted">{{ t('editor.timerResetNote') }}</p>
  </div>
</template>
