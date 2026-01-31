// Generation types
export type GenerationType = 'video' | 'image';

// Video generation models
export type VideoModel = 'veo' | 'sora' | 'grok';

// Image generation models
export type ImageModel = 'gemini-3-pro';

// Veo sub-model types (OpenAI format)
export type VeoSubModel = 'veo_3_1' | 'veo_3_1-fast' | 'veo_3_1-fast-4K' | 'veo_3_1-pro';

// Sora sub-model types
export type SoraSubModel = 'sora-2-all';

// Grok sub-model types
export type GrokSubModel = 'grok-video-3';

// Gemini sub-model types
export type GeminiSubModel = 'gemini-3-pro-image-preview';

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

// Gemini image generation options
export interface GeminiOptions {
  subModel?: GeminiSubModel;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: '720P' | '1080P' | '2K' | '4K';
  negativePrompt?: string;
  seed?: number;
}

// Video generation task
export interface VideoTask {
  id: string;
  prompt: string;
  model: VideoModel;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  progress?: number;
  options?: VeoOptions | SoraOptions | GrokOptions | GeminiOptions;
  imageData?: string; // base64 image for image-to-video
  position?: { x: number; y: number }; // position on the canvas
  generationType?: GenerationType; // 'video' or 'image'
}

// History record
export interface HistoryRecord {
  id: string;
  prompt: string;
  model: VideoModel;
  createdAt: Date;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  options?: VeoOptions | SoraOptions | GrokOptions | GeminiOptions;
  generationType?: GenerationType;
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
  defaultModel: VideoModel;
  defaultImageModel: ImageModel;
  defaultVeoSubModel: VeoSubModel;
  defaultSoraSubModel: SoraSubModel;
  defaultGrokSubModel: GrokSubModel;
  defaultGeminiSubModel: GeminiSubModel;
  defaultAspectRatio: string;
  apiBaseUrl: string;
}
