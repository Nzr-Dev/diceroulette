<script setup lang="ts">
import { reachedAlerts } from '#shared/engine'
import type { CounterElement } from '#shared/schemas'

const props = defineProps<{ element: CounterElement }>()
const { t, locale } = useI18n()
const store = useTableStore()

const up = useHoldRepeat((m) => store.step(props.element.id, 1, m))
const down = useHoldRepeat((m) => store.step(props.element.id, -1, m))

const alerts = computed(() => reachedAlerts(props.element))
const text = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 4 }).format(props.element.value))

const editing = ref(false)
const draft = ref(0)
function openEditor() {
  draft.value = props.element.value
  editing.value = true
}
function apply() {
  store.setCounter(props.element.id, Number(draft.value))
  editing.value = false
}
function rotate() {
  store.updateElement({ ...props.element, rotation: props.element.rotation === 180 ? 0 : 180 })
}
</script>

<template>
  <div class="mt-3 space-y-3">
    <!-- Turned upside down for the player sitting opposite -->
    <div class="flex items-center justify-center gap-3 select-none" :style="{ transform: element.rotation === 180 ? 'rotate(180deg)' : undefined }">
      <UButton
        icon="i-lucide-minus"
        size="xl"
        color="neutral"
        variant="outline"
        class="size-16 justify-center touch-manipulation"
        :aria-label="t('element.decrease')"
        :disabled="!element.enabled"
        @pointerdown.prevent="down.start"
        @pointerup="down.stop"
        @pointerleave="down.stop"
        @pointercancel="down.stop"
        @keydown.enter.space.prevent="store.step(element.id, -1)"
        @contextmenu.prevent
      />
      <button
        type="button"
        class="min-w-28 text-center text-6xl font-bold tabular-nums rounded-lg focus-visible:outline-2 outline-info"
        :aria-label="t('play.setValue')"
        :disabled="!element.enabled"
        @click="openEditor"
      >
        {{ text }}
      </button>
      <UButton
        icon="i-lucide-plus"
        size="xl"
        color="neutral"
        variant="outline"
        class="size-16 justify-center touch-manipulation"
        :aria-label="t('element.increase')"
        :disabled="!element.enabled"
        @pointerdown.prevent="up.start"
        @pointerup="up.stop"
        @pointerleave="up.stop"
        @pointercancel="up.stop"
        @keydown.enter.space.prevent="store.step(element.id, 1)"
        @contextmenu.prevent
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UBadge
        v-for="alert in alerts"
        :key="alert.id"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :label="alert.message || String(alert.value)"
      />
      <UButton class="ms-auto" size="xs" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" :label="t('element.reset')" @click="store.resetElement(element.id)" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :aria-label="t('play.rotate')" @click="rotate" />
    </div>

    <UModal v-model:open="editing" :title="t('play.setValue')">
      <template #body>
        <UInputNumber v-model="draft" :step="element.step" class="w-full" @keydown.enter="apply" />
      </template>
      <template #footer>
        <div class="flex gap-2 w-full justify-end">
          <UButton color="neutral" variant="outline" :label="t('play.cancel')" @click="editing = false" />
          <UButton :label="t('play.apply')" @click="apply" />
        </div>
      </template>
    </UModal>
  </div>
</template>
