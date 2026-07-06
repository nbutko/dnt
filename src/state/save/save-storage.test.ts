import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { defaultSave } from '../../domain/save'
import { flushPendingSave, loadSave, saveSave } from './save-storage'

// One shared fake-indexeddb + one shared module-level db connection across
// this file's tests (mirroring how the real app opens the db once) — tests
// below are ordered so each builds on the state the previous one left.
describe('save-storage', () => {
  it('loadSave returns a fresh default save when nothing has been written', async () => {
    const loaded = await loadSave()
    expect(loaded).toEqual(defaultSave())
  })

  it('round-trips a save through saveSave -> flush -> loadSave', async () => {
    const data = { ...defaultSave(), coins: 42, highestUnlockedTier: 3 }
    saveSave(data)
    await flushPendingSave()

    const loaded = await loadSave()
    expect(loaded).toEqual(data)
  })

  it('debounces a burst of writes into the latest value only', async () => {
    const first = { ...defaultSave(), coins: 1 }
    const second = { ...defaultSave(), coins: 2 }
    const third = { ...defaultSave(), coins: 3 }
    saveSave(first)
    saveSave(second)
    saveSave(third)
    await flushPendingSave()

    const loaded = await loadSave()
    expect(loaded.coins).toBe(3)
  })
})
