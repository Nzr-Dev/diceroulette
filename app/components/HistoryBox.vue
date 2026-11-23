<script setup lang="ts">
import type { HistoryRow } from '../db'

const { t, locale } = useI18n()
const store = useTableStore()

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function summary(row: HistoryRow): string {
  if (row.kind === 'wheel') return row.result.label
  return row.roll.total !== null ? String(row.roll.total) : row.roll.results.map((r) => r.label).join(' ')
}
</script>

<template>
  <section class="space-y-2">
    <div class="flex items-center">
      <h2 class="font-semibold">{{ t('history.title') }}</h2>
      <UButton
        v-if="store.history.length"
        class="ms-auto"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        :label="t('history.clear')"
        @click="store.clearTableHistory()"
      />
    </div>
    <div class="max-h-64 overflow-y-auto rounded-lg border border-default divide-y divide-default">
      <p v-if="!store.history.length" class="p-4 text-sm text-muted text-center">{{ t('history.empty') }}</p>
      <div v-for="row in store.history" :key="row.id" class="px-3 py-2 flex items-center gap-2 text-sm">
        <span class="text-muted tabular-nums shrink-0">{{ time(row.at) }}</span>
        <span class="truncate">{{ row.elementName }}<span v-if="row.player" class="text-muted"> · {{ row.player }}</span></span>
        <span class="ms-auto font-semibold tabular-nums">{{ summary(row) }}</span>
      </div>
    </div>
  </section>
</template>
