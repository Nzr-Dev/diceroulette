<script setup lang="ts">
import { readableTextColor, regularPolygonPoints, type Shape } from '#shared/engine'

/** One die that came out. The shape comes from the element; flags add an icon and a color, never color alone. */
const props = withDefaults(
  defineProps<{
    label: string
    shape?: Shape
    color?: string
    borderColor?: string
    borderWidth?: number
    critical?: boolean
    fumble?: boolean
    winner?: boolean
  }>(),
  { shape: 'square', borderWidth: 2 },
)

const polygons: Partial<Record<Shape, string>> = {
  triangle: '50,6 95,90 5,90',
  diamond: '50,4 96,50 50,96 4,50',
  pentagon: regularPolygonPoints(5),
  hexagon: regularPolygonPoints(6),
  octagon: regularPolygonPoints(8),
}

const stroke = computed(() => {
  if (props.critical) return 'var(--ui-success)'
  if (props.fumble) return 'var(--ui-error)'
  if (props.winner) return 'var(--ui-info)'
  return props.borderColor ?? 'var(--ui-text-muted)'
})
const strokeWidth = computed(() => (props.critical || props.fumble || props.winner ? Math.max(props.borderWidth, 4) : props.borderWidth))
const fill = computed(() => props.color ?? 'var(--ui-bg-elevated)')
// Text color: with a custom color pick black or white by contrast; otherwise the theme text color.
const textColor = computed(() => (props.color ? readableTextColor(props.color) : 'var(--ui-text-highlighted)'))
const fontSize = computed(() => (props.label.length <= 2 ? 40 : props.label.length <= 4 ? 28 : 18))
const shown = computed(() => (props.label.length > 8 ? `${props.label.slice(0, 7)}…` : props.label))
</script>

<template>
  <span class="relative inline-block size-14 shrink-0">
    <svg viewBox="0 0 100 100" class="size-full" aria-hidden="true">
      <rect v-if="shape === 'square'" x="6" y="6" width="88" height="88" rx="12" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" />
      <circle v-else-if="shape === 'circle'" cx="50" cy="50" r="45" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" />
      <polygon v-else :points="polygons[shape]" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" stroke-linejoin="round" />
      <text x="50" y="52" text-anchor="middle" dominant-baseline="middle" font-weight="700" :font-size="fontSize" :fill="textColor">{{ shown }}</text>
    </svg>
    <UIcon v-if="critical" name="i-lucide-star" class="absolute -top-1 -end-1 size-5 text-success bg-default rounded-full" />
    <UIcon v-else-if="fumble" name="i-lucide-skull" class="absolute -top-1 -end-1 size-5 text-error bg-default rounded-full" />
    <UIcon v-else-if="winner" name="i-lucide-trophy" class="absolute -top-1 -end-1 size-5 text-info bg-default rounded-full" />
  </span>
</template>
