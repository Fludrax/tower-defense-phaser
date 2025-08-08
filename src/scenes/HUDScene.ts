import Phaser from 'phaser';
import { events } from '../core/events';

export class HUDScene extends Phaser.Scene {
  private statsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HUD', active: true });
  }

  create() {
    this.statsText = this.add.text(10, 10, 'Wave: 0 | Lives: 20 | Money: 100', {
      color: '#ffffff',
    });

    events.on(
      'stats',
      (data: { wave: number; lives: number; money: number }) => {
        this.statsText.setText(`Wave: ${data.wave} | Lives: ${data.lives} | Money: ${data.money}`);
      },
      this,
    );
  }
}
