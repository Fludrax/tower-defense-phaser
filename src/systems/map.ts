import Phaser from 'phaser';
import { theme } from '../core/theme';

export interface GridCell {
  x: number;
  y: number;
}

export interface GridMap {
  grid: { cols: number; rows: number; tileSize: number };
  path: GridCell[];
  buildableMask: boolean[][];
  start: GridCell;
  goal: GridCell;
}

function drawGrid(scene: Phaser.Scene, cols: number, rows: number, tileSize: number) {
  const g = scene.add.graphics();
  g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.bg).color, 1);
  g.fillRect(0, 0, cols * tileSize, rows * tileSize);
  g.lineStyle(1, 0xffffff, 0.06);
  for (let c = 0; c <= cols; c++) g.lineBetween(c * tileSize, 0, c * tileSize, rows * tileSize);
  for (let r = 0; r <= rows; r++) g.lineBetween(0, r * tileSize, cols * tileSize, r * tileSize);
}

function drawPath(scene: Phaser.Scene, path: GridCell[], tileSize: number) {
  const g = scene.add.graphics();
  g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.path).color, 1);
  for (const cell of path) {
    g.fillRect(cell.x * tileSize, cell.y * tileSize, tileSize, tileSize);
  }
}

function expandSegments(segments: [number, number, number, number][]): GridCell[] {
  const cells: GridCell[] = [];
  for (const [x1, y1, x2, y2] of segments) {
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    let x = x1;
    let y = y1;
    cells.push({ x, y });
    while (x !== x2 || y !== y2) {
      if (x !== x2) x += dx;
      if (y !== y2) y += dy;
      cells.push({ x, y });
    }
  }
  return cells;
}

export function createGridMap(
  scene: Phaser.Scene,
  opts: { cols: number; rows: number; tileSize: number },
): GridMap {
  const { cols, rows, tileSize } = opts;
  drawGrid(scene, cols, rows, tileSize);
  const segments: [number, number, number, number][] = [
    [0, 5, cols - 6, 5],
    [cols - 6, 5, cols - 6, rows - 4],
    [cols - 6, rows - 4, 2, rows - 4],
    [2, rows - 4, 2, 1],
    [2, 1, cols - 4, 1],
    [cols - 4, 1, cols - 4, 3],
    [cols - 4, 3, 4, 3],
    [4, 3, 4, rows - 2],
    [4, rows - 2, cols - 1, rows - 2],
  ];
  const path = expandSegments(segments);
  drawPath(scene, path, tileSize);
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
    grid: { cols, rows, tileSize },
    path,
    buildableMask,
    start: path[0],
    goal: path[path.length - 1],
  };
}

export function gridToWorld(cell: GridCell, grid: { tileSize: number }) {
  const { tileSize } = grid;
  return { x: cell.x * tileSize + tileSize / 2, y: cell.y * tileSize + tileSize / 2 };
}

export function worldToGrid(x: number, y: number, grid: { tileSize: number }): GridCell {
  const { tileSize } = grid;
  return { x: Math.floor(x / tileSize), y: Math.floor(y / tileSize) };
}

export function isInside(cell: GridCell, grid: { cols: number; rows: number }) {
  return cell.x >= 0 && cell.y >= 0 && cell.x < grid.cols && cell.y < grid.rows;
}

export function isBuildable(cell: GridCell, map: GridMap) {
  return isInside(cell, map.grid) && map.buildableMask[cell.y][cell.x];
}
