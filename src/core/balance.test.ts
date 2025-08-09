import { describe, expect, it } from 'vitest';
import { enemySpeedForWave, spawnDelay } from './balance';

describe('enemy speed balance', () => {
  it('scales and clamps', () => {
    expect(enemySpeedForWave(0)).toBeCloseTo(16);
    expect(enemySpeedForWave(10)).toBeCloseTo(16 * (1 + 0.015 * 10));
    expect(enemySpeedForWave(1000)).toBe(60);
  });
});

describe('spawn delay jitter', () => {
  it('stays within 10% of base', () => {
    const samples = Array.from({ length: 20 }, () => spawnDelay());
    samples.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(990);
      expect(d).toBeLessThanOrEqual(1210);
    });
  });
});
