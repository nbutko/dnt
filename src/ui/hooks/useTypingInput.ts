import { useEffect, useRef, useState } from 'react'

interface UseTypingInputOptions {
  prompt: string
  // The engine's attempt counter — the typed line resets whenever it changes
  // (a hit, a miss, or a timeout all start a fresh prompt).
  attempt: number
  // Only capture keystrokes while true: the battle is ongoing AND the player
  // isn't in a miss pause. Off, the listener isn't even attached, so Enter on
  // a modal's autofocused Continue (reward modal, loss screen) can't leak in.
  active: boolean
  onSubmit: (input: string) => void
}

// The one keystroke source for a battle. There is deliberately NO text field
// on the battle screen: a real <input> has to hold DOM focus (a stray tap on
// a Chromebook loses it, and an invisible element can't be clicked back into)
// and ChromeOS autocorrects / auto-capitalizes anything editable regardless of
// opt-out attributes. Building the line from window `keydown` needs neither
// focus nor a field. Don't reintroduce an input "for focus" — see
// docs/plans/wip/20260913-nbutko-typing-input-rework.html.
//
// Key rules, in order (docs/plans/wip/20260913-nbutko-typing-input-rework.html §3):
//  1. Ctrl / Meta / Alt held -> ignore (browser + ChromeOS shortcuts keep
//     working; Shift is just how capitals are typed).
//  2. Enter -> submit only once input.length === prompt.length; a short-input
//     Enter does nothing (the multi-line "literal newline" rule in
//     game-design.html is dormant: no bank text has a line break).
//  3. Backspace -> drop the last char; always allowed.
//  4. A single-character `key` -> append (preventDefault so Space can't scroll).
//  5. Anything else (Shift, Tab, arrows, Dead, F-keys) -> ignore.
// `event.repeat` is honored: holding a key auto-repeats like a text field.
export const useTypingInput = ({
  prompt,
  attempt,
  active,
  onSubmit,
}: UseTypingInputOptions): string => {
  const [input, setInput] = useState('')

  useEffect(() => {
    setInput('')
  }, [attempt])

  // The listener is attached once per `active` flip, not once per keystroke:
  // it reads the latest prompt/input/onSubmit through this ref instead of
  // closing over them, so Enter's length check can never see a stale `input`
  // from a keystroke whose render hasn't committed yet.
  const latest = useRef({ input, prompt, onSubmit })
  latest.current = { input, prompt, onSubmit }

  useEffect(() => {
    if (!active) return undefined

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === 'Enter') {
        const { input: typed, prompt: target, onSubmit: submit } = latest.current
        if (typed.length !== target.length) return
        event.preventDefault()
        submit(typed)
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        setInput((current) => current.slice(0, -1))
        return
      }

      if (event.key.length !== 1) return
      event.preventDefault()
      setInput((current) => current + event.key)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  return input
}
