// The four launch classes (m3-scope.html#classes) — hit die, favored
// abilities, starting weapon, and a machine-readable feature descriptor.
// Pure data + a lookup; the mechanics that actually *read* these fields
// (Second Wind firing, Sneak Attack dice landing, the encounter d20 taking
// advantage, …) are engine/character/modifiers.ts's job (Story 3) and
// battle-store's (Story 11), not this file's.

import type { Ability, CharacterClass } from '../domain/character'
import type { WeaponId } from '../domain/weapons'

// One variant per class — every ClassDef carries exactly the feature that
// matches its own `id`, but a flat union (vs. per-class interfaces) keeps
// every consumer's switch/case exhaustive-checkable on `kind`.
export type ClassFeature =
  | {
      kind: 'second-wind'
      // Fighter: once per battle, the first time HP crosses this threshold,
      // auto-heal by this fraction of max HP and flash "Second Wind!"
      // (m3-scope.html#ability-mechanics). Placeholders — Story 13/M5 tune.
      hpThresholdPct: number
      healPct: number
    }
  | {
      kind: 'arcane-mind'
      // Wizard: crits roll the damage dice this many times (2 is the
      // baseline every other class uses — engine/damage.ts, Story 7), and
      // the INT tier-cap sits this many tiers above normal.
      critDiceCount: number
      intTierCapBonus: number
    }
  | {
      kind: 'cunning'
      // Rogue: advantage on the encounter d20 (roll twice, keep higher), a
      // bonus damage die on the first landed hit and every crit, and
      // Expertise (double proficiency) on the mimic-sense check.
      encounterAdvantage: true
      sneakAttackDice: number
      sneakAttackDie: number
      mimicExpertise: true
    }
  | {
      kind: 'silver-tongue'
      // Bard: cheaper Shop prices (stacks with the CHA discount), a debuff
      // on enemies faced this dungeon, and a limited encounter-d20 reroll.
      shopDiscountPct: number
      enemyDebuffPct: number
      rerollsPerDungeon: number
    }

export interface ClassDef {
  id: CharacterClass
  name: string
  hitDie: number
  favoredAbilities: readonly [Ability, Ability]
  startingWeapon: WeaponId
  feature: ClassFeature
}

export const CLASSES: readonly ClassDef[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 10,
    favoredAbilities: ['str', 'con'],
    startingWeapon: 'longsword',
    // "the first time a fight turns dire (HP drops to ≤30%)" — scope's exact
    // threshold; the heal fraction is a Story 13 placeholder.
    feature: { kind: 'second-wind', hpThresholdPct: 0.3, healPct: 0.25 },
  },
  {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 6,
    favoredAbilities: ['int', 'wis'],
    startingWeapon: 'wand',
    // "crits roll the damage dice three times instead of two" + "INT
    // tier-cap sits one tier above normal" — both exact per the scope.
    feature: { kind: 'arcane-mind', critDiceCount: 3, intTierCapBonus: 1 },
  },
  {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 8,
    favoredAbilities: ['dex', 'cha'],
    startingWeapon: 'dagger',
    // Sneak Attack die count/size are 5e-standard-shaped placeholders;
    // Story 13/M5 grow sneakAttackDice with level.
    feature: {
      kind: 'cunning',
      encounterAdvantage: true,
      sneakAttackDice: 1,
      sneakAttackDie: 6,
      mimicExpertise: true,
    },
  },
  {
    id: 'bard',
    name: 'Bard',
    hitDie: 8,
    favoredAbilities: ['cha', 'wis'],
    startingWeapon: 'rapier',
    // "one Bardic Inspiration reroll per dungeon" is exact per the scope;
    // the discount/debuff magnitudes are Story 13/M5 placeholders.
    feature: { kind: 'silver-tongue', shopDiscountPct: 0.15, enemyDebuffPct: 0.1, rerollsPerDungeon: 1 },
  },
]

export const getClass = (id: CharacterClass): ClassDef => {
  const found = CLASSES.find((candidate) => candidate.id === id)
  if (!found) {
    throw new Error(`Unknown class id: ${id}`)
  }
  return found
}
