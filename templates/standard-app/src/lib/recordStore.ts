import type { AppRecord } from '../types';

const STORE_NAME = 'records';

export class IndexedDbRecordStore {
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly databaseName = 'davy-lab-standard-app-v1') {}

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error('Could not open the local record database.'));
      };
      request.onblocked = () => reject(new Error('Database upgrade is blocked by another open tab.'));
    });
    return this.databasePromise;
  }

  async list(): Promise<AppRecord[]> {
    const db = await this.open();
    return new Promise<AppRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll() as IDBRequest<AppRecord[]>;
      let records: AppRecord[] = [];
      request.onsuccess = () => { records = request.result; };
      request.onerror = () => reject(request.error ?? new Error('Could not read local records.'));
      tx.oncomplete = () => resolve(records.sort((a, b) => b.updatedAt - a.updatedAt));
      tx.onerror = () => reject(tx.error ?? new Error('Local read transaction failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Local read transaction was aborted.'));
    });
  }

  async put(record: AppRecord): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not save the local record.'));
      tx.onabort = () => reject(tx.error ?? new Error('Local save transaction was aborted.'));
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not delete the local record.'));
      tx.onabort = () => reject(tx.error ?? new Error('Local delete transaction was aborted.'));
    });
  }

  close(): void {
    if (!this.databasePromise) return;
    void this.databasePromise.then((db) => db.close()).catch(() => undefined);
    this.databasePromise = null;
  }
}
