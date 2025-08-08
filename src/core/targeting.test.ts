import { describe, expect, it } from 'vitest';
import { selectTarget, Targetable } from './targeting';

describe('target selection', () => {
  it('selects enemy with highest progress within range', () => {
    const enemies: Targetable[] = [
      { x: 0, y: 0, progress: 0.1 },
      { x: 10, y: 0, progress: 0.2 },
      { x: 50, y: 0, progress: 0.9 },
    ];
    const target = selectTarget(enemies, 0, 0, 30);
    expect(target).toEqual(enemies[1]);
  });

  it('returns undefined when no enemies in range', () => {
    const enemies: Targetable[] = [{ x: 100, y: 100, progress: 0.9 }];
    const target = selectTarget(enemies, 0, 0, 30);
    expect(target).toBeUndefined();
  });
});
