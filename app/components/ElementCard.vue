<script setup lang="ts">
import { timerDisplayMs } from '#shared/engine'
import type { Element } from '#shared/schemas'

const props = defineProps<{ element: Element }>()
const { t } = useI18n()
const store = useTableStore()
const editing = computed(() => store.mode === 'edit')

/** Mm:ss for the timers. */
function clock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const now = ref(Date.now())
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  interval = setInterval(() => (now.value = Date.now()), 250)
})
onBeforeUnmount(() => clearInterval(interval))

const icons = { dice: 'i-lucide-dice-5', wheel: 'i-lucide-circle-dot-dashed', counter: 'i-lucide-hash', timer: 'i-lucide-timer' } as const
</script>

<template>
  <UCard :ui="{ body: 'p-3 sm:p-4' }" :class="{ 'opacity-50': !element.enabled }">
    <div class="flex items-center gap-3">
      <UIcon :name="icons[element.type]" class="size-5 shrink-0 text-muted" />
      <span class="font-medium truncate">{{ element.name }}</span>
      <div v-if="editing" class="ms-auto flex items-center gap-1">
        <USwitch :model-value="element.enabled" :aria-label="t('element.enabled')" @update:model-value="store.toggleEnabled(element.id)" />
        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" :aria-label="t('element.remove')" @click="store.removeElement(element.id)" />
      </div>
    </div>

    <!-- Dice -->
    <div v-if="element.type === 'dice'" class="mt-3 flex items-center gap-3">
      <UButton :label="t('element.roll')" icon="i-lucide-dices" :disabled="!element.enabled" @click="store.roll(element.id)" />
      <div v-if="element.lastRoll" class="flex items-baseline gap-2">
        <span class="text-3xl font-bold tabular-nums">{{ element.lastRoll.total ?? element.lastRoll.results.map((r) => r.label).join(' ') }}</span>
        <UIcon v-if="element.lastRoll.results.some((r) => r.isCritical)" name="i-lucide-star" class="text-success size-5" />
        <UIcon v-if="element.lastRoll.results.some((r) => r.isFumble)" name="i-lucide-skull" class="text-error size-5" />
      </div>
    </div>

    <!-- Wheel -->
    <div v-else-if="element.type === 'wheel'" class="mt-3 flex items-center gap-3">
      <UButton :label="t('element.spin')" icon="i-lucide-rotate-cw" :disabled="!element.enabled" @click="store.roll(element.id)" />
      <span v-if="element.lastResult" class="text-2xl font-bold">{{ element.lastResult.label }}</span>
    </div>

    <!-- Counter -->
    <div v-else-if="element.type === 'counter'" class="mt-3 flex items-center justify-center gap-4">
      <UButton icon="i-lucide-minus" size="xl" color="neutral" variant="outline" :aria-label="t('element.decrease')" :disabled="!element.enabled" @click="store.step(element.id, -1)" />
      <span class="text-5xl font-bold tabular-nums min-w-24 text-center">{{ element.value }}</span>
      <UButton icon="i-lucide-plus" size="xl" color="neutral" variant="outline" :aria-label="t('element.increase')" :disabled="!element.enabled" @click="store.step(element.id, 1)" />
    </div>

    <!-- Timer -->
    <div v-else class="mt-3 flex items-center gap-3">
      <span class="text-4xl font-bold tabular-nums" :class="{ 'text-warning': element.status === 'finished' }">
        {{ clock(timerDisplayMs(element, now)) }}
      </span>
      <UIcon v-if="element.status === 'finished'" name="i-lucide-bell-ring" class="size-6 text-warning" />
      <UButton
        v-if="element.status === 'running'"
        icon="i-lucide-pause"
        :label="t('element.pause')"
        color="neutral"
        variant="outline"
        @click="store.pause(element.id)"
      />
      <UButton v-else icon="i-lucide-play" :label="t('element.start')" :disabled="!element.enabled || element.status === 'finished'" @click="store.start(element.id)" />
      <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" :aria-label="t('element.reset')" @click="store.resetElement(element.id)" />
    </div>
  </UCard>
</template>
