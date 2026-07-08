import { useEffect, useMemo, useState } from 'react'
import type { Rng, TextTier } from '../../domain/types'
import { bandToServedTier } from '../../engine/dice/band'
import {
  rollEncounter,
  type EncounterRoll,
  type EncounterRollConfig,
  type EncounterRollModifiers,
} from '../../engine/dice/encounter-roll'
import Die, { type DieVariant } from '../common/Die'
import ModalOverlay from '../common/ModalOverlay'

// How long the tumble (index.css's die-tumble, the same keyframe Story 4's
// AbilityRoller uses) plays before a roll lands — matches
// ui/create/CharacterCreateScreen.tsx's ROLL_ANIMATION_MS so every die in the
// game settles on the same beat.
const ROLL_ANIMATION_MS = 500

// Everything the marquee d20 (m3-scope.html#encounter-roll, wireframe turn 4)
// needs to roll and grade itself. Optional on EncounterModal: when omitted the
// modal falls back to its pre-Story-6 plain reveal-and-begin behavior (no
// die), so the mimic/chokepoint reveal call in DungeonScreen.tsx keeps
// compiling and working unchanged until a later story threads this through
// the real dungeon/battle launch (see the note on EncounterModal below).
export interface EncounterDiceProps {
  cfg: EncounterRollConfig
  mods: EncounterRollModifiers
  // The dungeon's textTierRange (config/dungeon-tiers.ts) — turns the rolled
  // band into the served tier via engine/dice/band.ts's bandToServedTier.
  textTierRange: readonly [TextTier, TextTier]
  // A seeded Rng (engine/rng.ts) — the caller owns it since the roll is
  // ephemeral simulation state (never persisted), same home as the battle's
  // own rng.
  rng: Rng
  // Bardic Inspiration / a Guidance buff: whether a Reroll is offered at all
  // this fight. The "once per dungeon" budget lives in the caller (the run is
  // ephemeral state Story 9's Bag/buffs track) — this component only draws
  // the second roll and reports that it happened via onReroll.
  canReroll?: boolean
  onReroll?: () => void
}

interface EncounterModalProps {
  headline: string
  subtext: string
  // Red treatment for a mimic ambush or the boss; gold for a waypoint/approach.
  danger?: boolean
  // Receives the frozen EncounterRoll once the player commits (undefined when
  // `dice` wasn't supplied, i.e. the plain pre-Story-6 reveal). The battle
  // launch that consumes it is Story 7/12 territory — see the note below.
  onBegin: (roll?: EncounterRoll) => void
  dice?: EncounterDiceProps
}

const dieVariant = (roll: EncounterRoll): DieVariant => {
  if (roll.fumble) return 'fumble'
  if (roll.inspired) return 'inspired'
  return 'gold'
}

// The band panel's copy + palette (wireframe 4a's gold panel, 4b's
// green/red fumble/inspired variants) — one lookup instead of the same
// fumble/inspired/else branch repeated across border, text and body classes.
interface BandPanelStyle {
  title: string
  body: string
  border: string
  text: string
}

const bandPanelStyle = (roll: EncounterRoll): BandPanelStyle => {
  if (roll.fumble) {
    return {
      title: 'Fumble',
      body: 'Low band, no crits, damage ×0.75 this fight. "You stumble."',
      border: 'border-danger-bright bg-danger-bright/10',
      text: 'text-danger-bright',
    }
  }
  if (roll.inspired) {
    return {
      title: 'Inspired!',
      body: 'High band, and your first landed hit is a guaranteed crit. "A surge of focus."',
      border: 'border-[#7ac96a] bg-[#7ac96a]/10',
      text: 'text-[#9cf07c]',
    }
  }
  return {
    title: `${roll.band} band`,
    body: 'The rolled difficulty for this fight.',
    border: 'border-accent-gold-bright bg-accent-gold-bright/10',
    text: 'text-accent-gold-bright',
  }
}

// "2–7" / "8–13" / "14–19" — derived from cfg instead of hard-coded so a
// tuning change to lowMax/midMax (Story 13) doesn't silently desync the
// ladder's printed ranges.
const bandRangeLabel = (
  band: 'low' | 'mid' | 'high',
  cfg: EncounterRollConfig,
): string => {
  if (band === 'low') return `2–${cfg.lowMax}`
  if (band === 'mid') return `${cfg.lowMax + 1}–${cfg.midMax}`
  return `${cfg.midMax + 1}–19`
}

interface BandLadderProps {
  cfg: EncounterRollConfig
  active: 'fumble' | 'low' | 'mid' | 'high' | 'inspired'
}

// The 5-cell "fumble · low · mid · high · inspired" strip (wireframe 4a),
// highlighting whichever the roll landed on.
const BandLadder = ({ cfg, active }: BandLadderProps) => {
  const cells: { key: BandLadderProps['active']; range: string; label: string }[] = [
    { key: 'fumble', range: '1', label: 'fumble' },
    { key: 'low', range: bandRangeLabel('low', cfg), label: 'low' },
    { key: 'mid', range: bandRangeLabel('mid', cfg), label: 'mid' },
    { key: 'high', range: bandRangeLabel('high', cfg), label: 'high' },
    { key: 'inspired', range: '20', label: 'inspired' },
  ]

  return (
    <div className="mb-4 flex gap-1.5">
      {cells.map((cell) => (
        <div
          key={cell.key}
          className={`flex-1 rounded-md border py-1.5 text-center ${
            cell.key === active
              ? 'border-2 border-accent-gold-bright bg-accent-gold-bright/10'
              : 'border-border-gold-dim bg-black/20'
          }`}
        >
          <div className={`font-mono text-[9px] ${cell.key === active ? 'text-accent-gold-bright' : 'text-node-locked-text-dim'}`}>
            {cell.range}
          </div>
          <div className={`font-body text-[10px] ${cell.key === active ? 'text-accent-gold-bright' : 'text-text-dim'}`}>
            {cell.label}
            {cell.key === active ? ' ◄' : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

interface EncounterDiceViewProps {
  roll: EncounterRoll
  rolling: boolean
  dice: EncounterDiceProps
  activeBand: BandLadderProps['active'] | null
  gate: ReturnType<typeof bandToServedTier> | null
}

// The d20 + breakdown + band panel + ladder + INT-gate note (wireframe turn
// 4's whole lower half) — split out from EncounterModal so its JSX doesn't
// nest ternaries computing the same banner classes three times over.
const EncounterDiceView = ({ roll, rolling, dice, activeBand, gate }: EncounterDiceViewProps) => {
  const panel = bandPanelStyle(roll)

  return (
    <div className="mt-5">
      <div className="flex justify-center">
        <Die value={roll.natural} variant={dieVariant(roll)} rolling={rolling} size={110} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 font-mono text-[13px] text-text-dim">
        <span>{roll.natural}</span>
        <span className="text-node-locked-text-dim">+</span>
        <span>{dice.mods.encounterBonus}</span>
        <span className="text-node-locked-text-dim">=</span>
        <span className="text-base font-bold text-accent-gold-bright">{roll.total}</span>
      </div>

      {dice.mods.hasAdvantage && (
        <p className="mt-1 text-center font-mono text-[10px] tracking-[0.08em] text-text-dim uppercase">
          Advantage — rolled twice, kept the higher
        </p>
      )}

      <div className={`mt-3 mb-3 rounded-lg border-2 py-3 text-center ${panel.border}`}>
        <div className={`font-display text-base tracking-[0.06em] uppercase ${panel.text}`}>{panel.title}</div>
        <div className="mt-0.5 font-body text-xs text-text-dim italic">{panel.body}</div>
      </div>

      {activeBand && <BandLadder cfg={dice.cfg} active={activeBand} />}

      {gate && (
        <p className="mb-4 text-center font-mono text-[9.5px] text-node-locked-text-dim">
          reading tier {gate.servedTier}
        </p>
      )}
    </div>
  )
}

// Shown the instant a hidden encounter is committed to — a mimic chest springing
// its trap (feedback #13), or a waypoint/approach/boss whose monster stays behind
// a `?` until you select it (round-2 #C). The reveal only fires AFTER the player
// commits, so it never leaks which chest is the mimic or what guards a chokepoint
// beforehand. Non-dismissable: the sole action is Begin Battle.
//
// M3 Story 6 (m3-scope.html#encounter-roll, wireframe turn 4) turns this same
// modal into the marquee encounter d20: pass `dice` and it rolls (and tumbles,
// reusing Die.tsx/die-tumble) the total that picks this fight's prompt band,
// shows the breakdown + band ladder, and offers Reroll before Begin Battle
// freezes the roll and hands it up. `dice` is optional — wiring it into every
// live DungeonScreen encounter (not just the current mimic/chokepoint reveals)
// and threading the frozen roll into the actual battle launch requires
// reworking createBattleStore's tier-gate wiring (state/battle-store.ts) and
// widening DungeonScreen past today's REVEAL_KINDS — that's Story 7/12
// territory, done alongside the weapon-dice damage rework, not here.
const EncounterModal = ({ headline, subtext, danger = false, onBegin, dice }: EncounterModalProps) => {
  const [roll, setRoll] = useState<EncounterRoll | null>(() =>
    dice ? rollEncounter(dice.cfg, dice.mods, dice.rng) : null,
  )
  const [rolling, setRolling] = useState(Boolean(dice))
  const [rerollUsed, setRerollUsed] = useState(false)

  // The tumble plays for a fixed beat before the already-drawn roll reveals —
  // same shape as CharacterCreateScreen's ability-roll animation.
  useEffect(() => {
    if (!rolling) return undefined
    const timer = window.setTimeout(() => setRolling(false), ROLL_ANIMATION_MS)
    return () => window.clearTimeout(timer)
  }, [rolling])

  const gate = useMemo(() => {
    if (!dice || !roll) return null
    return bandToServedTier(roll.band, dice.textTierRange)
  }, [dice, roll])

  const handleReroll = (): void => {
    if (!dice || !dice.canReroll || rerollUsed || rolling) return
    setRoll(rollEncounter(dice.cfg, dice.mods, dice.rng))
    setRerollUsed(true)
    setRolling(true)
    dice.onReroll?.()
  }

  const handleBegin = (): void => onBegin(roll ?? undefined)

  // Enter commits the roll — the kid shouldn't have to hunt for the mouse
  // (matching the reward/run-end banners). A window listener rather than the
  // button's own focus because the Begin button is disabled during the tumble,
  // so autoFocus can't land on it; ignored while the die is still rolling, same
  // as the disabled button. Sole source of the Enter action (no autoFocus on
  // the button) so a single press can't fire Begin twice.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || rolling) return
      event.preventDefault()
      onBegin(roll ?? undefined)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rolling, roll, onBegin])

  const activeBand = ((): BandLadderProps['active'] | null => {
    if (!roll) return null
    if (roll.fumble) return 'fumble'
    if (roll.inspired) return 'inspired'
    return roll.band
  })()

  return (
    <ModalOverlay>
      <p
        className={`font-display text-2xl font-bold tracking-[0.1em] uppercase ${
          danger ? 'text-danger-bright' : 'text-accent-gold-bright'
        }`}
      >
        {headline}
      </p>
      <p className="mt-3 text-text-dim">{subtext}</p>

      {dice && roll && (
        <EncounterDiceView roll={roll} rolling={rolling} dice={dice} activeBand={activeBand} gate={gate} />
      )}

      <div className="mt-6 flex justify-center gap-3">
        {dice?.canReroll && !rerollUsed && (
          <button
            type="button"
            onClick={handleReroll}
            disabled={rolling}
            title="Bard, once per dungeon"
            className="rounded border border-border-gold px-4 py-2 font-mono text-sm text-text-dim hover:border-accent-gold-bright hover:text-accent-gold-bright disabled:opacity-50"
          >
            🎵 Reroll
          </button>
        )}
        <button
          type="button"
          onClick={handleBegin}
          disabled={rolling}
          className="rounded border border-border-gold px-5 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright disabled:opacity-50"
        >
          Begin Battle →
        </button>
      </div>
    </ModalOverlay>
  )
}

export default EncounterModal
