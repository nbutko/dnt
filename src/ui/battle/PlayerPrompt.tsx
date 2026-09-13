import TypedProgress from './TypedProgress'

interface PlayerPromptProps {
  prompt: string
  input: string
  disabled: boolean
  paused: boolean
  pauseReason?: 'expire' | 'miss'
}

const PAUSE_MESSAGES = {
  expire: 'Time Limit Expired. You missed!',
  miss: 'Incorrect Incantation. You missed!',
} as const

// Purely presentational: the player's target line with their typing overlaid
// (TypedProgress) and a blinking caret marking where they are. It renders no
// text field — keystrokes are captured by ui/hooks/useTypingInput.ts, which
// owns `input` (lifted to BattleScreen since Story 7 because Keyboard needs it
// too, alongside `prompt`). Only ONE line is shown, the big
// target-prompt-with-progress a 10-year-old reads and types over; there is no
// second echoed `> …` line (feedback #10).
//
// The submit rule — Return only counts once input length matches the prompt;
// exact match hits, anything else misses, no re-attempt — lives in the hook
// and in engine/battle.ts, not here. See game-design.html#submitting.
//
// While `paused` (a brief window after a timeout or a wrong-text miss, see
// engine/battle.ts), the prompt line is replaced with an explicit "you missed"
// message — worded differently per `pauseReason` — instead of silently
// swapping to the next prompt.
const PlayerPrompt = ({ prompt, input, disabled, paused, pauseReason }: PlayerPromptProps) => {
  if (paused) {
    return (
      <p className="font-mono text-lg text-danger-bright">
        {PAUSE_MESSAGES[pauseReason ?? 'expire']}
      </p>
    )
  }

  return (
    <TypedProgress
      prompt={prompt}
      typed={input}
      revealRemaining
      blinkCaret={!disabled}
      className="text-lg"
      maxVisibleLines={4}
    />
  )
}

export default PlayerPrompt
