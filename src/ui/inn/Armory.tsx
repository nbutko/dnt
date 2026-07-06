import { useState } from 'react'

import { getWeapon, type WeaponConfig } from '../../config/weapons'
import { abilityMod } from '../../domain/character'
import type { WeaponId } from '../../domain/weapons'
import { equipWeapon } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'

// No official weapon emoji set exists yet (content is data-only, config/
// weapons.ts has no icon field) — this is a presentation-only lookup local to
// the Armory, matching wireframe turn 7a's per-weapon glyphs.
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
// CharacterSheet.tsx's helper of the same name/logic).
const critRangeLabel = (critRange: number): string => (critRange >= 20 ? '20' : `${critRange}–20`)

type Direction = 'better' | 'worse' | 'neutral'

const DIR_COLOR: Record<Direction, string | undefined> = {
  better: '#7ac96a',
  worse: '#c98d8d',
  neutral: undefined,
}
const DIR_ARROW: Record<Direction, string> = { better: ' ▲', worse: ' ▼', neutral: '' }

// Which side of a stat is "better" varies (a bigger die is better, a smaller
// crit-range number is better since it procs on more rolls) — callers pass
// which direction counts as an improvement.
const directionFor = (equippedVal: number, selectedVal: number, higherIsBetter: boolean): Direction => {
  if (selectedVal === equippedVal) return 'neutral'
  const selectedIsHigher = selectedVal > equippedVal
  const isBetter = higherIsBetter ? selectedIsHigher : !selectedIsHigher
  return isBetter ? 'better' : 'worse'
}

interface DeltaRowProps {
  label: string
  equippedText: string
  selectedText: string
  direction: Direction
}

// One line of the compare panel (wireframe 7a): equipped value ⟷ label ⟷
// selected value, the selected side tinted/arrowed by whether it's an
// improvement.
const DeltaRow = ({ label, equippedText, selectedText, direction }: DeltaRowProps) => (
  <div className="grid items-center gap-2.5 font-mono text-xs" style={{ gridTemplateColumns: '1fr 90px 1fr' }}>
    <span className="text-right" style={{ color: '#c9b892' }}>
      {equippedText}
    </span>
    <span className="text-center text-[10px]" style={{ color: '#8a7a5a' }}>
      {label}
    </span>
    <span style={{ color: DIR_COLOR[direction] ?? '#ede1c3' }}>
      {selectedText}
      {DIR_ARROW[direction]}
    </span>
  </div>
)

// A generic one-line summary of the swap's trade-offs — no per-weapon flavor
// text exists in config/weapons.ts, so this is derived purely from the stat
// deltas (die/ability/crit/time), unlike the wireframe's hand-authored
// Greataxe caption.
const describeSwap = (equipped: WeaponConfig, selected: WeaponConfig): string => {
  if (equipped.id === selected.id) return `${selected.name} is already equipped.`
  const bits: string[] = []
  if (selected.die > equipped.die) bits.push('a bigger damage die')
  else if (selected.die < equipped.die) bits.push('a smaller damage die')
  if (selected.ability !== equipped.ability) bits.push(`a shift to ${selected.ability.toUpperCase()}`)
  if (selected.critRange < equipped.critRange) bits.push('a wider crit range')
  else if (selected.critRange > equipped.critRange) bits.push('a tighter crit range')
  if (selected.timeBudgetPenaltyMs > equipped.timeBudgetPenaltyMs) bits.push('a tighter typing clock')
  else if (selected.timeBudgetPenaltyMs < equipped.timeBudgetPenaltyMs) bits.push('more time to type')
  if (bits.length === 0) return `${selected.name} plays almost identically to your ${equipped.name}.`
  return `The ${selected.name} brings ${bits.join(', ')}.`
}

// The inventory row's border/background/glow: gold+glow when equipped,
// amber+dim-glow when merely selected, plain otherwise.
const rowBorderColor = (isEquipped: boolean, isSelected: boolean): string => {
  if (isEquipped) return '#e8c766'
  if (isSelected) return '#c9a227'
  return '#7a5a22'
}
const rowBoxShadow = (isEquipped: boolean, isSelected: boolean): string | undefined => {
  if (isEquipped) return '0 0 12px #e8c76644'
  if (isSelected) return '0 0 8px #c9a22733'
  return undefined
}

// The Inn's Armory tab (wireframe turn 7a): the owned-weapon list on the left
// (equipped badge, click-to-select) and a compare-and-equip panel on the
// right. Equip is only reachable here — the dungeon UI never dispatches
// equipWeapon, so a weapon is a run-long commitment (m3-scope.html#weapons).
const Armory = () => {
  const { save, dispatch } = useSave()
  const character = save.character!
  const equippedId = save.equippedWeapon
  const owned = save.inventory.weapons.map(getWeapon)

  // Selection defaults to the equipped weapon so the compare panel opens with
  // no deltas; clicking any row (equipped or not) moves the selection there.
  const [selectedId, setSelectedId] = useState<WeaponId>(equippedId)

  const equipped = getWeapon(equippedId)
  const selected = getWeapon(selectedId)
  const isSelectedEquipped = selectedId === equippedId

  const equippedMod = abilityMod(character.abilities[equipped.ability])
  const selectedMod = abilityMod(character.abilities[selected.ability])

  return (
    <div>
      <div className="mb-4 text-center font-body text-xs text-text-dim italic">
        Equip here between dungeons — no swapping once you&rsquo;re inside a run.
      </div>

      <div className="flex items-start gap-5.5">
        <div className="flex w-[360px] flex-none flex-col gap-2.5">
          {owned.map((weapon) => {
            const isEquipped = weapon.id === equippedId
            const isSelected = weapon.id === selectedId
            return (
              <button
                key={weapon.id}
                type="button"
                onClick={() => setSelectedId(weapon.id)}
                className="flex items-center gap-3 rounded-lg border-2 px-3.5 py-3 text-left"
                style={{
                  borderColor: rowBorderColor(isEquipped, isSelected),
                  background: isEquipped ? '#1c1608' : 'rgba(59,18,32,.2)',
                  boxShadow: rowBoxShadow(isEquipped, isSelected),
                }}
              >
                <span className="text-[22px]">{WEAPON_ICON[weapon.id]}</span>
                <div className="flex-1">
                  <div className="font-body text-sm" style={{ color: isEquipped ? '#e8c766' : '#ede1c3' }}>
                    {weapon.name}
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: isEquipped ? '#c9b892' : '#8a7a5a' }}>
                    d{weapon.die} &middot; {weapon.ability.toUpperCase()} &middot; crit {critRangeLabel(weapon.critRange)}
                  </div>
                </div>
                {isEquipped && (
                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold"
                    style={{ color: '#1c0f0a', background: '#e8c766' }}
                  >
                    EQUIPPED
                  </span>
                )}
                {!isEquipped && isSelected && (
                  <span className="font-mono text-[10px]" style={{ color: '#e8c766' }}>
                    &#9668; selected
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div
          className="flex-1 rounded-[10px] border-2 px-5 py-4.5"
          style={{ borderColor: '#7a5a22', background: 'rgba(28,22,8,.35)' }}
        >
          <div className="mb-3.5 font-mono text-[10px] tracking-[0.14em]" style={{ color: '#8a7a5a' }}>
            COMPARE
          </div>

          <div className="mb-4 grid items-center gap-3.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            <div className="text-center">
              <div className="text-[26px]">{WEAPON_ICON[equipped.id]}</div>
              <div className="my-1 font-display text-sm" style={{ color: '#c9b892' }}>
                {equipped.name}
              </div>
              <div className="font-mono text-[10px]" style={{ color: '#8a7a5a' }}>
                equipped
              </div>
            </div>
            <div className="font-mono text-lg" style={{ color: '#7a5a22' }}>
              &rarr;
            </div>
            <div className="text-center">
              <div className="text-[26px]">{WEAPON_ICON[selected.id]}</div>
              <div className="my-1 font-display text-sm" style={{ color: '#e8c766' }}>
                {selected.name}
              </div>
              <div className="font-mono text-[10px]" style={{ color: '#e8c766' }}>
                {isSelectedEquipped ? 'equipped' : 'selected'}
              </div>
            </div>
          </div>

          <div className="my-4 flex flex-col gap-2">
            <DeltaRow
              label="DAMAGE DIE"
              equippedText={`d${equipped.die}`}
              selectedText={`d${selected.die}`}
              direction={directionFor(equipped.die, selected.die, true)}
            />
            <div className="h-px" style={{ background: '#3a2a10' }} />
            <DeltaRow
              label="ABILITY"
              equippedText={`${equippedMod >= 0 ? '+' : ''}${equippedMod} (${equipped.ability.toUpperCase()})`}
              selectedText={`${selectedMod >= 0 ? '+' : ''}${selectedMod} (${selected.ability.toUpperCase()})`}
              direction={directionFor(equippedMod, selectedMod, true)}
            />
            <div className="h-px" style={{ background: '#3a2a10' }} />
            <DeltaRow
              label="CRIT"
              equippedText={critRangeLabel(equipped.critRange)}
              selectedText={critRangeLabel(selected.critRange)}
              direction={directionFor(equipped.critRange, selected.critRange, false)}
            />
            <div className="h-px" style={{ background: '#3a2a10' }} />
            <DeltaRow
              label="CATCH"
              equippedText={equipped.timeBudgetPenaltyMs > 0 ? `−${(equipped.timeBudgetPenaltyMs / 1000).toFixed(1)}s` : '—'}
              selectedText={selected.timeBudgetPenaltyMs > 0 ? `−${(selected.timeBudgetPenaltyMs / 1000).toFixed(1)}s` : '—'}
              direction={directionFor(equipped.timeBudgetPenaltyMs, selected.timeBudgetPenaltyMs, false)}
            />
          </div>

          <div
            className="mb-4 rounded-md border px-3 py-2.5 font-body text-xs italic"
            style={{ borderColor: '#7a5a22', background: 'rgba(59,18,32,.3)', color: '#c9b892' }}
          >
            {describeSwap(equipped, selected)}
          </div>

          <div className="text-center">
            <button
              type="button"
              disabled={isSelectedEquipped}
              onClick={() => dispatch(equipWeapon(selected.id))}
              className="rounded px-7 py-2.5 font-display text-xs tracking-[0.06em] disabled:opacity-40"
              style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
            >
              {isSelectedEquipped ? 'Equipped' : `Equip ${selected.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Armory
