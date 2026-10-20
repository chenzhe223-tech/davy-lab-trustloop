import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { IndexedDbRecordStore } from './recordStore';
import type { AppRecord } from '../types';

const databases: IndexedDbRecordStore[] = [];

function makeStore() {
  const store = new IndexedDbRecordStore('davy-standard-app-test-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  databases.push(store);
  return store;
}

function record(id: string, updatedAt: number): AppRecord {
  return {
    id, title: id, content: 'synthetic ' + id, version: 1,
    createdAt: updatedAt, updatedAt, deletedAt: null, syncState: 'local',
  };
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

describe('IndexedDbRecordStore', () => {
  it('persists records and lists newest updates first', async () => {
    const store = makeStore();
    await store.put(record('older', 10));
    await store.put(record('newer', 20));
    await expect(store.list()).resolves.toEqual([record('newer', 20), record('older', 10)]);
  });

  it('updates a record by stable ID instead of duplicating it', async () => {
    const store = makeStore();
    await store.put(record('stable-id', 10));
    await store.put({ ...record('stable-id', 20), version: 2, content: 'updated' });
    const rows = await store.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'stable-id', version: 2, content: 'updated' });
  });

  it('deletes only the requested local record', async () => {
    const store = makeStore();
    await store.put(record('keep', 10));
    await store.put(record('remove', 20));
    await store.delete('remove');
    await expect(store.list()).resolves.toEqual([record('keep', 10)]);
  });
});
