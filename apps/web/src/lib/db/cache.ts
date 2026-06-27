interface CacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}

export class AsyncTtlCache<T> {
  private entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > now) return existing.promise;

    const promise = load().catch((error) => {
      this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, { expiresAt: now + this.ttlMs, promise });
    return promise;
  }

  clear() {
    this.entries.clear();
  }
}
