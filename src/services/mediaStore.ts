const IMAGE_STORE_DB = 'video-ai-media';
const IMAGE_STORE_NAME = 'images';
const IMAGE_REF_PREFIX = 'idb-image://';
const MAX_STORED_IMAGES = 120;
const MAX_IMAGE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TOTAL_IMAGE_BYTES = 300 * 1024 * 1024;

interface StoredImageRecord {
  blob: Blob;
  savedAt: number;
}

interface StoredImageEntry extends StoredImageRecord {
  id: string;
  size: number;
}

let prunePromise: Promise<void> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_STORE_DB, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to convert blob to data URL'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function listStoredImages(database: IDBDatabase): Promise<StoredImageEntry[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.openCursor();
    const entries: StoredImageEntry[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(entries);
        return;
      }

      const value = cursor.value as StoredImageRecord | undefined;
      if (value?.blob) {
        entries.push({
          id: String(cursor.primaryKey),
          blob: value.blob,
          savedAt: value.savedAt || 0,
          size: value.blob.size,
        });
      }

      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function getPruneIds(entries: StoredImageEntry[], reserveBytes: number): string[] {
  const now = Date.now();
  const deleteIds = new Set<string>();
  const sortedEntries = [...entries].sort((left, right) => left.savedAt - right.savedAt);

  let keptEntries = sortedEntries.filter((entry) => {
    const isExpired = entry.savedAt > 0 && now - entry.savedAt > MAX_IMAGE_AGE_MS;
    if (isExpired) {
      deleteIds.add(entry.id);
      return false;
    }

    return true;
  });

  let totalBytes = keptEntries.reduce((sum, entry) => sum + entry.size, 0);

  while (keptEntries.length > MAX_STORED_IMAGES || totalBytes + reserveBytes > MAX_TOTAL_IMAGE_BYTES) {
    const oldestEntry = keptEntries.shift();
    if (!oldestEntry) {
      break;
    }

    deleteIds.add(oldestEntry.id);
    totalBytes -= oldestEntry.size;
  }

  return [...deleteIds];
}

export async function pruneStoredImages(reserveBytes = 0): Promise<void> {
  if (prunePromise) {
    return prunePromise;
  }

  prunePromise = (async () => {
    let database: IDBDatabase | null = null;

    try {
      database = await openDatabase();
      const entries = await listStoredImages(database);
      const pruneIds = getPruneIds(entries, reserveBytes);

      if (pruneIds.length === 0) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction(IMAGE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IMAGE_STORE_NAME);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);

        pruneIds.forEach((id) => {
          store.delete(id);
        });
      });

      console.log(`[MediaStore] Pruned ${pruneIds.length} stored images`);
    } catch (error) {
      console.error('[MediaStore] Failed to prune stored images:', error);
    } finally {
      database?.close();
      prunePromise = null;
    }
  })();

  return prunePromise;
}

export function createImageRef(id: string): string {
  return `${IMAGE_REF_PREFIX}${id}`;
}

export function isImageRef(url?: string): boolean {
  return typeof url === 'string' && url.startsWith(IMAGE_REF_PREFIX);
}

export function getImageRefId(url: string): string {
  return isImageRef(url) ? url.slice(IMAGE_REF_PREFIX.length) : '';
}

export async function saveImageData(id: string, dataUrl: string): Promise<string> {
  let database: IDBDatabase | null = null;

  try {
    const blob = await dataUrlToBlob(dataUrl);
    await pruneStoredImages(blob.size);
    database = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.put({ blob, savedAt: Date.now() } as StoredImageRecord, id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    void pruneStoredImages();
    return createImageRef(id);
  } catch (error) {
    console.error('[MediaStore] Failed to save image data:', error);
    throw error;
  } finally {
    database?.close();
  }
}

export async function resolveImageUrl(url?: string): Promise<string> {
  if (!url || !isImageRef(url)) {
    return url || '';
  }

  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    const id = getImageRefId(url);
    const record = await new Promise<StoredImageRecord | null>((resolve, reject) => {
      const transaction = database!.transaction(IMAGE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as StoredImageRecord | undefined) || null);
      request.onerror = () => reject(request.error);
    });

    if (!record?.blob) {
      return '';
    }

    return URL.createObjectURL(record.blob);
  } catch (error) {
    console.error('[MediaStore] Failed to resolve image URL:', error);
    return '';
  } finally {
    database?.close();
  }
}

export async function resolveImageDataUrl(url?: string): Promise<string> {
  if (!url) {
    return '';
  }

  if (url.startsWith('data:image')) {
    return url;
  }

  if (isImageRef(url)) {
    let database: IDBDatabase | null = null;

    try {
      database = await openDatabase();
      const id = getImageRefId(url);
      const record = await new Promise<StoredImageRecord | null>((resolve, reject) => {
        const transaction = database!.transaction(IMAGE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve((request.result as StoredImageRecord | undefined) || null);
        request.onerror = () => reject(request.error);
      });

      if (!record?.blob) {
        return '';
      }

      return blobToDataUrl(record.blob);
    } catch (error) {
      console.error('[MediaStore] Failed to resolve image data URL:', error);
      return '';
    } finally {
      database?.close();
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch (error) {
    console.error('[MediaStore] Failed to fetch remote image data:', error);
    return '';
  }
}

export function releaseImageUrl(url?: string): void {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export async function deleteImageData(url?: string): Promise<void> {
  if (!url || !isImageRef(url)) {
    return;
  }

  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    const id = getImageRefId(url);
    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[MediaStore] Failed to delete image data:', error);
  } finally {
    database?.close();
  }
}
