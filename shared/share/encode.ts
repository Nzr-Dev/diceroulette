import { LIMITS, type GameTable } from '../schemas'
import { cleanElement } from '../tables'

/**
 * Tables travel in a link as: JSON → deflate → base64url. The data goes after the `#`,
 * which the browser never sends to any server. Reading it back is capped, so a tiny
 * malicious link cannot expand into gigabytes («zip bomb»).
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, maxBytes: number): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  // Errors on the writing side show up when reading, so they are ignored here.
  writer.write(bytes as BufferSource).catch(() => {})
  writer.close().catch(() => {})
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error('The shared data is too big')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** The table, without play state, as text for a link. */
export async function encodeShare(table: GameTable): Promise<string> {
  const clean = { ...table, isQuick: false, deletedAt: null, elements: table.elements.map(cleanElement) }
  const json = new TextEncoder().encode(JSON.stringify(clean))
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw'), json.length + 1024))
}

/** The JSON text inside a shared link. Throws if the data is damaged or too big. */
export async function decodeShare(data: string): Promise<string> {
  if (data.length > LIMITS.maxTableBytes * 2) throw new Error('The shared data is too big')
  if (!/^[A-Za-z0-9_-]+$/.test(data)) throw new Error('The shared data is not valid')
  let bytes: Uint8Array
  try {
    bytes = fromBase64Url(data)
  } catch {
    throw new Error('The shared data is not valid')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(await pipe(bytes, new DecompressionStream('deflate-raw'), LIMITS.maxTableBytes))
  } catch (error) {
    if (error instanceof Error && error.message === 'The shared data is too big') throw error
    throw new Error('The shared data is not valid')
  }
}

/** Longest link we are happy to hand out. Longer ones may be cut by chat apps; use a file instead. */
export const MAX_SHARE_LINK_LENGTH = 8000
