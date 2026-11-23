import { describe, expect, it } from 'vitest'
import {
  createCounter, createTimer, createWheel, formatClock, readableTextColor, regularPolygonPoints, restRotation,
  sectorAngles, sectorPath, spinTarget, timerDisplayMs,
} from '../../../shared/engine'
import { elementSchema } from '../../../shared/schemas'

describe('sectorAngles', () => {
  it('fills 360° in proportion to the weights', () => {
    const a = sectorAngles([1, 3])
    expect(a[0]).toEqual({ start: 0, end: 90, mid: 45 })
    expect(a[1]).toEqual({ start: 90, end: 360, mid: 225 })
  })
  it('handles one sector and no weight', () => {
    expect(sectorAngles([5])[0]).toEqual({ start: 0, end: 360, mid: 180 })
    expect(sectorAngles([])).toEqual([])
  })
})

describe('sectorPath', () => {
  it('draws a slice and flags large arcs', () => {
    expect(sectorPath(100, 0, 90)).toBe('M0 0L0 -100A100 100 0 0 1 100 0Z')
    expect(sectorPath(100, 0, 270)).toContain('A100 100 0 1 1')
  })
  it('draws a full circle for a single sector', () => {
    expect(sectorPath(100, 0, 360)).toContain('A100 100 0 1 1 0 100')
  })
  it('only contains path commands and numbers', () => {
    expect(sectorPath(96, 12.3456, 200.789)).toMatch(/^[MLAZ0-9 .\-]+$/)
  })
})

describe('spinTarget', () => {
  const pointerAt = (rotation: number) => ((-rotation % 360) + 360) % 360
  it('stops with the pointer on the middle of the sector, always turning forward', () => {
    for (const current of [0, 100, 359, 1234.5]) {
      for (const mid of [0, 45, 200, 359]) {
        const target = spinTarget(current, mid, 5)
        expect(target).toBeGreaterThanOrEqual(current + 5 * 360)
        expect(Math.abs(((pointerAt(target) - mid + 540) % 360) - 180)).toBeLessThan(1e-6)
      }
    }
  })
  it('the offset moves the stop inside the sector', () => {
    const target = spinTarget(0, 90, 3, 10)
    expect(pointerAt(target)).toBeCloseTo(100)
  })
  it('restRotation shows the sector without turning', () => {
    expect(pointerAt(restRotation(45))).toBeCloseTo(45)
  })
})

describe('shapes and colors', () => {
  it('regular polygons have the right number of points', () => {
    expect(regularPolygonPoints(6).split(' ')).toHaveLength(6)
    expect(regularPolygonPoints(8).split(' ')[0]).toBe('50,4')
  })
  it('picks readable text colors', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000')
    expect(readableTextColor('#000000')).toBe('#ffffff')
    expect(readableTextColor('#3f3f46')).toBe('#ffffff')
    expect(readableTextColor('#fde047')).toBe('#000000')
  })
})

describe('formatClock', () => {
  it('formats mm:ss and h:mm:ss, rounding up', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(1)).toBe('00:01')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-5)).toBe('00:00')
  })
})

describe('presets', () => {
  it('create valid elements', () => {
    for (const e of [createWheel('W', ['a', 'b']), createCounter('C', 5), createTimer('T', 30), createTimer('S')]) {
      expect(() => elementSchema.parse(e)).not.toThrow()
    }
    expect(createCounter('C', 5)).toMatchObject({ value: 5, initial: 5 })
    const stopwatch = createTimer('S')
    expect(stopwatch.mode).toBe('stopwatch')
    expect(timerDisplayMs(stopwatch, 0)).toBe(0)
  })
})
