/** Bounded process/browser cache. Expired keys are swept on every write. */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 256) {
    if (ttlMs <= 0 || !Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error('Cache TTL and capacity must be positive');
    }
  }

  get size() { return this.entries.size; }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    if (entry.expiresAt <= Date.now()) return undefined;
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.ttlMs): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(id);
    }
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + ttlMs });
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }
  }

  delete(key: string): void { this.entries.delete(key); }
  clear(): void { this.entries.clear(); }
}

export class AsyncTtlCache<T> {
  private entries: TtlCache<Promise<T>>;

  constructor(ttlMs: number, maxEntries = 256) {
    this.entries = new TtlCache(ttlMs, maxEntries);
  }

  get(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing) return existing;
    const promise = Promise.resolve().then(load).then(value => {
      if (this.entries.get(key) === promise) this.entries.set(key, promise);
      return value;
    }).catch((error) => {
      // A failed old request must not remove its newer replacement.
      if (this.entries.get(key) === promise) this.entries.delete(key);
      throw error;
    });
    // Pending work stays deduplicated; result freshness starts at completion.
    // Capacity eviction still bounds the number of pending entries retained.
    this.entries.set(key, promise, Infinity);
    return promise;
  }

  set(key: string, value: T): void { this.entries.set(key, Promise.resolve(value)); }
  clear(): void { this.entries.clear(); }
}
