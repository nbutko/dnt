import type { CSSProperties } from 'react'
import { abilityMod, type Ability } from '../../domain/character'
import { ABILITY_ORDER, type AbilityRoll } from '../../engine/character/ability-roll'
import Die from '../common/Die'

const LABEL: Record<Ability, string> = {
  str: 'STRENGTH',
  dex: 'DEXTERITY',
  con: 'CONSTITUTION',
  int: 'INTELLIGENCE',
  wis: 'WISDOM',
  cha: 'CHARISMA',
}

// The one-line flavor caption under each ability card — wording straight from
// the wireframe (turn 1a).
const CAPTION: Record<Ability, string> = {
  str: '+ melee damage',
  dex: 'crits + dodge',
  con: '+ max HP / level',
  int: 'hardest word tier',
  wis: '+ time · perception',
  cha: 'cheaper Shop',
}

const modBadge = (mod: number): { className: string; style?: CSSProperties } => {
  if (mod > 0) return { className: 'bg-accent-gold-bright', style: { color: '#1c0f0a' } }
  if (mod < 0) return { className: 'bg-danger text-text-primary' }
  return { className: 'text-coin', style: { background: 'rgba(255,255,255,.08)' } }
}

interface AbilityCardProps {
  ability: Ability
  roll: AbilityRoll
  rolling: boolean
}

const AbilityCard = ({ ability, roll, rolling }: AbilityCardProps) => {
  const mod = abilityMod(roll.total)
  const badge = modBadge(mod)

  return (
    <div
      className="rounded-lg border-2 border-border-gold p-3 text-center"
      style={{ background: 'rgba(59,18,32,.25)' }}
    >
      <div className="font-display text-xs tracking-[0.05em] text-accent-gold-bright">{LABEL[ability]}</div>
      <div
        className={`my-1 font-mono text-[34px] leading-tight font-bold ${mod < 0 ? '' : 'text-text-primary'}`}
        style={mod < 0 ? { color: '#c98d8d' } : undefined}
      >
        {roll.total}
      </div>
      <div className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${badge.className}`} style={badge.style}>
        {mod >= 0 ? `+${mod}` : mod}
      </div>
      <div className="mt-2 flex justify-center gap-1">
        {roll.dice.map((die, index) => (
          // eslint-disable-next-line react/no-array-index-key -- 4 fixed dice slots, roll order is the identity
          <Die key={index} value={die} size={26} variant={index === roll.droppedIndex ? 'muted' : 'gold'} rolling={rolling} />
        ))}
      </div>
      <div className="mt-2 font-body text-[10.5px] text-node-locked-text">{CAPTION[ability]}</div>
    </div>
  )
}

interface AbilityRollerProps {
  rolls: Record<Ability, AbilityRoll>
  rolling: boolean
  rerollsRemaining: number
  onReroll: () => void
}

// Step 1 of creation (wireframe turn 1a): the 6-card ability grid plus a
// limited "Roll again" that re-rolls the whole set — never a single ability.
const AbilityRoller = ({ rolls, rolling, rerollsRemaining, onReroll }: AbilityRollerProps) => (
  <div>
    <div className="mb-4 text-center font-body text-[13px] text-text-dim italic">Step 1 · Roll your abilities</div>
    <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ABILITY_ORDER.map((ability) => (
        <AbilityCard key={ability} ability={ability} roll={rolls[ability]} rolling={rolling} />
      ))}
    </div>
    <div className="my-1 text-center">
      <button
        type="button"
        onClick={onReroll}
        disabled={rerollsRemaining <= 0 || rolling}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border-gold bg-panel-base px-3 py-1 font-mono text-xs ${
          rerollsRemaining > 0 ? 'text-accent-gold-bright' : 'cursor-not-allowed text-node-locked-text-dim opacity-60'
        }`}
      >
        🎲 Roll again <span className="text-text-dim">({rerollsRemaining} left)</span>
      </button>
    </div>
  </div>
)

export default AbilityRoller
