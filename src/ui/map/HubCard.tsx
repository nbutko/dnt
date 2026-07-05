interface HubCardProps {
  variant: 'inn' | 'shop'
  title: string
  subtitle: string
  onSelect?: () => void
}

// Inn/Shop hub tiles (design/README.md §2). Not part of the 3-state
// cleared/available/locked node language — the Inn is always available and
// the Shop is always "coming soon," so these are two fixed one-off looks
// rather than nodeState.ts states.
const HubCard = ({ variant, title, subtitle, onSelect }: HubCardProps) => {
  if (variant === 'shop') {
    return (
      <div className="rounded-lg border border-dashed border-node-locked-border bg-node-locked p-3.5 text-center opacity-60">
        <div className="font-display text-sm tracking-[0.08em] text-node-locked-text">{title}</div>
        <div className="mt-1 font-body text-xs text-node-locked-text-dim italic">{subtitle}</div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border-2 border-accent-gold bg-panel-base p-3.5 text-center shadow-[0_0_12px_#c9a22766]"
    >
      <div className="font-display text-sm tracking-[0.08em] text-accent-gold-bright">{title}</div>
      <div className="mt-1 font-body text-xs text-text-dim">{subtitle}</div>
    </button>
  )
}

export default HubCard
