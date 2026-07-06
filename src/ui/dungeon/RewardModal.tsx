import { getItem } from '../../config/items'
import { getWeapon } from '../../config/weapons'
import type { ItemId } from '../../domain/items'
import type { WeaponId } from '../../domain/weapons'
import ModalOverlay from '../common/ModalOverlay'

// No official weapon/item emoji set exists yet (config/weapons.ts and
// config/items.ts are data-only) — the same presentation-only lookup
// Armory.tsx's WEAPON_ICON / Bag.tsx's ITEM_ICON already keep locally, just
// duplicated here for the reward modal's own "You found: X" line.
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

// The real chest's (or a boss's guaranteed) gear/consumable drop
// (m3-scope.html#loot, Story 12) — resolved to an icon + name here rather
// than handed pre-formatted, so the modal is the one place that knows how to
// present a loot drop.
export interface RewardLoot {
  kind: 'weapon' | 'consumable'
  id: WeaponId | ItemId
}

const lootIconAndName = (loot: RewardLoot): { icon: string; name: string } =>
  loot.kind === 'weapon'
    ? { icon: WEAPON_ICON[loot.id as WeaponId], name: getWeapon(loot.id as WeaponId).name }
    : { icon: ITEM_ICON[loot.id as ItemId], name: getItem(loot.id as ItemId).name }

interface RewardRowProps {
  label: string
  gained: number
  total: number
  className: string
}

const RewardRow = ({ label, gained, total, className }: RewardRowProps) => (
  <div className="flex items-center justify-between gap-6 font-mono text-sm">
    <span className={className}>
      +{gained} {label}
    </span>
    <span className="text-text-dim">{total} total</span>
  </div>
)

interface RewardModalProps {
  title: string
  xpGained: number
  coinsGained: number
  xpTotal: number
  coinsTotal: number
  // A real chest's (or a boss's guaranteed) gear/consumable drop — undefined
  // for a plain kill, or a chest that rolled a coin hoard (m3-scope.html#loot).
  loot?: RewardLoot
  onConfirm: () => void
}

// Shown when a battle is won or the real chest is opened (feedback #1): what you
// just gained, plus the new running total, for both XP and coins. It is also the
// single "continue" for the win (feedback #12) — its button is autofocused so
// Enter alone confirms, and confirming is what advances the run back to the
// graph. There's no separate battle Continue press to make first; a win resolves
// straight into this modal. Non-dismissable (ModalOverlay).
const RewardModal = ({
  title,
  xpGained,
  coinsGained,
  xpTotal,
  coinsTotal,
  loot,
  onConfirm,
}: RewardModalProps) => (
  <ModalOverlay>
    <p className="font-display text-2xl font-bold tracking-[0.1em] text-accent-gold-bright uppercase">
      {title}
    </p>
    <div className="mx-auto mt-4 flex w-full max-w-[16rem] flex-col gap-2">
      {xpGained > 0 && (
        <RewardRow label="XP" gained={xpGained} total={xpTotal} className="text-accent-gold-bright" />
      )}
      {coinsGained > 0 && (
        <RewardRow label="coins" gained={coinsGained} total={coinsTotal} className="text-coin" />
      )}
    </div>
    {loot &&
      (() => {
        const { icon, name } = lootIconAndName(loot)
        return (
          <p className="mt-4 font-mono text-sm text-accent-gold-bright">
            You found: <span className="text-base">{icon}</span> {name}
          </p>
        )
      })()}
    <button
      type="button"
      onClick={onConfirm}
      // Autofocused so Enter alone confirms and returns to the graph (feedback #12).
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      className="mt-6 rounded border border-border-gold px-5 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
    >
      Continue →
    </button>
  </ModalOverlay>
)

export default RewardModal
