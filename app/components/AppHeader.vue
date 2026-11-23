<script setup lang="ts">
/** Very top of every page: language and theme, always in sight. */
const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()

const localeItems = computed(() => locales.value.map((l) => ({ label: l.name ?? l.code, value: l.code })))

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-default bg-default/90 backdrop-blur">
    <div class="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">
      <NuxtLink :to="useLocalePath()('/')" class="flex items-center gap-2 font-semibold tracking-tight">
        <UIcon name="i-lucide-dices" class="size-6" />
        <span>DiceRoulette</span>
      </NuxtLink>

      <UButton :to="useLocalePath()('/library')" icon="i-lucide-library" color="neutral" variant="ghost" :aria-label="t('nav.library')" class="ms-1">
        <span class="hidden sm:inline">{{ t('nav.library') }}</span>
      </UButton>

      <div class="ms-auto flex items-center gap-2">
        <USelect
          :model-value="locale"
          :items="localeItems"
          value-key="value"
          :aria-label="t('header.language')"
          icon="i-lucide-languages"
          class="w-36 sm:w-44"
          @update:model-value="(code: string) => setLocale(code as typeof locale)"
        />
        <ClientOnly>
          <USwitch
            v-model="isDark"
            :aria-label="t('header.theme')"
            checked-icon="i-lucide-moon"
            unchecked-icon="i-lucide-sun"
          />
          <template #fallback>
            <div class="w-11 h-5" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
