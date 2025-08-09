import { jitter } from './time';
export const STARTING_LIVES = 20;
export const STARTING_MONEY = 100;
export const WAVE_INTERVAL = 10000; // ms
export const ENEMIES_PER_WAVE = 5;
export const ENEMY_REWARD = 2;
export const SELL_REFUND = 0.7;
export const WAVE_BREAK = 8000; // ms between waves

// Responsive tile size (updated on resize)
export let TILE_SIZE = 32;
export function computeTileSize(width: number, height: number) {
  TILE_SIZE = Math.min(Math.max(Math.floor(Math.min(width / 30, height / 17)), 24), 40);
  return TILE_SIZE;
}

// Enemy balancing
const BASE_SPEED = 16; // px/s
const SPEED_PER_WAVE = 0.015; // +1.5% per wave
const MAX_SPEED = 60;
export function enemySpeedForWave(wave: number) {
  return Math.min(MAX_SPEED, BASE_SPEED * (1 + wave * SPEED_PER_WAVE));
}

const HP_BASE = 35;
export function enemyHpForWave(wave: number) {
  return Math.round(HP_BASE * (1 + wave * 0.12));
}

export function spawnDelay() {
  return jitter(1100, 0.1);
}

export interface TowerStats {
  range: number;
  fireRate: number; // shots per second
  damage: number;
  aoeRadius?: number;
  slowPct?: number; // 0-1
  slowDur?: number; // ms
  dotDamage?: number; // damage per second
  dotDur?: number; // ms
}

export interface TowerConfig {
  cost: number;
  levels: TowerStats[];
}

export const TOWERS: Record<string, TowerConfig> = {
  arrow: {
    cost: 20,
    levels: [
      { range: 100, fireRate: 1.5, damage: 1 },
      { range: 120, fireRate: 1.8, damage: 2 },
      { range: 140, fireRate: 2.1, damage: 3 },
    ],
  },
  cannon: {
    cost: 40,
    levels: [
      { range: 90, fireRate: 0.5, damage: 2, aoeRadius: 40 },
      { range: 100, fireRate: 0.6, damage: 3, aoeRadius: 40 },
      { range: 110, fireRate: 0.7, damage: 4, aoeRadius: 40 },
    ],
  },
  frost: {
    cost: 30,
    levels: [
      { range: 90, fireRate: 1, damage: 0, slowPct: 0.3, slowDur: 2 },
      { range: 100, fireRate: 1.2, damage: 0, slowPct: 0.4, slowDur: 2 },
      { range: 110, fireRate: 1.5, damage: 0, slowPct: 0.5, slowDur: 2 },
    ],
  },
};

export const PROJECTILE_SPEED = 300; // pixels per second
