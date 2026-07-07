import { describe, expect, it } from 'vitest'
import { getWeapon } from '../../config/weapons'
import type { Character } from '../../domain/character'
import type { ActiveBuff } from '../../domain/items'
import { resolveModifiers } from './modifiers'

const baseAbilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

const fighter: Character = {
  name: 'Test Fighter',
  class: 'fighter',
  level: 1,
  xp: 0,
  abilities: baseAbilities,
  pendingAsi: 0,
}

const dagger = getWeapon('dagger')

describe("resolveModifiers — base character reproduces today's M2 baseline", () => {
  it('a level-1 Fighter with all-10 abilities and a dagger, no buffs', () => {
    expect(resolveModifiers(fighter, dagger)).toEqual({
      maxHp: 40, // hit die (10) * HP_SCALE (4), matching combat.playerMaxHp
      maxHearts: 1,
      intTierCap: 3,
      timeBudgetBonusMs: 0,
      encounterBonus: 2, // level-1 proficiency bonus
      hasAdvantage: false,
      critChanceBonus: 0,
      critDamageMult: 1,
      powerUpMult: 1,
      dodgeChance: 0,
      intimidateWpmCut: 0,
      weaponDie: 4,
      weaponAbilityMod: 0,
      critRange: 19,
      guaranteedFirstCrit: false,
      fumbleImmune: false,
      sneakAttackDice: 0,
      secondWind: { hpThresholdPct: 0.3, healPct: 0.25 },
      arcaneCritMult: 2,
    })
  })
})

describe('resolveModifiers — CON raises maxHp per the leveling formula', () => {
  it('a level-2 Fighter with +2 CON gains the level-1 base plus the level-2 CON-boosted grant', () => {
    const character: Character = { ...fighter, level: 2, abilities: { ...baseAbilities, con: 14 } }
    // level 1: 10 * 4 = 40; level 2: ceil((10+1)/2) * 4 + 2 * 4 = 24 + 8 = 32
    expect(resolveModifiers(character, dagger).maxHp).toBe(72)
  })

  it('a level-1 Fighter ignores CON entirely (level-1 HP is hit-die only)', () => {
    const character: Character = { ...fighter, abilities: { ...baseAbilities, con: 20 } }
    expect(resolveModifiers(character, dagger).maxHp).toBe(40)
  })
})

describe('resolveModifiers — the equipped weapon', () => {
  it('a greataxe sets weaponDie to a d12 and applies its time-budget penalty', () => {
    const modifiers = resolveModifiers(fighter, getWeapon('greataxe'))
    expect(modifiers.weaponDie).toBe(12)
    expect(modifiers.critRange).toBe(20)
    expect(modifiers.timeBudgetBonusMs).toBe(-500)
  })

  it("a weapon's ability mod comes from the character's score in its governing ability", () => {
    const character: Character = { ...fighter, abilities: { ...baseAbilities, str: 18 } } // mod +4
    expect(resolveModifiers(character, getWeapon('greataxe')).weaponAbilityMod).toBe(4)
  })
})

describe('resolveModifiers — active consumable buffs layer on top', () => {
  it("a Bull's Strength buff raises powerUpMult", () => {
    const buffs: ActiveBuff[] = [{ itemId: 'bulls-strength', duration: 'next-fight' }]
    expect(resolveModifiers(fighter, dagger, buffs).powerUpMult).toBe(1.25)
  })

  it('a Luckstone raises encounterBonus on top of proficiency', () => {
    const buffs: ActiveBuff[] = [{ itemId: 'luckstone', duration: 'rest-of-dungeon' }]
    expect(resolveModifiers(fighter, dagger, buffs).encounterBonus).toBe(4) // 2 proficiency + 2 luckstone
  })

  it('a Potion of Heroism grants fumble immunity', () => {
    const buffs: ActiveBuff[] = [{ itemId: 'potion-of-heroism', duration: 'next-fight' }]
    expect(resolveModifiers(fighter, dagger, buffs).fumbleImmune).toBe(true)
  })

  it('restore-hearts buffs (instant effects) never reach the modifiers bag', () => {
    const buffs: ActiveBuff[] = [{ itemId: 'potion-healing', duration: 'instant' }]
    expect(resolveModifiers(fighter, dagger, buffs)).toEqual(resolveModifiers(fighter, dagger))
  })
})

describe('resolveModifiers — class features', () => {
  it('a Wizard sets arcaneCritMult to 3 and gets a +1 INT tier-cap bonus', () => {
    const wizard: Character = { ...fighter, class: 'wizard' }
    const modifiers = resolveModifiers(wizard, dagger)
    expect(modifiers.arcaneCritMult).toBe(3)
    expect(modifiers.intTierCap).toBe(4) // base 3 + Arcane Mind's +1
  })

  it('a Rogue has advantage and carries Sneak Attack dice', () => {
    const rogue: Character = { ...fighter, class: 'rogue' }
    const modifiers = resolveModifiers(rogue, dagger)
    expect(modifiers.hasAdvantage).toBe(true)
    expect(modifiers.sneakAttackDice).toBe(1)
  })

  it('a non-Fighter carries no Second Wind', () => {
    const wizard: Character = { ...fighter, class: 'wizard' }
    expect(resolveModifiers(wizard, dagger).secondWind).toBeNull()
  })
})
