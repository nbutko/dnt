import { toMap, type Screen } from '../../app/navigation'
import { getWeapon } from '../../config/weapons'
import { resolveModifiers } from '../../engine/character/modifiers'
import { useSave } from '../../state/save/SaveProvider'
import Frame from '../common/Frame'
import StatusReadout from '../common/StatusReadout'

interface InnScreenProps {
  onNavigate: (screen: Screen) => void
}

// The M2 skill tree is retired here (M3 Story 0 — save-reducer.ts's
// purchaseSkillNode is gone, SaveData.skillTree is gone). Story 5 rebuilds
// this screen into "Rest & Sheet" (restore hearts + spend Ability Score
// Improvements); this is a bare placeholder in between so the Inn still
// renders and compiles against the v3 save shape.
const InnScreen = ({ onNavigate }: InnScreenProps) => {
  const { save } = useSave()
  // GameShell gates every screen behind character creation (Story 4), so
  // save.character is always real here — TS can't see that cross-component
  // invariant, hence the assertion.
  const character = save.character!
  // Full hearts outside a run — they only deplete mid-dungeon (feedback #5).
  // No buffs at the Inn (it's never inside a run).
  const { maxHearts } = resolveModifiers(character, getWeapon(save.equippedWeapon))

  return (
    <Frame maxWidth={1080}>
      <div className="mb-5 flex items-center justify-between">
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
        <StatusReadout
          xp={character.xp}
          coins={save.coins}
          hearts={maxHearts}
          maxHearts={maxHearts}
        />
      </div>

      <p className="text-center font-mono text-sm text-text-dim">
        Rest &amp; Sheet coming soon — the skill tree has been retired for the D&amp;D character
        layer (M3).
      </p>
    </Frame>
  )
}

export default InnScreen
