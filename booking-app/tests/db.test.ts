import { getDB } from '../lib/db';

describe('Database Driver', () => {
  it('should set and get values correctly', async () => {
    const db = getDB();
    await db.set('test_key', 'hello');
    const val = await db.get('test_key');
    expect(val).toBe('hello');
  });

  it('should delete values correctly', async () => {
    const db = getDB();
    await db.set('delete_key', 'value');
    expect(await db.get('delete_key')).toBe('value');
    const delResult = await db.del('delete_key');
    expect(delResult).toBe(1);
    expect(await db.get('delete_key')).toBeNull();
  });

  it('should manage sets correctly', async () => {
    const db = getDB();
    const setKey = 'test_set';

    // Add elements
    expect(await db.sadd(setKey, 'a')).toBe(1);
    expect(await db.sadd(setKey, 'a')).toBe(0); // already exists
    expect(await db.sadd(setKey, 'b')).toBe(1);

    // Card
    expect(await db.scard(setKey)).toBe(2);

    // Is member
    expect(await db.sismember(setKey, 'a')).toBe(1);
    expect(await db.sismember(setKey, 'c')).toBe(0);

    // Remove
    expect(await db.srem(setKey, 'a')).toBe(1);
    expect(await db.srem(setKey, 'a')).toBe(0); // already removed
    expect(await db.scard(setKey)).toBe(1);
  });
});
