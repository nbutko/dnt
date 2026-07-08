// The eight launch weapons (m3-scope.html#weapons) — die, governing ability,
// crit range, tier, price, and the greataxe's time-budget penalty. Pure
// data + a lookup, matching domain/weapons.ts's Weapon shape exactly (plus
// the one extra field the scope's weapon table needs).

import type { Weapon, WeaponId } from '../domain/weapons'

export interface WeaponConfig extends Weapon {
  // Extra ms subtracted from the typing time budget (engine/character/
  // modifiers.ts, Story 3) — the greataxe's risk/reward tax
  // (m3-scope.html#weapons: "wildly swingy... but heavy"). 0 for every other
  // weapon. A Story 13/M5 tuning knob, not a scope decision.
  timeBudgetPenaltyMs: number
}

// Prices are a first-pass ladder against config/rewards.ts's coin payouts
// (m3-scope.html#open "Weapon/item pricing" is an explicit open question) —
// Story 13/M5 rebalances these, not this story.
export const WEAPONS: readonly WeaponConfig[] = [
  {
    id: 'dagger',
    name: 'Dagger',
    die: 4,
    ability: 'dex',
    critRange: 19,
    tier: 1,
    price: 10,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'shortsword',
    name: 'Shortsword',
    die: 6,
    ability: 'dex',
    critRange: 20,
    tier: 1,
    price: 25,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'longsword',
    name: 'Longsword',
    die: 8,
    ability: 'str',
    critRange: 20,
    tier: 2,
    price: 60,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'rapier',
    name: 'Rapier',
    die: 8,
    ability: 'dex',
    critRange: 19,
    tier: 2,
    price: 70,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'wand',
    name: 'Wand',
    die: 6,
    ability: 'int',
    critRange: 20,
    tier: 2,
    price: 65,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'warhammer',
    name: 'Warhammer',
    die: 10,
    ability: 'str',
    critRange: 20,
    tier: 3,
    price: 120,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'longbow',
    name: 'Longbow',
    die: 8,
    ability: 'dex',
    critRange: 20,
    tier: 3,
    price: 110,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'greataxe',
    name: 'Greataxe',
    die: 12,
    ability: 'str',
    critRange: 20,
    tier: 3,
    price: 130,
    bonusDamage: 0,
    timeBudgetPenaltyMs: 500,
  },

  // --- Story 3: the weapon ladder extended the length of the game ---------
  // One "+N magic" tier per governing ability above the launch tier-3
  // ceiling, so a Fighter/Rogue/Bard/Wizard all have somewhere to grow past
  // level ~5 instead of plateauing on their tier-2/3 launch weapon for the
  // rest of the game (content-plan-v2-tuning-implementation.html#story-3;
  // Story 1's report flagged D9-D11 htk running under target because
  // engine/sim/balance.ts's weaponForTierLevel had nowhere higher to go).
  // Escalates on three axes together — die size (capped at d12, the
  // biggest standard die), a flat "+N" bonusDamage (the same slot the
  // ability mod already occupies), and a tighter critRange (which now
  // actually raises crit chance, engine/damage.ts's critRangeChanceBonus) —
  // rather than inventing non-standard dice past d12. Priced monotonically
  // with `tier` against the coin economy's per-tier growth (config/
  // rewards.ts's tierGrowth 0.35 roughly doubles a boss's payout every ~3
  // tiers, so these roughly double in price across the same span).
  {
    id: 'greatsword-plus1',
    name: 'Greatsword +1',
    die: 12,
    ability: 'str',
    critRange: 20,
    tier: 5,
    price: 220,
    bonusDamage: 1,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'greatsword-plus2',
    name: 'Greatsword +2',
    die: 12,
    ability: 'str',
    critRange: 19,
    tier: 9,
    price: 480,
    bonusDamage: 2,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'fine-rapier-plus1',
    name: 'Fine Rapier +1',
    die: 10,
    ability: 'dex',
    critRange: 19,
    tier: 5,
    price: 230,
    bonusDamage: 1,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'fine-rapier-plus2',
    name: 'Fine Rapier +2',
    die: 10,
    ability: 'dex',
    critRange: 17,
    tier: 9,
    price: 480,
    bonusDamage: 2,
    timeBudgetPenaltyMs: 0,
  },
  // The Wizard's wand-line (Finding 3: "the wand is a d6 with no successor")
  // — three upgrades, not two, since the Wizard was the outlier the whole
  // pass targets; each tier tightens critRange too, so the Arcane Mind's
  // 3-dice crit (config/classes.ts's critDiceCount) has more chances to
  // actually fire, not just a bigger die to fire on.
  {
    id: 'wand-plus1',
    name: 'Wand +1',
    die: 8,
    ability: 'int',
    critRange: 19,
    tier: 4,
    price: 190,
    bonusDamage: 1,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'wand-plus2',
    name: 'Wand +2',
    die: 10,
    ability: 'int',
    critRange: 18,
    tier: 7,
    price: 400,
    bonusDamage: 2,
    timeBudgetPenaltyMs: 0,
  },
  {
    id: 'wand-plus3',
    name: 'Wand +3',
    die: 12,
    ability: 'int',
    critRange: 17,
    tier: 10,
    price: 680,
    bonusDamage: 3,
    timeBudgetPenaltyMs: 0,
  },
]

export const getWeapon = (id: WeaponId): WeaponConfig => {
  const found = WEAPONS.find((candidate) => candidate.id === id)
  if (!found) {
    throw new Error(`Unknown weapon id: ${id}`)
  }
  return found
}
