// The ten launch consumables (m3-scope.html#items) — effect key, duration,
// tier, price. Pure data + a lookup, matching domain/items.ts's Consumable
// shape exactly (plus the effect payload the scope's item table needs to be
// machine-readable for Story 9's Bag/buff wiring).

import type { Consumable, ItemId } from '../domain/items'

// One variant per effect the scope's item table describes — the magnitude
// fields are Story 13/M5 placeholders, the `key` discriminant is what
// Story 9's dungeon-run reducer switches on when a buff resolves.
export type ItemEffect =
  | { key: 'restore-hearts'; hearts: number }
  | { key: 'power-up'; powerUpMultBonus: number }
  | { key: 'time-budget'; bonusMs: number }
  | { key: 'encounter-advantage' }
  | { key: 'encounter-bonus'; bonus: number }
  | { key: 'crit-boost'; critChanceBonus: number; critDamageMultBonus: number }
  | { key: 'int-tier-cap-bonus'; tiers: number }
  | { key: 'heroism'; bonusHpPct: number; fumbleImmune: true }

export interface ItemConfig extends Consumable {
  effect: ItemEffect
  // Set only for a buff that outlasts one fight but isn't "rest of
  // dungeon" — today, only Oil of Sharpness's "next 3 fights"
  // (domain/items.ts's ActiveBuff.fightsRemaining doc comment). Mirrors
  // that field's shape so Story 9 can seed it directly.
  fights?: number
}

// Prices/magnitudes are first-pass placeholders (m3-scope.html#open
// "Weapon/item pricing" is an explicit open question) — Story 13/M5
// rebalances these, not this story. Listed in defaultSave()'s
// inventory.consumables key order (domain/save.ts).
export const ITEMS: readonly ItemConfig[] = [
  {
    id: 'potion-healing',
    name: 'Potion of Healing',
    duration: 'instant',
    tier: 1,
    price: 15,
    effect: { key: 'restore-hearts', hearts: 1 },
  },
  {
    id: 'potion-greater-healing',
    name: 'Potion of Greater Healing',
    duration: 'instant',
    tier: 2,
    price: 35,
    effect: { key: 'restore-hearts', hearts: 2 },
  },
  {
    id: 'bulls-strength',
    name: "Bull's Strength",
    duration: 'next-fight',
    tier: 1,
    price: 20,
    effect: { key: 'power-up', powerUpMultBonus: 0.25 },
  },
  {
    id: 'elixir-of-might',
    name: 'Elixir of Might',
    duration: 'rest-of-dungeon',
    tier: 3,
    price: 90,
    effect: { key: 'power-up', powerUpMultBonus: 0.5 },
  },
  {
    id: 'potion-of-speed',
    name: 'Potion of Speed',
    duration: 'next-fight',
    tier: 1,
    price: 20,
    effect: { key: 'time-budget', bonusMs: 3000 },
  },
  {
    id: 'guidance',
    name: 'Guidance',
    duration: 'next-fight',
    tier: 1,
    price: 15,
    effect: { key: 'encounter-advantage' },
  },
  {
    id: 'luckstone',
    name: 'Luckstone',
    duration: 'rest-of-dungeon',
    tier: 2,
    price: 60,
    // "+2 to all encounter rolls" — exact per the scope's item table.
    effect: { key: 'encounter-bonus', bonus: 2 },
  },
  {
    id: 'oil-of-sharpness',
    name: 'Oil of Sharpness',
    duration: 'next-fight',
    tier: 2,
    price: 45,
    fights: 3,
    effect: { key: 'crit-boost', critChanceBonus: 0.1, critDamageMultBonus: 0.5 },
  },
  {
    id: 'elixir-of-intellect',
    name: 'Elixir of Intellect',
    duration: 'next-fight',
    tier: 2,
    price: 40,
    effect: { key: 'int-tier-cap-bonus', tiers: 1 },
  },
  {
    id: 'potion-of-heroism',
    name: 'Potion of Heroism',
    duration: 'next-fight',
    tier: 2,
    price: 40,
    effect: { key: 'heroism', bonusHpPct: 0.2, fumbleImmune: true },
  },
]

export const getItem = (id: ItemId): ItemConfig => {
  const found = ITEMS.find((candidate) => candidate.id === id)
  if (!found) {
    throw new Error(`Unknown item id: ${id}`)
  }
  return found
}
