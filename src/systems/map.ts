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
  ground.fillStyle(theme.ground, 1);
  ground.fillRect(0, 0, raw.width * tileSize, raw.height * tileSize);

  const overlay = scene.add.graphics();
  overlay.lineStyle(tileSize, theme.path, 1);

  const path = new Phaser.Curves.Path(
    raw.path[0][0] * tileSize + tileSize / 2,
    raw.path[0][1] * tileSize + tileSize / 2,
  );
  for (let i = 1; i < raw.path.length; i++) {
    path.lineTo(raw.path[i][0] * tileSize + tileSize / 2, raw.path[i][1] * tileSize + tileSize / 2);
  }
  path.draw(overlay);

  // compute buildable mask
  const mask = computeMask(raw.path);

  return {
    grid: { width: raw.width, height: raw.height, tileSize },
    path,
    buildableMask: mask,
  };
}
