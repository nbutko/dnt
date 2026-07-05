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

// If the IndexedDB open hangs (it can sit in `readyState: pending` forever on a
// wedged origin) or rejects, we must NOT gate the whole UI on it and leave the
// app blank (feedback #16). After this long we give up waiting and hydrate a
// fresh in-memory save so play continues; whichever of load/timeout settles
// first wins, so a merely-slow-but-working load still gets its real data.
const LOAD_TIMEOUT_MS = 4000

// The persistent-save home (m2-implementation.html#state): hydrates from
// IndexedDB once on mount, then mirrors every dispatch back to it. Never
// imports combat/engine — the only bridge to battle numbers is
// resolveModifiers() (Story 4), called by state/battle-store.ts, not here.
const SaveProvider = ({ children }: SaveProviderProps) => {
  const [save, dispatch] = useReducer(saveReducer, defaultSave())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    let settled = false
    const settle = (loaded: SaveData): void => {
      if (cancelled || settled) return
      settled = true
      dispatch(hydrate(loaded))
      setHydrated(true)
    }
    // A rejected open falls back to a fresh save rather than staying blank.
    loadSave()
      .then(settle)
      .catch(() => settle(defaultSave()))
    // …and a hung open (which never resolves OR rejects) is caught by this
    // timeout, so the app still comes up instead of gating forever.
    const timer = setTimeout(() => settle(defaultSave()), LOAD_TIMEOUT_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
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
