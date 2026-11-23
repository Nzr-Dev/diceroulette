<script setup lang="ts">
import { LIMITS } from '#shared/schemas/limits'

const { t, n } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('help.title'), description: () => t('help.intro') })

/** Sections of the guide: each one is a heading plus a short text (all in the locale files). */
const sections = [
  { key: 'tables', icon: 'i-lucide-layout-grid' },
  { key: 'dice', icon: 'i-lucide-dice-5' },
  { key: 'wheels', icon: 'i-lucide-circle-dot' },
  { key: 'counters', icon: 'i-lucide-hash' },
  { key: 'timers', icon: 'i-lucide-timer' },
  { key: 'share', icon: 'i-lucide-share-2' },
  { key: 'offline', icon: 'i-lucide-wifi-off' },
] as const

const megabytes = (bytes: number) => `${n(bytes / 1_000_000)} MB`

/** The numbers come from the same constants the app validates with, so they never go out of date. */
const limits = computed(() => [
  { key: 'elements', value: n(LIMITS.maxElementsPerTable) },
  { key: 'dicePerGroup', value: n(LIMITS.maxDicePerGroup) },
  { key: 'faces', value: n(LIMITS.maxFacesPerDie) },
  { key: 'sectors', value: n(LIMITS.maxSectorsPerWheel) },
  { key: 'timer', value: t('help.limits.hours', { n: LIMITS.maxTimerSeconds / 3600 }) },
  { key: 'history', value: n(LIMITS.defaultHistoryEntries) },
  { key: 'tableSize', value: megabytes(LIMITS.maxTableBytes) },
  { key: 'accountSize', value: megabytes(LIMITS.maxAccountBytes) },
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2">
      <UButton :to="localePath('/')" icon="i-lucide-arrow-left" color="neutral" variant="ghost" :aria-label="t('library.back')" />
      <h1 class="text-xl font-semibold">{{ t('help.title') }}</h1>
    </div>
    <p class="text-muted">{{ t('help.intro') }}</p>

    <section v-for="s in sections" :key="s.key" class="space-y-1">
      <h2 class="flex items-center gap-2 font-semibold"><UIcon :name="s.icon" class="size-5" />{{ t(`help.${s.key}.title`) }}</h2>
      <p class="text-sm text-muted">{{ t(`help.${s.key}.text`) }}</p>
    </section>

    <section class="space-y-2">
      <h2 class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-gauge" class="size-5" />{{ t('help.limits.title') }}</h2>
      <p class="text-sm text-muted">{{ t('help.limits.text') }}</p>
      <dl class="divide-y divide-default rounded-lg border border-default text-sm">
        <div v-for="l in limits" :key="l.key" class="flex justify-between gap-4 px-3 py-2">
          <dt>{{ t(`help.limits.${l.key}`) }}</dt>
          <dd class="font-medium tabular-nums">{{ l.value }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
