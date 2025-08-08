import Phaser from 'phaser';

const tmp = new Phaser.Math.Vector2();

export function advanceOnPath(
  path: Phaser.Curves.Path,
  progress: number,
  speed: number,
  delta: number,
  out: Phaser.Math.Vector2 = tmp,
): number {
  progress += (speed * delta) / path.getLength();
  path.getPoint(progress, out);
  return progress;
}

export { tmp as pathVector };
