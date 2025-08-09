import { describe, expect, it } from 'vitest';
import { enemySpeedForWave, spawnDelay } from './balance';

describe('enemy speed balance', () => {
  it('scales and clamps', () => {
    expect(enemySpeedForWave(0)).toBeCloseTo(20);
    expect(enemySpeedForWave(10)).toBeCloseTo(20 * (1 + 0.02 * 10));
    expect(enemySpeedForWave(1000)).toBe(80);
  });
});

describe('spawn delay jitter', () => {
  it('stays within 10% of base', () => {
    const samples = Array.from({ length: 20 }, () => spawnDelay());
    samples.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(900);
      expect(d).toBeLessThanOrEqual(1100);
    });
  });
});
