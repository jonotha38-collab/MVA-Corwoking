/** Public display metadata only. Never pass a card number, expiry or CVC to this layer. */
export const CARD_BRANDS = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover',
  diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay', eftpos_au: 'eftpos',
} as const;
export type CardBrand = keyof typeof CARD_BRANDS;
export function displayCardBrands(value: unknown): CardBrand[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((brand): brand is CardBrand => typeof brand === 'string' && Object.hasOwn(CARD_BRANDS, brand)))];
}
