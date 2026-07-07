# Dungeons & Typing (`dnt`)

A monster-battle **typing trainer** for one specific 10-year-old, played on his Chromebook. The player and each
monster race their own line of text against their own clock; type yours correctly in time and you land a hit.
Win battles → earn coins/XP → level up a D&D character → buy gear → fight harder dungeons. It's a solo side
project for one kid, **not** a product for the world.

> **Read the docs before spelunking the code.** Almost every "how/why" question is already answered in `docs/`.
> Only dig through source when a question is genuinely unanswerable from the resources below.

## Start here

| If you need… | Open |
| --- | --- |
| **The map of the code** — tree, layers, seams, "where do I change X?" | [`docs/codebase-architecture.html`](docs/codebase-architecture.html) |
| The pitch, principles, doc index | [`docs/index.html`](docs/index.html) |
| Build order & milestones (M0–M6) | [`docs/roadmap.html`](docs/roadmap.html) |
| Combat math, HP/timers, damage formula | [`docs/game-design.html`](docs/game-design.html) |
| Stack, data model, persistence, hosting | [`docs/architecture.html`](docs/architecture.html) |
| Text tiers, monster roster, content sourcing | [`docs/content-plan.html`](docs/content-plan.html) |

### Milestone docs

Each milestone has a **scope** (what) and an **implementation plan** (how) under `docs/`. The
[roadmap](docs/roadmap.html) is the single source of truth for **which milestone is active** — check it rather
than trusting a hard-coded "current" note here. When starting work in a milestone, follow its implementation
plan's story order. **M3 is done; M4 (shipping it — hosting + PWA) is next.**

- **M0** — combat-math spike: [m0-implementation](docs/m0-implementation.html)
- **M2** — progression loop (map, dungeons, hearts, the Inn):
  [m2-scope](docs/m2-scope.html) + [m2-implementation](docs/m2-implementation.html) (its tail holds the
  post-playtest feedback logs)
- **M3** — the D&D character layer (abilities, leveling, two dice, weapons, consumables, the Shop) — **shipped**:
  [m3-scope](docs/m3-scope.html) + [m3-implementation](docs/m3-implementation.html) +
  [wireframes](docs/design/m3-wireframes.html)

## Working rules (non-negotiable)

- **One story = one commit, with a check-in between. Never batch.** Implement, verify, commit, stop, wait.
- **Before any _code_ commit, this must be clean:** `npm run lint` + `tsc` (`npm run build`) + `npm run test`
  (all bundled as `npm run presubmit`). Docs-only commits skip this gate.
- **Verify UI visually, not just via tests.** Match [`docs/design/`](docs/design/) exactly — the
  [wireframes](docs/design/m3-wireframes.html), [`visual-spec.html`](docs/design/visual-spec.html),
  [`README.md`](docs/design/README.md), and [`tokens.json`](docs/design/tokens.json). Dev server:
  `npm run dev` → `http://127.0.0.1:5173/` (also serves `/docs/...`; `file://` URLs are blocked by the browser
  tools).
- **Commit only when asked.** Branch first if on `main`. Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Favor simple over scalable.** One kid, one device — "works great for him today" beats "scales to a thousand
  users." No accounts, no backend, no router library.

## Architecture invariants (breaking these is how the code rots)

- **The combat `engine/` never imports React.** Pure, headless, unit-tested.
- **The persistent save never imports combat; combat never imports the save.** They meet at exactly **one** pure
  function, `resolveModifiers()` (`engine/character/modifiers.ts` as of M3; retired M2's `engine/progression/
  skill-effects.ts`). It turns save data → a `PlayerModifiers` object the battle consumes. **Grow this seam; don't
  route around it** — it's why milestones stay additive.
- **State is classified by lifetime** (see the architecture doc): _persistent_ (save → IndexedDB), _ephemeral run_
  (the dungeon-run store, **never** persisted — persisting it would let a player quit-to-dodge a wipe), and
  _simulation_ (the battle store). Don't move state across homes.
- **`src/config/combat.ts` stays at its committed values.** Retuning is a deliberate, reviewed change, not a
  drive-by.
- **Prove engine/data logic headlessly (tests + `engine/sim/` harnesses) _before_ the UI that consumes it.**

## Gotchas / good-to-knows

- **Save migrations are brittle:** `domain/save.ts` hard-codes the version literal (now `3`) and `isSaveData()`
  requires an exact match; `migrate()` wipes anything unrecognized (it knows one real migration, v2 → v3, which
  drops the retired `skillTree` and sets `character: null` so the player is routed through creation once). Bump
  the version _and_ write a real migration when the shape changes again, or existing saves silently reset.
- **A known pending wiring gap, not a design decision:** DEX's `critChanceBonus`, a weapon's `critRange`, and a
  crit-boost item's `critDamageMult` are all computed into `PlayerModifiers` (`engine/character/modifiers.ts`)
  but `engine/damage.ts`'s `rollIsCrit`/`computeDamage` never read them — crit chance today is still the flat
  `combat.criticalChance`, unchanged since M0. Don't assume raising DEX or swapping to a wider-crit-range weapon
  currently does anything to crit odds.
- **Battle is not a top-level screen** — it launches _inside_ `DungeonScreen` so the ephemeral run stays mounted,
  and returns via an `onResult` callback.
- **Tuning knobs are deferred to M5 on purpose.** Per-point magnitudes ship as placeholders (M3 corrals them into
  `config/abilities.ts` + `config/leveling.ts`); don't treat placeholder numbers as tuned.
- **`stats.battlesLost` is still dead** — in the save shape, never written by any reducer action (unlike
  `stats.bestWpm`, `powerUpMultiplier`, and `dungeon-tiers.ts`'s `textTierRange`, all lit up in M3).
- `docs/monster-manual.json` is canonical monster names/CRs reference data (not shipped code).

## Memory & context

There is a persistent auto-memory at `~/.claude/projects/-Users-nb-Documents-dnt/memory/` (indexed by
`MEMORY.md`) capturing user context, workflow feedback, and milestone status across sessions. It's loaded
automatically — check it for standing preferences before asking.
