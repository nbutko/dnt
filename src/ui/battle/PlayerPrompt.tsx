import type { KeyboardEvent } from 'react'

interface PlayerPromptProps {
  prompt: string
  input: string
  timeLimitMs: number
  elapsedMs: number
  disabled: boolean
  onInputChange: (value: string) => void
  onSubmit: (input: string) => void
}

// Return only counts as a submit once input length matches the prompt; exact
// match hits, anything else misses, and there's no re-attempt — the engine
// (engine/battle.ts) enforces this too, this is just the UI-local typing box
// feeding it. See game-design.html#submitting.
//
// `input` is lifted to BattleScreen (Story 7) rather than owned here, since
// Keyboard needs it too, alongside `prompt`.
const PlayerPrompt = ({
  prompt,
  input,
  timeLimitMs,
  elapsedMs,
  disabled,
  onInputChange,
  onSubmit,
}: PlayerPromptProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return
    if (input.length !== prompt.length) return
    onSubmit(input)
  }

  const secondsLeft = Math.max(0, timeLimitMs - elapsedMs) / 1000

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-lg">{prompt}</p>
      <input
        className="border p-2 font-mono disabled:opacity-50"
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
      <p className="text-sm text-gray-500">{secondsLeft.toFixed(1)}s left</p>
    </div>
  )
}

export default PlayerPrompt
