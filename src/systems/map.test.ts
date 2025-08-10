import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } },
}));

import { createGridMap, isBuildable, GridCell, PATH_CELLS, validPath } from './map';

const sceneStub = {
  add: {
    graphics: () => ({
      fillStyle() {
        return this;
      },
      fillRect() {
        return this;
      },
      lineStyle() {
        return this;
      },
      lineBetween() {
        return this;
      },
    }),
  },
} as unknown as Phaser.Scene;

describe('grid map buildable mask', () => {
  it('marks path tiles as unbuildable', () => {
    const map = createGridMap(sceneStub, { cols: 20, rows: 12, tileSize: 32 });
    const start = map.start;
    const inside: GridCell = { x: 6, y: 6 };
    expect(isBuildable(start, map)).toBe(false);
    expect(isBuildable(inside, map)).toBe(true);
  });

  it('has a contiguous path', () => {
    expect(validPath(PATH_CELLS)).toBe(true);
  });
});
