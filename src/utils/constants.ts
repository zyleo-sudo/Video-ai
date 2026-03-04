import { VideoModel, ImageModel, AppSettings, VeoSubModel, SoraSubModel, GrokSubModel, GeminiSubModel } from '../types';

// ALLAPI configuration
export const ALLAPI_BASE_URL = 'https://allapi.store/v1';

// Veo sub-model configurations
// OpenAI 格式使用 /v1/videos 端点 (FormData)
// 统一格式使用 /v1/video/create 端点 (JSON)
export const VEO_SUB_MODELS: Record<VeoSubModel, {
  name: string;
  priceLabel: string;
  description: string;
  apiFormat: 'openai' | 'unified';  // API 格式类型
}> = {
  // OpenAI 格式模型
  'veo_3_1-fast': {
    name: 'Veo 3.1 Fast (OpenAI)',
    priceLabel: '¥¥',
    description: '快速模式 - 720p分辨率',
    apiFormat: 'openai',
  },
  'veo_3_1-fast-4K': {
    name: 'Veo 3.1 Fast 4K (OpenAI)',
    priceLabel: '¥¥¥',
    description: '4K高清 - 自动音频生成',
    apiFormat: 'openai',
  },
  'veo_3_1': {
    name: 'Veo 3.1 (OpenAI)',
    priceLabel: '¥¥¥¥',
    description: '高质量 - 专业级别',
    apiFormat: 'openai',
  },
  'veo_3_1-pro': {
    name: 'Veo 3.1 Pro (OpenAI)',
    priceLabel: '¥¥¥¥¥',
    description: '最高质量 - 专业级别+',
    apiFormat: 'openai',
  },
  // 统一格式模型
  'veo3.1-fast': {
    name: 'Veo 3.1 Fast',
    priceLabel: '¥¥',
    description: '快速模式 - 自动音频',
    apiFormat: 'unified',
  },
  'veo3.1-pro': {
    name: 'Veo 3.1 Pro',
    priceLabel: '¥¥¥¥',
    description: '高质量 - 专业级别',
    apiFormat: 'unified',
  },
  'veo3.1-4k': {
    name: 'Veo 3.1 4K',
    priceLabel: '¥¥¥',
    description: '4K高清 - 自动音频',
    apiFormat: 'unified',
  },
  'veo3.1-pro-4k': {
    name: 'Veo 3.1 Pro 4K',
    priceLabel: '¥¥¥¥¥',
    description: '最高质量 - 4K输出',
    apiFormat: 'unified',
  },
  'veo3.1-fast-components': {
    name: 'Veo 3.1 Fast Components',
    priceLabel: '¥¥¥',
    description: '组件模式 - 支持多图输入',
    apiFormat: 'unified',
  },
};

// Display order for Veo models
export const VEO_MODEL_ORDER: VeoSubModel[] = [
  // OpenAI 格式
  'veo_3_1-fast',
  'veo_3_1-fast-4K',
  'veo_3_1',
  'veo_3_1-pro',
  // 统一格式
  'veo3.1-fast',
  'veo3.1-4k',
  'veo3.1-pro',
  'veo3.1-pro-4k',
  'veo3.1-fast-components',
];

// Sora sub-model configurations
export const SORA_SUB_MODELS: Record<SoraSubModel, {
  name: string;
  priceLabel: string;
  description: string;
}> = {
  'sora-2-all': {
    name: 'Sora 2 All',
    priceLabel: '¥¥',
    description: '完整版 - 更多功能',
  },
};

// Grok sub-model configurations
export const GROK_SUB_MODELS: Record<GrokSubModel, {
  name: string;
  priceLabel: string;
  description: string;
}> = {
  'grok-video-3': {
    name: 'Grok Video 3',
    priceLabel: '¥¥',
    description: '10秒视频 - 支持音画同出 - 720P',
  },
};

// Gemini sub-model configurations
export const GEMINI_SUB_MODELS: Record<GeminiSubModel, {
  name: string;
  priceLabel: string;
  description: string;
}> = {
  'gemini-3.1-flash-image-preview': {
    name: 'Gemini 3.1 Flash Image Preview',
    priceLabel: '¥¥',
    description: 'Nano Banana 2升级版 - 支持2K/4K - 原生多模态',
  },
};

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  autoDownload: false,
  maxConcurrentTasks: 3,
  defaultGenerationType: 'video',
  defaultModel: 'veo',
  defaultImageModel: 'gemini-3.1-flash-image-preview',
  defaultVeoSubModel: 'veo_3_1-fast',
  defaultSoraSubModel: 'sora-2-all',
  defaultGrokSubModel: 'grok-video-3',
  defaultGeminiSubModel: 'gemini-3.1-flash-image-preview',
  defaultAspectRatio: '16:9',
  apiBaseUrl: 'https://allapi.store/v1',
};

// Aspect ratio options
export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 (Landscape)', width: 1920, height: 1080 },
  { value: '9:16', label: '9:16 (Portrait)', width: 1080, height: 1920 },
  { value: '1:1', label: '1:1 (Square)', width: 1080, height: 1080 },
  { value: '4:3', label: '4:3 (Standard)', width: 1440, height: 1080 },
  { value: '3:4', label: '3:4 (Vertical)', width: 1080, height: 1440 },
];

// Model configurations
export const MODEL_CONFIGS: Record<VideoModel, {
  name: string;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportsImage: boolean;
}> = {
  veo: {
    name: 'Google Veo',
    maxDuration: 8,
    supportedAspectRatios: ['16:9', '9:16'],
    supportsImage: true,
  },
  sora: {
    name: 'OpenAI Sora',
    maxDuration: 60,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    supportsImage: true,
  },
  grok: {
    name: 'Grok Video',
    maxDuration: 10,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportsImage: true,
  },
};

// Image model configurations
export const IMAGE_MODEL_CONFIGS: Record<ImageModel, {
  name: string;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  description: string;
}> = {
  'gemini-3-pro': {
    name: 'Gemini 3 Pro',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    supportedResolutions: ['720P', '1080P', '2K', '4K'],
    description: 'Nano Banana 2升级版 - 2K/4K输出',
  },
  'gemini-3.1-flash-image-preview': {
    name: 'Gemini 3.1 Flash Image Preview',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    supportedResolutions: ['720P', '1080P', '2K', '4K'],
    description: 'Nano Banana Pro image generation and editing model',
  },
};

// Resolution options for image generation
export const IMAGE_RESOLUTION_OPTIONS = [
  { value: '720P', label: '720P', width: 1280, height: 720 },
  { value: '1080P', label: '1080P', width: 1920, height: 1080 },
  { value: '2K', label: '2K (2048×2048)', width: 2048, height: 2048 },
  { value: '4K', label: '4K', width: 4096, height: 4096 },
];

// Duration options by model
export const DURATION_OPTIONS = {
  veo: [2, 4, 6, 8],
  sora: [5, 10, 15, 20, 30, 60],
  grok: [10],
};

// Polling configuration
export const POLLING_CONFIG = {
  interval: 2000, // ms
  maxAttempts: 180, // ~6 minutes for Veo, ~30 minutes for Sora
  backoffMultiplier: 1.1,
};

// Task status colors
export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Duration formatter
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

// Date formatter
export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
