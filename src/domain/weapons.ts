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
  // Story 3 (content-plan-v2-tuning-implementation.html): the weapon ladder
  // extended the length of the game, one "+N magic" tier per governing
  // ability (STR/DEX/INT) above the launch tier-3 ceiling, so every class
  // has an upgrade path at every dungeon tier — see engine/sim/balance.ts's
  // weaponForTierLevel.
  | 'greatsword-plus1'
  | 'greatsword-plus2'
  | 'fine-rapier-plus1'
  | 'fine-rapier-plus2'
  | 'wand-plus1'
  | 'wand-plus2'
  | 'wand-plus3'

export interface Weapon {
  id: WeaponId
  name: string
  // The damage die's side count, e.g. 8 for a d8 (engine/damage.ts, Story 7).
  die: number
  // Which ability's modifier adds to damage and (usually) governs the crit
  // range below.
  ability: Ability
  // A natural roll >= this on the weapon die counts as a crit (19 for the
  // dagger/rapier's wider range, 20 for everything else; Story 3's "+N"
  // weapons go as low as 17 — engine/damage.ts's critRangeChanceBonus turns
  // this into real crit-chance percentage, so it's no longer a display-only
  // number).
  critRange: number
  tier: number
  price: number
  // Story 3: a flat "+N magic weapon" damage bonus, added alongside the
  // ability mod (engine/character/modifiers.ts's weaponAbilityMod) — the
  // headroom axis for weapons past d12 (the biggest standard die), same
  // slot the ability mod already occupies (added once per hit, not doubled
  // by crit dice). 0 for every launch weapon.
  bonusDamage: number
}
