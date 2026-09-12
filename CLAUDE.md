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
| The pitch, principles, doc index | [`docs/index.html`](docs/index.html) |
| How docs are named/organized, and how to open or close a feature's docs | [`docs/conventions.html`](docs/conventions.html) |
| Where the project is, what's next, one-liners into every finished milestone | [`docs/roadmap.html`](docs/roadmap.html) |
| Combat math, HP/timers, damage formula, abilities & D&D leveling | [`docs/game-design.html`](docs/game-design.html) |
| Text tiers, monster roster, content pipeline as it runs today | [`docs/content.html`](docs/content.html) |
| Stack, data model, persistence, hosting | [`docs/architecture.html`](docs/architecture.html) |
| **The map of the code** — tree, layers, seams, "where do I change X?" | [`docs/codebase-architecture.html`](docs/codebase-architecture.html) |
| Palette, type, layout, keyboard system every screen shares | [`docs/visual-spec.html`](docs/visual-spec.html) |
| Every shipped screen's layout, states, interactions | [`docs/screens.html`](docs/screens.html) |
| The visual spec's values, machine-readable | [`docs/design-tokens.json`](docs/design-tokens.json) |
| What's being built now, or the rationale behind a past feature (PRDs) | [`docs/prds/index.html`](docs/prds/index.html) |
| Screens/flows for a feature that added or reshaped one (wireframes) | [`docs/wireframes/index.html`](docs/wireframes/index.html) |
| The active plan's story order, or any finished plan | [`docs/plans/index.html`](docs/plans/index.html) |
| A gotcha someone already hit | [`docs/notes/index.html`](docs/notes/index.html) |

### Active work

The plan that's currently open lives under [`docs/plans/index.html`](docs/plans/index.html)'s wip table; the
[roadmap](docs/roadmap.html#where) is the single source of truth for **which milestone is live** and links
straight to that plan (and its PRD, if it has one). When starting work, follow the active plan's story order.
Every finished milestone's PRD, plan, and wireframes live under the matching `done/` directories, indexed the
same way — that's where worked examples of the doc types live.

## Working rules (non-negotiable)

- **One story = one commit, with a check-in between. Never batch.** Implement, verify, commit, stop, wait.
- **Before any _code_ commit, this must be clean:** `npm run lint` + `tsc` (`npm run build`) + `npm run test`
  (all bundled as `npm run presubmit`). Docs-only commits skip this gate.
- **Verify UI visually, not just via tests.** Match [`docs/visual-spec.html`](docs/visual-spec.html),
  [`docs/screens.html`](docs/screens.html), [`docs/design-tokens.json`](docs/design-tokens.json), and the
  relevant page in [`docs/wireframes/index.html`](docs/wireframes/index.html) exactly. Dev server:
  `npm run dev` → `http://127.0.0.1:5173/` (also serves `/docs/...`). Humans open docs straight from disk via
  `file://`; agent browser tools can't — they need the dev server and `http://127.0.0.1:5173/docs/...` (see
  [the note on why](docs/notes/20260912-nbutko-agent-browser-no-file-urls.html), which also explains why an
  HTTP-based link check proves nothing here).
- **A feature's last commit is the docs commit.** Reconcile its plan (tick tasks actually done), add/update its
  banner, `git mv` the PRD/wireframes/plan to `done/`, move their index rows, update any evergreen doc the
  feature touched, and add a note if it surfaced a gotcha worth not re-learning. Full checklist:
  [`docs/conventions.html`](docs/conventions.html) §11.
- **Commit only when asked.** Branch first if on `main`. Commit messages end with the `Co-Authored-By:` trailer
  the current session's harness provides (it names the model in use); never hard-code a model name here.
- **Favor simple over scalable.** One kid, one device — "works great for him today" beats "scales to a thousand
  users." No accounts, no backend, no router library.

## Architecture invariants (breaking these is how the code rots)

- **The combat `engine/` never imports React.** Pure, headless, unit-tested.
- **Combat math (`engine/battle.ts`, `damage.ts`, `monster-typing.ts`) never imports the save, and the save
  never reaches into combat math except through `resolveModifiers()`** (`engine/character/modifiers.ts`) —
  the one pure function that turns save data into the `PlayerModifiers` object a battle consumes. **Grow this
  seam; don't route around it** — it's why milestones stay additive. (The save *does* call other
  `engine/character/` functions directly — `leveling.ts`'s XP/level-up math, `create.ts`, `ability-roll.ts` —
  but that's character-progression logic kept headless for testability, not combat math.) See
  [`docs/codebase-architecture.html`](docs/codebase-architecture.html#seam) for the full shape, and the
  [M3 plan](docs/plans/done/20260705-nbutko-m3-character-sheet.html) for how this seam replaced M2's
  `engine/progression/skill-effects.ts`.
- **State is classified by lifetime** (see [`docs/codebase-architecture.html#state`](docs/codebase-architecture.html#state)):
  _persistent_ (save → IndexedDB), _ephemeral run_ (the dungeon-run store, **never** persisted — persisting it
  would let a player quit-to-dodge a wipe), and _simulation_ (the battle store). Don't move state across homes.
- **`src/config/combat.ts` stays at its committed values.** Retuning is a deliberate, reviewed change, not a
  drive-by.
- **Prove engine/data logic headlessly (tests + `engine/sim/` harnesses) _before_ the UI that consumes it.**

## Gotchas / good-to-knows

Traps and non-obvious behavior that aren't part of the architecture above live one-per-file in
[`docs/notes/index.html`](docs/notes/index.html), not here. Read the index's "relevant when" column before
touching save migrations, the PWA, the deploy, IndexedDB, class balance, or anything else that sounds like it
might already have a note — a stale itemized list here would just be one more thing to keep in sync.

## Memory & context

There is a persistent auto-memory at `~/.claude/projects/-Users-nb-Documents-dnt/memory/` (indexed by
`MEMORY.md`) holding the maintainer's personal preferences and workflow feedback across sessions — it's loaded
automatically, so check it for standing preferences before asking. Repo knowledge (gotchas, traps, "why is this
weird") lives in [`docs/notes/`](docs/notes/index.html) instead, where every author's agents can see it.
