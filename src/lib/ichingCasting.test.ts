import { describe, expect, it } from 'vitest';

import { computeHexagramsFromCoins } from './ichingCasting';

describe('computeHexagramsFromCoins', () => {
  it('computes primary/relating hexagrams and changing lines', () => {
    const out = computeHexagramsFromCoins([6, 7, 8, 9, 6, 7]);
    expect(out.primaryBinary).toBe('101010');
    expect(out.relateBinary).toBe('110011');
    expect(out.changingLines).toEqual([1, 4, 5]);
  });

  it('has no changing lines when there are no 6/9', () => {
    const out = computeHexagramsFromCoins([7, 7, 7, 7, 7, 7]);
    expect(out.primaryBinary).toBe('111111');
    expect(out.relateBinary).toBe('111111');
    expect(out.changingLines).toEqual([]);
  });
});
