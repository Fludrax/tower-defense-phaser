import Phaser from 'phaser';
import { events } from '../core/events';
import { TOWER_STATS } from '../core/balance';

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

    const arrowBtn = this.add
      .text(10, 40, `Arrow ($${TOWER_STATS.arrow.cost})`, { color: '#ffffff' })
      .setInteractive()
      .on('pointerdown', () => events.emit('selectTower', 'arrow'));
    const cannonBtn = this.add
      .text(120, 40, `Cannon ($${TOWER_STATS.cannon.cost})`, { color: '#ffffff' })
      .setInteractive()
      .on('pointerdown', () => events.emit('selectTower', 'cannon'));
    const frostBtn = this.add
      .text(250, 40, `Frost ($${TOWER_STATS.frost.cost})`, { color: '#ffffff' })
      .setInteractive()
      .on('pointerdown', () => events.emit('selectTower', 'frost'));
  }
}
