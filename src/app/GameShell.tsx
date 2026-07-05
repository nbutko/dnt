import { useState } from 'react'
import SaveProvider from '../state/save/SaveProvider'
import DungeonScreen from '../ui/dungeon/DungeonScreen'
import InnScreen from '../ui/inn/InnScreen'
import WorldMapScreen from '../ui/map/WorldMapScreen'
import { toMap, type Screen } from './navigation'

// Owns the current Screen and switches to the right one — the whole
// navigation layer (see navigation.ts). Wraps everything in SaveProvider so
// every screen below can reach the persistent save via useSave().
const GameShell = () => {
  const [screen, setScreen] = useState<Screen>(toMap())

  return (
    <SaveProvider>
      {/* Page padding so the double-border Frame always insets from the
          viewport edge instead of bleeding off the top or clipping left/right
          on a narrow window (feedback #2). */}
      <div className="min-h-screen p-4 sm:p-6">
        {(() => {
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
        })()}
      </div>
    </SaveProvider>
  )
}

export default GameShell
