import type { KeyboardEvent } from 'react'
import TypedProgress from './TypedProgress'

interface PlayerPromptProps {
  prompt: string
  input: string
  disabled: boolean
  paused: boolean
  pauseReason?: 'expire' | 'miss'
  onInputChange: (value: string) => void
  onSubmit: (input: string) => void
}

const PAUSE_MESSAGES = {
  expire: 'Time Limit Expired. You missed!',
  miss: 'Incorrect Incantation. You missed!',
} as const

// Return only counts as a submit once input length matches the prompt; exact
// match hits, anything else misses, and there's no re-attempt — the engine
// (engine/battle.ts) enforces this too, this is just the UI-local typing box
// feeding it. See game-design.html#submitting.
//
// `input` is lifted to BattleScreen (Story 7) rather than owned here, since
// Keyboard needs it too, alongside `prompt`. Only ONE line is rendered: the
// big target-prompt-with-progress line (TypedProgress) a 10-year-old reads and
// types over, with a blinking caret marking where they are. The real <input>
// stays in the DOM (visually hidden via `sr-only`) so keystrokes and focus
// still flow through it — but it's no longer echoed as a second, duplicate
// `> …` line below the prompt, which was confusing (feedback #10).
//
// While `paused` (a brief window after a timeout or a wrong-text miss, see
// engine/battle.ts), the prompt line is replaced with an explicit "you missed"
// message — worded differently per `pauseReason` — instead of silently
// swapping to the next prompt.
const PlayerPrompt = ({
  prompt,
  input,
  disabled,
  paused,
  pauseReason,
  onInputChange,
  onSubmit,
}: PlayerPromptProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return
    if (input.length !== prompt.length) return
    onSubmit(input)
  }

  if (paused) {
    return (
      <p className="font-mono text-lg text-danger-bright">
        {PAUSE_MESSAGES[pauseReason ?? 'expire']}
      </p>
    )
  }

  return (
    <div className="relative">
      <TypedProgress
        prompt={prompt}
        typed={input}
        revealRemaining
        blinkCaret={!disabled}
        className="text-lg"
      />
      {/* The real control, kept in the DOM (and focusable) but visually hidden:
          the TypedProgress line above is now the sole on-screen typing surface
          (feedback #10). `sr-only` still receives keystrokes, focus, and the
          autofocus below. */}
      <input
        className="sr-only"
        value={input}
        disabled={disabled}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Type the prompt"
        // This is the game's one always-relevant control; the kid should be
        // able to type on load without clicking first.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
    </div>
  )
}

export default PlayerPrompt
