/**
 * Computes the add-on charge for one unit of a product.
 * The first `freeExtrasCount` selected extras are free; each additional extra
 * costs `pricePerExtra`.
 */
export function computeExtrasChargePerUnit(
  selectedExtrasCount: number,
  freeExtrasCount: number,
  pricePerExtra: number
): number {
  const paidCount = Math.max(0, selectedExtrasCount - freeExtrasCount);
  return parseFloat((paidCount * pricePerExtra).toFixed(2));
}

/**
 * Per-unit prices for each selected extra at purchase time.
 * Free slots (by sort order) receive price 0; the rest receive `pricePerExtra`.
 */
export function computeExtraUnitPrices(
  selectedExtrasCount: number,
  freeExtrasCount: number,
  pricePerExtra: number
): number[] {
  return Array.from({ length: selectedExtrasCount }, (_, index) =>
    index < freeExtrasCount ? 0 : pricePerExtra
  );
}

/**
 * Line total for one cart/order item: (base price + extras charge per unit) × quantity.
 */
export function computeLineTotal(
  basePrice: number,
  selectedExtrasCount: number,
  quantity: number,
  freeExtrasCount: number,
  pricePerExtra: number
): number {
  const unitTotal =
    basePrice + computeExtrasChargePerUnit(selectedExtrasCount, freeExtrasCount, pricePerExtra);
  return parseFloat((unitTotal * quantity).toFixed(2));
}
