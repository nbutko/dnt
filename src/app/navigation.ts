// The whole navigation layer for 4 screens on 1 device — no router library
// (see m2-implementation.html#state, "No router library"). GameShell holds
// one Screen and switches on it.
export type Screen =
  | { name: 'map' }
  | { name: 'inn' }
  | { name: 'dungeon'; tier: number }
  | { name: 'battle' }

export const toMap = (): Screen => ({ name: 'map' })
export const toInn = (): Screen => ({ name: 'inn' })
export const toDungeon = (tier: number): Screen => ({ name: 'dungeon', tier })
export const toBattle = (): Screen => ({ name: 'battle' })
