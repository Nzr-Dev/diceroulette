<script setup lang="ts">
import { authClient } from '~/utils/authClient'

const { t, locale } = useI18n()
const toast = useToast()
const { state, session, syncNow } = useSync()

const user = computed(() => session.value.data?.user ?? null)
const busy = ref(false)
const confirmingDelete = ref(false)

async function signIn() {
  busy.value = true
  // Google takes the person away and brings them back to this same page.
  await authClient.signIn.social({ provider: 'google', callbackURL: window.location.href })
  busy.value = false
}

async function signOut() {
  busy.value = true
  await authClient.signOut()
  busy.value = false
}

async function deleteAccount() {
  busy.value = true
  const { error } = await authClient.deleteUser()
  busy.value = false
  confirmingDelete.value = false
  if (error) {
    toast.add({ title: t('account.deleteFailed'), color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  // The tables stay on this device, but they no longer belong to any account.
  const db = getDb()
  await db.transaction('rw', db.tableMeta, db.syncState, async () => {
    await db.syncState.clear()
    await db.tableMeta.toCollection().modify({ serverRevision: null, dirty: false })
  })
  toast.add({ title: t('account.deleted'), color: 'success', icon: 'i-lucide-circle-check' })
}

const lastSynced = computed(() =>
  state.lastSyncedAt ? new Intl.DateTimeFormat(locale.value, { timeStyle: 'short' }).format(new Date(state.lastSyncedAt)) : null,
)
</script>

<template>
  <UCard :ui="{ body: 'p-3 sm:p-4' }">
    <div v-if="session.isPending" class="h-10" />

    <div v-else-if="!user" class="space-y-3">
      <h2 class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-cloud" class="size-5" />{{ t('account.title') }}</h2>
      <p class="text-sm text-muted">{{ t('account.intro') }}</p>
      <UButton icon="i-lucide-log-in" color="neutral" variant="outline" :loading="busy" :label="t('account.signIn')" @click="signIn" />
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center gap-3">
        <UAvatar :src="user.image ?? undefined" :alt="user.name" size="md" />
        <div class="min-w-0 flex-1">
          <p class="font-medium truncate">{{ t('account.signedInAs', { name: user.name }) }}</p>
          <p class="text-sm text-muted truncate" aria-live="polite">
            <template v-if="state.status === 'syncing'">{{ t('account.syncing') }}</template>
            <template v-else-if="state.status === 'offline'">{{ t('account.offline') }}</template>
            <template v-else-if="state.status === 'error'">{{ t('account.syncFailed') }}</template>
            <template v-else-if="lastSynced">{{ t('account.synced', { time: lastSynced }) }}</template>
          </p>
        </div>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="state.status === 'syncing'" :aria-label="t('account.syncNow')" @click="syncNow()" />
      </div>

      <UAlert v-if="state.status === 'other-account'" color="warning" variant="subtle" icon="i-lucide-triangle-alert" :title="t('account.otherAccount')">
        <template #actions>
          <UButton size="sm" :label="t('account.adopt')" @click="syncNow({ adoptLocal: true })" />
          <UButton size="sm" color="neutral" variant="outline" :label="t('account.signOut')" @click="signOut" />
        </template>
      </UAlert>
      <UAlert v-if="state.conflictCopies > 0" color="info" variant="subtle" icon="i-lucide-info" :title="t('account.conflictCopies')" />
      <UAlert v-if="state.rejected > 0" color="warning" variant="subtle" icon="i-lucide-triangle-alert" :title="t('account.rejected')" />

      <div class="flex flex-wrap gap-2">
        <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-log-out" :loading="busy" :label="t('account.signOut')" @click="signOut" />
        <UButton size="sm" color="error" variant="ghost" icon="i-lucide-user-x" :label="t('account.deleteAccount')" @click="confirmingDelete = true" />
      </div>
    </div>

    <UModal v-model:open="confirmingDelete" :title="t('account.deleteAccount')" :description="t('account.deleteConfirm')">
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="outline" :label="t('play.cancel')" @click="confirmingDelete = false" />
          <UButton color="error" icon="i-lucide-user-x" :loading="busy" :label="t('account.deleteAccount')" @click="deleteAccount" />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
