import { MAX_PRICE } from '../constants/catalog-limits.constant';

/**
 * What's wrong with a price in UAH, by the same rules the API applies: at least 0, at most 1,000,000, and at most
 * 2 decimal places, since the database stores kopiykas.
 */
export function priceProblem(price: number | null | undefined): string | undefined {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return 'Enter a price.';
  }

  if (price < 0) {
    return "A price can't be negative.";
  }

  if (price > MAX_PRICE) {
    return 'A price can be at most 1,000,000 UAH.';
  }

  return /^\d+(\.\d{1,2})?$/.test(String(price))
    ? undefined
    : 'A price can have at most 2 decimal places.';
}
