import { useState } from 'react'

import { toMap, type Screen } from '../../app/navigation'
import { getWeapon } from '../../config/weapons'
import { grantsForLevel } from '../../engine/character/leveling'
import { resolveModifiers } from '../../engine/character/modifiers'
import { applyAsi } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'
import Frame from '../common/Frame'
import StatusReadout from '../common/StatusReadout'
import Tabs, { type TabItem } from '../common/Tabs'
import Armory from './Armory'
import AsiPanel from './AsiPanel'
import CharacterSheet from './CharacterSheet'
import RestPanel from './RestPanel'

interface InnScreenProps {
  onNavigate: (screen: Screen) => void
}

// The M2 skill tree is retired (M3 Stories 0/3/5). The Inn is now the D&D long
// rest + character sheet (wireframe turn 2), joined by the Armory (Story 8,
// wireframe turn 7) as a second tab.
type InnTab = 'rest-sheet' | 'armory'
const INN_TABS: readonly TabItem<InnTab>[] = [
  { id: 'rest-sheet', label: 'Rest & Sheet' },
  { id: 'armory', label: 'Armory' },
]

const InnScreen = ({ onNavigate }: InnScreenProps) => {
  const { save, dispatch } = useSave()
  // GameShell gates every screen behind character creation (Story 4), so
  // save.character is always real here — TS can't see that cross-component
  // invariant, hence the assertion.
  const character = save.character!
  const weapon = getWeapon(save.equippedWeapon)

  const [tab, setTab] = useState<InnTab>('rest-sheet')
  const [asiOpen, setAsiOpen] = useState(false)

  // Everything the sheet shows is derived at read time — never stored on the
  // Character, so it can't drift from level/abilities. No buffs at the Inn (it
  // is never inside a run).
  const { maxHp, maxHearts } = resolveModifiers(character, weapon)
  const { proficiencyBonus } = grantsForLevel(character.class, character.level, character.abilities.con)

  // One ASI grants 2 points; a character banking several spends 2 per confirm.
  const asiBudget = Math.min(2, character.pendingAsi)

  return (
    <Frame maxWidth={1080}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="font-mono text-xs text-text-dim hover:text-accent-gold-bright"
          onClick={() => onNavigate(toMap())}
        >
          ← World Map
        </button>
        <h1 className="font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
          The Inn
        </h1>
        <StatusReadout xp={character.xp} coins={save.coins} hearts={maxHearts} maxHearts={maxHearts} />
      </div>

      <Tabs tabs={INN_TABS} activeId={tab} onSelect={setTab} />

      {tab === 'rest-sheet' && (
        <div className="flex items-stretch gap-5">
          <RestPanel maxHearts={maxHearts} maxHp={maxHp} />
          <CharacterSheet
            character={character}
            weapon={weapon}
            maxHp={maxHp}
            proficiencyBonus={proficiencyBonus}
            onImprove={() => setAsiOpen(true)}
          />
        </div>
      )}

      {tab === 'armory' && <Armory />}

      {asiOpen && asiBudget > 0 && (
        <AsiPanel
          character={character}
          budget={asiBudget}
          onConfirm={(spend) => {
            dispatch(applyAsi(spend))
            setAsiOpen(false)
          }}
          onClose={() => setAsiOpen(false)}
        />
      )}
    </Frame>
  )
}

export default InnScreen
