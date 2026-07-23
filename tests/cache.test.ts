import { Cache } from '../src/utils/cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({
      maxSize: 3,
      ttl: 1000,
    });
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('should delete values', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should evict when maxSize is reached', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');

    expect(cache.size()).toBeLessThanOrEqual(3);
  });

  it('should return stats', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(3);
  });
});
