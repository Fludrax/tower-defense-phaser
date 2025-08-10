import Phaser from 'phaser';
import { theme } from '../core/theme';
import { computeTileSize } from '../core/balance';

export interface GridCell {
  x: number;
  y: number;
}

export interface GridMap {
  grid: { cols: number; rows: number; tileSize: number; offsetX: number; offsetY: number };
  path: GridCell[];
  buildableMask: boolean[][];
  start: GridCell;
  goal: GridCell;
}

export function addLine(path: GridCell[], from: GridCell, to: GridCell) {
  if (from.x !== to.x && from.y !== to.y)
    throw new Error('Diagonal segments are not supported');
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (path.length === 0) path.push({ ...from });
  let { x, y } = from;
  while (x !== to.x || y !== to.y) {
    x += dx;
    y += dy;
    path.push({ x, y });
  }
}

export const PATH_CELLS: GridCell[] = [];
addLine(PATH_CELLS, { x: 0, y: 5 }, { x: 14, y: 5 });
addLine(PATH_CELLS, { x: 14, y: 5 }, { x: 14, y: 8 });
addLine(PATH_CELLS, { x: 14, y: 8 }, { x: 2, y: 8 });
addLine(PATH_CELLS, { x: 2, y: 8 }, { x: 2, y: 1 });
addLine(PATH_CELLS, { x: 2, y: 1 }, { x: 16, y: 1 });
addLine(PATH_CELLS, { x: 16, y: 1 }, { x: 16, y: 3 });
addLine(PATH_CELLS, { x: 16, y: 3 }, { x: 4, y: 3 });
addLine(PATH_CELLS, { x: 4, y: 3 }, { x: 4, y: 10 });
addLine(PATH_CELLS, { x: 4, y: 10 }, { x: 19, y: 10 });

export function validPath(cells: GridCell[]) {
  if (cells.length < 2) return false;
  for (let i = 1; i < cells.length; i++) {
    const dx = Math.abs(cells[i].x - cells[i - 1].x);
    const dy = Math.abs(cells[i].y - cells[i - 1].y);
    if (dx + dy !== 1) return false;
  }
  return true;
}

function drawGrid(
  scene: Phaser.Scene,
  cols: number,
  rows: number,
  tileSize: number,
  offsetX: number,
  offsetY: number,
) {
  const g = scene.add.graphics();
  g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.bg).color, 1);
  g.fillRect(offsetX, offsetY, cols * tileSize, rows * tileSize);
  g.lineStyle(1, 0xffffff, 0.06);
  for (let c = 0; c <= cols; c++)
    g.lineBetween(
      offsetX + c * tileSize,
      offsetY,
      offsetX + c * tileSize,
      offsetY + rows * tileSize,
    );
  for (let r = 0; r <= rows; r++)
    g.lineBetween(
      offsetX,
      offsetY + r * tileSize,
      offsetX + cols * tileSize,
      offsetY + r * tileSize,
    );
}

function drawPath(
  scene: Phaser.Scene,
  path: GridCell[],
  tileSize: number,
  offsetX: number,
  offsetY: number,
) {
  const g = scene.add.graphics();
  g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.path).color, 1);
  for (const cell of path) {
    g.fillRect(offsetX + cell.x * tileSize, offsetY + cell.y * tileSize, tileSize, tileSize);
  }
}

export function createGridMap(
  scene: Phaser.Scene,
  opts: { cols: number; rows: number; tileSize: number },
): GridMap {
  const { cols, rows, tileSize } = opts;
  const viewW = scene.scale?.width ?? cols * tileSize;
  const viewH = scene.scale?.height ?? rows * tileSize;
  const offsetX = Math.floor((viewW - cols * tileSize) / 2);
  const offsetY = Math.floor((viewH - rows * tileSize) / 2);
  drawGrid(scene, cols, rows, tileSize, offsetX, offsetY);
  const path = PATH_CELLS;
  drawPath(scene, path, tileSize, offsetX, offsetY);
  const buildableMask: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
  // borders
  for (let c = 0; c < cols; c++) {
    buildableMask[0][c] = false;
    buildableMask[rows - 1][c] = false;
  }
  for (let r = 0; r < rows; r++) {
    buildableMask[r][0] = false;
    buildableMask[r][cols - 1] = false;
  }
  for (const cell of path) buildableMask[cell.y][cell.x] = false;
  return {
    grid: { cols, rows, tileSize, offsetX, offsetY },
    path,
    buildableMask,
    start: path[0],
    goal: path[path.length - 1],
  };
}

export function computeGrid(viewW: number, viewH: number) {
  const tileSize = computeTileSize(viewW, viewH);
  const cols = Math.floor(viewW / tileSize);
  const rows = Math.floor(viewH / tileSize);
  return { tileSize, cols, rows };
}

export function gridToWorld(
  cell: GridCell,
  grid: { tileSize: number; offsetX: number; offsetY: number },
) {
  const { tileSize, offsetX, offsetY } = grid;
  return {
    x: offsetX + cell.x * tileSize + tileSize / 2,
    y: offsetY + cell.y * tileSize + tileSize / 2,
  };
}

export function worldToGrid(
  x: number,
  y: number,
  grid: { tileSize: number; offsetX: number; offsetY: number },
): GridCell {
  const { tileSize, offsetX, offsetY } = grid;
  return {
    x: Math.floor((x - offsetX) / tileSize),
    y: Math.floor((y - offsetY) / tileSize),
  };
}

export function isInside(cell: GridCell, grid: { cols: number; rows: number }) {
  return cell.x >= 0 && cell.y >= 0 && cell.x < grid.cols && cell.y < grid.rows;
}

export function isBuildable(cell: GridCell, map: GridMap) {
  return isInside(cell, map.grid) && map.buildableMask[cell.y][cell.x];
}
