export interface KeyboardKey {
  code: string
  label: string
  shiftLabel?: string
  widthUnits: number
}

export type KeyboardRow = readonly KeyboardKey[]

// Full 5-row US QWERTY, as data. M0 only ever highlights letters, Space,
// Backspace, and Enter, but Backspace lives on the number row and Enter on
// the home row, so all five rows must render from the start.
const numberRow: KeyboardRow = [
  { code: 'Backquote', label: '`', shiftLabel: '~', widthUnits: 1 },
  { code: 'Digit1', label: '1', shiftLabel: '!', widthUnits: 1 },
  { code: 'Digit2', label: '2', shiftLabel: '@', widthUnits: 1 },
  { code: 'Digit3', label: '3', shiftLabel: '#', widthUnits: 1 },
  { code: 'Digit4', label: '4', shiftLabel: '$', widthUnits: 1 },
  { code: 'Digit5', label: '5', shiftLabel: '%', widthUnits: 1 },
  { code: 'Digit6', label: '6', shiftLabel: '^', widthUnits: 1 },
  { code: 'Digit7', label: '7', shiftLabel: '&', widthUnits: 1 },
  { code: 'Digit8', label: '8', shiftLabel: '*', widthUnits: 1 },
  { code: 'Digit9', label: '9', shiftLabel: '(', widthUnits: 1 },
  { code: 'Digit0', label: '0', shiftLabel: ')', widthUnits: 1 },
  { code: 'Minus', label: '-', shiftLabel: '_', widthUnits: 1 },
  { code: 'Equal', label: '=', shiftLabel: '+', widthUnits: 1 },
  { code: 'Backspace', label: 'Backspace', widthUnits: 2 },
]

const tabRow: KeyboardRow = [
  { code: 'Tab', label: 'Tab', widthUnits: 1.5 },
  { code: 'KeyQ', label: 'q', shiftLabel: 'Q', widthUnits: 1 },
  { code: 'KeyW', label: 'w', shiftLabel: 'W', widthUnits: 1 },
  { code: 'KeyE', label: 'e', shiftLabel: 'E', widthUnits: 1 },
  { code: 'KeyR', label: 'r', shiftLabel: 'R', widthUnits: 1 },
  { code: 'KeyT', label: 't', shiftLabel: 'T', widthUnits: 1 },
  { code: 'KeyY', label: 'y', shiftLabel: 'Y', widthUnits: 1 },
  { code: 'KeyU', label: 'u', shiftLabel: 'U', widthUnits: 1 },
  { code: 'KeyI', label: 'i', shiftLabel: 'I', widthUnits: 1 },
  { code: 'KeyO', label: 'o', shiftLabel: 'O', widthUnits: 1 },
  { code: 'KeyP', label: 'p', shiftLabel: 'P', widthUnits: 1 },
  { code: 'BracketLeft', label: '[', shiftLabel: '{', widthUnits: 1 },
  { code: 'BracketRight', label: ']', shiftLabel: '}', widthUnits: 1 },
  { code: 'Backslash', label: '\\', shiftLabel: '|', widthUnits: 1.5 },
]

const homeRow: KeyboardRow = [
  { code: 'CapsLock', label: 'Caps Lock', widthUnits: 1.75 },
  { code: 'KeyA', label: 'a', shiftLabel: 'A', widthUnits: 1 },
  { code: 'KeyS', label: 's', shiftLabel: 'S', widthUnits: 1 },
  { code: 'KeyD', label: 'd', shiftLabel: 'D', widthUnits: 1 },
  { code: 'KeyF', label: 'f', shiftLabel: 'F', widthUnits: 1 },
  { code: 'KeyG', label: 'g', shiftLabel: 'G', widthUnits: 1 },
  { code: 'KeyH', label: 'h', shiftLabel: 'H', widthUnits: 1 },
  { code: 'KeyJ', label: 'j', shiftLabel: 'J', widthUnits: 1 },
  { code: 'KeyK', label: 'k', shiftLabel: 'K', widthUnits: 1 },
  { code: 'KeyL', label: 'l', shiftLabel: 'L', widthUnits: 1 },
  { code: 'Semicolon', label: ';', shiftLabel: ':', widthUnits: 1 },
  { code: 'Quote', label: "'", shiftLabel: '"', widthUnits: 1 },
  { code: 'Enter', label: 'Enter', widthUnits: 2.25 },
]

const shiftRow: KeyboardRow = [
  { code: 'ShiftLeft', label: 'Shift', widthUnits: 2.25 },
  { code: 'KeyZ', label: 'z', shiftLabel: 'Z', widthUnits: 1 },
  { code: 'KeyX', label: 'x', shiftLabel: 'X', widthUnits: 1 },
  { code: 'KeyC', label: 'c', shiftLabel: 'C', widthUnits: 1 },
  { code: 'KeyV', label: 'v', shiftLabel: 'V', widthUnits: 1 },
  { code: 'KeyB', label: 'b', shiftLabel: 'B', widthUnits: 1 },
  { code: 'KeyN', label: 'n', shiftLabel: 'N', widthUnits: 1 },
  { code: 'KeyM', label: 'm', shiftLabel: 'M', widthUnits: 1 },
  { code: 'Comma', label: ',', shiftLabel: '<', widthUnits: 1 },
  { code: 'Period', label: '.', shiftLabel: '>', widthUnits: 1 },
  { code: 'Slash', label: '/', shiftLabel: '?', widthUnits: 1 },
  { code: 'ShiftRight', label: 'Shift', widthUnits: 2.75 },
]

const bottomRow: KeyboardRow = [
  { code: 'ControlLeft', label: 'Ctrl', widthUnits: 1.25 },
  { code: 'AltLeft', label: 'Alt', widthUnits: 1.25 },
  { code: 'Space', label: '', widthUnits: 6.25 },
  { code: 'AltRight', label: 'Alt', widthUnits: 1.25 },
  { code: 'ControlRight', label: 'Ctrl', widthUnits: 1.25 },
]

const keyboardLayout: readonly KeyboardRow[] = [
  numberRow,
  tabRow,
  homeRow,
  shiftRow,
  bottomRow,
]

export default keyboardLayout
