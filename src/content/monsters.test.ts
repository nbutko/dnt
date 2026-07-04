import { describe, expect, it } from 'vitest'
import { getMonster, listMonsters } from './monsters'

describe('monsters', () => {
  it('lists the M0 roster', () => {
    const roster = listMonsters()
    expect(roster.map((monster) => monster.id)).toEqual(['slime', 'goblin'])
  })

  it('looks up a monster by id', () => {
    const slime = getMonster('slime')
    expect(slime.hp).toBe(40)
    expect(slime.textTier).toBe(1)
  })

  it('throws for an unknown id', () => {
    expect(() => getMonster('dragon')).toThrow()
  })
})
