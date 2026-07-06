import { describe, expect, it } from 'vitest'
import type { Monster } from '../domain/types'
import { intimidatedMonster } from './battle-store'

const baseMonster: Monster = {
  id: 'goblin',
  name: 'Goblin',
  tier: 1,
  role: 'regular',
  habitat: 'Grassland',
  hp: 30,
  textTier: 1,
  wpm: 20,
  accuracy: 0.9,
  attention: 2,
  slack: 1.75,
  flavor: 'a goblin',
}

describe('intimidatedMonster', () => {
  it('cuts the monster wpm by the given fraction', () => {
    const debuffed = intimidatedMonster(baseMonster, 0.2)
    expect(debuffed.wpm).toBeCloseTo(16) // 20 * 0.8
  })

  it('no cut (0) leaves wpm unchanged', () => {
    const debuffed = intimidatedMonster(baseMonster, 0)
    expect(debuffed.wpm).toBe(baseMonster.wpm)
  })

  it('floors the multiplier at 10% of original wpm for an extreme cut', () => {
    const debuffed = intimidatedMonster(baseMonster, 5) // an absurd 500% cut
    expect(debuffed.wpm).toBeCloseTo(baseMonster.wpm * 0.1)
  })

  it('a negative cut (very low CHA) can raise wpm back up, but only ever wpm — no other field changes', () => {
    const debuffed = intimidatedMonster(baseMonster, -0.1)
    expect(debuffed.wpm).toBeCloseTo(22) // 20 * 1.1
    expect({ ...debuffed, wpm: baseMonster.wpm }).toEqual(baseMonster)
  })
})
