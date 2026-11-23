<script setup lang="ts">
/** Optional #RRGGBB color. The native picker only ever returns that format. */
const model = defineModel<string | undefined>()
defineProps<{ label: string }>()
const { t } = useI18n()
</script>

<template>
  <UFormField :label="label">
    <div class="flex items-center gap-2">
      <input
        type="color"
        :value="model ?? '#71717a'"
        class="h-9 w-12 rounded border border-default bg-transparent p-0.5 cursor-pointer"
        :aria-label="label"
        @input="model = ($event.target as HTMLInputElement).value"
      />
      <UButton v-if="model" size="xs" color="neutral" variant="ghost" icon="i-lucide-x" :label="t('editor.defaultColor')" @click="model = undefined" />
      <span v-else class="text-sm text-muted">{{ t('editor.defaultColor') }}</span>
    </div>
  </UFormField>
</template>
