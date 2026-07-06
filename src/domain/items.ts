// Consumable identity (m3-scope.html#items) — per-run buffs bought at the
// Shop, owned forever, spent from the dungeon map before a fight. This file
// is just the shape; the real table (effect, duration, tier, price for all
// ten items) lands in config/items.ts (Story 1).

export type ItemId =
  | 'potion-healing'
  | 'potion-greater-healing'
  | 'bulls-strength'
  | 'elixir-of-might'
  | 'potion-of-speed'
  | 'guidance'
  | 'luckstone'
  | 'oil-of-sharpness'
  | 'elixir-of-intellect'
  | 'potion-of-heroism'

// Two duration shapes plus instant healing — no status-effect engine needed
// (m3-scope.html#items).
export type BuffDuration = 'next-fight' | 'rest-of-dungeon' | 'instant'

export interface Consumable {
  id: ItemId
  name: string
  duration: BuffDuration
  tier: number
  price: number
}

// A consumable's effect once activated — lives in the ephemeral dungeon-run
// store (state/dungeon-run/, Story 9), never the persistent save: owning a
// Luckstone is a save fact, but it being active is a run fact that must die
// when the run does (finding E, m3-implementation.html).
export interface ActiveBuff {
  itemId: ItemId
  duration: BuffDuration
  // Counts down fights remaining for a buff that outlasts a single fight but
  // isn't "rest of dungeon" (e.g. Oil of Sharpness's "next 3 fights").
  // Unused for 'rest-of-dungeon' and 'instant' buffs.
  fightsRemaining?: number
}
