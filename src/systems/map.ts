/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
import Phaser from 'phaser';
import { theme } from '../core/theme';
import { computeTileSize } from '../core/balance';
import { mapForest } from '../../assets/maps/map_forest';
import { mapCanyon } from '../../assets/maps/map_canyon';
import { computeMask } from './mapUtils';

export interface MapData {
  grid: { width: number; height: number; tileSize: number };
  path: Phaser.Curves.Path;
  pathLength: number;
  pointAt: (d: number) => Phaser.Math.Vector2;
  buildableMask: Set<string>;
}

export function createMap(scene: Phaser.Scene, opts: { kind: 'forest' | 'canyon' }): MapData {
  const raw = opts.kind === 'canyon' ? mapCanyon() : mapForest();
  const tileSize = computeTileSize(scene.scale.width, scene.scale.height);
  const ground = scene.add.graphics();
  ground.fillStyle(Phaser.Display.Color.HexStringToColor(theme.bg).color, 1);
  ground.fillRect(0, 0, raw.width * tileSize, raw.height * tileSize);
  // grid lines
  ground.lineStyle(1, 0xffffff, 0.03);
  for (let x = 0; x <= raw.width; x++) {
    ground.lineBetween(x * tileSize, 0, x * tileSize, raw.height * tileSize);
  }
  for (let y = 0; y <= raw.height; y++) {
    ground.lineBetween(0, y * tileSize, raw.width * tileSize, y * tileSize);
  }

  const pts = raw.path.map(
    (p) => new Phaser.Math.Vector2(p[0] * tileSize + tileSize / 2, p[1] * tileSize + tileSize / 2),
  );
  const spline = new Phaser.Curves.Spline(pts);
  const path = new Phaser.Curves.Path();
  path.add(spline);
  const pathLength = path.getLength();
  const pointAt = (d: number) => {
    const t = Phaser.Math.Clamp(d / pathLength, 0, 1);
    const v = new Phaser.Math.Vector2();
    path.getPoint(t, v);
    return v;
  };
  const overlay = scene.add.graphics();
  overlay.lineStyle(tileSize * 0.8, Phaser.Display.Color.HexStringToColor(theme.path).color, 1);
  path.draw(overlay);
  const glow = scene.add.graphics();
  glow.lineStyle(tileSize * 0.8, Phaser.Display.Color.HexStringToColor(theme.path).color, 0.3);
  path.draw(glow);

  // compute buildable mask
  const mask = computeMask(raw.path);

  return {
    grid: { width: raw.width, height: raw.height, tileSize },
    path,
    pathLength,
    pointAt,
    buildableMask: mask,
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */
