import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xff0000, 1);
    gfx.fillRect(0, 0, 32, 32);
    gfx.generateTexture('placeholder', 32, 32);
    gfx.destroy();
  }

  create() {
    this.scene.start('Game');
  }
}
