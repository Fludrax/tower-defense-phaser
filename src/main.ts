import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';

export const PIXEL_RATIO = (window as Window & { PIXEL_RATIO?: number }).PIXEL_RATIO ?? 1;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'app',
  pixelArt: true,
  backgroundColor: '#0f172a',
  scene: [BootScene, GameScene, HUDScene],
  scale: {
    zoom: PIXEL_RATIO,
  },
};

export default new Phaser.Game(config);
