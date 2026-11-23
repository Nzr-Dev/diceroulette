<script setup lang="ts">
const emit = defineEmits<{ rollAll: [] }>()
const { t } = useI18n()
const store = useTableStore()
const player = usePlayer()
const editing = computed(() => store.mode === 'edit')

function reset() {
  store.resetAll()
}
</script>

<template>
  <div class="space-y-3">
  <div class="flex flex-wrap items-center gap-2">
    <UButton icon="i-lucide-dices" :label="t('toolbar.rollAll')" size="lg" @click="emit('rollAll')" />
    <UButton
      icon="i-lucide-rotate-ccw"
      :label="t('toolbar.reset')"
      color="neutral"
      variant="outline"
      size="lg"
      @click="reset"
    />
    <UButton
      class="ms-auto"
      :icon="editing ? 'i-lucide-check' : 'i-lucide-pencil'"
      :label="editing ? t('toolbar.play') : t('toolbar.edit')"
      color="neutral"
      :variant="editing ? 'solid' : 'subtle'"
      size="lg"
      @click="store.setMode(editing ? 'play' : 'edit')"
    />
  </div>
    <UInput v-model="player" icon="i-lucide-user" :placeholder="t('toolbar.player')" :aria-label="t('toolbar.player')" maxlength="100" class="w-full" />
  </div>
</template>
