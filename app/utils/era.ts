import type { Figure } from '~/data/figures'

// 生卒年區間重疊＝兩人同代
export function overlaps(a: Figure, b: Figure): boolean {
  return a.birth <= b.death && b.birth <= a.death
}