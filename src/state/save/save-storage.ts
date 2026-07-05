import { openDB, type IDBPDatabase } from 'idb'
import { migrate, type SaveData } from '../../domain/save'

const DB_NAME = 'dnt-save'
const STORE_NAME = 'save'
const KEY = 'current'
// Debounced so a burst of per-kill awards (Story 11) collapses to one flush
// instead of one write per kill.
const DEBOUNCE_MS = 250

let dbPromise: Promise<IDBPDatabase> | null = null

const getDb = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade: (db) => {
        db.createObjectStore(STORE_NAME)
      },
    })
  }
  return dbPromise
}

export const loadSave = async (): Promise<SaveData> => {
  const db = await getDb()
  const raw = await db.get(STORE_NAME, KEY)
  return migrate(raw)
}

let pending: SaveData | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null

const writeNow = async (data: SaveData): Promise<void> => {
  const db = await getDb()
  await db.put(STORE_NAME, data, KEY)
}

// Awaited by anyone who needs to know a write has landed (SaveProvider on
// unmount isn't a concern here, but tests are) — resolves immediately if
// nothing is pending.
export const flushPendingSave = async (): Promise<void> => {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!pending) return
  const data = pending
  pending = null
  await writeNow(data)
}

// Fire-and-forget debounced write for normal callers (SaveProvider). Tests /
// callers that need to know when a write has landed should await
// flushPendingSave() instead.
export const saveSave = (data: SaveData): void => {
  pending = data
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushPendingSave()
  }, DEBOUNCE_MS)
}
