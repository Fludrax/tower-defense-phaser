export const STARTING_LIVES = 20;
export const STARTING_MONEY = 100;
export const WAVE_INTERVAL = 10000; // ms
export const ENEMIES_PER_WAVE = 5;
export const ENEMY_SPEED = 60; // pixels per second
export const ENEMY_HP = 1;
export const ENEMY_REWARD = 5;

export const PROJECTILE_SPEED = 300; // pixels per second

export interface TowerConfig {
  cost: number;
  range: number;
  fireRate: number; // shots per second
  damage: number;
  aoeRadius?: number;
  slowPct?: number; // 0-1
  slowDur?: number; // ms
}

export const TOWER_STATS: Record<string, TowerConfig> = {
  arrow: { cost: 20, range: 100, fireRate: 1, damage: 1 },
  cannon: { cost: 30, range: 120, fireRate: 0.5, damage: 3, aoeRadius: 40 },
  frost: {
    cost: 25,
    range: 100,
    fireRate: 0.75,
    damage: 1,
    slowPct: 0.3,
    slowDur: 2000,
  },
};
