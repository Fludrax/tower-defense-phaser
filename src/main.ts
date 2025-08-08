import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';

interface RatioWindow {
  PIXEL_RATIO?: number;
}
const ratioWindow = window as unknown as RatioWindow;
export const PIXEL_RATIO = ratioWindow.PIXEL_RATIO ?? 1;

const config: Phaser.Types.Core.GameConfig & { resolution: number } = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'app',
  pixelArt: true,
  resolution: PIXEL_RATIO,
  backgroundColor: '#0f172a',
  scene: [BootScene, GameScene, HUDScene],
};

export default new Phaser.Game(config);
