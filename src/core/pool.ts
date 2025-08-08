// eslint-disable-next-line no-unused-vars
type ResetFn<T> = (value: T) => void;

export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: ResetFn<T>;

  constructor(factory: () => T, reset: ResetFn<T>) {
    this.factory = factory;
    this.reset = reset;
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  size(): number {
    return this.pool.length;
  }
}
