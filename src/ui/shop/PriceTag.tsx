// The one place a price renders (wireframe t3a's 🪙-pill): the CHA-adjusted
// price, plus — whenever a discount or markup actually moved it off the
// config base — a struck-through base price beside it, so the effect of CHA
// (and a Bard's Silver Tongue) is visible per-item, not just in the Shop's
// banner. `price`/`discountPct` come from engine/character/pricing.ts's
// shopPrice(), never recomputed here.

interface PriceTagProps {
  basePrice: number
  price: number
  discountPct: number
}

// Green when a discount lowered the price, red when a markup raised it, gold
// at the unmodified base — kept as a lookup rather than a nested ternary.
const priceColor = (discountPct: number): string => {
  if (discountPct > 0) return '#7ac96a'
  if (discountPct < 0) return '#c98d8d'
  return '#e8c766'
}

const PriceTag = ({ basePrice, price, discountPct }: PriceTagProps) => (
  <div className="inline-flex items-center gap-1.5">
    {discountPct !== 0 && (
      <span className="font-mono text-[10px] line-through" style={{ color: '#6a5a42' }}>
        🪙 {basePrice}
      </span>
    )}
    <span
      className="rounded-full px-3 py-0.5 font-mono text-xs"
      style={{
        border: '1px solid #7a5a22',
        background: '#1c1608',
        color: priceColor(discountPct),
      }}
    >
      🪙 {price}
    </span>
  </div>
)

export default PriceTag
