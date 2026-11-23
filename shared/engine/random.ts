/**
 * Source of randomness. The engine never calls Math.random: it asks an Rng,
 * and the default one uses crypto.getRandomValues. Tests pass a fixed Rng.
 */
export interface Rng {
  /** Whole number from 0 up to maxExclusive - 1, all values equally likely. */
  int(maxExclusive: number): number
  /** Number from 0 (included) up to 1 (excluded). */
  float(): number
}

const UINT32_RANGE = 0x1_0000_0000

function randomUint32(): number {
  const buffer = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buffer)
  return buffer[0] as number
}

export const cryptoRng: Rng = {
  int(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
      throw new RangeError(`maxExclusive must be an integer between 1 and 2^32, got ${maxExclusive}`)
    }
    // Rejection sampling: throw away the numbers that would make some results more likely.
    const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive)
    let value = randomUint32()
    while (value >= limit) value = randomUint32()
    return value % maxExclusive
  },
  float() {
    // 53 random bits, the precision of a double.
    const high = randomUint32() >>> 5
    const low = randomUint32() >>> 6
    return (high * 67_108_864 + low) / 9_007_199_254_740_992
  },
}
