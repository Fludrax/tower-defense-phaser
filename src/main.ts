import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUDController } from './ui/HUDController';

const zoom = Phaser.Math.Clamp(window.devicePixelRatio || 1, 1, 2);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  backgroundColor: '#0b1020',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom,
  },
  scene: [BootScene, GameScene],
};

export const game = new Phaser.Game(config);

// Initialize HUD overlay
new HUDController();
