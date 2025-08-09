import { GridCell, GridMap, isBuildable, isInside } from './map';

export class PlacementController {
  private occupancy: boolean[][];
  constructor(private map: GridMap) {
    this.occupancy = Array.from({ length: map.grid.rows }, () => Array(map.grid.cols).fill(false));
  }

  canPlace(cell: GridCell) {
    return (
      isInside(cell, this.map.grid) &&
      isBuildable(cell, this.map) &&
      !this.occupancy[cell.y][cell.x]
    );
  }

  place(cell: GridCell) {
    if (!this.canPlace(cell)) return false;
    this.occupancy[cell.y][cell.x] = true;
    return true;
  }

  remove(cell: GridCell) {
    if (isInside(cell, this.map.grid)) this.occupancy[cell.y][cell.x] = false;
  }
}
