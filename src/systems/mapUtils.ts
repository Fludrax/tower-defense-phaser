export function computeMask(pathPoints: number[][]) {
  const mask = new Set<string>();
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const [x1, y1] = pathPoints[i];
    const [x2, y2] = pathPoints[i + 1];
    if (x1 === x2) {
      const step = y2 > y1 ? 1 : -1;
      for (let y = y1; y !== y2 + step; y += step) {
        mask.add(`${x1},${y}`);
      }
    } else if (y1 === y2) {
      const step = x2 > x1 ? 1 : -1;
      for (let x = x1; x !== x2 + step; x += step) {
        mask.add(`${x},${y1}`);
      }
    }
  }
  return mask;
}
