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
    </SaveProvider>
  )
}

export default GameShell
