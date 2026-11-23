import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (code: string) => JSON.parse(readFileSync(`i18n/locales/${code}.json`, 'utf8')) as Record<string, unknown>

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? vueFiles(path) : path.endsWith('.vue') ? [path] : []
  })
}

describe('locale files', () => {
  const en = new Set(flatten(read('en')))

  it('every static t(\'key\') used in a component exists in English', () => {
    const used = new Set<string>()
    for (const file of vueFiles('app')) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z_.]+)'/g)) used.add(m[1]!)
    }
    expect([...used].filter((k) => !en.has(k))).toEqual([])
  })

  it('every key of the dynamic groups exists in English', () => {
    for (const key of [
      ...['sum', 'subtract', 'multiply', 'divide', 'max', 'min', 'average'].map((o) => `ops.${o}`),
      ...['square', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon'].map((s) => `shapes.${s}`),
      ...['highest', 'lowest', 'success'].map((m) => `editor.winner_${m}`),
      'editor.countdown', 'editor.stopwatch',
    ]) expect(en.has(key), key).toBe(true)
  })

  it('no language has keys that English does not have, and none is empty', () => {
    for (const code of ['es', 'ca', 'pt-BR', 'pt-PT', 'fr', 'de', 'it', 'pl', 'ru', 'uk', 'el']) {
      const keys = flatten(read(code))
      expect(keys.filter((k) => !en.has(k)), code).toEqual([])
      const json = JSON.stringify(read(code))
      expect(json.includes('""'), `${code} has an empty text`).toBe(false)
    }
  })

  it('the translated languages are complete', () => {
    for (const code of ['es', 'ca', 'pt-BR', 'pt-PT', 'fr', 'de', 'it', 'pl', 'ru', 'uk', 'el']) {
      const have = new Set(flatten(read(code)))
      expect([...en].filter((k) => !have.has(k)), code).toEqual([])
    }
  })

  it('every translation keeps the same {placeholders} as English', () => {
    const flat = (code: string) => {
      const out: Record<string, string> = {}
      const walk = (o: Record<string, unknown>, pre: string) => {
        for (const [k, v] of Object.entries(o)) {
          if (typeof v === 'object' && v !== null) walk(v as Record<string, unknown>, `${pre}${k}.`)
          else out[`${pre}${k}`] = String(v)
        }
      }
      walk(read(code), '')
      return out
    }
    const names = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort()
    const base = flat('en')
    for (const code of ['es', 'ca', 'pt-BR', 'pt-PT', 'fr', 'de', 'it', 'pl', 'ru', 'uk', 'el']) {
      const other = flat(code)
      for (const [key, text] of Object.entries(base)) {
        expect(names(other[key] ?? ''), `${code} ${key}`).toEqual(names(text))
      }
    }
  })
})
