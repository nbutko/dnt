import keyboardLayout from '../../content/keyboard-layout'
import Key from './Key'
import { nextKeyHighlights } from './keyboard-highlights'

interface KeyboardProps {
  prompt: string
  input: string
}

// On-screen keyboard highlighting the next ~3 keys (touch-typing aid): see
// m0-implementation.html#keyboard. Purely a function of prompt+input, no
// state of its own.
const Keyboard = ({ prompt, input }: KeyboardProps) => {
  const highlights = nextKeyHighlights(prompt, input)

  return (
    <div className="flex flex-col gap-1">
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
