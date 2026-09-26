import { priceProblem } from './price-rules.util';

describe('priceProblem', () => {
  it.each([0, 1, 499.5, 1999.99, 1_000_000])('accepts %s', (price) => {
    expect(priceProblem(price)).toBeUndefined();
  });

  it.each([
    [1.005, 'A price can have at most 2 decimal places.'],
    [-1, "A price can't be negative."],
    [1_000_000.01, 'A price can be at most 1,000,000 UAH.'],
    [Number.NaN, 'Enter a price.'],
    [null, 'Enter a price.'],
  ])('refuses %s', (price, message) => {
    expect(priceProblem(price)).toBe(message);
  });
});
