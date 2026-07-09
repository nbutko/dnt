import { useEffect, useRef, useState } from 'react'
import { getMonster } from '../../content/monsters'
import type { BattleEvent, Monster } from '../../domain/types'
import type { PlayerModifiers } from '../../domain/progression'
import { createBattleStore, type BattleStore, type FightEncounter } from '../../state/battle-store'
import Flash, { type FlashVariant } from '../common/Flash'
import Frame from '../common/Frame'
import { useBattle } from '../hooks/useBattle'
import { useGameLoop } from '../hooks/useGameLoop'
import BattleResult from './BattleResult'
import HealthBar from './HealthBar'
import Keyboard from './Keyboard'
import PlayerPrompt from './PlayerPrompt'
import TypedProgress from './TypedProgress'

// How long one Flash instance stays mounted — matches index.css's
// flash-float animation duration (Story 11, wireframe turn 8).
const FLASH_DURATION_MS = 1400

// Where a flash anchors within its (relatively-positioned) panel — fixed
// wireframe-matched slots so simultaneous flashes never overlap: a player
// hit's damage/crit number floats over the monster's HP bar; a dodge reads
// top-left of the player panel, Sneak Attack top-right, Second Wind
// bottom-right (8a's layout).
type FlashSlot = 'monster-hit' | 'player-topleft' | 'player-topright' | 'player-bottomright'

const SLOT_CLASS: Record<FlashSlot, string> = {
  'monster-hit': 'absolute left-1/2 top-14 -translate-x-1/2',
  'player-topleft': 'absolute left-2 -top-3',
  'player-topright': 'absolute right-2 -top-3',
  'player-bottomright': 'absolute right-3 bottom-3',
}

interface FlashInstance {
  id: number
  slot: FlashSlot
  variant: FlashVariant
  text: string
  sublabel?: string
}

// Builds this tick's flash(es) from ONE fresh BattleEvent — a player hit can
// carry both a damage/crit number AND a Sneak Attack label; a monster's
// dodge is its own event; Second Wind rides on whichever monster event
// triggered it (engine/battle.ts folds it in rather than using a separate
// kind, since both can land on the same tick). No mid-typing input — purely
// a reaction to what the engine already decided (m3-scope.html#ability-mechanics).
const buildFlashes = (event: BattleEvent, nextId: () => number): FlashInstance[] => {
  const flashes: FlashInstance[] = []

  if (event.side === 'player' && event.kind === 'hit') {
    const shown = Math.round(event.damage ?? 0)
    const sublabel = event.diceRolled?.length
      ? `🎲 ${event.diceRolled.join('+')}${event.isCrit ? ` ×${event.diceRolled.length}` : ''}`
      : undefined
    flashes.push({
      id: nextId(),
      slot: 'monster-hit',
      variant: event.isCrit ? 'crit' : 'hit',
      text: event.isCrit ? `CRIT ${shown}!` : `${shown}`,
      sublabel,
    })
    if (event.isSneakAttack) {
      flashes.push({
        id: nextId(),
        slot: 'player-topright',
        variant: 'sneak-attack',
        text: 'Sneak Attack!',
      })
    }
  }

  if (event.side === 'monster' && event.kind === 'dodge') {
    flashes.push({ id: nextId(), slot: 'player-topleft', variant: 'dodge', text: 'Dodged!' })
  }

  if (event.secondWindTriggered) {
    flashes.push({
      id: nextId(),
      slot: 'player-bottomright',
      variant: 'second-wind',
      text: '✚ Second Wind!',
    })
  }

  return flashes
}

// The battle's outcome, in the dungeon-run's vocabulary — a clean 'win'|'lose'
// so callers don't have to translate the engine's 'won'|'lost' status.
export type BattleResultKind = 'win' | 'lose'

// `wpm` (Story 12: SaveData.stats.bestWpm) rides along only on a win — the
// battle's final BattleState.player.wpm, chars-typed over typing-time-used
// across the whole fight (engine/battle.ts). Undefined on a loss; there's no
// "final" reading worth banking for a wipe.
interface ReadyBattleScreenProps {
  store: BattleStore
  onResult: (result: BattleResultKind, wpm?: number) => void
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

  // The Story 11 flash overlays. `state.lastEvent` isn't cleared on ticks
  // where nothing new happened — it's the same object reference until a NEW
  // event actually fires — so identity (not content) is what tells a fresh
  // event from a stale re-read; see engine/battle.ts's own comment on the
  // same subtlety.
  const [flashes, setFlashes] = useState<FlashInstance[]>([])
  const prevEventRef = useRef<BattleEvent | undefined>(undefined)
  const nextFlashId = useRef(0)
  const pendingTimeouts = useRef<number[]>([])

  useEffect(() => {
    const event = state.lastEvent
    if (!event || event === prevEventRef.current) return
    prevEventRef.current = event

    const created = buildFlashes(event, () => {
      nextFlashId.current += 1
      return nextFlashId.current
    })
    if (created.length === 0) return

    setFlashes((prev) => [...prev, ...created])
    created.forEach((flash) => {
      const timeoutId = window.setTimeout(() => {
        setFlashes((prev) => prev.filter((f) => f.id !== flash.id))
      }, FLASH_DURATION_MS)
      pendingTimeouts.current.push(timeoutId)
    })
  }, [state.lastEvent])

  // Clears any in-flight flash timers on unmount so a fight left mid-flash
  // never calls setState on an unmounted screen.
  useEffect(
    () => () => {
      pendingTimeouts.current.forEach((id) => window.clearTimeout(id))
    },
    [],
  )

  const flashesFor = (slot: FlashSlot): FlashInstance[] => flashes.filter((f) => f.slot === slot)

  // A win resolves straight into the dungeon's reward modal (feedback #1/#12):
  // hand the result up the moment the monster falls, with no intermediate
  // "Continue" button, so the modal's single Continue is the only press. A loss
  // still gets the in-battle end panel below (there's no reward to show). The
  // ref makes this fire exactly once even as `onResult` gets new identities.
  const resultSent = useRef(false)
  useEffect(() => {
    if (state.status === 'won' && !resultSent.current) {
      resultSent.current = true
      onResult('win', state.player.wpm)
    }
  }, [state.status, state.player.wpm, onResult])

  const secondsLeft = Math.max(0, state.player.timeLimitMs - state.player.elapsedMs) / 1000
  const monsterSecondsLeft =
    Math.max(0, state.monster.timeLimitMs - state.monster.elapsedMs) / 1000

  return (
    <Frame>
      <h1 className="mb-6 text-center font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
        Battle — Tier {monsterInfo.tier}
      </h1>

      <section className="relative rounded-lg border-2 border-border-gold bg-gradient-to-b from-panel-monster-from to-panel-monster-to p-4">
        <HealthBar
          label={monsterInfo.name}
          hp={state.monster.hp}
          maxHp={state.monster.maxHp}
          family="danger"
        />
        {flashesFor('monster-hit').map((f) => (
          <Flash key={f.id} text={f.text} variant={f.variant} sublabel={f.sublabel} className={SLOT_CLASS[f.slot]} />
        ))}
        <div className="mt-3 flex items-start gap-4">
          {/* min-w-0: without it the flex item's default min-width:auto lets the
              non-wrapping prompt line dictate (and blow out) the column width,
              which broke TypedProgress's width measurement. */}
          <div className="min-w-0 flex-1 rounded border border-border-gold-dim bg-black/30 p-3">
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

      <section className="relative rounded-lg border-2 border-border-gold bg-gradient-to-b from-panel-player-from to-panel-player-to p-4">
        <HealthBar label="You" hp={state.player.hp} maxHp={state.player.maxHp} family="gold" />
        {(['player-topleft', 'player-topright', 'player-bottomright'] as const).flatMap((slot) =>
          flashesFor(slot).map((f) => (
            <Flash key={f.id} text={f.text} variant={f.variant} sublabel={f.sublabel} className={SLOT_CLASS[f.slot]} />
          )),
        )}

        <div className="mt-3 flex items-start gap-4">
          <div className="min-w-0 flex-1">
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
  // This fight's frozen encounter roll (Story 6's EncounterModal, wired all
  // the way through by Story 12) + the dungeon's textTierRange — undefined
  // falls back to createBattleStore's pre-Story-12 monster.textTier
  // placeholder, so an older caller/test still compiles.
  encounter?: FightEncounter
  onResult: (result: BattleResultKind, wpm?: number) => void
}

// Launched by the dungeon screen for one tapped node. The served text tier and
// the damage gate come from `modifiers` + `encounter` (Story 6/12), computed
// once when the store is built; on finish, `onResult` hands the outcome (plus
// the fight's final wpm on a win) back so the dungeon can resolve the fight
// and bank rewards.
const BattleScreen = ({ monster, modifiers, encounter, onResult }: BattleScreenProps) => {
  const [store, setStore] = useState<BattleStore | null>(null)

  useEffect(() => {
    let cancelled = false
    createBattleStore(monster, modifiers, undefined, encounter).then((created) => {
      if (!cancelled) setStore(created)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one store per mount; a mid-fight monster/modifier/encounter change shouldn't restart the battle.
  }, [])

  if (!store) {
    return <p className="p-8 text-text-dim">Loading battle…</p>
  }

  return <ReadyBattleScreen store={store} onResult={onResult} />
}

export default BattleScreen
