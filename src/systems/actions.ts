import { GridCell, GridMap, isBuildable, isInside } from './map';

export class PlacementController {
  private occupancyGrid: boolean[][];
  constructor(private map: GridMap) {
    this.occupancyGrid = Array.from({ length: map.grid.rows }, () =>
      Array(map.grid.cols).fill(false),
    );
  }

  canPlace(cell: GridCell) {
    return (
      isInside(cell, this.map.grid) &&
      isBuildable(cell, this.map) &&
      !this.occupancyGrid[cell.y][cell.x]
    );
  }

  place(cell: GridCell) {
    if (!this.canPlace(cell)) return false;
    this.occupancyGrid[cell.y][cell.x] = true;
    return true;
  }

  remove(cell: GridCell) {
    if (isInside(cell, this.map.grid)) this.occupancyGrid[cell.y][cell.x] = false;
  }
}
