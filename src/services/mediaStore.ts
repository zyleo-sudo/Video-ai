const IMAGE_STORE_DB = 'video-ai-media';
const IMAGE_STORE_NAME = 'images';
const IMAGE_REF_PREFIX = 'idb-image://';

interface StoredImageRecord {
  blob: Blob;
  savedAt: number;
}

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
    database = await openDatabase();
    const blob = await dataUrlToBlob(dataUrl);

    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.put({ blob, savedAt: Date.now() } as StoredImageRecord, id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

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
