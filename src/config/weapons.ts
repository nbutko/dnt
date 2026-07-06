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
  { id: 'dagger', name: 'Dagger', die: 4, ability: 'dex', critRange: 19, tier: 1, price: 10, timeBudgetPenaltyMs: 0 },
  {
    id: 'shortsword',
    name: 'Shortsword',
    die: 6,
    ability: 'dex',
    critRange: 20,
    tier: 1,
    price: 25,
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
    timeBudgetPenaltyMs: 0,
  },
  { id: 'rapier', name: 'Rapier', die: 8, ability: 'dex', critRange: 19, tier: 2, price: 70, timeBudgetPenaltyMs: 0 },
  { id: 'wand', name: 'Wand', die: 6, ability: 'int', critRange: 20, tier: 2, price: 65, timeBudgetPenaltyMs: 0 },
  {
    id: 'warhammer',
    name: 'Warhammer',
    die: 10,
    ability: 'str',
    critRange: 20,
    tier: 3,
    price: 120,
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
    timeBudgetPenaltyMs: 500,
  },
]

export const getWeapon = (id: WeaponId): WeaponConfig => {
  const found = WEAPONS.find((candidate) => candidate.id === id)
  if (!found) {
    throw new Error(`Unknown weapon id: ${id}`)
  }
  return found
}
