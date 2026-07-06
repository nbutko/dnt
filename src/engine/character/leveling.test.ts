import { describe, expect, it } from 'vitest'
import { ASI_LEVELS, PROFICIENCY_BY_LEVEL, XP_THRESHOLDS } from '../../config/leveling'
import type { AbilityScores } from '../../domain/character'
import { applyAsi, grantsForLevel, levelForXp } from './leveling'

const baseAbilities: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

describe('levelForXp', () => {
  it('sits at level 1 for 0 XP and below the second threshold', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(XP_THRESHOLDS[1] - 1)).toBe(1)
  })

  it.each(XP_THRESHOLDS.map((threshold, index) => [index + 1, threshold] as const).slice(1))(
    'lands exactly on threshold %i (%i XP) and one short of it stays at the prior level',
    (level, threshold) => {
      expect(levelForXp(threshold)).toBe(level)
      expect(levelForXp(threshold - 1)).toBe(level - 1)
    },
  )

  it('never exceeds the table length even for absurd XP', () => {
    expect(levelForXp(10_000_000)).toBe(XP_THRESHOLDS.length)
  })
})

describe('grantsForLevel — proficiency ramp', () => {
  it.each(PROFICIENCY_BY_LEVEL.map((bonus, index) => [index + 1, bonus] as const))(
    'level %i carries proficiency bonus %i',
    (level, bonus) => {
      expect(grantsForLevel('fighter', level, 10).proficiencyBonus).toBe(bonus)
    },
  )
})

describe('grantsForLevel — ASI cadence', () => {
  it.each(ASI_LEVELS)('level %i grants an ASI', (level) => {
    expect(grantsForLevel('fighter', level, 10).grantsAsi).toBe(true)
  })

  it.each([1, 2, 3, 5, 6, 7, 9, 10, 11])('level %i does not grant an ASI', (level) => {
    expect(grantsForLevel('fighter', level, 10).grantsAsi).toBe(false)
  })
})

describe('grantsForLevel — level-1 HP targets (m3-scope.html#leveling)', () => {
  it('a d10 Fighter lands at 40 HP', () => {
    expect(grantsForLevel('fighter', 1, 10).hpAdded).toBe(40)
  })

  it('a d6 Wizard lands a bit under, at 24 HP', () => {
    expect(grantsForLevel('wizard', 1, 10).hpAdded).toBe(24)
  })

  it('level-1 HP ignores CON — only the per-level formula after that adds it', () => {
    expect(grantsForLevel('fighter', 1, 20).hpAdded).toBe(40)
  })
})

describe('grantsForLevel — HP after level 1 adds the average die roll plus scaled CON', () => {
  it('a d10 Fighter with +2 CON gains hit-die-average(6) + CON(2), both scaled by HP_SCALE(4)', () => {
    // con 14 -> abilityMod 2; avg roll for a d10 is ceil((10+1)/2) = 6
    expect(grantsForLevel('fighter', 2, 14).hpAdded).toBe(6 * 4 + 2 * 4)
  })

  it('a negative CON mod can reduce the HP gained at a later level', () => {
    // con 8 -> abilityMod -1; avg roll for a d6 is ceil((6+1)/2) = 4
    expect(grantsForLevel('wizard', 2, 8).hpAdded).toBe(4 * 4 + -1 * 4)
  })
})

describe('grantsForLevel — features unlock at level 1 only (Story 1 has no per-level feature scaling yet)', () => {
  it('level 1 unlocks the class feature', () => {
    const grant = grantsForLevel('rogue', 1, 10)
    expect(grant.featuresUnlocked).toHaveLength(1)
    expect(grant.featuresUnlocked[0].kind).toBe('cunning')
  })

  it('later levels unlock nothing new (yet)', () => {
    expect(grantsForLevel('rogue', 5, 10).featuresUnlocked).toHaveLength(0)
  })
})

describe('applyAsi', () => {
  it('accepts a valid <=2 spend and returns a new, unmutated object', () => {
    const next = applyAsi(baseAbilities, { str: 1, dex: 1 })
    expect(next).toEqual({ ...baseAbilities, str: 11, dex: 11 })
    expect(next).not.toBe(baseAbilities)
    expect(baseAbilities.str).toBe(10) // original untouched
  })

  it('accepts putting all 2 points into one ability', () => {
    const next = applyAsi(baseAbilities, { con: 2 })
    expect(next.con).toBe(12)
  })

  it('rejects a 3-point spend', () => {
    expect(() => applyAsi(baseAbilities, { str: 2, dex: 1 })).toThrow()
  })

  it('rejects a negative delta', () => {
    expect(() => applyAsi(baseAbilities, { str: -1 })).toThrow()
  })
})
