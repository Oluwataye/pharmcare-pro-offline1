/**
 * offlineQueue.ts
 * ---------------
 * Persistent offline operation queue backed by IndexedDB.
 * Replaces the localStorage('PENDING_OPERATIONS') pattern with a proper
 * key-value store that has no practical size limit for a POS context.
 *
 * API is intentionally promise-based and thin — it mirrors the old
 * localStorage calls so callers need minimal changes.
 */

export interface OfflineOperation {
  id?: number;            // auto-assigned by IndexedDB (keyPath)
  type: 'create' | 'update' | 'delete';
  resource: string;
  recordId?: string;      // the UUID of the target record (renamed from 'id' to avoid clash)
  data?: any;
  timestamp: number;
  synced: boolean;
}

const DB_NAME = 'pharmcare_offline_queue';
const STORE_NAME = 'pending_operations';
const DB_VERSION = 1;

// ---------- Internal helpers ----------

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Auto-increment integer key — lets us preserve insertion order for FIFO replay
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;

      // Handle DB being closed externally (e.g. browser upgrade)
      _db.onclose = () => { _db = null; };
      _db.onerror = (e) => console.error('[OfflineQueue] DB error:', e);

      resolve(_db);
    };

    request.onerror = (event) => {
      console.error('[OfflineQueue] Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---------- Public API ----------

/**
 * Append a new operation to the end of the queue.
 * Returns the auto-assigned integer id.
 */
export async function enqueueOperation(
  op: Omit<OfflineOperation, 'id' | 'timestamp' | 'synced'>
): Promise<number> {
  const record: Omit<OfflineOperation, 'id'> = {
    ...op,
    timestamp: Date.now(),
    synced: false,
  };
  return withStore('readwrite', (store) => store.add(record)) as Promise<number>;
}

/**
 * Return all queued operations in insertion order (FIFO).
 */
export async function getAllOperations(): Promise<OfflineOperation[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as OfflineOperation[]);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Remove a single operation by its auto-assigned integer id.
 */
export async function removeOperation(id: number): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

/**
 * Remove all operations. Used after a full successful sync.
 */
export async function clearAllOperations(): Promise<void> {
  await withStore('readwrite', (store) => store.clear());
}

/**
 * Returns true if the queue has at least one entry.
 */
export async function hasOperations(): Promise<boolean> {
  const count = await withStore<number>('readonly', (store) => store.count());
  return count > 0;
}
