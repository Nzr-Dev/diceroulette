<script setup lang="ts">
import { LEGAL } from '~/utils/legal'
import { legalDocument, type LegalKind } from '~/utils/legalText'

const props = defineProps<{ kind: LegalKind }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()

const shown = computed(() => legalDocument(props.kind, locale.value))
// Plain text replacement: the texts are printed as text, never as HTML.
const fill = (text: string) => text.replaceAll('{email}', LEGAL.contactEmail).replaceAll('{site}', LEGAL.siteName)
const date = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(LEGAL.updated)))

useSeoMeta({ title: () => shown.value.doc.title })
</script>

<template>
  <article class="space-y-5">
    <div class="flex items-center gap-2">
      <UButton :to="localePath('/')" icon="i-lucide-arrow-left" color="neutral" variant="ghost" :aria-label="t('library.back')" />
      <h1 class="text-xl font-semibold">{{ shown.doc.title }}</h1>
    </div>
    <p class="text-sm text-muted">{{ t('legal.updated', { date }) }}</p>
    <p v-if="shown.lang === 'en' && locale !== 'en'" class="text-sm text-muted">{{ t('legal.onlyEnglishSpanish') }}</p>
    <section v-for="section in shown.doc.sections" :key="section.title" class="space-y-2">
      <h2 class="font-semibold">{{ section.title }}</h2>
      <p v-for="(p, i) in section.paragraphs" :key="i" class="text-sm text-muted">{{ fill(p) }}</p>
    </section>
  </article>
</template>
