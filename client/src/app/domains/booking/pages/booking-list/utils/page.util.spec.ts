import { parsePage } from './page.util';

describe('parsePage', () => {
  it.each([
    ['3', 3],
    [undefined, 1],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['two', 1],
  ])('reads %s as page %i', (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });
});
