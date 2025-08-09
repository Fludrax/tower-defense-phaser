/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { enemySpeedForWave, spawnDelay } from './balance';

function makeEnemy(length: number, speed: number) {
  const enemy = {
    dead: false,
    progress: 0,
    speed,
    path: { getPoint: () => ({}) },
    pathLength: length,
  } as any;
  enemy.circle = {
    setActive: () => enemy.circle,
    setVisible: () => enemy.circle,
    setPosition: () => enemy.circle,
  } as any;
  return enemy;
}

function simulate(fps: number) {
  const enemy = makeEnemy(300, 60);
  const steps = fps * 5;
  const dt = 1 / fps;
  for (let i = 0; i < steps; i++) {
    enemy.progress += (enemy.speed * dt) / enemy.pathLength;
  }
  return enemy.progress * enemy.pathLength;
}

describe('framerate independent movement', () => {
  it('stays within 1% across fps', () => {
    const p60 = simulate(60);
    const p144 = simulate(144);
    const p360 = simulate(360);
    const avg = (p60 + p144 + p360) / 3;
    expect(Math.abs(p60 - avg) / avg).toBeLessThan(0.01);
    expect(Math.abs(p144 - avg) / avg).toBeLessThan(0.01);
    expect(Math.abs(p360 - avg) / avg).toBeLessThan(0.01);
  });

  it('clamps max speed', () => {
    expect(enemySpeedForWave(9999)).toBeLessThanOrEqual(60);
  });

  it('spawnDelay jitter ±10%', () => {
    const samples = Array.from({ length: 20 }, () => spawnDelay());
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(990);
      expect(s).toBeLessThanOrEqual(1210);
    }
  });

  it('progresses over multiple segments', () => {
    const enemy = makeEnemy(150, 30);
    const dt = 1 / 60;
    for (let t = 0; t < 5; t += dt) {
      enemy.progress += (enemy.speed * dt) / enemy.pathLength;
    }
    expect(enemy.progress).toBeCloseTo(1, 2);
  });
});
