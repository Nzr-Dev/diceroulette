<script setup lang="ts">
import { cryptoRng, readableTextColor, restRotation, sectorAngles, sectorPath, spinTarget, wheelStatus } from '#shared/engine'
import type { WheelElement } from '#shared/schemas'

const props = defineProps<{ element: WheelElement }>()
const { t } = useI18n()
const store = useTableStore()
const player = usePlayer()

const RADIUS = 96
const SPIN_MS = 3000
// Neutral by default: red, green and yellow keep their fixed meaning for results.
const FILLS = ['#3f3f46', '#71717a']

const angles = computed(() => sectorAngles(props.element.sectors.map((s) => s.weight)))
const status = computed(() => wheelStatus(props.element))

const rotation = ref(0)
const spinning = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

// Starts showing the last result, if there is one.
onMounted(() => {
  const last = props.element.lastResult
  const index = last ? props.element.sectors.findIndex((s) => s.id === last.sectorId) : -1
  const angle = index >= 0 ? angles.value[index] : undefined
  if (angle) rotation.value = restRotation(angle.mid)
})

const justChosen = ref<string | null>(null)
function isUsed(id: string): boolean {
  // The sector that just came out stays normal until the wheel stops.
  return props.element.usedSectorIds.includes(id) && !(spinning.value && id === justChosen.value)
}

async function spin() {
  if (spinning.value) return
  const result = await store.roll(props.element.id, { player: player.value })
  if (!result.ok) return
  const chosenId = store.table?.elements.find((e) => e.id === props.element.id && e.type === 'wheel')
  const lastId = chosenId && chosenId.type === 'wheel' ? chosenId.lastResult?.sectorId : undefined
  const index = props.element.sectors.findIndex((s) => s.id === lastId)
  const angle = angles.value[index]
  if (!angle) return
  justChosen.value = lastId ?? null
  // The result is already decided. Only the stopping point inside the sector is random, to look natural.
  const offset = (cryptoRng.float() - 0.5) * 0.7 * (angle.end - angle.start)
  if (prefersReducedMotion()) {
    rotation.value = restRotation(angle.mid)
    return
  }
  spinning.value = true
  rotation.value = spinTarget(rotation.value, angle.mid, 5, offset)
  timer = setTimeout(() => {
    spinning.value = false
    justChosen.value = null
  }, SPIN_MS + 50)
}

function labelOf(label: string): string {
  return label.length > 14 ? `${label.slice(0, 13)}…` : label
}
const lastLabel = computed(() => props.element.lastResult?.label)
</script>

<template>
  <div class="mt-3 space-y-3">
    <div class="relative mx-auto w-full max-w-72">
      <svg viewBox="-100 -108 200 208" class="w-full" role="img" :aria-label="element.name">
        <g
          :style="{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '0 0',
            transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.12, 1)` : 'none',
          }"
        >
          <g v-for="(sector, i) in element.sectors" :key="sector.id" :opacity="isUsed(sector.id) ? 0.3 : 1">
            <path
              :d="sectorPath(RADIUS, angles[i]!.start, angles[i]!.end)"
              :fill="sector.color ?? FILLS[i % 2]"
              stroke="var(--ui-bg)"
              stroke-width="1.5"
            />
            <text
              v-if="angles[i]!.end - angles[i]!.start >= 9"
              :transform="`rotate(${angles[i]!.mid - 90}) translate(${RADIUS - 8} 0)`"
              text-anchor="end"
              dominant-baseline="middle"
              font-size="9"
              font-weight="600"
              :fill="readableTextColor(sector.color ?? FILLS[i % 2]!)"
            >
              {{ labelOf(sector.label) }}
            </text>
          </g>
          <circle r="6" :fill="element.borderColor ?? 'var(--ui-bg)'" />
        </g>
        <circle r="97" fill="none" :stroke="element.borderColor ?? 'var(--ui-text-muted)'" stroke-width="2.5" />
        <!-- Pointer, fixed at the top -->
        <polygon points="-8,-108 8,-108 0,-90" fill="var(--ui-error)" stroke="var(--ui-bg)" stroke-width="1.5" />
      </svg>
    </div>

    <div class="flex items-center gap-3">
      <UButton
        :label="t('element.spin')"
        icon="i-lucide-rotate-cw"
        size="lg"
        :disabled="!element.enabled || status.exhausted"
        :loading="spinning"
        @click="spin"
      />
      <UBadge v-if="status.remaining !== null" color="neutral" variant="subtle" :label="t('play.remaining', { n: status.remaining })" />
      <p v-if="lastLabel && !spinning" role="status" aria-live="polite" class="ms-auto text-2xl font-bold truncate">{{ lastLabel }}</p>
    </div>

    <UAlert
      v-if="status.exhausted && !spinning"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('play.exhausted')"
      :actions="[{ label: t('element.reset'), icon: 'i-lucide-rotate-ccw', color: 'neutral', variant: 'outline', onClick: () => store.resetElement(element.id) }]"
    />
  </div>
</template>
