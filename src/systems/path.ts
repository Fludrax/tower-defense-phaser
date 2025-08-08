import Phaser from 'phaser';
import type { Enemy } from '../scenes/GameScene';

const tmp = new Phaser.Math.Vector2();

export function updatePath(enemy: Enemy, delta: number) {
  if (enemy.dead) return true;
  enemy.progress += (enemy.speed * delta) / enemy.path.getLength();
  if (enemy.progress >= 1) {
    enemy.dead = true;
    enemy.circle.setActive(false).setVisible(false);
    return true;
  }
  enemy.path.getPoint(enemy.progress, tmp);
  enemy.circle.setPosition(tmp.x, tmp.y);
  return false;
}
