import PriceTag from './PriceTag'

// Consumables render as a squat centered card in the CONSUMABLES grid, a
// weapon as a wide horizontal row in the WEAPON RACK list (wireframe t3a) —
// both share the same afford/owned/Buy logic and PriceTag so the two
// surfaces never disagree on what something costs.
export type ShopItemLayout = 'card' | 'row'

interface ShopItemProps {
  layout: ShopItemLayout
  icon: string
  name: string
  blurb: string
  basePrice: number
  price: number
  discountPct: number
  coins: number
  // Weapons are one-off buys (m3-scope.html#shop) — already-owned ones show
  // "Owned" instead of a price/Buy button. Consumables restock every visit,
  // so they're never "owned" in this sense.
  owned?: boolean
  onBuy: () => void
}

const ShopItem = ({
  layout,
  icon,
  name,
  blurb,
  basePrice,
  price,
  discountPct,
  coins,
  owned = false,
  onBuy,
}: ShopItemProps) => {
  const canAfford = coins >= price
  const disabled = owned || !canAfford

  const buyButton = (
    <button
      type="button"
      disabled={disabled}
      onClick={onBuy}
      className="rounded px-3 py-1.5 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: owned ? 'transparent' : 'linear-gradient(180deg,#e8c766,#c9a227)',
        color: owned ? '#8a7a5a' : '#1c0f0a',
      }}
    >
      {owned ? 'Owned' : 'Buy'}
    </button>
  )

  if (layout === 'card') {
    return (
      <div
        className="flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 text-center"
        style={{ borderColor: '#7a5a22', background: 'rgba(59,18,32,.25)' }}
      >
        <div className="text-xl leading-none">{icon}</div>
        <div className="font-body text-xs" style={{ color: '#ede1c3' }}>
          {name}
        </div>
        <div className="font-body text-[10px] italic" style={{ color: '#8a7a5a' }}>
          {blurb}
        </div>
        <PriceTag basePrice={basePrice} price={price} discountPct={discountPct} />
        {buyButton}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg border-2 px-3 py-2.5"
      style={{ borderColor: '#7a5a22', background: 'rgba(59,18,32,.25)', opacity: owned ? 0.65 : 1 }}
    >
      <span className="text-xl leading-none">{icon}</span>
      <div className="flex-1">
        <div className="font-body text-sm" style={{ color: '#ede1c3' }}>
          {name}
        </div>
        <div className="font-mono text-[10px]" style={{ color: '#8a7a5a' }}>
          {blurb}
        </div>
      </div>
      <PriceTag basePrice={basePrice} price={price} discountPct={discountPct} />
      {buyButton}
    </div>
  )
}

export default ShopItem
