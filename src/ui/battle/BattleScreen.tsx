import { useEffect, useState } from 'react'
import { createBattleStore, type BattleStore } from '../../state/battle-store'
import { useBattle } from '../hooks/useBattle'
import { useGameLoop } from '../hooks/useGameLoop'
import BattleResult from './BattleResult'
import HealthBar from './HealthBar'
import MonsterTyping from './MonsterTyping'
import PlayerPrompt from './PlayerPrompt'

const M0_MONSTER_ID = 'slime' // M0/M1 hardcode one monster; the roster grows in M2.

interface ReadyBattleScreenProps {
  store: BattleStore
}

const ReadyBattleScreen = ({ store }: ReadyBattleScreenProps) => {
  const { state, actions } = useBattle(store)
  useGameLoop(actions.tick, state.status === 'ongoing')

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <HealthBar label="You" hp={state.player.hp} maxHp={state.player.maxHp} />
      <HealthBar label={state.monster.id} hp={state.monster.hp} maxHp={state.monster.maxHp} />
      <MonsterTyping prompt={state.monster.prompt} typed={state.monster.typed} />
      <PlayerPrompt
        key={state.player.attempt}
        prompt={state.player.prompt}
        timeLimitMs={state.player.timeLimitMs}
        elapsedMs={state.player.elapsedMs}
        disabled={state.status !== 'ongoing'}
        onSubmit={actions.submit}
      />
      <BattleResult status={state.status} />
    </main>
  )
}

const BattleScreen = () => {
  const [store, setStore] = useState<BattleStore | null>(null)

  useEffect(() => {
    let cancelled = false
    createBattleStore(M0_MONSTER_ID).then((created) => {
      if (!cancelled) setStore(created)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!store) {
    return <p className="p-8">Loading battle…</p>
  }

  return <ReadyBattleScreen store={store} />
}

export default BattleScreen
