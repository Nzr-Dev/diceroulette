<script setup lang="ts">
import { LIMITS, type GameTable } from '#shared/schemas'
import { encodeShare, exportFileName, MAX_SHARE_LINK_LENGTH } from '#shared/share'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const library = useLibraryStore()
const settings = useSettingsStore()
const toast = useToast()

useSeoMeta({ title: () => t('nav.library'), robots: 'noindex' })

const ready = ref(false)
onMounted(async () => {
  await settings.load()
  await library.load()
  ready.value = true
})

function fail(message: string) {
  toast.add({ title: message, color: 'error', icon: 'i-lucide-circle-alert' })
}

// ----- create / rename -----
const nameDialog = reactive({ open: false, id: null as string | null, name: '' })
function askNew() {
  Object.assign(nameDialog, { open: true, id: null, name: t('library.newName') })
}
function askRename(table: GameTable) {
  Object.assign(nameDialog, { open: true, id: table.id, name: table.name })
}
async function confirmName() {
  const result = nameDialog.id ? await library.rename(nameDialog.id, nameDialog.name) : await library.create(nameDialog.name)
  if (!result.ok) return fail(result.error)
  nameDialog.open = false
  if (!nameDialog.id) await navigateTo(localePath(`/table/${result.table.id}`))
}

// ----- duplicate / delete with confirmation and undo -----
async function duplicate(table: GameTable) {
  const result = await library.duplicate(table.id, t('library.copyName', { name: table.name }))
  if (!result.ok) fail(result.error)
}
const deleting = ref<GameTable | null>(null)
async function confirmDelete() {
  const table = deleting.value
  deleting.value = null
  if (!table || !(await library.remove(table.id))) return
  toast.add({
    title: t('library.deleted'),
    description: table.name,
    icon: 'i-lucide-trash-2',
    actions: [{ label: t('library.undo'), icon: 'i-lucide-undo-2', onClick: () => void library.undoRemove(table.id) }],
  })
}

// ----- export / import / share -----
async function exportFile(table: GameTable) {
  const json = await library.exportJson(table.id)
  if (!json) return
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: exportFileName(table.name) })
  link.click()
  URL.revokeObjectURL(url)
}

async function share(table: GameTable) {
  const link = `${location.origin}${localePath('/import')}#t=${await encodeShare(table)}`
  if (link.length > MAX_SHARE_LINK_LENGTH) return fail(t('library.shareTooLong'))
  try {
    await navigator.clipboard.writeText(link)
    toast.add({ title: t('library.shareCopied'), color: 'success', icon: 'i-lucide-link' })
  } catch {
    fail(t('library.shareFailed'))
  }
}

const fileInput = ref<HTMLInputElement>()
async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // The size is checked BEFORE reading the file.
  if (file.size > LIMITS.maxTableBytes) return fail(t('library.importError', { error: t('library.tooBig') }))
  const result = await library.importFromText(await file.text())
  if (result.ok) toast.add({ title: t('library.imported'), description: result.table.name, color: 'success', icon: 'i-lucide-circle-check' })
  else fail(t('library.importError', { error: result.error }))
}

const date = (iso: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(iso))
const trashOpen = ref(false)
</script>

<template>
  <ClientOnly>
    <div v-if="ready" class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-xl font-semibold me-auto">{{ t('nav.library') }}</h1>
        <UButton icon="i-lucide-upload" color="neutral" variant="outline" :label="t('library.import')" @click="fileInput?.click()" />
        <UButton icon="i-lucide-plus" :label="t('library.new')" @click="askNew" />
        <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onFile" />
      </div>

      <AccountPanel />

      <div v-if="library.tables.length === 0" class="text-center text-muted py-12 space-y-3">
        <UIcon name="i-lucide-library" class="size-10 mx-auto" />
        <p>{{ t('library.empty') }}</p>
      </div>

      <UCard v-for="table in library.tables" :key="table.id" :ui="{ body: 'p-3 sm:p-4' }">
        <div class="flex items-center gap-3">
          <NuxtLink :to="localePath(`/table/${table.id}`)" class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ table.name }}</p>
            <p class="text-sm text-muted">{{ t('library.elements', { n: table.elements.length }, table.elements.length) }} · {{ date(table.updatedAt) }}</p>
          </NuxtLink>
          <UButton :to="localePath(`/table/${table.id}`)" icon="i-lucide-play" :aria-label="t('library.open')" />
          <UDropdownMenu
            :items="[
              { label: t('library.rename'), icon: 'i-lucide-pencil', onSelect: () => askRename(table) },
              { label: t('library.duplicate'), icon: 'i-lucide-copy', onSelect: () => duplicate(table) },
              { label: t('library.export'), icon: 'i-lucide-download', onSelect: () => exportFile(table) },
              { label: t('library.share'), icon: 'i-lucide-link', onSelect: () => share(table) },
              { label: t('library.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => (deleting = table) },
            ]"
          >
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" :aria-label="t('library.more')" />
          </UDropdownMenu>
        </div>
      </UCard>

      <section v-if="library.trash.length" class="space-y-2 pt-4">
        <UButton color="neutral" variant="ghost" :icon="trashOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" :label="`${t('library.trash')} (${library.trash.length})`" @click="trashOpen = !trashOpen" />
        <div v-if="trashOpen" class="space-y-2">
          <p class="text-sm text-muted">{{ t('library.trashHelp') }}</p>
          <div v-for="table in library.trash" :key="table.id" class="flex items-center gap-2 rounded-lg border border-default px-3 py-2">
            <span class="truncate flex-1">{{ table.name }}</span>
            <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-undo-2" :label="t('library.restore')" @click="library.undoRemove(table.id)" />
          </div>
        </div>
      </section>

      <UModal v-model:open="nameDialog.open" :title="nameDialog.id ? t('library.rename') : t('library.new')">
        <template #body>
          <UInput v-model="nameDialog.name" maxlength="100" autofocus class="w-full" :aria-label="t('editor.name')" @keydown.enter="confirmName" />
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="outline" :label="t('play.cancel')" @click="nameDialog.open = false" />
            <UButton :label="t('editor.save')" :disabled="!nameDialog.name.trim()" @click="confirmName" />
          </div>
        </template>
      </UModal>

      <UModal :open="deleting !== null" :title="t('library.deleteTitle')" @update:open="(v: boolean) => { if (!v) deleting = null }">
        <template #body>
          <p>{{ t('library.deleteConfirm', { name: deleting?.name ?? '' }) }}</p>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="outline" :label="t('play.cancel')" @click="deleting = null" />
            <UButton color="error" icon="i-lucide-trash-2" :label="t('library.delete')" @click="confirmDelete" />
          </div>
        </template>
      </UModal>
    </div>
    <USkeleton v-else class="h-40 w-full" />
    <template #fallback><USkeleton class="h-40 w-full" /></template>
  </ClientOnly>
</template>
