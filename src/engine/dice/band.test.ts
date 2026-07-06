import { describe, expect, it } from 'vitest'
import type { TextTier } from '../../domain/types'
import { bandToServedTier } from './band'

describe('bandToServedTier', () => {
  const range: [TextTier, TextTier] = [2, 8]

  it('low band picks the bottom of the dungeon range', () => {
    const { targetTier, servedTier } = bandToServedTier('low', range, 10 as TextTier)
    expect(targetTier).toBe(2)
    expect(servedTier).toBe(2)
  })

  it('high band picks the top of the dungeon range', () => {
    const { targetTier, servedTier } = bandToServedTier('high', range, 10 as TextTier)
    expect(targetTier).toBe(8)
    expect(servedTier).toBe(8)
  })

  it('mid band picks the (rounded) midpoint of the range', () => {
    const { targetTier } = bandToServedTier('mid', range, 10 as TextTier)
    expect(targetTier).toBe(5)
  })

  it('a single-tier dungeon range collapses every band to the same tier', () => {
    const single: [TextTier, TextTier] = [3, 3]
    expect(bandToServedTier('low', single, 10 as TextTier).targetTier).toBe(3)
    expect(bandToServedTier('mid', single, 10 as TextTier).targetTier).toBe(3)
    expect(bandToServedTier('high', single, 10 as TextTier).targetTier).toBe(3)
  })

  it('caps servedTier at intTierCap and still reports the uncapped target', () => {
    const { targetTier, servedTier } = bandToServedTier('high', range, 5 as TextTier)
    expect(targetTier).toBe(8)
    expect(servedTier).toBe(5)
  })

  it('does not cap when the target is already at or below intTierCap', () => {
    const { targetTier, servedTier } = bandToServedTier('low', range, 5 as TextTier)
    expect(targetTier).toBe(2)
    expect(servedTier).toBe(2)
  })
})
