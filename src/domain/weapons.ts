// Weapon identity (m3-scope.html#weapons) — the one piece of persistent gear.
// This file is just the shape; the real table (die, ability, crit range,
// tier, price for all eight weapons) lands in config/weapons.ts (Story 1).

import type { Ability } from './character'

export type WeaponId =
  | 'dagger'
  | 'shortsword'
  | 'longsword'
  | 'rapier'
  | 'wand'
  | 'warhammer'
  | 'longbow'
  | 'greataxe'

export interface Weapon {
  id: WeaponId
  name: string
  // The damage die's side count, e.g. 8 for a d8 (engine/damage.ts, Story 7).
  die: number
  // Which ability's modifier adds to damage and (usually) governs the crit
  // range below.
  ability: Ability
  // A natural roll >= this on the weapon die counts as a crit (19 for the
  // dagger/rapier's wider range, 20 for everything else).
  critRange: number
  tier: number
  price: number
}
