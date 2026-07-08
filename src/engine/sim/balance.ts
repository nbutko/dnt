import abilitiesConfig from '../../config/abilities'
import { getClass } from '../../config/classes'
import { DUNGEON_TIERS } from '../../config/dungeon-tiers'
import { getWeapon, type WeaponConfig } from '../../config/weapons'
import { byRole } from '../../content/monsters'
import type { Ability, AbilityScores, Character, CharacterClass } from '../../domain/character'
import type { ActiveBuff } from '../../domain/items'
import type { BattleEvent, CombatConfig, Monster, TextTier } from '../../domain/types'
import { createBattle } from '../battle'
import { ASI_POINTS_PER_LEVEL, DEFAULT_LEVELING_CONFIG, type LevelingConfig } from '../character/leveling'
import { DEFAULT_MODIFIERS_CONFIG, resolveModifiers, type ModifiersConfig } from '../character/modifiers'
import { lengthFactor, tierGatePenalty } from '../damage'
import { bandToServedTier } from '../dice/band'
import {
  DEFAULT_ENCOUNTER_ROLL_CONFIG,
  rollEncounter,
  type EncounterBand,
  type EncounterRollConfig,
} from '../dice/encounter-roll'
import { expectedTypingTimeMs } from '../monster-typing'
import { createRng } from '../rng'

export interface SimulatedPlayer {
  wpm: number
  accuracy: number
  // Optional (Story 7) — a bare SimulatedPlayer falls back to computeDamage's
  // own default weapon, so older callers/tests don't need updating.
  weaponDie?: number
  weaponAbilityMod?: number
}

export interface BalanceSimConfig {
  monster: Monster
  combat: CombatConfig
  player: SimulatedPlayer
  prompt: string
  battles: number
  seed?: number
  dtMs?: number
  maxTicks?: number
}

export interface BalanceResult {
  winRate: number
  medianDurationMs: number
  // monster.hp / (average damage per landed player hit) — the ratio Story
  // 13's "HP-scale decision" (m3-scope.html#open) tunes toward a healthy
  // multi-prompt band, independent of absolute HP/damage scale.
  hitsToKill: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Headless "N battles at player wpm X vs monster Y" harness — the whole point
// is answering "what win rate / duration does this matchup produce" without
// playing it by hand, so `baseDamage`, `playerBaselineWpm`, and monster stats
// can be tuned before any UI exists. Not a full per-character typing model
// (that's engine/monster-typing.ts) — the simulated player submits on a
// sampled cadence derived from their own wpm, hitting or missing per a single
// per-attempt accuracy roll.
export const simulateBattles = (config: BalanceSimConfig): BalanceResult => {
  const { monster, combat, player, prompt, battles, seed = 1, dtMs = 50, maxTicks = 4000 } = config
  const typingTimeMs = expectedTypingTimeMs(prompt.length, player.wpm, combat)
  const durations: number[] = []
  let wins = 0
  let totalDamageDealt = 0
  let totalHitsLanded = 0

  for (let i = 0; i < battles; i += 1) {
    const rng = createRng(seed + i)
    const battle = createBattle({
      combat,
      monster,
      playerPrompts: () => prompt,
      monsterPrompts: () => prompt,
      rng,
      weaponDie: player.weaponDie,
      weaponAbilityMod: player.weaponAbilityMod,
      damageScale: abilitiesConfig.damageScale,
    })

    let elapsedMs = 0
    let nextSubmitAtMs = typingTimeMs
    for (let tick = 0; tick < maxTicks && battle.getState().status === 'ongoing'; tick += 1) {
      battle.tick(dtMs)
      elapsedMs += dtMs
      if (elapsedMs >= nextSubmitAtMs) {
        const currentPrompt = battle.getState().player.prompt
        const isHit = rng.next() < player.accuracy
        const hpBefore = battle.getState().monster.hp
        battle.submitPlayerAttack(isHit ? currentPrompt : 'x'.repeat(currentPrompt.length))
        const hpAfter = battle.getState().monster.hp
        if (hpBefore > hpAfter) {
          totalDamageDealt += hpBefore - hpAfter
          totalHitsLanded += 1
        }
        nextSubmitAtMs = elapsedMs + rng.sample(typingTimeMs, combat.typingVariance)
      }
    }

    if (battle.getState().status === 'won') wins += 1
    durations.push(elapsedMs)
  }

  const avgDamagePerHit = totalHitsLanded > 0 ? totalDamageDealt / totalHitsLanded : 0

  return {
    winRate: wins / battles,
    medianDurationMs: median(durations),
    hitsToKill: avgDamagePerHit > 0 ? monster.hp / avgDamagePerHit : Infinity,
  }
}

// --- Story 13: the whole M3 pipeline, headlessly & seeded --------------------
//
// simulateBattles above (Story 0/7) is a bare wpm/accuracy vs. a flat
// weaponDie/weaponAbilityMod — it never rolls the encounter d20, never gates
// on a served text tier, and knows nothing about a class/level/ability
// spread. simulateCharacterBattles grows the harness into a full character:
// class + level + six abilities + an equipped weapon + optional buffs go in,
// resolveModifiers() (Story 3) turns that into the same PlayerModifiers bag
// battle-store.ts feeds real fights, and every battle rolls its own encounter
// d20 -> band -> served tier (Story 6/12's rollEncounter/bandToServedTier,
// INT-capped) before the typed fight runs on the real createBattle/
// computeDamage. Reuses every real engine function; the only "new" logic
// here is the same orchestration state/battle-store.ts's resolveFightTier
// already does, re-expressed without importing state/ (engine/ never imports
// state/ — see CLAUDE.md's architecture invariants), so this file stays a
// pure engine/ citizen.

// The ten launch text tiers' real seed-bank content (content/text/tier-0N.json)
// grows very unevenly past tier 7 (tiers 8-10 are placeholder long-form
// paragraphs 500-1400 chars — "real excerpts stay M6", m3-implementation.html
// Story 14's out-of-scope note) — plugging those in verbatim would make a
// tier-9/10 fight take many real minutes per prompt, which is a content-
// authoring artifact, not a combat-math one. So each tier gets ONE
// representative line: tiers 1-7 are lifted verbatim from their real bank
// (a line closest to that tier's own average length); tiers 8-10 are the
// real tier's own opening line, truncated at a word boundary to the length
// the tier 1-7 growth curve would predict (~130/170/220 chars) — real prose,
// sane length, so the sanity sweep measures dice/HP/mods, not M6's content
// backlog.
// Tiers 11-14 are M3's stamina passages, far longer than the 1-10 curve
// (content-plan-v2.html §3.5: ~300/700/1275/2000 chars). The sim only needs a
// representative *length* — characters drive typing time — so pad tier 10's
// real prose up to each tier's content target rather than paste 2000-char walls
// inline.
const TIER_10_LINE =
  'The gate to the old dungeon had been sealed for longer than anyone in the village could remember, its iron bars fused with rust and its lock long since seized shut around a keyhole nobody had a key for. Which was,'
const padTo = (base: string, target: number): string => {
  let s = base
  while (s.length < target) s = `${s} ${base}`
  return s.slice(0, target).trimEnd()
}
const REPRESENTATIVE_LINE_BY_TIER: Record<TextTier, string> = {
  1: 'a s d f j k l ;',
  2: 'the goblin is sneaky',
  3: 'the dragon hides in the cave and waits',
  4: 'Careful, that chest might be a mimic.',
  5: 'You need 100 XP to reach the next level.',
  6: "The wizard's spell missed, but the knight's sword found its mark.",
  7: 'The chest sat alone in the torchlight. It looked perfectly ordinary. That was exactly the problem.',
  8: 'There is a particular kind of silence that settles over a dungeon just before something goes wrong, and every adventurer worth',
  9: 'Long before the dungeon had monsters in it, it had simply been a very ambitious wine cellar, built by a merchant who badly overestimated how much wine one household',
  10: TIER_10_LINE,
  11: padTo(TIER_10_LINE, 300),
  12: padTo(TIER_10_LINE, 700),
  13: padTo(TIER_10_LINE, 1275),
  14: padTo(TIER_10_LINE, 2000),
}

export const promptForTier = (tier: TextTier): string => REPRESENTATIVE_LINE_BY_TIER[tier]

// The encounter d20's fumble rule (m3-scope.html#encounter-roll: "damage x0.75
// this fight") — mirrors state/battle-store.ts's own FUMBLE_DAMAGE_MULTIPLIER
// constant. A repeated literal (not re-derived math), same as that file.
const FUMBLE_DAMAGE_MULTIPLIER = 0.75

// A representative "optimizing" ability spread for the sweep: everyone gets a
// serviceable 13 CON (nobody dump-stats survivability) and a 12 INT floor
// (nobody dump-stats *reading*, either — a totally untouched INT would test
// only the "never invest a single point" edge, not a sane baseline), the
// class's favored pair sits at 15/14, and every Ability Score Improvement the
// level has crossed (config/leveling.ts's ASI_LEVELS) dumps its 2 points into
// whichever ability actually governs the equipped weapon's damage. That's
// usually the primary favored ability (Fighter/STR, Rogue/DEX, Wizard/INT),
// but not always — a Bard favors CHA/WIS (m3-scope.html#classes) yet every
// launch weapon its own kit can use (rapier, longbow) reads DEX, so a build
// that blindly maxed CHA would leave its actual damage stat at the floor
// forever. Modeling "invests in what its weapon reads" here, not blind
// favored-stat maxing, is what a sane build looks like — not a claim about
// how an actual 10-year-old spends his points.
export const representativeAbilities = (
  characterClass: CharacterClass,
  level: number,
  weaponAbility?: Ability,
  cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG,
): AbilityScores => {
  const [primary, secondary] = getClass(characterClass).favoredAbilities
  const scores: AbilityScores = { str: 10, dex: 10, con: 13, int: 12, wis: 10, cha: 10 }
  scores[primary] = 15
  scores[secondary] = Math.max(scores[secondary], 14)
  if (weaponAbility) scores[weaponAbility] = Math.max(scores[weaponAbility], 14)
  const asisReached = cfg.asiLevels.filter((asiLevel) => asiLevel <= level).length
  const asiTarget = weaponAbility ?? primary
  scores[asiTarget] += asisReached * ASI_POINTS_PER_LEVEL
  return scores
}

// --- Story 1 (M4/M5 retune): the hit distribution HP is authored against ---
//
// content-plan-v2-tuning.html §8.1: a "reference hit" isn't one number, it's
// a range from a weak roll (min dice, no crit) to a strong roll (max dice +
// crit) that widens with level, and monster HP has to be authored so BOTH
// tails behave (weak doesn't slog, strong never one-shots). This is the
// closed-form companion to simulateCharacterBattles's Monte-Carlo sample —
// same spirit as combat-invariants.ts's expectedAverageHitDamage (an exact
// expectation, not a sampled one), extended to fold in lengthFactor, since
// sizing HP against the served tier's (capped) prompt length is exactly what
// this story tunes. speedBonus is deliberately left out, the same
// simplification docs/content-plan-v2-tuning.html §3's own battle-shape model
// makes ("speed bonus... ignored here — the sim [is what] models [it]") —
// this helper is a theory-only aid for picking a first-pass HP number; the
// real convergence check is re-running content-pipeline/retune-sweep.ts.
// Also deliberately mirrors the CURRENT engine, not Story 3's future crit
// wiring: crit chance is the flat combat.criticalChance (rollIsCrit doesn't
// read critChanceBonus yet — the CLAUDE.md gotcha), so this stays consistent
// with what the sweep actually measures today.
export interface HitMagnitudes {
  weak: number
  average: number
  strong: number
}

export const hitMagnitudes = (
  characterClass: CharacterClass,
  level: number,
  weapon: WeaponConfig,
  tier: TextTier,
  combat: CombatConfig,
  cfg: ModifiersConfig = DEFAULT_MODIFIERS_CONFIG,
): HitMagnitudes => {
  const abilities = representativeAbilities(characterClass, level, weapon.ability, cfg.leveling)
  const character: Character = { name: 'sim', class: characterClass, level, xp: 0, abilities, pendingAsi: 0 }
  const modifiers = resolveModifiers(character, weapon, [], cfg)
  const { damageScale } = cfg.abilities
  const lf = lengthFactor(promptForTier(tier).length, combat)

  const dieAvg = (modifiers.weaponDie + 1) / 2
  const sneakAvg = modifiers.sneakAttackDice * 3.5
  const sneakMax = modifiers.sneakAttackDice * 6
  // Sneak Attack always rides a crit in steady state (isSneakAttack =
  // forceSneakAttack || isCrit — forceSneakAttack only ever fires once, on
  // the fight's first hit), so both the average crit contribution and the
  // strong (crit) tail fold it in; the weak (no-crit) tail never does.
  const critChance = combat.criticalChance
  const avgCritDiceTotal = modifiers.arcaneCritMult * dieAvg + sneakAvg
  const avgDiceTotal = (1 - critChance) * dieAvg + critChance * avgCritDiceTotal
  const strongDiceTotal = modifiers.arcaneCritMult * modifiers.weaponDie + sneakMax

  const scale = (diceTotal: number): number => (diceTotal + modifiers.weaponAbilityMod) * damageScale * lf

  return {
    weak: scale(1),
    average: scale(avgDiceTotal),
    strong: scale(strongDiceTotal),
  }
}

export interface SimulatedCharacter {
  class: CharacterClass
  level: number
  abilities: AbilityScores
  weapon: WeaponConfig
  buffs?: ActiveBuff[]
  // The simulated player's own typing (distinct from the character's D&D
  // stats) — same role as SimulatedPlayer.wpm/accuracy above. Callers
  // typically match this to the target dungeon's own config/dungeon-tiers.ts
  // wpmRange, since that's the game's own "what wpm is this tier built for"
  // signal (m2-scope.html#dungeon-tiers) — a fixed baseline wpm across every
  // tier would make tier 8-10 fights take unplayable real-world minutes.
  wpm: number
  accuracy: number
}

export interface CharacterBalanceSimConfig {
  monster: Monster
  combat: CombatConfig
  character: SimulatedCharacter
  // The dungeon's textTierRange (config/dungeon-tiers.ts) the encounter d20's
  // band resolves against (Story 6/12).
  textTierRange: readonly [TextTier, TextTier]
  battles: number
  seed?: number
  dtMs?: number
  maxTicks?: number
  modifiersConfig?: ModifiersConfig
  encounterRollConfig?: EncounterRollConfig
}

export interface CharacterBalanceResult extends BalanceResult {
  critRate: number
  dodgeRate: number
  bandCounts: Record<EncounterBand, number>
}

// Runs `battles` complete M3 fights for one (character, monster, dungeon)
// matchup: each battle rolls its own encounter d20 (its own rng stream, kept
// independent of the battle's own dice so neither draw sequence can shift
// the other — the same separation of concerns real streams get, e.g.
// DungeonScreen's mimicSenseRng vs. the battle rng), resolves the served
// text tier, then runs the typed fight on the real createBattle/computeDamage
// with every Story 3-11 modifier threaded through exactly as state/
// battle-store.ts's createBattleStore does.
export const simulateCharacterBattles = (config: CharacterBalanceSimConfig): CharacterBalanceResult => {
  const {
    monster,
    combat,
    character,
    textTierRange,
    battles,
    seed = 1,
    dtMs = 50,
    maxTicks = 20000,
    modifiersConfig = DEFAULT_MODIFIERS_CONFIG,
    encounterRollConfig = DEFAULT_ENCOUNTER_ROLL_CONFIG,
  } = config

  const fakeCharacter: Character = {
    name: 'sim',
    class: character.class,
    level: character.level,
    xp: 0,
    abilities: character.abilities,
    pendingAsi: 0,
  }
  const modifiers = resolveModifiers(fakeCharacter, character.weapon, character.buffs ?? [], modifiersConfig)

  const durations: number[] = []
  let wins = 0
  let totalDamageDealt = 0
  let totalHitsLanded = 0
  let critHits = 0
  let dodges = 0
  let monsterAttackAttempts = 0
  const bandCounts: Record<EncounterBand, number> = { low: 0, mid: 0, high: 0 }

  for (let i = 0; i < battles; i += 1) {
    // Two independent streams per battle (encounter d20 vs. the fight itself)
    // so a Luckstone/Guidance's extra encounter-roll draw can never desync
    // the battle's own dice — mirrors the real game keeping separate rng
    // instances per concern (engine/rng.ts's seedFromString doc comment).
    const encounterRng = createRng(seed + i * 2)
    const battleRng = createRng(seed + i * 2 + 1)

    const encounter = rollEncounter(encounterRollConfig, modifiers, encounterRng)
    bandCounts[encounter.band] += 1
    const { servedTier, targetTier } = bandToServedTier(encounter.band, textTierRange)
    const gatePenalty = tierGatePenalty(servedTier, targetTier)
    const noCrits = encounter.fumble
    const fumbleDamageMultiplier = encounter.fumble ? FUMBLE_DAMAGE_MULTIPLIER : 1
    const guaranteedFirstCrit = modifiers.guaranteedFirstCrit || encounter.inspired

    const playerPrompt = promptForTier(servedTier)
    const monsterPrompt = promptForTier(monster.textTier)
    // CHA intimidate (m3-scope.html#ability-mechanics) — same rule as state/
    // battle-store.ts's intimidatedMonster, inlined so this file never
    // imports state/.
    const intimidatedMonster: Monster = {
      ...monster,
      wpm: monster.wpm * Math.max(0.1, 1 - modifiers.intimidateWpmCut),
    }

    const battle = createBattle({
      combat: { ...combat, playerMaxHp: modifiers.maxHp },
      monster: intimidatedMonster,
      playerPrompts: () => playerPrompt,
      monsterPrompts: () => monsterPrompt,
      rng: battleRng,
      tierGatePenalty: gatePenalty,
      weaponDie: modifiers.weaponDie,
      weaponAbilityMod: modifiers.weaponAbilityMod,
      damageScale: abilitiesConfig.damageScale,
      critCount: modifiers.arcaneCritMult,
      guaranteedFirstCrit,
      noCrits,
      fumbleDamageMultiplier,
      dodgeChance: modifiers.dodgeChance,
      secondWind: modifiers.secondWind,
      sneakAttackDice: modifiers.sneakAttackDice,
    })

    const typingTimeMs = expectedTypingTimeMs(playerPrompt.length, character.wpm, combat)
    let elapsedMs = 0
    let nextSubmitAtMs = typingTimeMs
    let lastMonsterEvent: BattleEvent | undefined

    for (let tick = 0; tick < maxTicks && battle.getState().status === 'ongoing'; tick += 1) {
      battle.tick(dtMs)
      elapsedMs += dtMs

      // Monster 'hit'/'dodge' events land on the monster's own attack cadence,
      // not the player's submit cadence, so they're polled every tick (object
      // identity marks a fresh event — see engine/battle.ts's lastEvent).
      const tickEvent = battle.getState().lastEvent
      if (tickEvent && tickEvent !== lastMonsterEvent && tickEvent.side === 'monster') {
        lastMonsterEvent = tickEvent
        if (tickEvent.kind === 'hit' || tickEvent.kind === 'dodge') {
          monsterAttackAttempts += 1
          if (tickEvent.kind === 'dodge') dodges += 1
        }
      }

      if (elapsedMs >= nextSubmitAtMs) {
        const currentPrompt = battle.getState().player.prompt
        const isHit = battleRng.next() < character.accuracy
        const hpBefore = battle.getState().monster.hp
        battle.submitPlayerAttack(isHit ? currentPrompt : 'x'.repeat(currentPrompt.length))
        const hpAfter = battle.getState().monster.hp
        const submitEvent = battle.getState().lastEvent
        if (hpBefore > hpAfter) {
          totalDamageDealt += hpBefore - hpAfter
          totalHitsLanded += 1
          if (submitEvent?.side === 'player' && submitEvent.kind === 'hit' && submitEvent.isCrit) {
            critHits += 1
          }
        }
        nextSubmitAtMs = elapsedMs + battleRng.sample(typingTimeMs, combat.typingVariance)
      }
    }

    if (battle.getState().status === 'won') wins += 1
    durations.push(elapsedMs)
  }

  const avgDamagePerHit = totalHitsLanded > 0 ? totalDamageDealt / totalHitsLanded : 0

  return {
    winRate: wins / battles,
    medianDurationMs: median(durations),
    hitsToKill: avgDamagePerHit > 0 ? monster.hp / avgDamagePerHit : Infinity,
    critRate: totalHitsLanded > 0 ? critHits / totalHitsLanded : 0,
    dodgeRate: monsterAttackAttempts > 0 ? dodges / monsterAttackAttempts : 0,
    bandCounts,
  }
}

// --- Shared sweep fixtures ---------------------------------------------------
//
// Both balance.test.ts's metrics table and combat-invariants.ts's sweeps read
// off the same "what does a tier-appropriate hero look like" fixtures, so
// they're defined once, here.

// A dungeon's own wpmRange midpoint stands in for "a typist who just arrived
// at this tier" (config/dungeon-tiers.ts) — a flat baseline wpm across every
// tier would make an endgame fight's expected typing time (and thus its
// simulated duration) balloon unrealistically, since the whole game assumes
// real typing speed climbs alongside the character (this IS a typing
// trainer).
export const wpmForTier = (tier: number): number => {
  const dungeonTier = DUNGEON_TIERS.find((candidate) => candidate.tier === tier)
  if (!dungeonTier) throw new Error(`Unknown dungeon tier: ${tier}`)
  return Math.round((dungeonTier.wpmRange[0] + dungeonTier.wpmRange[1]) / 2)
}

export const textTierRangeForTier = (tier: number): readonly [TextTier, TextTier] => {
  const dungeonTier = DUNGEON_TIERS.find((candidate) => candidate.tier === tier)
  if (!dungeonTier) throw new Error(`Unknown dungeon tier: ${tier}`)
  return dungeonTier.textTierRange
}

// A sensible gear-up path per class: start on the class's own starting
// weapon (config/classes.ts), move to the best same-governing-ability weapon
// once a few levels in. Wizard has no upgrade path — the wand is the only
// INT weapon in the launch catalog (m3-scope.html#weapons: "the framework
// holds any number; the launch set is deliberately small"); Bard keeps its
// starting rapier for the same reason (no CHA weapon exists at all — see
// representativeAbilities's doc comment on why DEX, not CHA, governs its
// damage).
export const weaponForTierLevel = (characterClass: CharacterClass, level: number): WeaponConfig => {
  if (characterClass === 'fighter') return getWeapon(level >= 5 ? 'warhammer' : 'longsword')
  if (characterClass === 'wizard') return getWeapon('wand')
  if (characterClass === 'rogue') return getWeapon(level >= 5 ? 'rapier' : 'dagger')
  return getWeapon('rapier') // bard
}

export const cheapestRegularOf = (tier: number): Monster => {
  const regulars = [...byRole(tier, 'regular')].sort((a, b) => a.hp - b.hp)
  const [cheapest] = regulars
  if (!cheapest) throw new Error(`No regular monster for tier ${tier}`)
  return cheapest
}

export const bossOf = (tier: number): Monster => {
  const [boss] = byRole(tier, 'boss')
  if (!boss) throw new Error(`No boss for tier ${tier}`)
  return boss
}
