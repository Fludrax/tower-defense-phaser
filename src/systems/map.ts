import Phaser from 'phaser';
import { theme } from '../core/theme';
import { computeTileSize } from '../core/balance';
import { mapForest } from '../../assets/maps/map_forest';
import { mapCanyon } from '../../assets/maps/map_canyon';
import { computeMask } from './mapUtils';

export interface MapData {
  grid: { width: number; height: number; tileSize: number };
  path: Phaser.Curves.Path;
  buildableMask: Set<string>;
}

export function createMap(scene: Phaser.Scene, opts: { kind: 'forest' | 'canyon' }): MapData {
  const raw = opts.kind === 'canyon' ? mapCanyon() : mapForest();
  const tileSize = computeTileSize(scene.scale.width, scene.scale.height);
  const ground = scene.add.graphics();
  ground.fillStyle(Phaser.Display.Color.HexStringToColor(theme.bg).color, 1);
  ground.fillRect(0, 0, raw.width * tileSize, raw.height * tileSize);
  // grid lines
  ground.lineStyle(1, 0xffffff, 0.05);
  for (let x = 0; x <= raw.width; x++) {
    ground.lineBetween(x * tileSize, 0, x * tileSize, raw.height * tileSize);
  }
  for (let y = 0; y <= raw.height; y++) {
    ground.lineBetween(0, y * tileSize, raw.width * tileSize, y * tileSize);
  }

  const path = new Phaser.Curves.Path(
    raw.path[0][0] * tileSize + tileSize / 2,
    raw.path[0][1] * tileSize + tileSize / 2,
  );
  for (let i = 1; i < raw.path.length; i++) {
    path.lineTo(raw.path[i][0] * tileSize + tileSize / 2, raw.path[i][1] * tileSize + tileSize / 2);
  }
  const pattern = scene.add.graphics();
  pattern.lineStyle(
    tileSize * 0.8,
    Phaser.Display.Color.HexStringToColor(theme.pathHighlight).color,
    0.3,
  );
  path.draw(pattern);

  const overlay = scene.add.graphics() as Phaser.GameObjects.Graphics & {
    lineCap?: CanvasLineCap;
    lineJoin?: CanvasLineJoin;
  };
  overlay.lineStyle(tileSize * 0.8, Phaser.Display.Color.HexStringToColor(theme.path).color, 1);
  overlay.lineCap = 'round';
  overlay.lineJoin = 'round';
  path.draw(overlay);

  // compute buildable mask
  const mask = computeMask(raw.path);

  return {
    grid: { width: raw.width, height: raw.height, tileSize },
    path,
    buildableMask: mask,
  };
}
