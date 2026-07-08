import { describe, expect, it } from 'vitest'
import type { TextTier } from '../../domain/types'
import { bandToServedTier } from './band'

describe('bandToServedTier', () => {
  const range: [TextTier, TextTier] = [2, 8]

  it('low band picks the bottom of the dungeon range', () => {
    const { targetTier, servedTier } = bandToServedTier('low', range)
    expect(targetTier).toBe(2)
    expect(servedTier).toBe(2)
  })

  it('high band picks the top of the dungeon range', () => {
    const { targetTier, servedTier } = bandToServedTier('high', range)
    expect(targetTier).toBe(8)
    expect(servedTier).toBe(8)
  })

  it('mid band picks the (rounded) midpoint of the range', () => {
    const { targetTier } = bandToServedTier('mid', range)
    expect(targetTier).toBe(5)
  })

  it('a single-tier dungeon range collapses every band to the same tier', () => {
    const single: [TextTier, TextTier] = [3, 3]
    expect(bandToServedTier('low', single).targetTier).toBe(3)
    expect(bandToServedTier('mid', single).targetTier).toBe(3)
    expect(bandToServedTier('high', single).targetTier).toBe(3)
  })

  it('always serves the target tier — INT no longer caps it', () => {
    const { targetTier, servedTier } = bandToServedTier('high', range)
    expect(servedTier).toBe(targetTier)
    expect(servedTier).toBe(8)
  })
})
