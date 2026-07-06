// The Shop's price formula (m3-scope.html#shop) — the single source of truth
// the Shop UI and any future modifier both read, so they can never disagree
// on what a hero actually pays (m3-implementation.html#story-10: "a small
// shared price helper so the Shop and the modifier agree on one formula").
// Pure; never imports state/ or ui/.

import type { AbilitiesConfig } from '../../config/abilities'
import abilitiesConfig from '../../config/abilities'
import { getClass } from '../../config/classes'
import { abilityMod, type Character } from '../../domain/character'

export interface PricingConfig {
  abilities: AbilitiesConfig
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  abilities: abilitiesConfig,
}

export interface ShopPrice {
  // The final coin cost, clamped to a minimum of 1 so no discount stack ever
  // makes an item free.
  price: number
  // The net discount fraction that produced `price` — signed, so a negative
  // CHA modifier (with no Bard feature to offset it) comes back negative,
  // which the Shop's banner and PriceTag read as a markup.
  discountPct: number
}

// CHA's modifier is a *signed* discount (m3-scope.html#shop: "a negative CHA
// marks prices up instead"), and a Bard's Silver Tongue feature stacks its own
// flat discount on top — both fold into one net percentage before rounding.
export const shopPrice = (
  basePrice: number,
  character: Character,
  cfg: PricingConfig = DEFAULT_PRICING_CONFIG,
): ShopPrice => {
  const classDef = getClass(character.class)
  const bardDiscountPct = classDef.feature.kind === 'silver-tongue' ? classDef.feature.shopDiscountPct : 0
  const chaDiscountPct = cfg.abilities.chaShopDiscountPctPerMod * abilityMod(character.abilities.cha)
  const discountPct = chaDiscountPct + bardDiscountPct

  const price = Math.max(1, Math.round(basePrice * (1 - discountPct)))
  return { price, discountPct }
}
