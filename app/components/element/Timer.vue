<script setup lang="ts">
import { formatClock, timerDisplayMs } from '#shared/engine'
import type { TimerElement } from '#shared/schemas'

const props = defineProps<{ element: TimerElement }>()
const { t } = useI18n()
const store = useTableStore()
const now = useNow()

const display = computed(() => timerDisplayMs(props.element, now.value))
const finished = computed(() => props.element.status === 'finished')
const progress = computed(() => {
  const total = (props.element.durationSeconds ?? 0) * 1000
  return props.element.mode === 'countdown' && total > 0 ? Math.round((display.value / total) * 100) : null
})
</script>

<template>
  <div class="mt-3 space-y-3">
    <div class="flex items-center gap-3">
      <span class="text-5xl font-bold tabular-nums" :class="{ 'text-warning dr-pulse': finished }" role="timer">
        {{ formatClock(display) }}
      </span>
      <span v-if="finished" role="alert" class="inline-flex items-center gap-1 text-warning font-medium">
        <UIcon name="i-lucide-bell-ring" class="size-6" />{{ t('play.timeUp') }}
      </span>
    </div>
    <UProgress v-if="progress !== null" :model-value="progress" :color="finished ? 'warning' : 'neutral'" size="sm" />
    <div class="flex items-center gap-2">
      <UButton
        v-if="element.status === 'running'"
        icon="i-lucide-pause"
        :label="t('element.pause')"
        size="lg"
        color="neutral"
        variant="outline"
        @click="store.pause(element.id)"
      />
      <UButton
        v-else
        icon="i-lucide-play"
        :label="t('element.start')"
        size="lg"
        :disabled="!element.enabled || finished"
        @click="store.start(element.id)"
      />
      <UButton icon="i-lucide-rotate-ccw" size="lg" color="neutral" variant="ghost" :aria-label="t('element.reset')" @click="store.resetElement(element.id)" />
    </div>
  </div>
</template>
