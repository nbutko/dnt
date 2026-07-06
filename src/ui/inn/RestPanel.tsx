import { useState } from 'react'

import { rest } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'

interface RestPanelProps {
  maxHearts: number
  maxHp: number
}

// The Rest & Sheet tab's left column (wireframe turn 2a) — the D&D long rest.
// Hearts always read FULL at the Inn: the dungeon-run store that tracks spent
// hearts is ephemeral and never persisted, and every dungeon entry starts a
// fresh run at maxHearts, so there is no persisted deficit to restore (see
// save-reducer.ts's `rest`, a documented no-op). HP likewise always reads full
// here because it resets after every battle. The button therefore mostly gives
// the ritual of resting a beat of feedback rather than changing a number.
const RestPanel = ({ maxHearts, maxHp }: RestPanelProps) => {
  const { dispatch } = useSave()
  const [rested, setRested] = useState(false)

  const takeRest = () => {
    dispatch(rest())
    setRested(true)
  }

  return (
    <div
      className="flex w-[250px] flex-none flex-col items-center rounded-lg border-2 px-4.5 py-4.5 text-center"
      style={{ borderColor: '#7a5a22', background: 'rgba(59,18,32,.25)' }}
    >
      <div className="mb-3.5 font-display text-sm tracking-[0.06em] text-accent-gold-bright">A WARM BED</div>

      <div className="font-display text-[26px] tracking-[0.08em]" style={{ color: '#c94b4b' }}>
        {Array.from({ length: maxHearts }, (_, i) => (
          <span key={i}>&#9829;</span>
        ))}
      </div>
      <div className="mt-1 mb-3.5 font-mono text-[10px] text-text-dim">
        hearts {maxHearts} / {maxHearts} — full
      </div>

      <div
        className="mb-1 h-3 w-full overflow-hidden rounded-full border"
        style={{ borderColor: '#5a4a20', background: '#1c1608' }}
      >
        <div className="h-full w-full" style={{ background: 'linear-gradient(90deg,#8a6a1a,#e8c766)' }} />
      </div>
      <div className="mb-4.5 font-mono text-[10px] text-coin">
        HP {maxHp} / {maxHp} · always full here
      </div>

      <button
        type="button"
        onClick={takeRest}
        disabled={rested}
        className="w-full rounded px-4 py-2 font-display text-xs tracking-[0.06em] disabled:opacity-60"
        style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
      >
        {rested ? 'Rested — hearts full' : 'Take a long rest'}
      </button>

      <div className="mt-2.5 font-body text-[11px] text-node-locked-text italic">
        Restores your spent hearts. HP already resets to full after every battle.
      </div>
    </div>
  )
}

export default RestPanel
