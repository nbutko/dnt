import { ITEMS, type ItemConfig } from '../../config/items'
import type { ItemId } from '../../domain/items'
import { addBuff, restoreHearts } from '../../state/dungeon-run/dungeon-run-reducer'
import { useDungeonRun } from '../../state/dungeon-run/DungeonRunProvider'
import { consumeItem } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'

// No official item emoji set exists yet (content is data-only, config/items.ts
// has no icon field) — this is a presentation-only lookup local to the Bag,
// matching wireframe turn 6a's per-item glyphs (Armory.tsx's WEAPON_ICON is
// the same pattern for weapons).
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
  'ring-of-protection': '💍',
}

// "next fight" / "next 3 fights" / "rest of dungeon" / "instant" — reused by
// both the effect description and (via ActiveBuffsStrip) the active-buff
// pills, so the two surfaces never phrase a duration differently.
export const durationLabel = (item: ItemConfig): string => {
  if (item.duration === 'instant') return 'instant'
  if (item.duration === 'rest-of-dungeon') return 'rest of dungeon'
  return item.fights ? `next ${item.fights} fights` : 'next fight'
}

// One line of flavor-free mechanical summary per effect key — no per-item
// flavor text exists in config/items.ts, so (like Armory.tsx's describeSwap)
// this is derived purely from the effect payload.
const describeEffect = (item: ItemConfig): string => {
  const { effect } = item
  const duration = durationLabel(item)
  switch (effect.key) {
    case 'restore-hearts':
      return `restore ${effect.hearts} heart${effect.hearts > 1 ? 's' : ''} · ${duration}`
    case 'power-up':
      return `+${Math.round(effect.powerUpMultBonus * 100)}% power · ${duration}`
    case 'time-budget':
      return `+${(effect.bonusMs / 1000).toFixed(1)}s time · ${duration}`
    case 'encounter-advantage':
      return `advantage on the d20 · ${duration}`
    case 'encounter-bonus':
      return `+${effect.bonus} to encounter rolls · ${duration}`
    case 'crit-boost':
      return `+crit chance & damage · ${duration}`
    case 'int-roll-bonus':
      return `+${effect.bonus} to encounter rolls (reading) · ${duration}`
    case 'heroism':
      return `+${Math.round(effect.bonusHpPct * 100)}% HP, fumble-immune · ${duration}`
    case 'defense-boost':
      return `+${Math.round(effect.maxHpBonusPct * 100)}% HP, −${Math.round(effect.damageReductionPct * 100)}% dmg taken · ${duration}`
    default:
      return duration
  }
}

interface BagRowProps {
  item: ItemConfig
  owned: number
  onUse: () => void
}

const BagRow = ({ item, owned, onUse }: BagRowProps) => (
  <div
    className="flex items-center gap-2.5 rounded-md border px-2.5 py-2"
    style={{ borderColor: '#7a5a22', background: 'rgba(28,22,8,.5)' }}
  >
    <span className="text-base">{ITEM_ICON[item.id]}</span>
    <div className="flex-1">
      <div className="font-body text-[12.5px]" style={{ color: '#ede1c3' }}>
        {item.name} <span style={{ color: '#8a7a5a' }}>&times;{owned}</span>
      </div>
      <div className="font-body text-[10px] italic" style={{ color: '#8a7a5a' }}>
        {describeEffect(item)}
      </div>
    </div>
    <button
      type="button"
      onClick={onUse}
      className="rounded px-3 py-1.5 font-mono text-[11px]"
      style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
    >
      Use
    </button>
  </div>
)

interface BagProps {
  open: boolean
  onToggle: () => void
}

// The expandable drawer over the dungeon map (wireframe turn 6a): a 🎒 Bag
// button that expands into the owned-consumables list. Using an item is one
// dispatch to EACH store (m3-scope.html#items, finding E) — decrement the
// owned count in the save, and either add a buff or restore hearts in the
// ephemeral run. Deliberately collapsed by default; the caller (DungeonScreen)
// closes it again on node select so it can't be left open mid-fight-prep.
const Bag = ({ open, onToggle }: BagProps) => {
  const { save, dispatch: saveDispatch } = useSave()
  const { dispatch: runDispatch } = useDungeonRun()

  const owned = ITEMS.filter((item) => save.inventory.consumables[item.id] > 0)
  const totalOwned = Object.values(save.inventory.consumables).reduce((sum, n) => sum + n, 0)

  const handleUse = (item: ItemConfig): void => {
    saveDispatch(consumeItem(item.id))
    if (item.effect.key === 'restore-hearts') {
      runDispatch(restoreHearts(item.effect.hearts))
    } else {
      runDispatch(addBuff({ itemId: item.id, duration: item.duration, fightsRemaining: item.fights }))
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-full border px-3 py-1.5 font-mono text-xs"
        style={{
          borderColor: '#e8c766',
          color: '#e8c766',
          background: '#1c1608',
          boxShadow: '0 0 8px #e8c76644',
        }}
      >
        🎒 Bag {totalOwned > 0 && <span style={{ color: '#c9b892' }}>({totalOwned})</span>}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 z-10 mt-2 w-[300px] rounded-[10px] border-2 p-4"
          style={{ borderColor: '#e8c766', background: '#1a0f0a', boxShadow: '0 14px 36px rgba(0,0,0,.7)' }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="font-display text-sm" style={{ color: '#e8c766' }}>
              🎒 The Bag
            </span>
            <button type="button" onClick={onToggle} className="font-mono text-sm" style={{ color: '#a89a7a' }}>
              &times;
            </button>
          </div>
          <div className="mb-3 font-mono text-[10px]" style={{ color: '#8a7a5a' }}>
            use before you fight · closes when you pick a node
          </div>

          {owned.length === 0 ? (
            <p className="font-body text-xs italic" style={{ color: '#8a7a5a' }}>
              Nothing in the bag yet — the Shop sells consumables.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {owned.map((item) => (
                <BagRow
                  key={item.id}
                  item={item}
                  owned={save.inventory.consumables[item.id]}
                  onUse={() => handleUse(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Bag
