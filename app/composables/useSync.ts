import type { SyncResponse } from '#shared/sync'
import { runSync, type SyncResult } from '~/sync/client'
import { authClient } from '~/utils/authClient'

/** Shared by the whole app: one sync at a time, one status. */
const state = reactive({
  status: 'idle' as 'idle' | 'syncing' | 'error' | 'offline' | 'other-account',
  lastSyncedAt: null as string | null,
  conflictCopies: 0,
  rejected: 0,
})
let running = false
let started = false

export function useSync() {
  const { t } = useI18n()
  const session = authClient.useSession()
  const library = useLibraryStore()
  const table = useTableStore()

  async function syncNow(options: { adoptLocal?: boolean } = {}): Promise<void> {
    const user = session.value.data?.user
    if (!user || running) return
    if (!navigator.onLine) {
      state.status = 'offline'
      return
    }
    running = true
    state.status = 'syncing'
    try {
      await table.flush() // save what is being edited first, so it goes in this sync
      const result: SyncResult = await runSync(
        getDb(),
        (request) => $fetch<SyncResponse>('/api/sync', { method: 'POST', body: request }),
        user.id,
        { conflictName: (name) => t('account.conflictName', { name }), adoptLocal: options.adoptLocal },
      )
      if (result.status === 'other-account') {
        state.status = 'other-account'
        return
      }
      state.status = 'idle'
      state.lastSyncedAt = new Date().toISOString()
      state.conflictCopies = result.conflictCopies
      state.rejected = result.rejected.length
      if (result.pulled > 0 || result.conflictCopies > 0) await library.load()
    } catch {
      state.status = navigator.onLine ? 'error' : 'offline'
    } finally {
      running = false
    }
  }

  /** Starts the automatic sync (call once, from the layout): on sign-in, when coming back, and every so often. */
  function start() {
    if (started) return
    started = true
    watch(
      () => session.value.data?.user?.id,
      (id) => {
        if (id) void syncNow()
      },
      { immediate: true },
    )
    const soon = () => void syncNow()
    window.addEventListener('online', soon)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') soon()
    })
    let ticks = 0
    setInterval(async () => {
      if (document.visibilityState !== 'visible' || !session.value.data?.user) return
      ticks++
      const dirty = (await getDb().tableMeta.filter((m) => m.dirty).count()) > 0
      // Upload changes within 30 seconds; look for changes from other devices every 5 minutes.
      if (dirty || ticks % 10 === 0) void syncNow()
    }, 30_000)
  }

  return { state, session, syncNow, start }
}
