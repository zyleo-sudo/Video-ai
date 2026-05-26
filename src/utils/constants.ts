import {
  AppSettings,
  GrokSubModel,
  ImageModel,
  ImageSubModel,
  TaskStatus,
  SoraSubModel,
  VeoSubModel,
  VideoModel,
} from '../types';

export const ALLAPI_BASE_URL = 'https://yunwu.ai/v1';

export const VEO_SUB_MODELS: Record<VeoSubModel, { name: string }> = {
  veo_3_1: { name: 'Veo 3.1' },
  'veo_3_1-fast': { name: 'Veo 3.1 Fast' },
  'veo_3_1-fast-4K': { name: 'Veo 3.1 Fast 4K' },
  'veo_3_1-pro': { name: 'Veo 3.1 Pro' },
  'veo_3_1-components': { name: 'Veo 3.1 Components' },
  'veo3.1-fast': { name: 'Veo 3.1 Fast (Unified)' },
  'veo3.1-pro': { name: 'Veo 3.1 Pro (Unified)' },
  'veo3.1-4k': { name: 'Veo 3.1 4K (Unified)' },
  'veo3.1-pro-4k': { name: 'Veo 3.1 Pro 4K (Unified)' },
  'veo3.1-fast-components': { name: 'Veo 3.1 Fast Components' },
};

export const SORA_SUB_MODELS: Record<SoraSubModel, { name: string }> = {
  'sora-2-all': { name: 'Sora 2 All' },
};

export const GROK_SUB_MODELS: Record<GrokSubModel, { name: string }> = {
  'grok-video-3': { name: 'Grok Video 3' },
};

export const IMAGE_SUB_MODELS: Record<ImageSubModel, { name: string }> = {
  'gpt-image-2': { name: 'Image2' },
};

export const MODEL_CONFIGS: Record<VideoModel, { name: string; supportsImage: boolean }> = {
  veo: {
    name: 'Veo',
    supportsImage: true,
  },
  sora: {
    name: 'Sora',
    supportsImage: true,
  },
  grok: {
    name: 'Grok',
    supportsImage: false,
  },
};

export const IMAGE_MODEL_CONFIGS: Record<ImageModel, { name: string; supportsImage: boolean }> = {
  image2: {
    name: 'Image2',
    supportsImage: true,
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  optimizeApiKey: '',
  imageApiKey: '',
  videoApiKey: '',
  autoDownload: false,
  maxConcurrentTasks: 3,
  defaultGenerationType: 'video',
  defaultModel: 'veo',
  defaultImageModel: 'image2',
  defaultVeoSubModel: 'veo_3_1-fast',
  defaultSoraSubModel: 'sora-2-all',
  defaultGrokSubModel: 'grok-video-3',
  defaultImageSubModel: 'gpt-image-2',
  defaultAspectRatio: '16:9',
  apiBaseUrl: ALLAPI_BASE_URL,
};

export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '1:1', label: '1:1 方图' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
] as const;

export const IMAGE_RESOLUTION_OPTIONS = [
  { value: '720P', label: '720P' },
  { value: '1080P', label: '1080P' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const;

export const DURATION_OPTIONS: Record<VideoModel, number[]> = {
  veo: [4, 5, 6, 8],
  sora: [5, 10, 15],
  grok: [5, 10],
};

export const POLLING_CONFIG = {
  interval: 5000,
  maxAttempts: 60,
  backoffMultiplier: 1.1,
} as const;

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
