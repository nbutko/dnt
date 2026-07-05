import type { KeyboardEvent } from 'react'
import TypedProgress from './TypedProgress'

interface PlayerPromptProps {
  prompt: string
  input: string
  disabled: boolean
  paused: boolean
  onInputChange: (value: string) => void
  onSubmit: (input: string) => void
}

// Return only counts as a submit once input length matches the prompt; exact
// match hits, anything else misses, and there's no re-attempt — the engine
// (engine/battle.ts) enforces this too, this is just the UI-local typing box
// feeding it. See game-design.html#submitting.
//
// `input` is lifted to BattleScreen (Story 7) rather than owned here, since
// Keyboard needs it too, alongside `prompt`. Two lines are rendered: the big
// target-prompt-with-progress line (TypedProgress) a 10-year-old reads under
// time pressure, and a small dim "live input echo" below it that's the
// actual focused control — see docs/design/visual-spec.html#type.
//
// While `paused` (a brief window after a timeout, see engine/battle.ts), both
// lines are replaced with an explicit "time's up" message instead of silently
// swapping to the next prompt.
const PlayerPrompt = ({
  prompt,
  input,
  disabled,
  paused,
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
      <div className="flex flex-col gap-1">
        <p className="font-mono text-lg text-danger-bright">Time Limit Expired. You missed!</p>
        <p aria-hidden="true" className="font-mono text-[13px] text-text-dim">
          &gt;
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <TypedProgress prompt={prompt} typed={input} revealRemaining className="text-lg" />
      <div className="flex items-center gap-1 font-mono text-[13px] text-text-dim">
        <span aria-hidden="true">&gt;</span>
        <input
          className="flex-1 border-none bg-transparent outline-none disabled:opacity-50"
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
    </div>
  )
}

export default PlayerPrompt
