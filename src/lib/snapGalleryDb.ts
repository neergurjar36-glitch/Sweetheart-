import { LastSnap } from '../types';

const DB_NAME = 'sweetheart_snaps_db';
const DB_VERSION = 1;
const STORE_NAME = 'past_snaps';

/**
 * Initializes and returns the IndexedDB instance for storing past snaps
 */
function openSnapDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'snapId' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('senderId', 'senderId', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open snaps IndexedDB'));
    };
  });
}

/**
 * Saves a single snap into the past snaps IndexedDB
 */
export async function saveSnapToDb(snap: LastSnap): Promise<void> {
  try {
    const db = await openSnapDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snap);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn('Failed to save snap to IndexedDB:', req.error);
        resolve(); // Don't crash
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('saveSnapToDb notice:', err);
  }
}

/**
 * Saves a list of snaps to IndexedDB (batch)
 */
export async function saveSnapsListToDb(snaps: LastSnap[]): Promise<void> {
  try {
    const db = await openSnapDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      snaps.forEach((s) => {
        if (s && s.snapId) {
          store.put(s);
        }
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch (err) {
    console.warn('saveSnapsListToDb notice:', err);
  }
}

/**
 * Retrieves all past snaps from IndexedDB, sorted by createdAt descending
 */
export async function getAllSnapsFromDb(): Promise<LastSnap[]> {
  try {
    const db = await openSnapDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as LastSnap[]) || [];
        // Sort descending by createdAt
        results.sort((a, b) => {
          const tA = new Date(a.createdAt).getTime() || 0;
          const tB = new Date(b.createdAt).getTime() || 0;
          return tB - tA;
        });
        db.close();
        resolve(results);
      };

      req.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('getAllSnapsFromDb notice:', err);
    return [];
  }
}

/**
 * Deletes a snap from IndexedDB by snapId
 */
export async function deleteSnapFromDb(snapId: string): Promise<void> {
  try {
    const db = await openSnapDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(snapId);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('deleteSnapFromDb notice:', err);
  }
}
