import type { Monster } from '../domain/types'
import monstersData from './monsters.json'

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
