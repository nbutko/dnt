import { describe, expect, it } from 'vitest'
import { defaultSave } from '../../domain/save'
import { award, purchaseSkillNode, recordDefeat, saveReducer, unlockTier } from './save-reducer'

describe('saveReducer', () => {
  it('award accumulates coins and xp across multiple dispatches', () => {
    const s1 = saveReducer(defaultSave(), award(10, 5))
    const s2 = saveReducer(s1, award(3, 7))
    expect(s2.coins).toBe(13)
    expect(s2.xp).toBe(12)
  })

  it('purchaseSkillNode spends xp and bumps the branch count', () => {
    const start = { ...defaultSave(), xp: 100 }
    const next = saveReducer(start, purchaseSkillNode('endurance', 40))
    expect(next.xp).toBe(60)
    expect(next.skillTree.endurance).toBe(1)
    expect(next.skillTree.wordsmith).toBe(0)
  })

  it('unlockTier is monotonic — never lowers the current value', () => {
    const start = { ...defaultSave(), highestUnlockedTier: 3 }
    expect(saveReducer(start, unlockTier(5)).highestUnlockedTier).toBe(5)
    expect(saveReducer(start, unlockTier(1)).highestUnlockedTier).toBe(3)
  })

  it('recordDefeat adds a unique monster id and increments battlesWon', () => {
    const s1 = saveReducer(defaultSave(), recordDefeat('slime'))
    expect(s1.monstersDefeated).toEqual(['slime'])
    expect(s1.stats.battlesWon).toBe(1)

    const s2 = saveReducer(s1, recordDefeat('slime'))
    expect(s2.monstersDefeated).toEqual(['slime'])
    expect(s2.stats.battlesWon).toBe(2)

    const s3 = saveReducer(s2, recordDefeat('goblin'))
    expect(s3.monstersDefeated).toEqual(['slime', 'goblin'])
  })
})
