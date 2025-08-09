import { describe, it, expect } from 'vitest';
import { upgradeCost, totalCost, sellRefund, canAfford } from './economy';

describe('economy', () => {
  it('calculates upgrade and total cost', () => {
    expect(upgradeCost(100, 1)).toBe(160);
    expect(upgradeCost(100, 2)).toBe(256);
    expect(totalCost(100, 3)).toBe(516);
  });

  it('computes sell refund', () => {
    expect(sellRefund(100, 3)).toBe(Math.round(516 * 0.7));
  });

  it('prevents purchase when funds insufficient', () => {
    expect(canAfford(50, 60)).toBe(false);
    expect(canAfford(60, 60)).toBe(true);
  });
});
