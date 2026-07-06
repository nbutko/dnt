import { describe, expect, it } from 'vitest'
import { getItem, ITEMS } from './items'

describe('ITEMS', () => {
  it('prices every item positively', () => {
    for (const item of ITEMS) {
      expect(item.price).toBeGreaterThan(0)
    }
  })

  it('uses only the three defined duration shapes', () => {
    const validDurations = ['next-fight', 'rest-of-dungeon', 'instant']
    for (const item of ITEMS) {
      expect(validDurations).toContain(item.duration)
    }
  })

  it('only sets `fights` for a buff that outlasts a single fight', () => {
    for (const item of ITEMS) {
      if (item.fights !== undefined) {
        expect(item.duration).not.toBe('instant')
        expect(item.fights).toBeGreaterThan(1)
      }
    }
  })

  it('looks up a known item and throws for an unknown one', () => {
    expect(getItem('luckstone').effect.key).toBe('encounter-bonus')
    // @ts-expect-error deliberately invalid id
    expect(() => getItem('philters-of-nonsense')).toThrow()
  })
})
