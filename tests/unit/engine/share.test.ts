import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DiceRouletteDb, importTable, renameTable, saveTable, getTable } from '../../../app/db'
import { createCounter, createStandardDie, createWheel, rollDice } from '../../../shared/engine'
import { LIMITS, tableSchema } from '../../../shared/schemas'
import { decodeShare, encodeShare, exportFileName, MAX_SHARE_LINK_LENGTH } from '../../../shared/share'
import { makeTable, uuid } from '../schemas/helpers'

const sample = () => {
  const rolled = rollDice(createStandardDie(20))
  if (!rolled.ok) throw new Error()
  return tableSchema.parse(makeTable({ name: 'Ñandú ✓', isQuick: true, elements: [rolled.element, createWheel('W', ['a', 'b']), createCounter('C', 3)] }))
}

describe('share links', () => {
  it('round-trips, without play state, quick mark or deletion', async () => {
    const table = sample()
    const data = await encodeShare(table)
    expect(data).toMatch(/^[A-Za-z0-9_-]+$/)
    const json = JSON.parse(await decodeShare(data))
    expect(json.name).toBe('Ñandú ✓')
    expect(json.isQuick).toBe(false)
    expect(json.elements).toHaveLength(3)
    expect('lastRoll' in json.elements[0]).toBe(false)
  })
  it('imports as a new table through the normal validation', async () => {
    const db = new DiceRouletteDb(`test-${uuid()}`)
    const table = sample()
    const res = await importTable(db, await decodeShare(await encodeShare(table)))
    if (!res.ok) throw new Error(res.error)
    expect(res.table.id).not.toBe(table.id)
    expect(res.table.isQuick).toBe(false)
  })
  it('a typical table fits in a link', async () => {
    expect((await encodeShare(sample())).length).toBeLessThan(MAX_SHARE_LINK_LENGTH)
  })
  it('rejects damaged data', async () => {
    await expect(decodeShare('')).rejects.toThrow()
    await expect(decodeShare('not base64!!')).rejects.toThrow('not valid')
    await expect(decodeShare('AAAAAAAA')).rejects.toThrow('not valid')
    const good = await encodeShare(sample())
    await expect(decodeShare(good.slice(0, -10))).rejects.toThrow()
    await expect(decodeShare(good.slice(0, 20) + 'AAAA' + good.slice(24))).rejects.toThrow()
  })
  it('a compression bomb is stopped at the size limit', async () => {
    const zeros = new Uint8Array(LIMITS.maxTableBytes * 3)
    const stream = new CompressionStream('deflate-raw')
    const writer = stream.writable.getWriter()
    void writer.write(zeros)
    void writer.close()
    const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer())
    expect(compressed.length).toBeLessThan(10_000)
    const data = Buffer.from(compressed).toString('base64url')
    await expect(decodeShare(data)).rejects.toThrow('too big')
  })
  it('refuses absurdly long data before decoding', async () => {
    await expect(decodeShare('A'.repeat(LIMITS.maxTableBytes * 2 + 1))).rejects.toThrow('too big')
  })
})

describe('export file name', () => {
  it('is a safe slug', () => {
    expect(exportFileName('Mi Partida de Rol!')).toBe('mi-partida-de-rol.diceroulette.json')
    expect(exportFileName('Ñandú')).toBe('nandu.diceroulette.json')
    expect(exportFileName('../../etc/passwd')).toBe('etc-passwd.diceroulette.json')
    expect(exportFileName('🎲🎲')).toBe('table.diceroulette.json')
    expect(exportFileName('x'.repeat(200)).length).toBeLessThan(80)
  })
})

describe('renameTable', () => {
  it('renames, trims and refuses empty names', async () => {
    const db = new DiceRouletteDb(`test-${uuid()}`)
    const saved = await saveTable(db, tableSchema.parse(makeTable({ name: 'Old' })))
    if (!saved.ok) throw new Error()
    expect((await renameTable(db, saved.table.id, '  New  ')).ok).toBe(true)
    expect((await getTable(db, saved.table.id))?.name).toBe('New')
    expect((await renameTable(db, saved.table.id, '   ')).ok).toBe(false)
    expect((await renameTable(db, uuid(), 'x')).ok).toBe(false)
  })
})
