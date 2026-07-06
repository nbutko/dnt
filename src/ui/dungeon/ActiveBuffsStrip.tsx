import { getItem } from '../../config/items'
import type { ActiveBuff } from '../../domain/items'

// "next fight" / "3 fights left" / "rest of dungeon" — the strip's own phrasing
// of an ActiveBuff's remaining life, distinct from Bag.tsx's durationLabel
// (which describes an unused item's shelf life, not a ticking one).
const remainingLabel = (buff: ActiveBuff): string => {
  if (buff.duration === 'rest-of-dungeon') return 'rest of dungeon'
  if (buff.fightsRemaining !== undefined) {
    return `${buff.fightsRemaining} fight${buff.fightsRemaining > 1 ? 's' : ''} left`
  }
  return 'next fight'
}

interface ActiveBuffsStripProps {
  buffs: ActiveBuff[]
}

// The pinned "what's riding on the next fight" readout (wireframe turn 6a) —
// glanceable enough to stay visible even while the Bag drawer is collapsed.
// Renders nothing when no buffs are active, so it never occupies space the
// graph could use.
const ActiveBuffsStrip = ({ buffs }: ActiveBuffsStripProps) => {
  if (buffs.length === 0) return null

  return (
    <div
      className="mt-2.5 mb-4 flex items-center gap-2.5 rounded-lg border px-3.5 py-2"
      style={{ borderColor: '#7ac96a55', background: 'rgba(122,201,106,.06)' }}
    >
      <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: '#7ac96a' }}>
        ACTIVE BUFFS
      </span>
      {buffs.map((buff, index) => {
        const item = getItem(buff.itemId)
        return (
          <span
            // Buffs of the same item can coexist (e.g. two Bull's Strength
            // uses), so the array index — not itemId — is the stable key.
            // eslint-disable-next-line react/no-array-index-key
            key={`${buff.itemId}-${index}`}
            className="rounded-full border px-2.5 py-1 font-mono text-[11px]"
            style={{ borderColor: '#4a7a3a', background: 'rgba(74,122,58,.15)', color: '#c9e6b6' }}
          >
            {item.name} · {remainingLabel(buff)}
          </span>
        )
      })}
      <span className="ml-auto font-body text-[11px] italic" style={{ color: '#8a7a5a' }}>
        clears when you leave the dungeon
      </span>
    </div>
  )
}

export default ActiveBuffsStrip
