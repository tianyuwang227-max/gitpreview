export interface CacheConfig {
  maxSize: number;
  ttl: number;
  checkInterval: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timer;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize || 1000,
      ttl: config?.ttl || 3600000,
      checkInterval: config?.checkInterval || 300000,
    };

    this.startCleanup();
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    entry.lastAccessed = new Date();
    entry.accessCount++;
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.config.maxSize) {
      this.evict();
    }

    this.store.set(key, {
      key,
      value,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.createdAt.getTime() > this.config.ttl;
  }

  private evict(): void {
    const entries = Array.from(this.store.values());
    entries.sort((a, b) => {
      const aScore = a.accessCount / (Date.now() - a.lastAccessed.getTime());
      const bScore = b.accessCount / (Date.now() - b.lastAccessed.getTime());
      return aScore - bScore;
    });

    const toRemove = Math.ceil(this.config.maxSize * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.store.delete(entries[i].key);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      for (const [key, entry] of this.store.entries()) {
        if (this.isExpired(entry)) {
          this.store.delete(key);
        }
      }
    }, this.config.checkInterval);
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer as unknown as number);
    }
  }

  getStats() {
    const entries = Array.from(this.store.values());
    return {
      size: this.store.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      totalAccesses: entries.reduce((sum, e) => sum + e.accessCount, 0),
    };
  }
}

export const repoCache = new Cache<any>({
  maxSize: 100,
  ttl: 3600000,
});

export const screenshotCache = new Cache<any>({
  maxSize: 500,
  ttl: 86400000,
});
