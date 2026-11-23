/**
 * Drawing maths for the wheel and the dice faces. Pure numbers in, numbers or strings out:
 * the components only put the result in the SVG, so no user text ever becomes SVG code.
 * Angles are in degrees, 0 = top, growing clockwise (the pointer of the wheel is at the top).
 */

export interface SectorAngle {
  start: number
  end: number
  mid: number
}

/** Angle taken by each sector, proportional to its weight. The angles fill exactly 360°. */
export function sectorAngles(weights: readonly number[]): SectorAngle[] {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let start = 0
  return weights.map((weight) => {
    const end = start + (total > 0 ? (weight / total) * 360 : 0)
    const sector = { start, end, mid: (start + end) / 2 }
    start = end
    return sector
  })
}

function polar(radius: number, degrees: number): [number, number] {
  const rad = ((degrees - 90) * Math.PI) / 180
  return [radius * Math.cos(rad), radius * Math.sin(rad)]
}

const round = (n: number) => Math.round(n * 1000) / 1000

/** SVG path of a pie slice centered on (0, 0). A full circle (one sector) is drawn as two halves. */
export function sectorPath(radius: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 359.999) {
    return `M0 ${-radius}A${radius} ${radius} 0 1 1 0 ${radius}A${radius} ${radius} 0 1 1 0 ${-radius}Z`
  }
  const [x1, y1] = polar(radius, startDeg)
  const [x2, y2] = polar(radius, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M0 0L${round(x1)} ${round(y1)}A${radius} ${radius} 0 ${large} 1 ${round(x2)} ${round(y2)}Z`
}

/**
 * Rotation (in degrees, clockwise) the wheel must reach so the pointer at the top shows the sector
 * whose middle is at `midDeg`. It always turns forward, at least `extraTurns` full turns.
 * `offsetDeg` moves the stop inside the sector, only so the wheel does not always stop in the middle.
 */
export function spinTarget(currentRotation: number, midDeg: number, extraTurns: number, offsetDeg = 0): number {
  const wanted = (((-(midDeg + offsetDeg)) % 360) + 360) % 360
  const base = currentRotation + extraTurns * 360
  const current = ((base % 360) + 360) % 360
  let delta = wanted - current
  if (delta < 0) delta += 360
  return base + delta
}

/** Rotation that shows a sector right away, without turning. */
export function restRotation(midDeg: number): number {
  return (((-midDeg) % 360) + 360) % 360
}

/** Points of a regular polygon in a 0–100 box, with one vertex at the top. */
export function regularPolygonPoints(sides: number, radius = 46, center = 50): string {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * 2 * Math.PI - Math.PI / 2
    return `${round(center + radius * Math.cos(angle))},${round(center + radius * Math.sin(angle))}`
  }).join(' ')
}

/** Black or white, whichever reads better on the given #RRGGBB background. */
export function readableTextColor(hex: string): '#000000' | '#ffffff' {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => {
    const c = ((n >> shift) & 255) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
  return luminance > 0.4 ? '#000000' : '#ffffff'
}

/** 65 -> «01:05», 3725 -> «1:02:05». Time left is rounded up, so the display never shows 00:00 early. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
}
