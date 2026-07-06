import { ABILITY_ORDER } from '../../engine/character/ability-roll'
import { xpProgress } from '../../engine/character/leveling'
import { getClass, type ClassFeature } from '../../config/classes'
import type { WeaponConfig } from '../../config/weapons'
import { abilityMod, type Ability, type Character } from '../../domain/character'
import { FEATURE_LABEL } from '../create/ClassPicker'

const ABILITY_LABEL: Record<Ability, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

// A one-line mechanic caption per class feature (wireframe turn 2a's "Second
// Wind · auto-heal once per battle") — short, unlike HeroSummary's longer
// creation-screen flavor text for the same features.
const FEATURE_CAPTION: Record<ClassFeature['kind'], string> = {
  'second-wind': 'auto-heal once per battle',
  'arcane-mind': 'crits hit 3x harder, reads deeper words',
  cunning: 'advantage on the encounter roll, sneak attack dice',
  'silver-tongue': 'cheaper Shop, debuffs foes, one reroll a dungeon',
}

const modColor = (mod: number): string | undefined => {
  if (mod > 0) return '#e8c766'
  if (mod < 0) return '#c98d8d'
  return undefined
}

interface AbilityTileProps {
  ability: Ability
  score: number
}

const AbilityTile = ({ ability, score }: AbilityTileProps) => {
  const mod = abilityMod(score)
  return (
    <div
      className="rounded-md border px-1 py-2 text-center"
      style={{ borderColor: '#4a3a18', background: 'rgba(28,22,8,.6)' }}
    >
      <div className="font-display text-[10px] text-text-dim">{ABILITY_LABEL[ability]}</div>
      <div className="font-mono text-xl text-text-primary">{score}</div>
      <div className="font-mono text-[11px] text-text-dim" style={{ color: modColor(mod) }}>
        {mod >= 0 ? `+${mod}` : mod}
      </div>
    </div>
  )
}

// weapon.critRange 20 reads as a plain "crit 20"; anything lower (the
// dagger/rapier's 19) reads as the 5e-standard range "19–20".
const critRangeLabel = (critRange: number): string => (critRange >= 20 ? '20' : `${critRange}–20`)

interface CharacterSheetProps {
  character: Character
  weapon: WeaponConfig
  maxHp: number
  proficiencyBonus: number
  onImprove: () => void
}

// The Rest & Sheet tab's character sheet (wireframe turn 2a, right panel):
// everything on it is derived from the Character + equipped weapon at read
// time (abilityMod, xpProgress, resolveModifiers' proficiencyBonus/maxHp) —
// nothing here is its own stored state.
const CharacterSheet = ({ character, weapon, maxHp, proficiencyBonus, onImprove }: CharacterSheetProps) => {
  const classDef = getClass(character.class)
  const progress = xpProgress(character.xp)

  return (
    <div
      className="flex-1 rounded-lg border-2 px-5 py-4.5"
      style={{ borderColor: '#7a5a22', background: 'rgba(28,22,8,.35)' }}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <span className="font-display text-[19px] text-accent-gold-bright">{character.name}</span>
          <span className="ml-2 font-body text-[13px] text-text-dim italic">
            Level {character.level} {classDef.name}
          </span>
        </div>
        <div className="font-mono text-[11px] text-text-dim">
          Proficiency <span className="text-accent-gold-bright">+{proficiencyBonus}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex justify-between font-mono text-[10px] text-text-dim">
          <span>{progress.isMax ? 'MAX LEVEL' : `XP to Level ${progress.nextLevel}`}</span>
          <span className="text-coin">
            {progress.isMax ? `${character.xp} XP` : `${character.xp} / ${progress.nextThreshold}`}
          </span>
        </div>
        <div
          className="h-[9px] overflow-hidden rounded-full border"
          style={{ borderColor: '#5a4a20', background: '#1c1608' }}
        >
          <div
            className="h-full"
            style={{
              width: `${progress.fraction * 100}%`,
              background: 'linear-gradient(90deg,#4a7a3a,#7ac96a)',
            }}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-6 gap-2">
        {ABILITY_ORDER.map((ability) => (
          <AbilityTile key={ability} ability={ability} score={character.abilities[ability]} />
        ))}
      </div>

      <div className="mb-1 flex gap-3 font-mono text-[11px] text-text-dim">
        <span>
          Max HP <span className="text-accent-gold-bright">{maxHp}</span>
        </span>
      </div>

      <div className="flex gap-3 border-t pt-2.5" style={{ borderColor: '#3a2a10' }}>
        <div className="flex-1">
          <div className="mb-1.5 font-mono text-[10px] tracking-[0.1em] text-node-locked-text">CLASS FEATURES</div>
          <div className="font-body text-[12.5px] text-text-primary">
            {FEATURE_LABEL[classDef.feature.kind]}{' '}
            <span className="text-node-locked-text">&middot; {FEATURE_CAPTION[classDef.feature.kind]}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-1.5 font-mono text-[10px] tracking-[0.1em] text-node-locked-text">EQUIPPED</div>
          <div className="font-body text-[12.5px] text-text-primary">
            {weapon.name}{' '}
            <span className="font-mono text-node-locked-text">
              d{weapon.die} &middot; {weapon.ability.toUpperCase()} &middot; crit {critRangeLabel(weapon.critRange)}
            </span>
          </div>
        </div>
      </div>

      {character.pendingAsi > 0 && (
        <div
          className="mt-4 flex items-center gap-3 rounded-lg border px-3.5 py-2.5"
          style={{
            borderColor: '#e8c766',
            background: 'rgba(232,199,102,.08)',
            boxShadow: '0 0 12px #e8c76633',
          }}
        >
          <span className="text-lg">&#10022;</span>
          <span className="flex-1 font-body text-[13px] text-accent-gold-bright">
            Ability Score Improvement available &mdash; you have{' '}
            <strong>{character.pendingAsi} point{character.pendingAsi === 1 ? '' : 's'}</strong> to spend.
          </span>
          <button
            type="button"
            onClick={onImprove}
            className="rounded px-4 py-2 font-display text-xs tracking-[0.06em]"
            style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
          >
            Improve &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

export default CharacterSheet
