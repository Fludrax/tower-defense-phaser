export type Factory<T> = () => T;
export type Resetter<T> = (item: T) => void;

export class ObjectPool<T> {
  private pool: T[] = [];
  constructor(
    private factory: Factory<T>,
    private reset: Resetter<T>,
  ) {}

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(item: T) {
    this.reset(item);
    this.pool.push(item);
  }

  clear() {
    this.pool.length = 0;
  }

  size() {
    return this.pool.length;
  }
}
