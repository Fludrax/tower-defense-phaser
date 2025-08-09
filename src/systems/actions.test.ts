import { describe, it, expect, vi } from 'vitest';
import { createGridMap } from './map';
import { PlacementController } from './actions';

vi.mock('phaser', () => ({
  default: { Display: { Color: { HexStringToColor: () => ({ color: 0 }) } } },
}));

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

describe('placement controller', () => {
  it('releases cell on remove', () => {
    const map = createGridMap(sceneStub, { cols: 6, rows: 6, tileSize: 32 });
    const pc = new PlacementController(map);
    const cell = { x: 1, y: 1 };
    expect(pc.place(cell)).toBe(true);
    pc.remove(cell);
    expect(pc.canPlace(cell)).toBe(true);
  });

  it('rejects placement on occupied cell', () => {
    const map = createGridMap(sceneStub, { cols: 6, rows: 6, tileSize: 32 });
    const pc = new PlacementController(map);
    const cell = { x: 1, y: 1 };
    expect(pc.place(cell)).toBe(true);
    expect(pc.place(cell)).toBe(false);
  });
});
