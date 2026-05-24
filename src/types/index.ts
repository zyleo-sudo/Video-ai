// Generation types
export type GenerationType = 'video' | 'image';

// Video generation models
export type VideoModel = 'veo' | 'sora' | 'grok';

// Image generation models
export type ImageModel = 'image2';

// Veo sub-model types (支持两种 API 格式)
// OpenAI 格式: veo_3_1, veo_3_1-fast, veo_3_1-fast-4K, veo_3_1-pro
// 统一格式: veo3.1-fast, veo3.1-pro, veo3.1-4k, veo3.1-fast-components
export type VeoSubModel = 
  // OpenAI 格式
  | 'veo_3_1' 
  | 'veo_3_1-fast' 
  | 'veo_3_1-fast-4K' 
  | 'veo_3_1-pro'
  // 统一格式
  | 'veo3.1-fast'
  | 'veo3.1-pro'
  | 'veo3.1-4k'
  | 'veo3.1-pro-4k'
  | 'veo3.1-fast-components';

// Sora sub-model types
export type SoraSubModel = 'sora-2-all';

// Grok sub-model types
export type GrokSubModel = 'grok-video-3';

// Image sub-model types
export type ImageSubModel = 'image2';

// Generation status
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Veo generation options
export interface VeoOptions {
  subModel?: VeoSubModel;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number; // in seconds
  negativePrompt?: string;
  guidanceScale?: number;
  imageType?: 'reference' | 'start-end'; // image type for image-to-video
}

// Sora generation options
export interface SoraOptions {
  subModel?: SoraSubModel;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration?: number; // in seconds
  resolution?: '480p' | '720p' | '1080p';
}

// Grok generation options
export interface GrokOptions {
  subModel?: GrokSubModel;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number; // in seconds, max 10s
  audioEnabled?: boolean; // 音画同出
}

// Image generation options
export interface ImageOptions {
  subModel?: ImageSubModel;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: '720P' | '1080P' | '2K' | '4K';
  negativePrompt?: string;
  seed?: number;
}

// Video generation task
export interface VideoTask {
  id: string;
  prompt: string;
  model: VideoModel | ImageModel;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  progress?: number;
  options?: VeoOptions | SoraOptions | GrokOptions | ImageOptions;
  imageData?: string; // base64 image for image-to-video
  position?: { x: number; y: number }; // position on the canvas
  generationType?: GenerationType; // 'video' or 'image'
  batchId?: string;
  sourceTaskId?: string;
  batchLabel?: string;
}

// History record
export interface HistoryRecord {
  id: string;
  prompt: string;
  model: VideoModel | ImageModel;
  createdAt: Date;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  options?: VeoOptions | SoraOptions | GrokOptions | ImageOptions;
  generationType?: GenerationType;
  batchId?: string;
  sourceTaskId?: string;
  batchLabel?: string;
}

// Download item
export interface DownloadItem {
  id: string;
  taskId: string;
  videoUrl: string;
  filename: string;
  progress: number;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
  downloadedBytes: number;
  totalBytes: number;
  createdAt: Date;
  completedAt?: Date;
  filePath?: string;
}

// Prompt template
export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  prompt: string;
  description?: string;
  variables?: string[]; // Variable names that can be replaced
}

// Storage keys
export const STORAGE_KEYS = {
  API_KEY: 'videoai_api_key',
  HISTORY: 'videoai_history',
  DOWNLOADS: 'videoai_downloads',
  SETTINGS: 'videoai_settings',
} as const;

// App settings
export interface AppSettings {
  apiKey: string;
  autoDownload: boolean;
  maxConcurrentTasks: number;
  defaultGenerationType: GenerationType;
  defaultModel: VideoModel | ImageModel;
  defaultImageModel: ImageModel;
  defaultVeoSubModel: VeoSubModel;
  defaultSoraSubModel: SoraSubModel;
  defaultGrokSubModel: GrokSubModel;
  defaultImageSubModel: ImageSubModel;
  defaultAspectRatio: string;
  apiBaseUrl: string;
}
