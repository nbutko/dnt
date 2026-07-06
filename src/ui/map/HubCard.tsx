interface HubCardProps {
  variant: 'inn' | 'shop'
  title: string
  subtitle: string
  onSelect: () => void
}

// Inn/Shop hub tiles (design/README.md §2). Both are now real navigating
// buttons with the same gold-bordered affordance — the Shop's M2-era
// "Coming soon" dashed/locked look retired in Story 10 once it had somewhere
// to navigate to. `variant` stays as a prop (rather than collapsing to one
// shared component) since the two tiles still carry distinct icons.
const VARIANT_ICON: Record<HubCardProps['variant'], string> = {
  inn: '🛏️',
  shop: '🪙',
}

const HubCard = ({ variant, title, subtitle, onSelect }: HubCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    className="w-full rounded-lg border-2 border-accent-gold bg-panel-base p-3.5 text-center shadow-[0_0_12px_#c9a22766]"
  >
    <div className="mb-0.5 text-base leading-none">{VARIANT_ICON[variant]}</div>
    <div className="font-display text-sm tracking-[0.08em] text-accent-gold-bright">{title}</div>
    <div className="mt-1 font-body text-xs text-text-dim">{subtitle}</div>
  </button>
)

export default HubCard
