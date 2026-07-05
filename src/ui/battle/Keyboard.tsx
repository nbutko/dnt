import keyboardLayout from '../../content/keyboard-layout'
import Key from './Key'
import { nextKeyHighlights } from './keyboard-highlights'

interface KeyboardProps {
  prompt: string
  input: string
  active?: boolean
}

// On-screen keyboard highlighting the next ~3 keys (touch-typing aid): see
// m0-implementation.html#keyboard. Purely a function of prompt+input, no
// state of its own. `active=false` (e.g. during the post-timeout pause in
// PlayerPrompt) blanks out all highlights rather than lighting up Enter for
// a stale prompt/input pair.
const Keyboard = ({ prompt, input, active = true }: KeyboardProps) => {
  const highlights = active ? nextKeyHighlights(prompt, input) : new Map<string, number>()

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border-gold-dim bg-panel-base p-3.5">
      {keyboardLayout.map((row) => (
        <div key={row[0].code} className="flex gap-1">
          {row.map((keyData) => (
            <Key key={keyData.code} keyData={keyData} brightness={highlights.get(keyData.code)} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default Keyboard
