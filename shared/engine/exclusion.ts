import type { DiceElement } from '../schemas'

export interface ExclusionStatus {
  enabled: boolean
  /** Faces that can still come out, added up over all the groups. Null if exclusion is off. */
  remaining: number | null
  /** True when the next roll is not possible until the user resets. */
  exhausted: boolean
}

/**
 * Where the exclusion list stands. The list is shared by the whole element, like drawing
 * from a bag. A roll is impossible as soon as one group has fewer faces left than dice to roll.
 */
export function exclusionStatus(element: DiceElement): ExclusionStatus {
  if (!element.exclusion.enabled) return { enabled: false, remaining: null, exhausted: false }

  const used = new Set(element.exclusion.usedFaceIds)
  let remaining = 0
  let exhausted = false
  for (const group of element.groups) {
    const available = group.faces.reduce((count, face) => count + (used.has(face.id) ? 0 : 1), 0)
    remaining += available
    if (available < group.count) exhausted = true
  }
  return { enabled: true, remaining, exhausted }
}

/** Puts every face back in the bag. Does not touch any other element. */
export function resetExclusion(element: DiceElement): DiceElement {
  return { ...element, exclusion: { ...element.exclusion, usedFaceIds: [] } }
}
