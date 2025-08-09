export const UPGRADE_FACTOR = 1.6;

export function upgradeCost(base: number, level: number) {
  return Math.round(base * Math.pow(UPGRADE_FACTOR, level));
}

export function totalCost(base: number, level: number) {
  let total = base;
  for (let i = 1; i < level; i++) {
    total += upgradeCost(base, i);
  }
  return total;
}

export function sellRefund(base: number, level: number) {
  return Math.round(totalCost(base, level) * 0.7);
}

export function canAfford(money: number, cost: number) {
  return money >= cost;
}
