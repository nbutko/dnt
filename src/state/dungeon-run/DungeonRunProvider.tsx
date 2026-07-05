import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import {
  dungeonRunReducer,
  initRun,
  runOutcome,
  type DungeonRunAction,
  type DungeonRunState,
  type EnterParams,
  type RunOutcome,
} from './dungeon-run-reducer'

interface DungeonRunContextValue {
  run: DungeonRunState
  outcome: RunOutcome
  dispatch: (action: DungeonRunAction) => void
}

const DungeonRunContext = createContext<DungeonRunContextValue | null>(null)

interface DungeonRunProviderProps {
  // The run is seeded once when the provider mounts. It's deliberately NOT
  // persisted (finding E) — remounting the provider (a fresh dungeon visit)
  // regenerates from these params. Callers key the provider on the tier so a
  // new dungeon visit remounts with a fresh run.
  params: EnterParams
  children: ReactNode
}

// The ephemeral run home, scoped under the dungeon screen. Opposite lifetime to
// SaveProvider: nothing here touches IndexedDB, and closing the screen throws
// the whole run away by design.
const DungeonRunProvider = ({ params, children }: DungeonRunProviderProps) => {
  const [run, dispatch] = useReducer(dungeonRunReducer, params, initRun)

  const value = useMemo(
    () => ({ run, outcome: runOutcome(run), dispatch }),
    [run],
  )

  return <DungeonRunContext.Provider value={value}>{children}</DungeonRunContext.Provider>
}

export const useDungeonRun = (): DungeonRunContextValue => {
  const value = useContext(DungeonRunContext)
  if (!value) {
    throw new Error('useDungeonRun must be used within a DungeonRunProvider')
  }
  return value
}

export default DungeonRunProvider
