import { useSyncExternalStore } from 'react'
import type { BattleStore } from '../../state/battle-store'

export interface UseBattleResult {
  state: ReturnType<BattleStore['getSnapshot']>
  actions: {
    submit: BattleStore['submit']
    tick: BattleStore['tick']
  }
}

export const useBattle = (store: BattleStore): UseBattleResult => {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return {
    state,
    actions: { submit: store.submit, tick: store.tick },
  }
}
