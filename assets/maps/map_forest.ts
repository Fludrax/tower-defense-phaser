export function mapForest() {
  const width = 36;
  const height = 22;
  // Serpentine path with 11+ segments avoiding edges
  const path = [
    [0, 10],
    [34, 10],
    [34, 4],
    [2, 4],
    [2, 16],
    [32, 16],
    [32, 6],
    [4, 6],
    [4, 18],
    [30, 18],
    [30, 8],
    [35, 8],
  ];
  return { width, height, path };
}
