import { describe, expect, it } from 'vitest'
import type { EncounterRoll } from '../engine/dice/encounter-roll'
import type { Monster, TextTier } from '../domain/types'
import type { PlayerModifiers } from '../domain/progression'
import { intimidatedMonster, resolveFightTier, type FightEncounter } from './battle-store'

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

// A minimal PlayerModifiers — only the field resolveFightTier reads
// (guaranteedFirstCrit) is exercised; the rest are inert placeholders so the
// object type-checks.
const baseModifiers: PlayerModifiers = {
  maxHp: 40,
  maxHearts: 1,
  timeBudgetBonusMs: 0,
  encounterBonus: 0,
  hasAdvantage: false,
  critChanceBonus: 0,
  critDamageMult: 1,
  powerUpMult: 1,
  dodgeChance: 0,
  intimidateWpmCut: 0,
  charmAccuracyCut: 0,
  weaponDie: 8,
  weaponAbilityMod: 2,
  critRange: 20,
  guaranteedFirstCrit: false,
  fumbleImmune: false,
  sneakAttackDice: 0,
  secondWind: null,
  arcaneCritMult: 2,
}

const rollWith = (overrides: Partial<EncounterRoll>): EncounterRoll => ({
  natural: 10,
  total: 10,
  band: 'mid',
  fumble: false,
  inspired: false,
  ...overrides,
})

const encounterWith = (
  overrides: Partial<EncounterRoll>,
  textTierRange: readonly [TextTier, TextTier] = [1, 3],
): FightEncounter => ({ roll: rollWith(overrides), textTierRange })

describe('resolveFightTier', () => {
  it('with no encounter, falls back to the monster.textTier placeholder', () => {
    const result = resolveFightTier(baseMonster, baseModifiers)
    expect(result.servedTier).toBe(1)
    expect(result.targetTier).toBe(1)
    expect(result.noCrits).toBe(false)
    expect(result.fumbleDamageMultiplier).toBe(1)
  })

  it('a low band picks the bottom of the dungeon range as both target and served tier', () => {
    const result = resolveFightTier(baseMonster, baseModifiers, encounterWith({ band: 'low' }))
    expect(result.targetTier).toBe(1)
    expect(result.servedTier).toBe(1)
  })

  it('a high band serves the top of the range — INT no longer caps it', () => {
    const result = resolveFightTier(baseMonster, baseModifiers, encounterWith({ band: 'high' }))
    expect(result.targetTier).toBe(3)
    expect(result.servedTier).toBe(3)
  })

  it('a fumble disables crits and caps damage at 0.75, regardless of band', () => {
    const result = resolveFightTier(baseMonster, baseModifiers, encounterWith({ band: 'low', fumble: true }))
    expect(result.noCrits).toBe(true)
    expect(result.fumbleDamageMultiplier).toBe(0.75)
    expect(result.guaranteedFirstCrit).toBe(false)
  })

  it('an inspired natural 20 forces the first landed hit to crit', () => {
    const result = resolveFightTier(
      baseMonster,
      baseModifiers,
      encounterWith({ band: 'high', natural: 20, inspired: true }),
    )
    expect(result.guaranteedFirstCrit).toBe(true)
    expect(result.noCrits).toBe(false)
    expect(result.fumbleDamageMultiplier).toBe(1)
  })

  it('an existing guaranteedFirstCrit modifier still forces a crit on a non-inspired roll', () => {
    const result = resolveFightTier(
      baseMonster,
      { ...baseModifiers, guaranteedFirstCrit: true },
      encounterWith({ band: 'mid' }),
    )
    expect(result.guaranteedFirstCrit).toBe(true)
  })
})

describe('intimidatedMonster', () => {
  it('cuts the monster wpm by the given fraction', () => {
    const debuffed = intimidatedMonster(baseMonster, 0.2, 0)
    expect(debuffed.wpm).toBeCloseTo(16) // 20 * 0.8
  })

  it('no cut (0) leaves wpm unchanged', () => {
    const debuffed = intimidatedMonster(baseMonster, 0, 0)
    expect(debuffed.wpm).toBe(baseMonster.wpm)
  })

  it('floors the wpm multiplier at 10% of original wpm for an extreme cut', () => {
    const debuffed = intimidatedMonster(baseMonster, 5, 0) // an absurd 500% cut
    expect(debuffed.wpm).toBeCloseTo(baseMonster.wpm * 0.1)
  })

  it('a negative wpm cut (very low CHA) can raise wpm back up, but only ever wpm/accuracy — no other field changes', () => {
    const debuffed = intimidatedMonster(baseMonster, -0.1, 0)
    expect(debuffed.wpm).toBeCloseTo(22) // 20 * 1.1
    expect({ ...debuffed, wpm: baseMonster.wpm }).toEqual(baseMonster)
  })

  it('charm cuts the monster accuracy by the given fraction', () => {
    const debuffed = intimidatedMonster(baseMonster, 0, 0.2)
    expect(debuffed.accuracy).toBeCloseTo(0.72) // 0.9 * 0.8
  })

  it('no charm cut (0) leaves accuracy unchanged', () => {
    const debuffed = intimidatedMonster(baseMonster, 0, 0)
    expect(debuffed.accuracy).toBe(baseMonster.accuracy)
  })

  it('floors the charm multiplier at 10% of original accuracy for an extreme cut', () => {
    const debuffed = intimidatedMonster(baseMonster, 0, 5) // an absurd 500% cut
    expect(debuffed.accuracy).toBeCloseTo(baseMonster.accuracy * 0.1)
  })

  it('a negative charm cut can raise accuracy back up, but never past 1', () => {
    const debuffed = intimidatedMonster(baseMonster, 0, -5) // an absurd inflate
    expect(debuffed.accuracy).toBe(1)
  })

  it('wpm and charm cuts apply independently, in the same call', () => {
    const debuffed = intimidatedMonster(baseMonster, 0.2, 0.3)
    expect(debuffed.wpm).toBeCloseTo(16) // 20 * 0.8
    expect(debuffed.accuracy).toBeCloseTo(0.63) // 0.9 * 0.7
  })
})
