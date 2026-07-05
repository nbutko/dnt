import { describe, expect, it } from 'vitest'
import combat from '../../config/combat'
import type { SkillTreeState } from '../../domain/progression'
import { resolveModifiers } from './skill-effects'

const baseTree: SkillTreeState = { endurance: 0, wordsmith: 0, focus: 0, luck: 0, utility: 0 }

describe('resolveModifiers', () => {
  it('returns base stats when nothing is purchased', () => {
    expect(resolveModifiers(baseTree)).toEqual({
      maxHp: combat.playerMaxHp,
      maxHearts: 1,
      wordsmithMaxTier: 1,
    })
  })

  it('a full Endurance branch grants +40 HP and +2 hearts', () => {
    const modifiers = resolveModifiers({ ...baseTree, endurance: 4 })
    expect(modifiers.maxHp).toBe(combat.playerMaxHp + 40)
    expect(modifiers.maxHearts).toBe(3)
  })

  it.each([
    { purchased: 0, expectedTier: 1 },
    { purchased: 1, expectedTier: 2 },
    { purchased: 2, expectedTier: 4 },
    { purchased: 3, expectedTier: 6 },
    { purchased: 4, expectedTier: 8 },
    { purchased: 5, expectedTier: 10 },
  ])('$purchased Wordsmith nodes purchased -> tier $expectedTier', ({ purchased, expectedTier }) => {
    const modifiers = resolveModifiers({ ...baseTree, wordsmith: purchased })
    expect(modifiers.wordsmithMaxTier).toBe(expectedTier)
  })

  it('ignores locked-branch purchase counts (never happens via the UI, but stays inert if it did)', () => {
    const modifiers = resolveModifiers({ ...baseTree, focus: 3, luck: 3, utility: 3 })
    expect(modifiers).toEqual({ maxHp: combat.playerMaxHp, maxHearts: 1, wordsmithMaxTier: 1 })
  })
})
