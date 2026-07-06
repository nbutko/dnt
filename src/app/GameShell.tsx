import { useState } from 'react'
import SaveProvider, { useSave } from '../state/save/SaveProvider'
import CharacterCreateScreen from '../ui/create/CharacterCreateScreen'
import DungeonScreen from '../ui/dungeon/DungeonScreen'
import InnScreen from '../ui/inn/InnScreen'
import WorldMapScreen from '../ui/map/WorldMapScreen'
import { toMap, type Screen } from './navigation'

// Owns the current Screen and switches to the right one, once a hero exists.
// Split from GameShell so it can sit inside SaveProvider and call useSave().
const GameShellRouter = () => {
  const [screen, setScreen] = useState<Screen>(toMap())
  const { save } = useSave()

  // The blocking pre-map gate (finding G, m3-implementation.html#story-4): a
  // fresh or freshly-migrated save has no character yet, so every other
  // screen is unreachable until creation completes. Not a Screen variant —
  // there's nowhere to navigate "back" to from here.
  if (save.character === null) {
    return <CharacterCreateScreen />
  }

  switch (screen.name) {
    case 'map':
      return <WorldMapScreen onNavigate={setScreen} />
    case 'inn':
      return <InnScreen onNavigate={setScreen} />
    case 'dungeon':
      return <DungeonScreen tier={screen.tier} onNavigate={setScreen} />
    default:
      return null
  }
}

// Wraps everything in SaveProvider so every screen below can reach the
// persistent save via useSave().
const GameShell = () => (
  <SaveProvider>
    {/* Page padding so the double-border Frame always insets from the
        viewport edge instead of bleeding off the top or clipping left/right
        on a narrow window (feedback #2). */}
    <div className="min-h-screen p-4 sm:p-6">
      <GameShellRouter />
    </div>
  </SaveProvider>
)

export default GameShell
