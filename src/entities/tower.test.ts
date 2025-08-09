import { describe, it, expect } from 'vitest';

class DummyTower {
  fireRate = 1;
  cooldown = 1;
  shots = 0;
  update(dt: number) {
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.shots += 1;
      this.cooldown = 1 / this.fireRate;
    }
  }
}

describe('tower cooldown', () => {
  it('fires after cooldown expires', () => {
    const t = new DummyTower();
    t.update(0.5);
    expect(t.shots).toBe(0);
    t.update(0.6);
    expect(t.shots).toBe(1);
  });
});
