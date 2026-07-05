import type { Monster } from '../domain/types'
import monstersData from './monsters.json'

// `slack` (attack time limit = expected typing time x slack) is tuned per
// monster via engine/sim/balance.ts-style sweeps against its own
// wpm/accuracy/attention, targeting roughly: weak/early monsters miss their
// own attack (time out) ~20-25% of the time, tougher/more disciplined ones
// ~5%. Slime (2.0) and Goblin (2.4) both land in the "weak" end of that
// range — Goblin needs a looser slack than Slime despite being the
// "tougher" tier-1 fight, because its higher wpm + lower accuracy means a
// single mistake costs more (more wrong characters typed before it
// corrects). Later, stronger monsters should aim their own slack toward the
// ~5% end using the same technique.
const monsters = monstersData as Monster[]

export const listMonsters = (): readonly Monster[] => monsters

export const getMonster = (id: string): Monster => {
  const monster = monsters.find((candidate) => candidate.id === id)
  if (!monster) {
    throw new Error(`Unknown monster id: ${id}`)
  }
  return monster
}

export default monsters
