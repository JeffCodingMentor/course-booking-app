import { kv } from '@vercel/kv';

class MemoryDB {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  async get(key: string): Promise<unknown> {
    const val = this.store.get(key);
    return val ? JSON.parse(val) : null;
  }

  async set(key: string, value: unknown): Promise<string> {
    this.store.set(key, JSON.stringify(value));
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deletedStore = this.store.delete(key);
    const deletedSet = this.sets.delete(key);
    return (deletedStore || deletedSet) ? 1 : 0;
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    return set && set.has(member) ? 1 : 0;
  }

  async sadd(key: string, member: string): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    if (set.has(member)) return 0;
    set.add(member);
    return 1;
  }

  async srem(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    if (set && set.has(member)) {
      set.delete(member);
      return 1;
    }
    return 0;
  }

  async scard(key: string): Promise<number> {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  dump() {
    const storeObj: Record<string, unknown> = {};
    for (const [k, v] of this.store.entries()) {
      try {
        storeObj[k] = JSON.parse(v);
      } catch {
        storeObj[k] = v;
      }
    }
    const setsObj: Record<string, string[]> = {};
    for (const [k, v] of this.sets.entries()) {
      setsObj[k] = Array.from(v);
    }
    return { store: storeObj, sets: setsObj };
  }
}

const mockDbInstance = new MemoryDB();

export function getDB() {
  // If running in Vercel production with KV variables set, use @vercel/kv
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return kv;
  }
  // Otherwise return our mock in-memory database for offline tests
  return mockDbInstance;
}
