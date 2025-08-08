import Phaser from 'phaser';

export class Projectile {
  private circle: Phaser.GameObjects.Arc;
  private vx = 0;
  private vy = 0;
  active = false;

  constructor(private scene: Phaser.Scene) {
    this.circle = scene.add.circle(0, 0, 4, 0x22d3ee);
    this.circle.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, vx: number, vy: number) {
    this.vx = vx;
    this.vy = vy;
    this.active = true;
    this.circle.setPosition(x, y).setActive(true).setVisible(true);
  }

  update(delta: number): boolean {
    if (!this.active) return false;
    this.circle.x += this.vx * delta;
    this.circle.y += this.vy * delta;
    if (
      this.circle.x < 0 ||
      this.circle.x > this.scene.scale.width ||
      this.circle.y < 0 ||
      this.circle.y > this.scene.scale.height
    ) {
      this.deactivate();
      return true;
    }
    return false;
  }

  deactivate() {
    this.active = false;
    this.circle.setActive(false).setVisible(false);
  }
}
