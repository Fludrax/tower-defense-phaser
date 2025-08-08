import { describe, expect, it } from 'vitest';
import { gridToWorld, worldToGrid } from './grid';

describe('grid utils', () => {
  it('converts world coordinates to grid', () => {
    expect(worldToGrid(64, 96)).toEqual({ col: 2, row: 3 });
  });
  it('floors world coordinates to grid', () => {
    expect(worldToGrid(70, 95)).toEqual({ col: 2, row: 2 });
  });

  it('converts grid coordinates to world', () => {
    expect(gridToWorld(2, 3)).toEqual({ x: 64, y: 96 });
  });

  it('supports custom tile size', () => {
    expect(worldToGrid(50, 50, 50)).toEqual({ col: 1, row: 1 });
    expect(gridToWorld(1, 1, 50)).toEqual({ x: 50, y: 50 });
  });
});
