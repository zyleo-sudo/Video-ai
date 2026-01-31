import { STORAGE_KEYS, AppSettings, HistoryRecord, DownloadItem, VideoTask } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

// API Key storage
export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
}

// Settings storage
export function getSettings(): AppSettings {
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
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

  // 对于 base64 图片，不保存到历史记录（避免 localStorage 配额溢出）
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
      return JSON.parse(stored).map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
      }));
    } catch {
      return [];
    }
  }
  return [];
}

export function setTasks(tasks: VideoTask[]): void {
  localStorage.setItem('videoai_tasks', JSON.stringify(tasks));
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
