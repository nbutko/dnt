import type { KeyboardKey } from '../../content/keyboard-layout'

interface KeyProps {
  keyData: KeyboardKey
  brightness?: number
}

// 0 = brightest (the very next key), higher = dimmer.
const BRIGHTNESS_CLASSES = ['bg-yellow-400', 'bg-yellow-300', 'bg-yellow-200']

const Key = ({ keyData, brightness }: KeyProps) => {
  const highlightClass =
    brightness === undefined
      ? 'bg-gray-100'
      : (BRIGHTNESS_CLASSES[brightness] ?? BRIGHTNESS_CLASSES[BRIGHTNESS_CLASSES.length - 1])

  return (
    <div
      className={`flex h-8 items-center justify-center rounded border border-gray-300 font-mono text-xs ${highlightClass}`}
      style={{ flexGrow: keyData.widthUnits, flexBasis: 0 }}
    >
      {keyData.label}
    </div>
  )
}

export default Key
