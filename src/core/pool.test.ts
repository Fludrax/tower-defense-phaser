import { describe, it, expect } from 'vitest';
import { ObjectPool } from './pool';

describe('ObjectPool', () => {
  it('reuses released objects', () => {
    let counter = 0;
    const pool = new ObjectPool(
      () => ({ id: counter++ }),
      () => {},
    );
    const a = pool.acquire();
    pool.acquire();
    pool.release(a);
    const c = pool.acquire();
    expect(c).toBe(a);
    expect(pool.size()).toBe(0);
    expect(counter).toBe(2);
  });
});
