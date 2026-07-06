// The transient "juice" overlays wireframe turn 8 asks for — a floating
// damage/crit number and labeled reaction flashes ("Dodged!", "Second Wind!",
// "Sneak Attack!"). Pure presentation, driven entirely by props: BattleScreen
// owns *when* one exists (mounts it on a fresh battle event, unmounts it
// after FLASH_DURATION_MS) and *where* it sits (via `className`/style on the
// wrapping absolutely-positioned container); this component only ever draws
// what it's handed and plays the float+fade animation. No mid-typing input —
// these are read-only reactions to engine events (m3-scope.html#ability-mechanics).

export type FlashVariant = 'crit' | 'hit' | 'dodge' | 'second-wind' | 'sneak-attack'

interface VariantStyle {
  textClass: string
  glow: string
}

// Palette lifted from tokens.json + the wireframe: green for the good-
// surprise family (crit/second-wind/sneak-attack), blue for dodge, gold for
// an ordinary hit number — never the danger-red family, which is reserved
// for the monster's own HP bar/panel.
const VARIANT_STYLES: Record<FlashVariant, VariantStyle> = {
  crit: { textClass: 'text-[#9cf07c]', glow: '0 0 12px #7ac96a' },
  hit: { textClass: 'text-accent-gold-bright', glow: '0 0 8px #e8c76699' },
  dodge: { textClass: 'text-[#8fd0e8]', glow: '0 0 8px #8fd0e8' },
  'second-wind': { textClass: 'text-[#7ac96a]', glow: '0 0 8px #7ac96a' },
  'sneak-attack': { textClass: 'text-[#9cf07c]', glow: '0 0 8px #7ac96a' },
}

export interface FlashProps {
  text: string
  variant: FlashVariant
  // The small mono pill under the headline text (wireframe 8a's "🎲 d8→7 ×2")
  // — e.g. the dice breakdown for a damage number.
  sublabel?: string
  className?: string
}

const Flash = ({ text, variant, sublabel, className = '' }: FlashProps) => {
  const style = VARIANT_STYLES[variant]
  return (
    <div
      className={`pointer-events-none z-10 animate-flash-float text-center font-display font-bold ${style.textClass} ${className}`}
      style={{ textShadow: `${style.glow}, 0 2px 4px rgba(0,0,0,0.6)` }}
    >
      <div>{text}</div>
      {sublabel && (
        <div className="mt-1 inline-block rounded-full border border-accent-gold-bright bg-bg-deep/80 px-2 py-0.5 font-mono text-[10px] font-normal text-accent-gold-bright">
          {sublabel}
        </div>
      )}
    </div>
  )
}

export default Flash
