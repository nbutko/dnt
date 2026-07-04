import type { CombatConfig, Monster, Rng } from '../domain/types'

export interface MonsterTyperState {
  typed: string
  done: boolean
  failed: boolean
  elapsedMs: number
  timeLimitMs: number
}

export interface MonsterTyper {
  getState(): MonsterTyperState
  advance(dtMs: number): void
}

const msPerChar = (monster: Monster, combat: CombatConfig): number =>
  60000 / (monster.wpm * combat.avgWordLength)

// The monster's own expected typing time for this prompt, before any slack.
// Shared by the typer (to size its time limit) and the battle engine (to
// show a time limit in the UI) so there's one source of truth for "how long
// should this monster take."
export const expectedTypingTimeMs = (
  promptLength: number,
  monster: Monster,
  combat: CombatConfig,
): number => msPerChar(monster, combat) * promptLength

const WRONG_CHAR_POOL = 'abcdefghijklmnopqrstuvwxyz'

const pickWrongChar = (targetChar: string, rng: Rng): string => {
  const lower = targetChar.toLowerCase()
  const candidates = WRONG_CHAR_POOL.split('').filter((char) => char !== lower)
  return candidates[Math.floor(rng.next() * candidates.length)]
}

// Tick-driven simulation of a monster typing `prompt`: characters arrive on a
// sampled interval, each may be a typo (per monster.accuracy), and a typo
// isn't fixed until `monster.attention` seconds of wall-clock time pass —
// during which the monster keeps typing forward, so a fast/inattentive
// monster can rack up several wrong characters before it self-corrects.
// See game-design.html#monster-ai.
export const createMonsterTyper = (
  monster: Monster,
  prompt: string,
  rng: Rng,
  combat: CombatConfig,
): MonsterTyper => {
  const intervalMeanMs = msPerChar(monster, combat)
  const timeLimitMs = expectedTypingTimeMs(prompt.length, monster, combat) * combat.monsterSlack

  let elapsedMs = 0
  let done = false
  let failed = false
  let committed = 0
  let pending: string[] = []
  let correcting = false
  let mistakeStartMs = 0
  let noticeDelayMs = 0
  let nextCharDueMs = rng.sample(intervalMeanMs, combat.typingVariance)

  const getTyped = (): string => prompt.slice(0, committed) + pending.join('')

  const getState = (): MonsterTyperState => ({
    typed: getTyped(),
    done,
    failed,
    elapsedMs,
    timeLimitMs,
  })

  const advance = (dtMs: number): void => {
    if (done || failed) return
    elapsedMs += dtMs

    if (elapsedMs >= timeLimitMs) {
      failed = true
      return
    }

    const maxSteps = prompt.length * 8 + 16
    for (let step = 0; step < maxSteps; step += 1) {
      if (correcting && elapsedMs - mistakeStartMs >= noticeDelayMs) {
        pending = []
        correcting = false
      } else if (elapsedMs >= nextCharDueMs && committed + pending.length < prompt.length) {
        const targetChar = prompt[committed + pending.length]
        const isCorrect = rng.next() < monster.accuracy

        if (isCorrect && !correcting) {
          committed += 1
        } else {
          if (!isCorrect && !correcting) {
            correcting = true
            mistakeStartMs = elapsedMs
            noticeDelayMs = rng.sample(monster.attention * 1000, combat.typingVariance)
          }
          pending.push(isCorrect ? targetChar : pickWrongChar(targetChar, rng))
        }

        nextCharDueMs += rng.sample(intervalMeanMs, combat.typingVariance)
      } else {
        break
      }
    }

    done = !correcting && committed === prompt.length && pending.length === 0
  }

  return { getState, advance }
}
