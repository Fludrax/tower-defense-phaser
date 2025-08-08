import { describe, it, expect } from 'vitest';
import { ObjectPool } from './pool';

class Dummy {
  value = 0;
}

describe('ObjectPool', () => {
  it('acquires and releases objects', () => {
    const pool = new ObjectPool(
      () => new Dummy(),
      (obj) => (obj.value = 0),
    );
    const a = pool.acquire();
    a.value = 42;
    pool.release(a);
    const b = pool.acquire();
    expect(b.value).toBe(0);
    expect(a).toBe(b);
    expect(pool.size()).toBe(0);
  });
});
