import type { ReactNode } from 'react'
import { getClass, type ClassFeature } from '../../config/classes'
import type { WeaponConfig } from '../../config/weapons'
import { abilityMod, type Ability, type Character } from '../../domain/character'
import HeartsReadout from '../common/HeartsReadout'
import { FEATURE_LABEL } from './ClassPicker'

// A one-line blurb per class feature, echoing the wireframe's Fighter copy
// ("A durable, forgiving start...") for the other three classes.
const FLAVOR: Record<ClassFeature['kind'], string> = {
  'second-wind':
    'A durable, forgiving start — swing a longsword, and shrug off a near-death blow once per fight.',
  'arcane-mind':
    'A fragile but clever start — wield a wand, and land crits that hit three times as hard.',
  cunning:
    'A quick, cunning start — draw a dagger, and strike first with the edge of Advantage.',
  'silver-tongue':
    'A charming, versatile start — draw a rapier, talk your way to a discount, and reroll fate once per dungeon.',
}

// Paired two-up, matching the wireframe's confirm-card grid order exactly
// (STR/INT, DEX/WIS, CON/CHA) rather than the roll screen's straight order.
const ABILITY_PAIRS: readonly [Ability, Ability][] = [
  ['str', 'int'],
  ['dex', 'wis'],
  ['con', 'cha'],
]

const modColor = (mod: number): string => {
  if (mod > 0) return 'text-accent-gold-bright'
  if (mod < 0) return ''
  return 'text-text-dim'
}

interface AbilityRowProps {
  ability: Ability
  score: number
}

const AbilityRow = ({ ability, score }: AbilityRowProps) => {
  const mod = abilityMod(score)
  return (
    <div
      className="flex justify-between rounded border px-2.5 py-1.5"
      style={{ borderColor: '#4a3a18', background: 'rgba(28,22,8,.6)' }}
    >
      <span className="font-display text-[11px] text-text-dim">{ability.toUpperCase()}</span>
      <span className="font-mono text-[13px] text-text-primary">
        {score} <span className={modColor(mod)} style={mod < 0 ? { color: '#c98d8d' } : undefined}>
          {mod >= 0 ? `+${mod}` : mod}
        </span>
      </span>
    </div>
  )
}

interface StatRowProps {
  label: string
  children: ReactNode
}

const StatRow = ({ label, children }: StatRowProps) => (
  <div className="flex items-center justify-between">
    <span className="font-body text-[13px] text-text-dim">{label}</span>
    <span className="font-body text-[13px] text-text-primary">{children}</span>
  </div>
)

const HairlineDivider = () => <div className="h-px" style={{ background: '#3a2a10' }} />

interface HeroSummaryProps {
  character: Character
  weapon: WeaponConfig
  maxHp: number
  maxHearts: number
  onRerollAll: () => void
  onConfirm: () => void
}

// The confirm step (wireframe turn 1b): "meet your hero," derived stats, and
// the final commit. Nothing here has been dispatched to the save yet — that
// only happens once "To the World Map →" is pressed.
const HeroSummary = ({ character, weapon, maxHp, maxHearts, onRerollAll, onConfirm }: HeroSummaryProps) => {
  const classDef = getClass(character.class)

  return (
    <div>
      <div className="mb-3.5 text-center">
        <div className="font-display text-[15px] tracking-[0.18em] text-text-dim">MEET YOUR HERO</div>
        <div className="mt-1.5 font-display text-[30px] text-accent-gold-bright">{character.name}</div>
        <div className="font-body text-sm text-text-dim italic">
          Level {character.level} {classDef.name} · Hit die d{classDef.hitDie}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {ABILITY_PAIRS.flat().map((ability) => (
          <AbilityRow key={ability} ability={ability} score={character.abilities[ability]} />
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <StatRow label="Max HP">
          <span className="font-mono text-accent-gold-bright">{maxHp}</span>
        </StatRow>
        <HairlineDivider />
        <StatRow label="Hearts">
          <HeartsReadout current={maxHearts} max={maxHearts} />
        </StatRow>
        <HairlineDivider />
        <StatRow label="Weapon">
          {weapon.name} <span className="font-mono text-text-dim">(d{weapon.die}, {weapon.ability.toUpperCase()})</span>
        </StatRow>
        <HairlineDivider />
        <StatRow label="Feature">{FEATURE_LABEL[classDef.feature.kind]}</StatRow>
      </div>

      <div
        className="mb-5 rounded-md border border-border-gold px-3 py-2.5 text-center font-body text-[12.5px] text-text-dim italic"
        style={{ background: 'rgba(59,18,32,.3)' }}
      >
        {FLAVOR[classDef.feature.kind]}
      </div>

      <div className="flex justify-center gap-2.5">
        <button
          type="button"
          onClick={onRerollAll}
          className="rounded border border-border-gold px-5 py-2.5 font-display text-sm tracking-[0.06em] text-text-dim hover:text-accent-gold-bright"
        >
          ↩ Reroll everything
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded px-5 py-2.5 font-display text-sm tracking-[0.06em]"
          style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
        >
          To the World Map →
        </button>
      </div>
    </div>
  )
}

export default HeroSummary
