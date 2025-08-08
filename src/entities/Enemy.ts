import Phaser from 'phaser';
import { advanceOnPath, pathVector } from '../systems/path';

export class Enemy {
  private circle: Phaser.GameObjects.Arc;
  private progress = 0;
  private speed = 0;
  private hp = 0;
  private onDeath: (() => void) | null = null;
  active = false;
  path!: Phaser.Curves.Path;

  constructor(private scene: Phaser.Scene) {
    this.circle = scene.add.circle(0, 0, 10, 0xf87171);
    this.circle.setActive(false).setVisible(false);
    this.circle.setInteractive();
    this.circle.on('pointerdown', () => {
      this.hp = 0;
    });
  }

  reset(path: Phaser.Curves.Path, speed: number, hp: number, onDeath: () => void) {
    this.path = path;
    this.speed = speed;
    this.hp = hp;
    this.onDeath = onDeath;
    this.progress = 0;
    this.active = true;
    path.getPoint(0, pathVector);
    this.circle.setPosition(pathVector.x, pathVector.y).setActive(true).setVisible(true);
  }

  update(delta: number): boolean {
    if (!this.active) return false;
    this.progress = advanceOnPath(this.path, this.progress, this.speed, delta, pathVector);
    if (this.progress >= 1 || this.hp <= 0) {
      this.deactivate();
      if (this.onDeath) {
        this.onDeath();
      }
      return true;
    }
    this.circle.setPosition(pathVector.x, pathVector.y);
    return false;
  }

  deactivate() {
    this.active = false;
    this.circle.setActive(false).setVisible(false);
  }
}
