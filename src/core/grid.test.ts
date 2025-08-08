import { describe, expect, it } from 'vitest';
import { gridToWorld, worldToGrid } from './grid';

describe('grid utils', () => {
  it('converts world coordinates to grid', () => {
    expect(worldToGrid(64, 96)).toEqual({ col: 2, row: 3 });
  });

  it('converts grid coordinates to world', () => {
    expect(gridToWorld(2, 3)).toEqual({ x: 64, y: 96 });
  });
});
