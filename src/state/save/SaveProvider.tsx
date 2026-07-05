import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { defaultSave, type SaveData } from '../../domain/save'
import { hydrate, saveReducer, type SaveAction } from './save-reducer'
import { loadSave, saveSave } from './save-storage'

interface SaveContextValue {
  save: SaveData
  dispatch: (action: SaveAction) => void
}

const SaveContext = createContext<SaveContextValue | null>(null)

interface SaveProviderProps {
  children: ReactNode
}

// The persistent-save home (m2-implementation.html#state): hydrates from
// IndexedDB once on mount, then mirrors every dispatch back to it. Never
// imports combat/engine — the only bridge to battle numbers is
// resolveModifiers() (Story 4), called by state/battle-store.ts, not here.
const SaveProvider = ({ children }: SaveProviderProps) => {
  const [save, dispatch] = useReducer(saveReducer, defaultSave())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSave().then((loaded) => {
      if (cancelled) return
      dispatch(hydrate(loaded))
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveSave(save)
  }, [save, hydrated])

  const value = useMemo(() => ({ save, dispatch }), [save])

  if (!hydrated) {
    return null
  }

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>
}

export const useSave = (): SaveContextValue => {
  const value = useContext(SaveContext)
  if (!value) {
    throw new Error('useSave must be used within a SaveProvider')
  }
  return value
}

export default SaveProvider
