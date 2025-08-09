import { TOWERS, type TowerStats } from '../core/balance';
import { upgradeCost, sellRefund } from '../core/economy';

export interface TowerLike {
  x: number;
  y: number;
  type: string;
  level: number;
  stats: TowerStats;
}

export function calcPreview(tower: TowerLike) {
  const cfg = TOWERS[tower.type];
  const before = cfg.levels[tower.level - 1];
  const after = cfg.levels[tower.level] ?? null;
  const upgrade = tower.level < cfg.levels.length ? upgradeCost(cfg.cost, tower.level) : 0;
  const refund = sellRefund(cfg.cost, tower.level);
  return { before, after, upgrade, refund };
}
