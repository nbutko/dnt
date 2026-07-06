import { useEffect, useState } from 'react'
import { getClass } from '../../config/classes'
import { getWeapon } from '../../config/weapons'
import type { Ability, CharacterClass } from '../../domain/character'
import { abilityRollsToScores, rollAbilityScores, type AbilityRoll } from '../../engine/character/ability-roll'
import { createNewCharacter, DEFAULT_CREATION_CLASS, pickRandomName } from '../../engine/character/create'
import { resolveModifiers } from '../../engine/character/modifiers'
import { createRng } from '../../engine/rng'
import { buyWeapon, createCharacter, equipWeapon } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'
import Frame from '../common/Frame'
import AbilityRoller from './AbilityRoller'
import ClassPicker from './ClassPicker'
import HeroSummary from './HeroSummary'
import NameField from './NameField'

// "🎲 Roll again (2 left)" in the wireframe — 2 rerolls of the whole set, on
// top of the initial roll (3 rolls total).
const MAX_REROLLS = 2
// How long the tumble animation (index.css's die-tumble) plays before the new
// numbers land — long enough to read as a roll, short enough not to stall a
// 10-year-old mashing the button.
const ROLL_ANIMATION_MS = 500

type Step = 'create' | 'confirm'

// The first screen a fresh save hits (m3-scope.html#creation, wireframe
// turn 1) — gated in by GameShell whenever save.character is null. Every
// field starts pre-filled with a valid random default, so "mash one button
// twice" (Begin Adventure → To the World Map) is enough to produce a
// complete, playable hero.
const CharacterCreateScreen = () => {
  const { dispatch } = useSave()
  // One Rng for the whole screen's lifetime, seeded fresh per mount — reused
  // by every reroll and by the name dice so nothing here needs Math.random()
  // sprinkled through event handlers.
  const [rng] = useState(() => createRng(Math.floor(Math.random() * 2 ** 31)))

  const [step, setStep] = useState<Step>('create')
  const [abilityRolls, setAbilityRolls] = useState<Record<Ability, AbilityRoll>>(() => rollAbilityScores(rng))
  const [rerollsUsed, setRerollsUsed] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(DEFAULT_CREATION_CLASS)
  const [name, setName] = useState(() => pickRandomName(rng))

  // The tumble plays for a fixed beat, then the reroll actually lands — an
  // effect (not a bare setTimeout in the click handler) so an unmount mid-roll
  // cleans the timer up instead of setting state on a gone component.
  useEffect(() => {
    if (!rolling) return undefined
    const timer = window.setTimeout(() => {
      setAbilityRolls(rollAbilityScores(rng))
      setRerollsUsed((prev) => prev + 1)
      setRolling(false)
    }, ROLL_ANIMATION_MS)
    return () => window.clearTimeout(timer)
  }, [rolling, rng])

  const rerollsRemaining = MAX_REROLLS - rerollsUsed
  const handleReroll = (): void => {
    if (rolling || rerollsRemaining <= 0) return
    setRolling(true)
  }

  // "↩ Reroll everything" on the confirm card: a full restart of the
  // randomized pieces (abilities + name), not bound to the step-1 reroll
  // budget — the deliberate class choice is left alone.
  const handleRerollAll = (): void => {
    setAbilityRolls(rollAbilityScores(rng))
    setRerollsUsed(0)
    setName(pickRandomName(rng))
    setStep('create')
  }

  const displayName = name.trim().length > 0 ? name.trim() : 'Adventurer'
  const abilities = abilityRollsToScores(abilityRolls)
  const classDef = getClass(selectedClass)
  const weapon = getWeapon(classDef.startingWeapon)
  const previewCharacter = createNewCharacter(displayName, selectedClass, abilities)
  const modifiers = resolveModifiers(previewCharacter, weapon)

  const handleConfirm = (): void => {
    dispatch(createCharacter(previewCharacter))
    // The class's starting weapon is free gear, not a Shop purchase — reusing
    // buyWeapon at price 0 grants it into the inventory without a new
    // save-reducer verb, then equipWeapon makes it the active one.
    dispatch(buyWeapon(classDef.startingWeapon, 0))
    dispatch(equipWeapon(classDef.startingWeapon))
  }

  if (step === 'confirm') {
    return (
      <Frame maxWidth={480}>
        <HeroSummary
          character={previewCharacter}
          weapon={weapon}
          maxHp={modifiers.maxHp}
          maxHearts={modifiers.maxHearts}
          onRerollAll={handleRerollAll}
          onConfirm={handleConfirm}
        />
      </Frame>
    )
  }

  return (
    <Frame maxWidth={1080}>
      <div className="mb-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
          Create Your Hero
        </h1>
        <div className="mt-1 font-mono text-[11px] text-text-dim">No save found — let&apos;s roll one up</div>
      </div>

      <AbilityRoller
        rolls={abilityRolls}
        rolling={rolling}
        rerollsRemaining={rerollsRemaining}
        onReroll={handleReroll}
      />

      <div
        className="mt-4 flex flex-col items-start gap-6 border-t pt-4 sm:flex-row sm:justify-center"
        style={{ borderColor: '#3a2a10' }}
      >
        <div className="w-full flex-1">
          <ClassPicker selected={selectedClass} onSelect={setSelectedClass} />
        </div>
        <NameField value={name} onChange={setName} onRandomize={() => setName(pickRandomName(rng))} />
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setStep('confirm')}
          className="rounded px-8 py-3 font-display text-[15px] tracking-[0.06em]"
          style={{ background: 'linear-gradient(180deg,#e8c766,#c9a227)', color: '#1c0f0a' }}
        >
          Begin Adventure →
        </button>
      </div>
    </Frame>
  )
}

export default CharacterCreateScreen
