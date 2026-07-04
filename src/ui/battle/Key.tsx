import type { KeyboardKey } from '../../content/keyboard-layout'

interface KeyProps {
  keyData: KeyboardKey
  brightness?: number
}

// Only three states ever apply color (brightness 0/1/2); everything else
// stays the neutral base key. Values from docs/design/tokens.json#keyboard.
const BRIGHTNESS_STYLES = [
  { backgroundColor: '#e8c766', color: '#1c0f0a', boxShadow: '0 0 10px #e8c76699' },
  { backgroundColor: 'rgba(232,199,102,0.55)', color: '#1c0f0a' },
  { backgroundColor: 'rgba(232,199,102,0.3)', color: '#1c0f0a' },
]

const Key = ({ keyData, brightness }: KeyProps) => {
  const highlightStyle = brightness === undefined ? undefined : BRIGHTNESS_STYLES[brightness]

  return (
    <div
      className={`flex h-[32px] items-center justify-center rounded border border-border-gold-dim bg-key-base font-mono text-[12px] text-text-primary ${brightness === 0 ? 'font-bold' : ''}`}
      style={{ flexGrow: keyData.widthUnits, flexBasis: 0, ...highlightStyle }}
    >
      {keyData.label}
    </div>
  )
}

export default Key
