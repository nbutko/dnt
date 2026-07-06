import { useState } from 'react'

import { ABILITY_ORDER } from '../../engine/character/ability-roll'
import { abilityMod, type Ability, type AbilityScores, type Character } from '../../domain/character'
import ModalOverlay from '../common/ModalOverlay'

const ABILITY_NAME: Record<Ability, string> = {
  str: 'STRENGTH',
  dex: 'DEXTERITY',
  con: 'CONSTITUTION',
  int: 'INTELLIGENCE',
  wis: 'WISDOM',
  cha: 'CHARISMA',
}

interface AsiPanelProps {
  character: Character
  // How many points this session may distribute — min(2, pendingAsi). One ASI
  // grants 2 points (engine/character/leveling.ts's ASI_POINTS_PER_LEVEL), so a
  // character banking several still spends them 2 at a time, one confirm each.
  budget: number
  onConfirm: (spend: Partial<AbilityScores>) => void
  onClose: () => void
}

const emptyAlloc = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 })

// The level-up ASI overlay (wireframe turn 2b): +/− steppers distributing the
// banked points across the six abilities. The only discretionary choice a
// level-up offers — everything else (HP, proficiency, features) is automatic
// and derived. Confirm dispatches a single validated `applyAsi` (the reducer
// routes it through the engine's <=2-point guard); the sheet's banner shows any
// points still owed afterward.
const AsiPanel = ({ character, budget, onConfirm, onClose }: AsiPanelProps) => {
  const [alloc, setAlloc] = useState<Record<Ability, number>>(emptyAlloc)

  const spent = ABILITY_ORDER.reduce((sum, a) => sum + alloc[a], 0)
  const pointsLeft = budget - spent

  const bump = (ability: Ability, delta: number) => {
    setAlloc((prev) => {
      const next = prev[ability] + delta
      if (next < 0 || spent + delta > budget) return prev
      return { ...prev, [ability]: next }
    })
  }

  const confirm = () => {
    const spend: Partial<AbilityScores> = {}
    for (const ability of ABILITY_ORDER) {
      if (alloc[ability] > 0) spend[ability] = alloc[ability]
    }
    onConfirm(spend)
  }

  return (
    <ModalOverlay>
      <div className="mb-1.5 text-center">
        <div className="font-mono text-[11px] tracking-[0.2em]" style={{ color: '#7ac96a' }}>
          LEVEL UP
        </div>
        <div className="my-1 font-display text-[28px] text-accent-gold-bright">Ability Score Improvement</div>
        <div className="font-body text-[13px] text-coin italic">
          distribute <span className="text-accent-gold-bright">+{budget} points</span>
        </div>
      </div>

      <div className="my-3 flex justify-center">
        <span
          className="rounded-full border px-3 py-1 font-mono text-xs text-accent-gold-bright"
          style={{ borderColor: '#7a5a22' }}
        >
          Points left: <strong className="text-sm">{pointsLeft}</strong>
        </span>
      </div>

      <div className="my-3.5 flex flex-col gap-2">
        {ABILITY_ORDER.map((ability) => {
          const base = character.abilities[ability]
          const added = alloc[ability]
          const next = base + added
          const mod = abilityMod(next)
          const changed = added > 0
          const canInc = pointsLeft > 0
          const canDec = added > 0
          return (
            <div
              key={ability}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
              style={{
                borderColor: changed ? '#7a5a22' : '#4a3a18',
                background: changed ? 'rgba(28,22,8,.5)' : 'rgba(28,22,8,.35)',
              }}
            >
              <div className="flex-1">
                <span
                  className="font-display text-[13px]"
                  style={{ color: changed ? '#e8c766' : '#c9b892' }}
                >
                  {ABILITY_NAME[ability]}
                </span>
              </div>
              <span className="font-mono text-[13px] text-text-dim">{base}</span>
              <span className="font-mono" style={{ color: changed ? '#7ac96a' : '#a89a7a' }}>
                &rarr;
              </span>
              <span className="font-mono text-[15px] text-text-primary">{next}</span>
              <span className="font-mono text-[11px]" style={{ color: changed ? '#7ac96a' : '#a89a7a' }}>
                ({mod >= 0 ? `+${mod}` : mod})
              </span>
              <div className="ml-2 flex gap-1.5">
                <button
                  type="button"
                  aria-label={`Decrease ${ABILITY_NAME[ability]}`}
                  onClick={() => bump(ability, -1)}
                  disabled={!canDec}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-md border font-mono text-coin disabled:opacity-40"
                  style={{ borderColor: '#7a5a22' }}
                >
                  &minus;
                </button>
                <button
                  type="button"
                  aria-label={`Increase ${ABILITY_NAME[ability]}`}
                  onClick={() => bump(ability, 1)}
                  disabled={!canInc}
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-md font-mono font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: '#e8c766', color: '#1c0f0a' }}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mx-0 mt-1.5 mb-4 text-center font-body text-[11.5px] text-node-locked-text italic">
        Spend both points on one stat, or +1 to two of them. The only choice you make at level-up —
        everything else is automatic.
      </div>

      <div className="flex justify-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded border px-4 py-2 font-display text-xs tracking-[0.06em] text-coin"
          style={{ borderColor: '#7a5a22' }}
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => setAlloc(emptyAlloc())}
          disabled={spent === 0}
          className="rounded border px-4 py-2 font-display text-xs tracking-[0.06em] text-coin disabled:opacity-40"
          style={{ borderColor: '#7a5a22' }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={spent === 0}
          className="rounded px-4 py-2 font-display text-xs tracking-[0.06em] disabled:opacity-40"
          style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
        >
          {pointsLeft > 0 ? `Confirm (spend ${pointsLeft} more)` : 'Confirm'}
        </button>
      </div>
    </ModalOverlay>
  )
}

export default AsiPanel
