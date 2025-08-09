import { describe, it, expect, vi } from 'vitest';
import { GameScene } from './GameScene';
import { TOWERS, ENEMY_REWARD } from '../core/balance';

vi.mock('phaser', () => {
  class EventEmitter {
    on() {}
    emit() {}
  }
  return {
    default: { Scene: class {} },
    Events: { EventEmitter },
  };
});

function getScene() {
  const scene = new GameScene();
  // @ts-expect-error accessing private field for tests
  scene.money = 100;
  return scene;
}

describe('money flow', () => {
  it('deducts tower cost on spend', () => {
    const scene = getScene();
    const spendFn = (scene as unknown as { spendMoney: (_: number) => boolean }).spendMoney;
    const spend = spendFn.bind(scene);
    expect(spend(TOWERS.arrow.cost)).toBe(true);
    // @ts-expect-error reading private field
    expect(scene.money).toBe(100 - TOWERS.arrow.cost);
  });

  it('adds reward on kill', () => {
    const scene = getScene();
    // @ts-expect-error accessing private field
    scene.money = 0;
    const rewardFn = (scene as unknown as { gainKillReward: () => void }).gainKillReward;
    const reward = rewardFn.bind(scene);
    reward();
    // @ts-expect-error reading private field
    expect(scene.money).toBe(ENEMY_REWARD);
  });
});
