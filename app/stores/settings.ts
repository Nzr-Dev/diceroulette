import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsSchema, type Settings } from '#shared/schemas'
import { getSettings, updateSettings } from '../db'
import { getDb } from './context'

/** Preferences of this device (theme, language, history size). */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(settingsSchema.parse({}))
  const loaded = ref(false)

  async function load(): Promise<void> {
    settings.value = await getSettings(getDb())
    loaded.value = true
  }

  async function update(changes: Partial<Settings>): Promise<void> {
    settings.value = await updateSettings(getDb(), changes)
  }

  return { settings, loaded, load, update }
})
