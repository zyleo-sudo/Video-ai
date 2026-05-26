import { STORAGE_KEYS, AppSettings, HistoryRecord, DownloadItem, VideoTask } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

const LEGACY_ALLAPI_BASE_URL = 'https://allapi.store/v1';
const YUNWU_BASE_URL = 'https://yunwu.ai/v1';

function sanitizeTaskForStorage(task: VideoTask): VideoTask {
  const sanitizedTask = { ...task };

  if (sanitizedTask.videoUrl?.startsWith('data:')) {
    sanitizedTask.videoUrl = '';
  }
  if (sanitizedTask.thumbnailUrl?.startsWith('data:')) {
    sanitizedTask.thumbnailUrl = '';
  }
  if (sanitizedTask.imageData?.startsWith('data:')) {
    sanitizedTask.imageData = undefined;
  }

  return sanitizedTask;
}

function sanitizeTasksForStorage(tasks: VideoTask[]): VideoTask[] {
  return tasks.map(sanitizeTaskForStorage);
}

// API Key storage
export function sanitizeApiKey(key: string): string {
  return key
    .replace(/^Bearer\s+/i, '')
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, '')
    .trim();
}

export function getApiKey(): string {
  return sanitizeApiKey(localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.API_KEY, sanitizeApiKey(key));
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
}

export function getOptimizeApiKey(): string {
  return sanitizeApiKey(localStorage.getItem(STORAGE_KEYS.OPTIMIZE_API_KEY) || '');
}

export function setOptimizeApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.OPTIMIZE_API_KEY, sanitizeApiKey(key));
}

export function getImageApiKey(): string {
  return sanitizeApiKey(localStorage.getItem(STORAGE_KEYS.IMAGE_API_KEY) || '');
}

export function setImageApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.IMAGE_API_KEY, sanitizeApiKey(key));
}

export function getVideoApiKey(): string {
  return sanitizeApiKey(localStorage.getItem(STORAGE_KEYS.VIDEO_API_KEY) || '');
}

export function setVideoApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.VIDEO_API_KEY, sanitizeApiKey(key));
}

// Settings storage
export function getSettings(): AppSettings {
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (stored) {
    try {
      const raw = JSON.parse(stored) as Record<string, unknown>;
      const parsed = { ...raw } as Record<string, unknown>;

      // Backward compatibility for old image model keys.
      if (parsed.defaultModel === 'gemini-3-pro-image-preview' || parsed.defaultModel === 'gemini-3.1-flash-image-preview') {
        parsed.defaultModel = 'image2';
      }
      if (parsed.defaultImageModel === 'gemini-3-pro-image-preview' || parsed.defaultImageModel === 'gemini-3.1-flash-image-preview') {
        parsed.defaultImageModel = 'image2';
      }
      if (parsed.defaultGeminiSubModel === 'gemini-3-pro-image-preview' || parsed.defaultGeminiSubModel === 'gemini-3.1-flash-image-preview') {
        parsed.defaultGeminiSubModel = 'image2';
      }
      if (parsed.defaultGeminiSubModel && !parsed.defaultImageSubModel) {
        parsed.defaultImageSubModel = parsed.defaultGeminiSubModel;
      }
      if (parsed.defaultImageSubModel === 'gemini-3-pro-image-preview' || parsed.defaultImageSubModel === 'gemini-3.1-flash-image-preview') {
        parsed.defaultImageSubModel = 'gpt-image-2';
      }
      if (parsed.defaultImageSubModel === 'image2') {
        parsed.defaultImageSubModel = 'gpt-image-2';
      }
      if (parsed.apiBaseUrl === LEGACY_ALLAPI_BASE_URL) {
        parsed.apiBaseUrl = YUNWU_BASE_URL;
      }
      if (typeof parsed.apiKey === 'string') {
        const normalizedLegacyKey = sanitizeApiKey(parsed.apiKey);
        if (!parsed.optimizeApiKey) {
          parsed.optimizeApiKey = normalizedLegacyKey;
        }
        if (!parsed.imageApiKey) {
          parsed.imageApiKey = normalizedLegacyKey;
        }
        if (!parsed.videoApiKey) {
          parsed.videoApiKey = normalizedLegacyKey;
        }
      }
      if (typeof parsed.optimizeApiKey === 'string') {
        parsed.optimizeApiKey = sanitizeApiKey(parsed.optimizeApiKey);
      }
      if (typeof parsed.imageApiKey === 'string') {
        parsed.imageApiKey = sanitizeApiKey(parsed.imageApiKey);
      }
      if (typeof parsed.videoApiKey === 'string') {
        parsed.videoApiKey = sanitizeApiKey(parsed.videoApiKey);
      }

      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

export function setSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
}

// History storage
export function getHistory(): HistoryRecord[] {
  const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt || Date.now()),
      }));
    } catch {
      return [];
    }
  }
  return [];
}

export function addHistory(record: HistoryRecord): void {
  const history = getHistory();

  // Do not persist base64 payloads in history to avoid localStorage quota issues.
  const recordToSave = { ...record };
  if (recordToSave.videoUrl?.startsWith('data:')) {
    recordToSave.videoUrl = '';
  }
  if (recordToSave.thumbnailUrl?.startsWith('data:')) {
    recordToSave.thumbnailUrl = '';
  }

  history.unshift(recordToSave); // Add to beginning
  // Keep only last 100 records
  if (history.length > 100) {
    history.pop();
  }
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export function deleteHistory(id: string): void {
  const history = getHistory().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

export function searchHistory(query: string): HistoryRecord[] {
  const history = getHistory();
  const lowerQuery = query.toLowerCase();
  return history.filter(r =>
    r.prompt.toLowerCase().includes(lowerQuery) ||
    r.model.toLowerCase().includes(lowerQuery)
  );
}

// Downloads storage
export function getDownloads(): DownloadItem[] {
  const stored = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt),
        completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
      }));
    } catch {
      return [];
    }
  }
  return [];
}

export function addDownload(item: DownloadItem): void {
  const downloads = getDownloads();
  downloads.unshift(item);
  localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
}

export function updateDownload(id: string, updates: Partial<DownloadItem>): void {
  const downloads = getDownloads();
  const index = downloads.findIndex(d => d.id === id);
  if (index !== -1) {
    downloads[index] = { ...downloads[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
  }
}

export function deleteDownload(id: string): void {
  const downloads = getDownloads().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
}

export function clearDownloads(): void {
  localStorage.removeItem(STORAGE_KEYS.DOWNLOADS);
}

export function clearCompletedDownloads(): void {
  const downloads = getDownloads().filter(d => d.status !== 'completed');
  localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
}

// Tasks storage
export function getTasks(): VideoTask[] {
  const stored = localStorage.getItem('videoai_tasks');
  if (stored) {
    try {
      const parsedTasks = JSON.parse(stored).map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
      }));

      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const filteredTasks = parsedTasks.filter((task: VideoTask) => (
        task.status !== 'failed' || task.createdAt.getTime() >= oneHourAgo
      ));

      if (filteredTasks.length !== parsedTasks.length) {
        setTasks(filteredTasks);
      }

      return filteredTasks;
    } catch {
      return [];
    }
  }
  return [];
}

export function setTasks(tasks: VideoTask[]): void {
  const sanitizedTasks = sanitizeTasksForStorage(tasks);

  try {
    localStorage.setItem('videoai_tasks', JSON.stringify(sanitizedTasks));
  } catch (error) {
    console.error('[Storage] Failed to persist tasks:', error);
    localStorage.setItem('videoai_tasks', JSON.stringify(sanitizedTasks.slice(0, 10)));
  }
}

export function addTask(task: VideoTask): void {
  const tasks = getTasks();
  tasks.unshift(task);
  // Keep only last 50 tasks
  if (tasks.length > 50) {
    tasks.pop();
  }
  setTasks(tasks);
}

export function updateTask(taskId: string, updates: Partial<VideoTask>): void {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    setTasks(tasks);
  }
}

export function deleteTask(taskId: string): void {
  const tasks = getTasks().filter(t => t.id !== taskId);
  setTasks(tasks);
}

export function clearTasks(): void {
  localStorage.removeItem('videoai_tasks');
}


