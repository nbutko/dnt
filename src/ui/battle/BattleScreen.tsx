import { useEffect, useRef, useState } from 'react'
import { getMonster } from '../../content/monsters'
import type { Monster } from '../../domain/types'
import type { PlayerModifiers } from '../../domain/progression'
import { createBattleStore, type BattleStore } from '../../state/battle-store'
import Frame from '../common/Frame'
import { useBattle } from '../hooks/useBattle'
import { useGameLoop } from '../hooks/useGameLoop'
import BattleResult from './BattleResult'
import HealthBar from './HealthBar'
import Keyboard from './Keyboard'
import PlayerPrompt from './PlayerPrompt'
import TypedProgress from './TypedProgress'

// The battle's outcome, in the dungeon-run's vocabulary — a clean 'win'|'lose'
// so callers don't have to translate the engine's 'won'|'lost' status.
export type BattleResultKind = 'win' | 'lose'

interface ReadyBattleScreenProps {
  store: BattleStore
  onResult: (result: BattleResultKind) => void
}

// "Vertical Duel" layout (docs/design/visual-spec.html#layout): title, then
// monster panel (top), a VS divider, then the player's own panel (bottom) —
// HP, prompt, live input, countdown, and the keyboard.
const ReadyBattleScreen = ({ store, onResult }: ReadyBattleScreenProps) => {
  const { state, actions } = useBattle(store)
  useGameLoop(actions.tick, state.status === 'ongoing')
  const monsterInfo = getMonster(state.monster.id)

  // Owned here (not PlayerPrompt) because Keyboard needs it alongside
  // `prompt` — see m0-implementation.html#keyboard.
  const [input, setInput] = useState('')
  useEffect(() => {
    setInput('')
  }, [state.player.attempt])

  // A win resolves straight into the dungeon's reward modal (feedback #1/#12):
  // hand the result up the moment the monster falls, with no intermediate
  // "Continue" button, so the modal's single Continue is the only press. A loss
  // still gets the in-battle end panel below (there's no reward to show). The
  // ref makes this fire exactly once even as `onResult` gets new identities.
  const resultSent = useRef(false)
  useEffect(() => {
    if (state.status === 'won' && !resultSent.current) {
      resultSent.current = true
      onResult('win')
    }
  }, [state.status, onResult])

  const secondsLeft = Math.max(0, state.player.timeLimitMs - state.player.elapsedMs) / 1000
  const monsterSecondsLeft =
    Math.max(0, state.monster.timeLimitMs - state.monster.elapsedMs) / 1000

  return (
    <Frame>
      <h1 className="mb-6 text-center font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
        Battle — Tier {monsterInfo.tier}
      </h1>

      <section className="rounded-lg border-2 border-border-gold bg-gradient-to-b from-panel-monster-from to-panel-monster-to p-4">
        <HealthBar
          label={monsterInfo.name}
          hp={state.monster.hp}
          maxHp={state.monster.maxHp}
          family="danger"
        />
        <div className="mt-3 flex items-start gap-4">
          <div className="flex-1 rounded border border-border-gold-dim bg-black/30 p-3">
            {state.monster.paused ? (
              <p className="font-mono text-lg text-danger-bright">
                Time Limit Expired. Attack missed!
              </p>
            ) : (
              <TypedProgress
                prompt={state.monster.prompt}
                typed={state.monster.typed}
                revealRemaining={false}
                className="text-lg"
              />
            )}
          </div>
          <div className="w-16 flex-none text-center">
            <div className="font-display text-[22px] font-bold text-danger-bright">
              {monsterSecondsLeft.toFixed(1)}
            </div>
            <div className="font-mono text-[10px] tracking-wide text-text-dim uppercase">
              Sec left
            </div>
          </div>
        </div>
      </section>

      <div className="my-4 flex items-center gap-3 text-accent-gold">
        <span className="h-px flex-1 bg-border-gold-dim" />
        <span>◆</span>
        <span className="font-display text-sm tracking-[0.2em]">VS</span>
        <span>◆</span>
        <span className="h-px flex-1 bg-border-gold-dim" />
      </div>

      <section className="rounded-lg border-2 border-border-gold bg-gradient-to-b from-panel-player-from to-panel-player-to p-4">
        <HealthBar label="You" hp={state.player.hp} maxHp={state.player.maxHp} family="gold" />

        <div className="mt-3 flex items-start gap-4">
          <div className="flex-1">
            <PlayerPrompt
              prompt={state.player.prompt}
              input={input}
              disabled={state.status !== 'ongoing'}
              paused={state.player.paused}
              pauseReason={state.player.pauseReason}
              onInputChange={setInput}
              onSubmit={actions.submit}
            />
          </div>
          <div className="w-16 flex-none text-center">
            <div className="font-display text-[22px] font-bold text-accent-gold-bright">
              {secondsLeft.toFixed(1)}
            </div>
            <div className="font-mono text-[10px] tracking-wide text-text-dim uppercase">Sec left</div>
          </div>
        </div>

        <div className="mt-4">
          <Keyboard
            prompt={state.player.prompt}
            input={input}
            active={state.status === 'ongoing' && !state.player.paused}
          />
        </div>

        {/* Loss only: a win hands straight up to the reward modal (above), which
            carries its own Continue. A defeat has nothing to reward, so it keeps
            the in-battle end panel and its Continue back to the run. */}
        {state.status === 'lost' && (
          <div className="mt-4">
            <BattleResult status={state.status} />
            <button
              type="button"
              onClick={() => onResult('lose')}
              // Autofocused so a bare Enter confirms the loss too (feedback #1) —
              // the typing input is gone/disabled, so this is the keydown target.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="mx-auto mt-4 block rounded border border-border-gold px-5 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
            >
              Continue →
            </button>
          </div>
        )}
      </section>
    </Frame>
  )
}

interface BattleScreenProps {
  monster: Monster
  modifiers: PlayerModifiers
  onResult: (result: BattleResultKind) => void
}

// Launched by the dungeon screen for one tapped node. The served text tier and
// the damage gate come from `modifiers` (Story 6), computed once when the store
// is built; on finish, `onResult` hands the outcome back so the dungeon can
// resolve the fight and bank rewards.
const BattleScreen = ({ monster, modifiers, onResult }: BattleScreenProps) => {
  const [store, setStore] = useState<BattleStore | null>(null)

  useEffect(() => {
    let cancelled = false
    createBattleStore(monster, modifiers).then((created) => {
      if (!cancelled) setStore(created)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one store per mount; a mid-fight monster/modifier change shouldn't restart the battle.
  }, [])

  if (!store) {
    return <p className="p-8 text-text-dim">Loading battle…</p>
  }

  return <ReadyBattleScreen store={store} onResult={onResult} />
}

export default BattleScreen
