# Handoff: Dungeons & Typing — Battle, Map, Dungeon &amp; Inn Screens

## Overview
Four screens for the "Dungeons & Typing" typing-combat game (a monster-battle typing trainer): the
battle screen (M0/M1), the world map (M2), a dungeon's branching-path view (M2), and the Inn's skill-tree
spending screen (M2, since retired — see below). All four share one D&D-inspired visual language: dark
parchment/dungeon palette, gold accents, Cinzel display type, JetBrains Mono for anything the player is
actually typing/reading against a clock.

M3 (the D&D character layer) added five more screens/components on top of that same visual language —
character creation, the Inn's two new tabs, the Shop, the encounter-d20 modal, and the dungeon map's Bag —
described in **"M3 screens"** below. Their source wireframes are in
[`m3-wireframes.html`](m3-wireframes.html) (frozen, the original proposal); this doc folds in what actually
shipped, which sometimes diverges in a small detail (noted inline).

## About the Design Files
The bundled HTML is a **design reference built as an exploratory wireframe/mock deck**, not production code —
several screens show 2–3 alternative layouts side by side for comparison. It is not meant to be copied
directly into the app. The task is to **recreate the chosen screens in the target codebase's actual stack**
(per the project's own architecture doc: Vite + React + TypeScript + Tailwind) using its existing patterns —
component structure, state management, and build tooling — not to embed this HTML as-is.

**Which options are canonical** (the rest are rejected alternates, kept only for context):
- Battle screen → option **2a** ("Vertical Duel") — 2b and 2c were alternatives, not chosen.
- World map → option **3a**.
- Dungeon branch graph → option **3b**.
- Inn / skill tree → option **4a**.

## Fidelity
**Mixed, closer to low-fidelity-plus:** colors, typography, and component layout are final/intentional and
safe to implement as specified below. Exact pixel positions in the dungeon-graph SVG (3b) are illustrative
for one example run, not a layout algorithm — the real graph is procedurally generated per the game-design
spec (see Files). Copy text (monster names, numbers) is placeholder/example data, not final content.

## Screens / Views

### 1. Battle screen (direction 2a — "Vertical Duel")
**Purpose:** the core combat loop — player types a prompt to attack while the monster "types" its own
prompt on its own clock, in real time.
**Layout:** single centered panel, max-width 1040px, vertical stack: title → monster panel → divider →
player panel (which contains HP, prompt/input/countdown, and the on-screen keyboard).
- Outer frame: `border: 3px solid #7a5a22`, plus a 1px inset outline offset 8px in (double-border look),
  padding 28px, background `radial-gradient(ellipse at 50% 0%, #2a1710 0%, #140b07 65%)`.
- Monster panel: `border-radius: 8px`, `border: 2px solid #7a5a22`, background
  `linear-gradient(180deg, #3b1220, #2a0d17)`, padding `16px 20px`. Contains: name (Cinzel 15px, `#e8c766`,
  letter-spacing .06em), HP readout (JetBrains Mono 12px, `#c98d8d`), HP bar (14px tall, 7px radius, track
  `#1c0b0e` w/ `1px solid #5a2020`, fill `linear-gradient(90deg,#8b2020,#c94b4b)`), and the monster's
  live-typed text box (JetBrains Mono 16px, correct chars `#ede1c3`, a wrong char shown in `#e05a5a` with a
  wavy underline, untyped remainder dimmed `#6a5a4a`).
- Divider: centered "VS" between two gold diamonds (`8×8px div rotated 45deg, background:#c9a227`) with
  fading horizontal rules either side.
- Player panel: same shape as monster panel, gold family instead of red — background
  `linear-gradient(180deg,#241f3d20,#1a1226)`, HP fill `linear-gradient(90deg,#8a6a1a,#e8c766)`.
  Below HP: a row with (a) the prompt/input block — target prompt shown dimmed above, live input echoed
  below with a blinking-caret span (`border-right:2px solid #e8c766`) — and (b) a fixed 64px-wide countdown
  column (Cinzel 22px `#e8c766` number + "sec left" caption, JetBrains Mono 10px uppercase `#a89a7a`).
- Keyboard: full 5-row QWERTY. Base key `34×32px`, `4px` radius, `1px solid #4a3a18`,
  background `rgba(237,225,195,.06)`. Row 1 ends in a wide Backspace key; row 3 ends in a wide Enter key;
  row 4 has Shift keys either side; row 5 is the space bar. See **Keyboard states** below for the only 3
  states that ever apply color.

**Keyboard states** (mutually exclusive, computed from `prompt` + `input`):
| State | Trigger | Styling |
|---|---|---|
| On track | `input === prompt.slice(0, input.length)` | Next key: solid `#e8c766` bg, dark text, `box-shadow:0 0 10px #e8c76699`. +1 key: `rgba(232,199,102,.55)`. +2 key: `rgba(232,199,102,.3)`. All else: base key. |
| Off track | a wrong char anywhere in input, or input longer than prompt | Only Backspace gets the "next key" solid-gold treatment; every other key (incl. letters) drops to base/neutral. |
| Complete | `input === prompt` | Only Enter gets the "next key" solid-gold treatment; all else neutral. |

### 2. World map (option 3a)
**Purpose:** the post-battle hub — launch point for dungeons, the Inn, and the (locked) Shop.
**Layout:** same outer frame styling as the battle screen. Below the "World Map" title: a flex row —
a fixed 168px-wide left column (Inn card above Shop card, stacked, 14px gap) and a flex:1 horizontally
scrolling trail of 11 dungeon-tier cards connected by a dashed gold line.
- Inn card: `border:2px solid #c9a227`, background `#1c1608`, glow `box-shadow:0 0 12px #c9a22766`. Always
  in the "available" visual treatment (never locked).
- Shop card: `border:1px dashed #5a4a30`, background `rgba(40,34,24,.5)`, `opacity:.6`. Always locked
  through all of M2 — label "Coming soon."
- Tier trail: a `position:relative` scroll container; a horizontal dashed line
  (`repeating-linear-gradient(90deg,#7a5a22 0 8px,transparent 8px 16px)`, 2px tall) sits behind 11 tier
  cards (76×92px, 8px radius, 36px gap between them).
- Tier card states — **cleared**: background `linear-gradient(160deg,#4a3a12,#2a1f08)`, border
  `2px solid #c9a227`, glow, plus a small gold "✓" badge (18px circle) at the top-right corner.
  **available**: background `#1c1608`, border `2px solid #e8c766`, glow. **locked**: background
  `rgba(40,34,24,.5)`, `1px dashed #5a4a30`, `opacity:.55`, and a small 2-shape padlock (a bordered arc +
  a filled rect) centered above the habitat name instead of a checkmark.
- The 11 tiers in order (habitat / tier number) come straight from the M2 scope doc's tier table: Grassland
  (1), Forest (2), Hill (3), Coastal (4), Desert (5), Swamp (6), Mountain (7), Arctic (8), Underdark (9),
  Underwater (10), Urban (11).
- Legend row at the bottom explains the three card states with small color swatches.

### 3. Dungeon branch graph (option 3b)
**Purpose:** inside a dungeon — shows the generated branching path from entrance to boss so the player can
choose which available fight to take next.
**Layout:** header (dungeon name + one-line status, e.g. "Path A cleared → Waypoint now available") plus a
hearts readout (`♥`/`♡` glyphs, Cinzel 20px, filled `#c94b4b`, empty at `opacity:.35`) top-right. Below:
a horizontally-scrollable `position:relative` canvas (1230×460px in the example) containing one absolutely
positioned `<svg>` line layer (z-index 0) and absolutely positioned node `<div>`s on top (z-index 1,
positioned via `left/top` + `transform:translate(-50%,-50%)`).
- **Structure:** Entrance (diamond) → 2–4 parallel early paths of 2–4 nodes each → Waypoint (single,
  larger node) → 2–4 parallel late paths of 3–5 nodes each → Approach (single, larger node) → Boss
  (largest node, red family). 3–5 treasure-chest nodes hang as dead-end diamond spurs off regular path
  nodes (never off Waypoint/Approach). Chests are visually **identical** whether real or mimic — never
  style one differently, that would leak information to the player.
- **Node shapes:** regular fight = circle 40px. Entrance = 34px diamond (rotated-45° square). Waypoint/
  Approach = 56px circle with a double ring (`box-shadow:0 0 0 4px rgba(201,162,39,.25)` in addition to the
  border). Boss = 64px circle, red-tinted even while locked (`rgba(80,20,20,.35)` bg, `#6a2a2a` dashed
  border) to read as "the big one" regardless of state. Chests = 22px diamond.
- **Node states** — reuse the exact same 3-state color language as the world map tiers (cleared = gold
  radial fill + gold border + glow; available = dark bg + gold border + glow, no fill; locked = dim +
  dashed border + `opacity:.55`). No separate visual language needed per screen.
- **Edge lines:** solid `#e8c766` 2px when the edge leads to a cleared or available node (i.e., it's
  currently walkable); dashed `#5a4a30` 2px (`stroke-dasharray:5,5`) when it leads to a locked node.
- Legend row at bottom repeats the 3 node states plus the chest swatch.

### 4. Inn — skill tree (option 4a) — RETIRED in M3
**Historical:** the M2 skill tree this section describes was replaced in M3 by the Inn's Rest & Sheet + Armory
tabs (see **M3 screens** below) — XP is no longer a spendable currency. Kept here for the record of what M2
shipped; the palette/type/shape language it establishes still applies to the M3 screens that replaced it.

**Purpose:** spend accumulated XP on the 5 skill-tree branches; each branch is a strictly sequential chain
(must buy node *n* before node *n+1* unlocks).
**Layout:** header bar (back-to-map link, "The Inn — Skill Tree" Cinzel title, XP + coin pill readouts on
the right) above 5 equal branch columns (190px wide, `2px solid #7a5a22` border, 8px radius, background
`rgba(59,18,32,.25)`), laid out with `flex-direction:column-reverse` inside each so the cheapest node sits
at the bottom and the tree visually "grows" upward.
- Branch order/node counts: **Endurance** (4 nodes: +20 HP, +20 HP, +1 heart, +1 heart), **Wordsmith**
  (5 nodes: unlock text tiers 2/4/6/8/10), **Focus** (3 nodes, illustrative: +10%/+20%/+35% time limit),
  **Luck** (3 nodes, illustrative: +3%/+3% crit chance, +25% crit damage), **Utility** (3 nodes: +1
  power-up slot each). Focus/Luck/Utility node counts and exact percentages are illustrative — not yet
  spec'd numerically in the design docs — flag these for the numbers pass.
- Node states, same 3-tier language as the other screens: **purchased** (gold radial fill, gold border,
  "✓"), **buyable now** (dark bg, gold border + glow, shows its XP cost as the node's label — e.g. "180" —
  and should be tappable/clickable), **locked** (dim, dashed border, `opacity:.55`, shows "?" instead of a
  cost). Only ever one buyable node per branch at a time (the next node after the highest purchased one).
- Vertical connector between nodes: 2px wide, `#c9a227` solid if both nodes it joins are purchased (or the
  lower is purchased and upper is buyable), `#5a4a30` if leading into a locked node.

## M3 screens (shipped, current)
Five more screens/components joined the four above once the D&D character layer landed. All reuse the same
palette/type/shape system (gold family = player-facing/progress, red = danger; Cinzel display, EB Garamond
body, JetBrains Mono for anything typed/read-against-a-clock, `#e8c766`/`#c9a227` gold, 8px panel radius) —
nothing below introduces a new hue family. Source proposal: `m3-wireframes.html` turns 1–8 (frozen); this is
what actually shipped.

### 5. Character creation
**Purpose:** the screen a fresh (or freshly-migrated) save is gated behind before the world map — roll
abilities, pick a class, name the hero. **Layout:** a title, a 4d6-drop-lowest ability roller (six dice, up to
2 rerolls of the whole set, a 500ms tumble animation shared with the encounter d20's `Die` component), a class
picker and a name field side by side below a divider, then "Begin Adventure →" (gold gradient button,
`linear-gradient(180deg,#e8c766,#c9a227)`) into a one-screen confirm/summary card with a "↩ Reroll everything"
escape hatch. Every field starts pre-filled with a valid random default, so mashing the confirm button twice
produces a complete, playable hero.

### 6. The Inn — Rest & Sheet / Armory tabs
**Purpose:** replaces the M2 skill tree (§4 above, retired). Two tabs via the shared `Tabs` component:
- **Rest & Sheet:** a Rest panel (restore hearts/HP) beside the character sheet (abilities, level, XP-to-next-
  level bar, proficiency bonus, an "Improve" button that opens the Ability Score Improvement panel whenever
  `pendingAsi > 0`).
- **Armory:** equip one weapon at a time from owned inventory; shows each weapon's die/ability/crit range.

Header keeps the battle screen's title treatment (Cinzel, uppercase, `.12em` tracking, `text-accent-gold-bright`)
plus a `StatusReadout` (XP/coins/hearts) on the right, matching the World Map/Shop header pattern.

### 7. The Shop
**Purpose:** spend coins on consumables (restock every visit) and weapons (one-off buys) — the sink XP's
leveling redirect left coins needing. **Layout:** header (back-to-map, title, coin `ResourcePill`), an optional
CHA/Bard discount-or-markup banner (green `#a8c98d`/`rgba(58,90,42,.15)` border when discounted, red
`#c98d8d`/`rgba(139,32,32,.15)` when marked up), then a 2-column body: a 3-wide consumables card grid on the
left, a weapon-rack list (`ShopItem` in `row` layout, greys out with "owned" once bought) on the right.

### 8. The encounter d20 modal
**Purpose:** every fight's pre-clock d20 roll (m3-scope.html#encounter-roll) — reuses the base `EncounterModal`
non-dismissable reveal pattern from M2 (mimic/chokepoint reveals), now with a rolled/tumbling `Die` (the same
projected-icosahedron SVG component the character-creation ability roller uses) plus a total/breakdown line, a
band-result panel, and a 5-cell fumble/low/mid/high/inspired ladder highlighting the landed band. Die palette by
result: **gold** (`outline #e8c766`) for an ordinary landed roll, **green** (`outline #9cf07c`, faces `#368349`
family) for an Inspired nat-20, **red** (`outline #ff9a9a`, faces `#872a2a` family) for a Fumble nat-1. A Bard's
"🎵 Reroll" button appears once per dungeon when available; "Begin Battle →" is autofocused so Enter fires it
without hunting for the mouse.

### 9. The Bag
**Purpose:** an expandable drawer over the dungeon map for using an owned consumable before a fight — a
`🎒 Bag (N)` pill button (`border/color #e8c766`, glow `0 0 8px #e8c76644`) that opens a 300px dropdown panel
(`border #e8c766` on `#1a0f0a`) listing owned items with a one-line mechanical effect summary and a "Use" button
(same gold-gradient treatment as Character Creation's confirm button). Deliberately collapsed by default and
closed again the instant a dungeon node is selected, so it can't be left open mid-fight-prep.

## Interactions &amp; Behavior
- **Battle:** input is local component state; Enter only submits once `input.length === prompt.length`
  (shorter input treats Enter as a literal character, for prompts containing inline line breaks). Exact
  match → hit; anything else → miss; next prompt starts immediately either way. Keyboard highlight state
  recomputes on every keystroke from `prompt` + `input` (pure function, no stored state of its own).
- **World map:** tapping an unlocked-or-cleared tier card navigates into that dungeon's branch graph
  (regenerated fresh each visit). Tapping the Inn opens the skill tree. The Shop is inert (shows a "coming
  soon" message) for all of M2.
- **Dungeon graph:** tapping an "available" node starts that fight. Winning marks the node "cleared" and
  makes its immediate downstream neighbor(s) "available." Losing resets that monster's HP and leaves the
  node "available" (not cleared) and costs one heart. Hitting 0 hearts discards the entire dungeon run and
  returns to the world map at the Inn; the dungeon regenerates a new random layout on the next visit.
  Opening a chest node is a plain reward if it's the real one, or a fight (same rules as any monster) if
  it's a mimic.
- **Inn skill tree:** tapping a "buyable" node spends XP and immediately flips it to "purchased," which
  reveals the next node in that branch as "buyable" (if affordable) or leaves it locked-but-visible if the
  player can't yet afford it — cost is always shown even when unaffordable, just not tappable.

## State Management
- **Battle:** per the M0 implementation plan, battle state (HP, prompts, countdowns, monster's live-typed
  string) lives in a plain-TS engine outside React, read via `useSyncExternalStore` — not component state,
  since it updates many times/second. Local component state is only the player's in-progress `input` string
  and which screen is showing.
- **Save/progression** (map unlock state, the character — class/level/XP/abilities, coins, equipped weapon +
  owned inventory, hearts.max): persistent, once-per-action-frequency — Context + `useReducer` backed by
  IndexedDB, per the architecture doc. The in-progress dungeon graph, its cleared/available/locked node states,
  hearts *remaining*, and — since M3 — any active consumable buff are explicitly **not** persisted across
  sessions; they live in the ephemeral dungeon-run store instead. Closing mid-dungeon should behave the same as
  voluntarily leaving.

## Design Tokens
See `tokens.json` in this folder for the full machine-readable set. Summary:
- **Color:** bg `#140b07`; player-side panel `#1c1608`; monster-side panel `#2a0d17`/`#3b1220`; border gold
  `#7a5a22` (dim `#4a3a18`); accent gold `#c9a227` / bright `#e8c766`; danger `#8b2020` / bright `#c94b4b`;
  text `#ede1c3` / dim `#a89a7a`. One hue family per "side" (gold = player/progress, red = monster/danger) —
  never mix them.
- **Type:** Cinzel (500/700) for all display/headers/labels; EB Garamond (400/400italic) for incidental
  body copy; JetBrains Mono (400/500/700) for anything the player is typing, reading against a clock, or
  any numeric readout (HP, XP, costs, timers) — never substitute this one, it's the legibility-critical font
  in the whole app.
- **Shape language:** 8px radius on panels/cards, fully round circles for tree/graph nodes, 45°-rotated
  squares for diamonds (entrance/chests), all built from CSS gradients/borders/box-shadows — no bitmap or
  SVG icon art anywhere in these 4 screens except the dungeon-graph's line layer (which is structural, not
  iconographic).

## Assets
No image assets. Two Google Font families beyond the base pairing (Cinzel, JetBrains Mono) plus EB Garamond
for body copy — all free/open-license, loaded via a standard Google Fonts `<link>`, no local font files.
Padlock and checkmark are drawn from plain divs / a Unicode "✓" glyph, not icon images.

## Files
- `M0 Wireframes.dc.html` — the full wireframe deck (all screens, including rejected alternates 2b/2c).
  Open in a browser to see every option; treat only 2a/3a/3b/4a as canonical (see "Which options are
  canonical" above).
- `visual-spec.html` — written spec for the battle-screen palette/type/layout/keyboard-states (a subset of
  what's restated more completely above).
- `tokens.json` — machine-readable color/font/layout/keyboard-state values.
