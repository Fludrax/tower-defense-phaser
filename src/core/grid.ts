export const TILE_SIZE = 32;

export function worldToGrid(x: number, y: number, tileSize = TILE_SIZE) {
  return {
    col: Math.floor(x / tileSize),
    row: Math.floor(y / tileSize),
  };
}

export function gridToWorld(col: number, row: number, tileSize = TILE_SIZE) {
  return {
    x: col * tileSize,
    y: row * tileSize,
  };
}
