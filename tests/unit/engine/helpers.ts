import type { Rng } from '../../../shared/engine'

/** Rng that returns the given numbers in order (and repeats the last one). For int(), the value is taken modulo maxExclusive. */
export function fixedRng(values: number[], floats: number[] = [0]): Rng {
  let i = 0
  let f = 0
  return {
    int(max) {
      const v = values[Math.min(i++, values.length - 1)] ?? 0
      return v % max
    },
    float() {
      return floats[Math.min(f++, floats.length - 1)] ?? 0
    },
  }
}

/** Small deterministic generator (mulberry32) for tests that need many rolls. */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { int: (max) => Math.floor(next() * max), float: next }
}
