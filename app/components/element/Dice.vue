<script setup lang="ts">
import { exclusionStatus } from '#shared/engine'
import type { DiceElement } from '#shared/schemas'

const props = defineProps<{ element: DiceElement }>()
const { t } = useI18n()
const store = useTableStore()
const player = usePlayer()

const MAX_FACES_SHOWN = 60
const rolling = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

const status = computed(() => exclusionStatus(props.element))
const roll = computed(() => props.element.lastRoll)
const visible = computed(() => roll.value?.results.slice(0, MAX_FACES_SHOWN) ?? [])
const hidden = computed(() => (roll.value?.results.length ?? 0) - visible.value.length)
const hasModifiers = computed(() => props.element.modifiers.length > 0)

async function doRoll() {
  if (rolling.value) return
  const result = await store.roll(props.element.id, { player: player.value })
  if (!result.ok) return
  if (prefersReducedMotion()) return
  rolling.value = true
  timer = setTimeout(() => (rolling.value = false), 450)
}
</script>

<template>
  <div class="mt-3 space-y-3">
    <div class="flex items-center gap-3">
      <UButton
        :label="t('element.roll')"
        icon="i-lucide-dices"
        size="lg"
        :disabled="!element.enabled || status.exhausted"
        :loading="rolling"
        @click="doRoll"
      />
      <UBadge v-if="status.remaining !== null" color="neutral" variant="subtle" :label="t('play.remaining', { n: status.remaining })" />
    </div>

    <UAlert
      v-if="status.exhausted"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('play.exhausted')"
      :actions="[{ label: t('element.reset'), icon: 'i-lucide-rotate-ccw', color: 'neutral', variant: 'outline', onClick: () => store.resetElement(element.id) }]"
    />

    <div v-if="roll" role="status" aria-live="polite" class="space-y-2">
      <div class="flex flex-wrap gap-2" :class="{ 'dr-shake': rolling }">
        <ElementDieFace
          v-for="(die, i) in visible"
          :key="i"
          :label="rolling ? '?' : die.label"
          :shape="element.appearance.shape"
          :color="element.appearance.color"
          :border-color="element.appearance.borderColor"
          :border-width="element.appearance.borderWidth"
          :critical="!rolling && die.isCritical"
          :fumble="!rolling && die.isFumble"
          :winner="!rolling && die.isWinner"
        />
        <span v-if="hidden > 0" class="self-center text-sm text-muted">{{ t('play.more', { n: hidden }) }}</span>
      </div>

      <div v-if="!rolling" class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span v-if="roll.total !== null" class="text-4xl font-bold tabular-nums">{{ roll.total }}</span>
        <span v-if="hasModifiers && roll.raw !== null && roll.raw !== roll.total" class="text-sm text-muted">
          {{ t('play.rawResult') }}: {{ roll.raw }}
        </span>
        <span v-if="roll.error === 'divisionByZero'" class="inline-flex items-center gap-1 text-error">
          <UIcon name="i-lucide-octagon-alert" class="size-5" />{{ t('play.divisionByZero') }}
        </span>
        <span v-if="roll.difficultyMet === true" class="inline-flex items-center gap-1 text-success font-medium">
          <UIcon name="i-lucide-circle-check" class="size-5" />{{ t('play.success') }}
        </span>
        <span v-else-if="roll.difficultyMet === false" class="inline-flex items-center gap-1 text-error font-medium">
          <UIcon name="i-lucide-circle-x" class="size-5" />{{ t('play.failed') }}
        </span>
      </div>
    </div>
  </div>
</template>
