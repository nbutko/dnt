import { toMap, type Screen } from '../../app/navigation'
import { getClass } from '../../config/classes'
import { ITEMS, type ItemConfig } from '../../config/items'
import { WEAPONS, type WeaponConfig } from '../../config/weapons'
import { abilityMod } from '../../domain/character'
import type { ItemId } from '../../domain/items'
import type { WeaponId } from '../../domain/weapons'
import { shopPrice } from '../../engine/character/pricing'
import { durationLabel } from '../dungeon/Bag'
import { buyItem, buyWeapon } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'
import Frame from '../common/Frame'
import ResourcePill from '../common/ResourcePill'
import ShopItem from './ShopItem'

interface ShopScreenProps {
  onNavigate: (screen: Screen) => void
}

// No official item emoji set exists yet (config/items.ts is data-only) — this
// is a presentation-only lookup local to the Shop, matching wireframe turn
// 3a's per-item glyphs. Mirrors ui/dungeon/Bag.tsx's ITEM_ICON of the same
// name/pattern (Armory.tsx's WEAPON_ICON is the weapon-side twin).
const ITEM_ICON: Record<ItemId, string> = {
  'potion-healing': '🧪',
  'potion-greater-healing': '⚗️',
  'bulls-strength': '💪',
  'elixir-of-might': '🔥',
  'potion-of-speed': '⚡',
  guidance: '🙏',
  luckstone: '🍀',
  'oil-of-sharpness': '🗡️',
  'elixir-of-intellect': '🧠',
  'potion-of-heroism': '🛡️',
}

// A flavor-free mechanical one-liner per effect key — no per-item flavor text
// exists in config/items.ts (mirrors Bag.tsx's describeEffect, kept local
// rather than imported since the Shop's blurb omits "instant" as noise for a
// price-tag-adjacent line).
const blurbFor = (item: ItemConfig): string => {
  const { effect } = item
  const suffix = item.duration === 'instant' ? '' : ` · ${durationLabel(item)}`
  switch (effect.key) {
    case 'restore-hearts':
      return `restore ${effect.hearts} heart${effect.hearts > 1 ? 's' : ''}`
    case 'power-up':
      return `+${Math.round(effect.powerUpMultBonus * 100)}% power${suffix}`
    case 'time-budget':
      return `+${(effect.bonusMs / 1000).toFixed(1)}s time${suffix}`
    case 'encounter-advantage':
      return `advantage on the d20${suffix}`
    case 'encounter-bonus':
      return `+${effect.bonus} to encounter rolls${suffix}`
    case 'crit-boost':
      return `+crit chance & damage${suffix}`
    case 'int-tier-cap-bonus':
      return `+${effect.tiers} INT tier cap${suffix}`
    case 'heroism':
      return `+${Math.round(effect.bonusHpPct * 100)}% HP, fumble-immune${suffix}`
    default:
      return suffix
  }
}

// No official weapon emoji set exists yet (config/weapons.ts has no icon
// field) — local to the Shop, matching wireframe t3a's per-weapon glyphs.
// Mirrors ui/inn/Armory.tsx's WEAPON_ICON of the same name/pattern.
const WEAPON_ICON: Record<WeaponId, string> = {
  dagger: '🗡️',
  shortsword: '🗡️',
  longsword: '⚔️',
  rapier: '⚔️',
  wand: '🪄',
  warhammer: '🔨',
  longbow: '🏹',
  greataxe: '🪓',
}

// weapon.critRange 20 reads as a plain "crit 20"; anything lower (the
// dagger/rapier's 19) reads as the 5e-standard range "19–20" (mirrors
// Armory.tsx/CharacterSheet.tsx's helper of the same name/logic).
const critRangeLabel = (critRange: number): string => (critRange >= 20 ? '20' : `${critRange}–20`)

const weaponBlurb = (weapon: WeaponConfig): string =>
  `d${weapon.die} · ${weapon.ability.toUpperCase()} · crit ${critRangeLabel(weapon.critRange)}`

// The Shop (wireframe t3, m3-scope.html#shop): consumables restock every
// visit, weapons are one-off buys. CHA (signed) plus a Bard's Silver Tongue
// adjust every price through the one shared engine/character/pricing.ts
// formula, surfaced here as a banner and per-item on PriceTag.
const ShopScreen = ({ onNavigate }: ShopScreenProps) => {
  const { save, dispatch } = useSave()
  // GameShell gates every screen behind character creation (Story 4), so
  // save.character is always real here — TS can't see that cross-component
  // invariant, hence the assertion (matches WorldMapScreen/InnScreen).
  const character = save.character!

  const chaMod = abilityMod(character.abilities.cha)
  const isBard = getClass(character.class).feature.kind === 'silver-tongue'
  // discountPct doesn't depend on the base price passed in — any base works
  // to read the net rate for the banner.
  const { discountPct: netDiscountPct } = shopPrice(100, character)
  const pctLabel = `${Math.round(Math.abs(netDiscountPct) * 100)}%`

  return (
    <Frame maxWidth={1080}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="font-mono text-xs text-text-dim hover:text-accent-gold-bright"
          onClick={() => onNavigate(toMap())}
        >
          ← World Map
        </button>
        <h1 className="font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
          The Shop
        </h1>
        <ResourcePill kind="coins" amount={save.coins} />
      </div>

      {netDiscountPct !== 0 && (
        <div
          className="mb-4 flex items-center gap-2.5 rounded-md border px-3.5 py-2"
          style={{
            borderColor: netDiscountPct > 0 ? '#3a5a2a' : '#7a2020',
            background: netDiscountPct > 0 ? 'rgba(58,90,42,.15)' : 'rgba(139,32,32,.15)',
          }}
        >
          <span className="text-[15px]">🗣️</span>
          <span
            className="font-body text-[12.5px]"
            style={{ color: netDiscountPct > 0 ? '#a8c98d' : '#c98d8d' }}
          >
            Your <strong>Charisma {chaMod >= 0 ? `+${chaMod}` : chaMod}</strong>
            {isBard && ' and Silver Tongue'}{' '}
            {netDiscountPct > 0
              ? `charms the keeper — prices are marked down ${pctLabel}.`
              : `rubs the keeper the wrong way — prices are marked up ${pctLabel}. Raise CHA (or play a Bard) to charm them down.`}
          </span>
        </div>
      )}

      <div className="flex items-start gap-5.5">
        <div className="flex-1">
          <div className="mb-2.5 font-mono text-[11px] tracking-[0.14em] text-text-dim uppercase">
            Consumables · restock each visit
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {ITEMS.map((item) => {
              const { price, discountPct } = shopPrice(item.price, character)
              return (
                <ShopItem
                  key={item.id}
                  layout="card"
                  icon={ITEM_ICON[item.id]}
                  name={item.name}
                  blurb={blurbFor(item)}
                  basePrice={item.price}
                  price={price}
                  discountPct={discountPct}
                  coins={save.coins}
                  onBuy={() => dispatch(buyItem(item.id, price))}
                />
              )
            })}
          </div>
        </div>

        <div className="w-[300px] flex-none">
          <div className="mb-2.5 font-mono text-[11px] tracking-[0.14em] text-text-dim uppercase">
            Weapon rack · one-off
          </div>
          <div className="flex flex-col gap-2.5">
            {WEAPONS.map((weapon) => {
              const owned = save.inventory.weapons.includes(weapon.id)
              const { price, discountPct } = shopPrice(weapon.price, character)
              return (
                <ShopItem
                  key={weapon.id}
                  layout="row"
                  icon={WEAPON_ICON[weapon.id]}
                  name={weapon.name}
                  blurb={weaponBlurb(weapon)}
                  basePrice={weapon.price}
                  price={price}
                  discountPct={discountPct}
                  coins={save.coins}
                  owned={owned}
                  onBuy={() => dispatch(buyWeapon(weapon.id, price))}
                />
              )
            })}
          </div>
        </div>
      </div>
    </Frame>
  )
}

export default ShopScreen
