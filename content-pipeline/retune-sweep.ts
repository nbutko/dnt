/**
 * Retune characterization sweep (step A). Run: `npx tsx content-pipeline/retune-sweep.ts`
 *
 * Prints the MEASURED (dungeon boss × corner × class) win-rate + hits-to-kill
 * surface next to docs/content-plan-v2-tuning.html's TARGET surface, so we can
 * see how far the current combat math is from the intent before tuning knobs.
 *
 * Not shipped code — a disposable harness that reuses the real engine
 * (simulateCharacterBattles) exactly as the app would run each fight.
 */
import combat from '../src/config/combat'
import {
  bossOf,
  representativeAbilities,
  simulateCharacterBattles,
  weaponForTierLevel,
} from '../src/engine/sim/balance'
import type { CharacterClass } from '../src/domain/character'
import type { TextTier } from '../src/domain/types'

// From docs/content-plan-v2-tuning.html §2/§3: each dungeon boss's target
// [level, wpm] at behind / on-track / ahead, plus the on-track #prompts goal.
interface Corner {
  level: number
  wpm: number
}
interface Target {
  d: number
  habitat: string
  boss: TextTier
  behind: Corner
  on: Corner
  ahead: Corner
  prompts: number
}
const TARGETS: Target[] = [
  { d: 1, habitat: 'Grassland', boss: 4, behind: { level: 4, wpm: 7 }, on: { level: 2, wpm: 10 }, ahead: { level: 1, wpm: 16 }, prompts: 4 },
  { d: 2, habitat: 'Forest', boss: 5, behind: { level: 6, wpm: 10 }, on: { level: 3, wpm: 16 }, ahead: { level: 2, wpm: 22 }, prompts: 4 },
  { d: 3, habitat: 'Hill', boss: 6, behind: { level: 7, wpm: 16 }, on: { level: 5, wpm: 22 }, ahead: { level: 3, wpm: 30 }, prompts: 5 },
  { d: 4, habitat: 'Coastal', boss: 7, behind: { level: 9, wpm: 22 }, on: { level: 6, wpm: 30 }, ahead: { level: 4, wpm: 38 }, prompts: 6 },
  { d: 5, habitat: 'Desert', boss: 8, behind: { level: 10, wpm: 30 }, on: { level: 7, wpm: 38 }, ahead: { level: 5, wpm: 47 }, prompts: 6 },
  { d: 6, habitat: 'Swamp', boss: 9, behind: { level: 12, wpm: 38 }, on: { level: 9, wpm: 47 }, ahead: { level: 7, wpm: 57 }, prompts: 6 },
  { d: 7, habitat: 'Mountain', boss: 10, behind: { level: 14, wpm: 47 }, on: { level: 10, wpm: 57 }, ahead: { level: 8, wpm: 65 }, prompts: 5 },
  { d: 8, habitat: 'Arctic', boss: 11, behind: { level: 15, wpm: 57 }, on: { level: 11, wpm: 65 }, ahead: { level: 9, wpm: 70 }, prompts: 6 },
  { d: 9, habitat: 'Underdark', boss: 12, behind: { level: 17, wpm: 65 }, on: { level: 12, wpm: 70 }, ahead: { level: 10, wpm: 85 }, prompts: 5 },
  { d: 10, habitat: 'Underwater', boss: 13, behind: { level: 18, wpm: 70 }, on: { level: 14, wpm: 85 }, ahead: { level: 11, wpm: 100 }, prompts: 4 },
  { d: 11, habitat: 'Urban', boss: 14, behind: { level: 20, wpm: 85 }, on: { level: 15, wpm: 100 }, ahead: { level: 12, wpm: 118 }, prompts: 3 },
]

const CLASSES: CharacterClass[] = ['fighter', 'wizard', 'rogue', 'bard']
const ACCURACY = 0.92 // a competent-but-imperfect typist, held fixed across corners
const BATTLES = 40
const MAX_TICKS = 40000 // ~33 min of sim-time at dtMs=50 — covers a 15-min stamina boss

interface Cell {
  winRate: number
  hitsToKill: number
  durationMs: number
}

const runCell = (d: number, boss: TextTier, corner: Corner, cls: CharacterClass): Cell => {
  const weapon = weaponForTierLevel(cls, corner.level)
  const abilities = representativeAbilities(cls, corner.level, weapon.ability)
  const monster = bossOf(d)
  const result = simulateCharacterBattles({
    monster,
    combat,
    character: { class: cls, level: corner.level, abilities, weapon, wpm: corner.wpm, accuracy: ACCURACY },
    // Current game behavior: a boss serves its single N+3 tier (the boss-window
    // [N+1,N+3] rework is a later retune step, not yet implemented).
    textTierRange: [boss, boss],
    battles: BATTLES,
    maxTicks: MAX_TICKS,
  })
  return { winRate: result.winRate, hitsToKill: result.hitsToKill, durationMs: result.medianDurationMs }
}

const fmtCell = (c: Cell): string => {
  const win = `${Math.round(c.winRate * 100)}%`.padStart(4)
  const htk = Number.isFinite(c.hitsToKill) ? c.hitsToKill.toFixed(1).padStart(5) : '  inf'
  return `W${win} H${htk}`
}

const fmtMin = (ms: number): string => `${(ms / 60000).toFixed(1)}m`

console.log('RETUNE SWEEP · measured boss fights vs. targets')
console.log(`(${BATTLES} battles/cell, accuracy ${ACCURACY}, gear = weaponForTierLevel — ladder stops at tier-3 weapons)\n`)
console.log('  cell = W<winRate> H<hitsToKill>;  target #prompts is the on-track hits-to-kill goal\n')

for (const t of TARGETS) {
  const boss = bossOf(t.d)
  console.log(`━━ D${t.d} ${t.habitat} · boss ${boss.name} · T${t.boss} · target on-track ≈ ${t.prompts} prompts ━━`)
  console.log(`   ${'corner'.padEnd(9)} ${'lvl/wpm'.padEnd(8)} ${CLASSES.map((c) => c.padEnd(15)).join('')}`)
  const rows: { label: string; corner: Corner }[] = [
    { label: 'behind', corner: t.behind },
    { label: 'on-track', corner: t.on },
    { label: 'ahead', corner: t.ahead },
  ]
  for (const row of rows) {
    const cells = CLASSES.map((cls) => {
      const cell = runCell(t.d, t.boss, row.corner, cls)
      return `${fmtCell(cell)} ${fmtMin(cell.durationMs)}`.padEnd(15)
    })
    const lw = `${row.corner.level}/${row.corner.wpm}`.padEnd(8)
    console.log(`   ${row.label.padEnd(9)} ${lw} ${cells.join('')}`)
  }
  console.log('')
}

console.log('Legend: on-track should be a comfortable win with htk near the target #prompts;')
console.log('ahead should be marginal; behind safe. htk far below target = fights collapsing')
console.log('to too few hits (the uncapped-lengthFactor problem).')
