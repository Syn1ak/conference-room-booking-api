import { UahPipe } from './uah.pipe';

describe('UahPipe', () => {
  const pipe = new UahPipe();

  it('shows two decimals and groups thousands', () => {
    expect(pipe.transform(9400)).toBe('9,400.00 UAH');
    expect(pipe.transform(1999.99)).toBe('1,999.99 UAH');
  });

  it('shows zero', () => {
    expect(pipe.transform(0)).toBe('0.00 UAH');
  });

  it('rounds binary floating-point noise away', () => {
    expect(pipe.transform(0.1 + 0.2)).toBe('0.30 UAH');
  });

  it('shows nothing for a missing amount', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
