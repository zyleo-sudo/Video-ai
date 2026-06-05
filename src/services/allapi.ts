import { POLLING_CONFIG } from '../utils/constants';
import { getSettings, sanitizeApiKey } from './storage';
import {
  GrokOptions,
  SoraOptions,
  TaskStatus,
  VeoOptions,
  VeoSubModel,
  VideoModel,
} from '../types';

type JsonObject = Record<string, unknown>;

const UNIFIED_VEO_MODELS: VeoSubModel[] = [
  'veo3.1-fast',
  'veo3.1-pro',
  'veo3.1-4k',
  'veo3.1-pro-4k',
  'veo3.1-fast-components',
];

function isUnifiedVeoModel(model: VeoSubModel): boolean {
  return UNIFIED_VEO_MODELS.includes(model);
}

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null ? (value as JsonObject) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(object: JsonObject, key: string): string | undefined {
  const value = object[key];
  return typeof value === 'string' ? value : undefined;
}

function findFirstStringByKeys(value: unknown, keys: string[], depth: number = 0): string | undefined {
  if (depth > 6 || value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKeys(item, keys, depth + 1);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  const object = value as JsonObject;
  for (const key of keys) {
    const candidate = object[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  for (const nestedValue of Object.values(object)) {
    const found = findFirstStringByKeys(nestedValue, keys, depth + 1);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function findFirstNumberByKeys(value: unknown, keys: string[], depth: number = 0): number | undefined {
  if (depth > 6 || value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumberByKeys(item, keys, depth + 1);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  const object = value as JsonObject;
  for (const key of keys) {
    const candidate = object[key];
    if (typeof candidate === 'number') {
      return candidate;
    }
    if (typeof candidate === 'string' && candidate.trim() && !Number.isNaN(Number(candidate))) {
      return Number(candidate);
    }
  }

  for (const nestedValue of Object.values(object)) {
    const found = findFirstNumberByKeys(nestedValue, keys, depth + 1);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function normalizeHeaders(headersInit?: HeadersInit): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (!headersInit) {
    return normalized;
  }

  if (headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(headersInit)) {
    headersInit.forEach(([key, value]) => {
      normalized[key] = value;
    });
    return normalized;
  }

  Object.entries(headersInit).forEach(([key, value]) => {
    if (value !== undefined) {
      normalized[key] = value;
    }
  });

  return normalized;
}

function buildAuthorizationHeader(apiKey: string): string {
  const normalizedApiKey = sanitizeApiKey(apiKey);

  if (!normalizedApiKey) {
    throw new Error('API Key 不能为空，请重新输入');
  }

  if (/[^\u0000-\u00FF]/.test(normalizedApiKey)) {
    throw new Error('API Key 包含异常字符，请重新复制粘贴');
  }

  return `Bearer ${normalizedApiKey}`;
}

async function authorizedFetch(apiKey: string, input: string, init: RequestInit): Promise<Response> {
  const headers = normalizeHeaders(init.headers);
  headers.Authorization = buildAuthorizationHeader(apiKey);

  return fetch(input, {
    ...init,
    headers,
  });
}

function ratioToOpenAiSize(ratio: string): string {
  const ratioMap: Record<string, string> = {
    '16:9': '16x9',
    '9:16': '9x16',
    '1:1': '1x1',
    '4:3': '4x3',
    '3:4': '3x4',
  };

  return ratioMap[ratio] || '16x9';
}

function ratioToGrokAspectRatio(ratio: string): '3:2' | '2:3' | '1:1' {
  if (ratio === '9:16') {
    return '2:3';
  }
  if (ratio === '1:1') {
    return '1:1';
  }

  return '3:2';
}

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
  const bytes = atob(parts[1] || '');
  const buffer = new Uint8Array(bytes.length);

  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }

  return new Blob([buffer], { type: mime });
}

function appendImageEditField(formData: FormData, fieldName: string, imageData: string, index: number): void {
  const extension = imageData.includes('image/jpeg')
    ? 'jpg'
    : imageData.includes('image/webp')
      ? 'webp'
      : 'png';

  formData.append(fieldName, base64ToBlob(imageData), `reference-${index}.${extension}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapStatus(status: string | undefined): TaskStatus {
  const normalized = (status || '').toLowerCase();

  if (['completed', 'succeeded', 'success'].includes(normalized)) {
    return 'completed';
  }
  if (['failed', 'cancelled', 'canceled', 'error'].includes(normalized)) {
    return 'failed';
  }
  if (['processing', 'running', 'in_progress'].includes(normalized)) {
    return 'processing';
  }

  return 'pending';
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function extractMessage(data: unknown): string | undefined {
  const object = asObject(data);
  const direct = readString(object, 'message');
  if (direct) {
    return direct;
  }

  const errorText = readString(object, 'error');
  if (errorText) {
    return errorText;
  }

  const error = asObject(object.error);
  return readString(error, 'message');
}

function calculateImageDimensions(
  resolution: '720P' | '1080P' | '2K' | '4K',
  ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
): { width: number; height: number } {
  const longEdgeMap: Record<'720P' | '1080P' | '2K' | '4K', number> = {
    '720P': 1280,
    '1080P': 1920,
    '2K': 2048,
    '4K': 4096,
  };

  const ratioMap: Record<'1:1' | '16:9' | '9:16' | '4:3' | '3:4', { w: number; h: number }> = {
    '1:1': { w: 1, h: 1 },
    '16:9': { w: 16, h: 9 },
    '9:16': { w: 9, h: 16 },
    '4:3': { w: 4, h: 3 },
    '3:4': { w: 3, h: 4 },
  };

  const maxSide = longEdgeMap[resolution];
  const selectedRatio = ratioMap[ratio];

  if (selectedRatio.w >= selectedRatio.h) {
    return {
      width: maxSide,
      height: Math.round((maxSide * selectedRatio.h) / selectedRatio.w),
    };
  }

  return {
    width: Math.round((maxSide * selectedRatio.w) / selectedRatio.h),
    height: maxSide,
  };
}

function toGptImageSize(ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'): '1024x1024' | '1536x1024' | '1024x1536' {
  if (ratio === '1:1') {
    return '1024x1024';
  }

  return ratio === '16:9' || ratio === '4:3' ? '1536x1024' : '1024x1536';
}

type TaskQueryResult = {
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  progress?: number;
  errorMessage?: string;
};

function parseTaskQueryResult(data: unknown): TaskQueryResult {
  const object = asObject(data);
  const status = findFirstStringByKeys(data, ['status', 'state', 'task_status']);
  const videoUrl = findFirstStringByKeys(data, [
    'video_url',
    'videoUrl',
    'file_url',
    'download_url',
    'play_url',
    'media_url',
    'url',
    'src',
  ]);
  const thumbnailUrl = findFirstStringByKeys(data, [
    'cover_url',
    'thumbnail_url',
    'thumbnailUrl',
    'poster_url',
    'poster',
    'cover',
    'thumbnail',
  ]);
  const progress = findFirstNumberByKeys(data, ['progress', 'percentage', 'percent']);

  return {
    status: mapStatus(status || readString(object, 'status')),
    videoUrl,
    thumbnailUrl,
    progress,
    errorMessage: extractMessage(data),
  };
}

export async function createVeoVideo(
  apiKey: string,
  prompt: string,
  subModel: string = 'veo_3_1-fast',
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;
  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(options.duration || 4));
  formData.append('watermark', 'false');
  formData.append('size', ratioToOpenAiSize(options.aspectRatio || '16:9'));

  const response = await authorizedFetch(apiKey, url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Veo create failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

export async function createVeoVideoUnified(
  apiKey: string,
  prompt: string,
  subModel: VeoSubModel,
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/video/create`;

  const response = await authorizedFetch(apiKey, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: subModel,
      prompt,
      seconds: options.duration || 4,
      aspect_ratio: options.aspectRatio || '16:9',
      enhance_prompt: true,
    }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Veo unified create failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

export async function createVeoVideoAuto(
  apiKey: string,
  prompt: string,
  subModel: VeoSubModel = 'veo_3_1-fast',
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  return isUnifiedVeoModel(subModel)
    ? createVeoVideoUnified(apiKey, prompt, subModel, options)
    : createVeoVideo(apiKey, prompt, subModel, options);
}

export async function createVeoVideoWithImage(
  apiKey: string,
  prompt: string,
  imageData: string,
  subModel: string = 'veo_3_1-fast',
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  if (options.imageType === 'start-end' && options.imageData2) {
    return createVeoVideoUnifiedWithImages(
      apiKey,
      prompt,
      [imageData, options.imageData2],
      subModel as VeoSubModel,
      options
    );
  }

  if (isUnifiedVeoImageModel(subModel)) {
    return createVeoVideoUnifiedWithImages(
      apiKey,
      prompt,
      [imageData],
      subModel as VeoSubModel,
      options
    );
  }

  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;
  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(options.duration || 4));
  formData.append('watermark', 'false');
  formData.append('size', ratioToOpenAiSize(options.aspectRatio || '16:9'));
  formData.append('input_reference', base64ToBlob(imageData), 'reference.png');

  const response = await authorizedFetch(apiKey, url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Veo image-to-video failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

function isUnifiedVeoImageModel(model: string): boolean {
  return [
    ...UNIFIED_VEO_MODELS,
    'veo_3_1',
    'veo_3_1-fast',
    'veo_3_1-fast-4K',
    'veo_3_1-pro',
    'veo_3_1-components',
  ].includes(model as VeoSubModel | 'veo_3_1-components');
}

async function createVeoVideoUnifiedWithImages(
  apiKey: string,
  prompt: string,
  images: string[],
  subModel: VeoSubModel,
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/video/create`;
  const normalizedImages = images.filter((value) => value.trim().length > 0).slice(0, 2);

  if (normalizedImages.length === 0) {
    throw new Error('Veo 图生视频至少需要一张参考图');
  }

  const response = await authorizedFetch(apiKey, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: subModel,
      prompt,
      seconds: options.duration || 4,
      aspect_ratio: options.aspectRatio || '16:9',
      enhance_prompt: true,
      images: normalizedImages,
    }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Veo unified image-to-video failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

async function queryVeoTask(apiKey: string, taskId: string): Promise<TaskQueryResult> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/videos/${taskId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Query Veo task failed: ${response.status}`);
  }

  return parseTaskQueryResult(data);
}

async function queryVeoTaskUnified(apiKey: string, taskId: string): Promise<TaskQueryResult> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/video/query?id=${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Query unified Veo task failed: ${response.status}`);
  }

  return parseTaskQueryResult(data);
}

async function queryVeoTaskAuto(apiKey: string, taskId: string, model?: VeoSubModel): Promise<TaskQueryResult> {
  if (model && isUnifiedVeoModel(model)) {
    return queryVeoTaskUnified(apiKey, taskId);
  }

  if (taskId.startsWith('veo3') || taskId.startsWith('veo_3') || taskId.includes(':task_')) {
    return queryVeoTaskUnified(apiKey, taskId);
  }

  return queryVeoTask(apiKey, taskId);
}

export async function createSoraVideo(
  apiKey: string,
  prompt: string,
  subModel: string = 'sora-2-all',
  options: Omit<SoraOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;
  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(options.duration || 10));
  formData.append('watermark', 'false');
  formData.append('size', ratioToOpenAiSize(options.aspectRatio || '16:9'));

  const response = await authorizedFetch(apiKey, url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Sora create failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

export async function createSoraVideoWithImage(
  apiKey: string,
  prompt: string,
  imageData: string,
  subModel: string = 'sora-2-all',
  options: Omit<SoraOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;
  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(options.duration || 10));
  formData.append('watermark', 'false');
  formData.append('size', ratioToOpenAiSize(options.aspectRatio || '16:9'));
  formData.append('input_reference', base64ToBlob(imageData), 'reference.png');

  const response = await authorizedFetch(apiKey, url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Sora image-to-video failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

async function querySoraTask(apiKey: string, taskId: string): Promise<TaskQueryResult> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/videos/${taskId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Query Sora task failed: ${response.status}`);
  }

  return parseTaskQueryResult(data);
}

export async function createGrokVideo(
  apiKey: string,
  prompt: string,
  subModel: string = 'grok-video-3-10s',
  options: Omit<GrokOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/video/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: subModel,
      prompt,
      seconds: String(options.duration || 10),
      aspect_ratio: ratioToGrokAspectRatio(options.aspectRatio || '16:9'),
      size: '720P',
      enhance_prompt: true,
      images: [],
    }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Grok create failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

export async function createGrokVideoWithImage(
  apiKey: string,
  prompt: string,
  imageData: string,
  subModel: string = 'grok-video-3-10s',
  options: Omit<GrokOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  if (!imageData.trim()) {
    throw new Error('Grok 图生视频至少需要一张参考图');
  }

  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/video/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: subModel,
      prompt,
      seconds: String(options.duration || 10),
      aspect_ratio: ratioToGrokAspectRatio(options.aspectRatio || '16:9'),
      size: '720P',
      enhance_prompt: false,
      images: [imageData],
    }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Grok image-to-video failed: ${response.status}`);
  }

  const object = asObject(data);
  return {
    taskId: readString(object, 'id') || '',
    status: mapStatus(readString(object, 'status')),
  };
}

async function queryGrokTask(apiKey: string, taskId: string): Promise<TaskQueryResult> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/video/query?id=${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractMessage(data) || `Query Grok task failed: ${response.status}`);
  }

  return parseTaskQueryResult(data);
}

export async function pollTaskStatus(
  apiKey: string,
  model: VideoModel,
  taskId: string,
  apiModel?: string,
  onProgress?: (status: TaskStatus, progress: number) => void
): Promise<{
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  progress?: number;
}> {
  let attempts = 0;
  let interval = POLLING_CONFIG.interval;

  while (attempts < POLLING_CONFIG.maxAttempts) {
    const result = model === 'veo'
      ? await queryVeoTaskAuto(apiKey, taskId, apiModel as VeoSubModel | undefined)
      : model === 'grok'
        ? await queryGrokTask(apiKey, taskId)
        : await querySoraTask(apiKey, taskId);

    const progress = result.progress ?? Math.min(95, Math.round((attempts / POLLING_CONFIG.maxAttempts) * 100));
    onProgress?.(result.status, progress);

    if (result.status === 'completed') {
      return {
        status: 'completed',
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        progress: 100,
      };
    }

    if (result.status === 'failed') {
      return {
        status: 'failed',
        errorMessage: result.errorMessage || 'Video generation failed',
        progress,
      };
    }

    await sleep(interval);
    interval *= POLLING_CONFIG.backoffMultiplier;
    attempts += 1;
  }

  return {
    status: 'failed',
    errorMessage: 'Task timed out',
  };
}

export async function optimizePrompt(
  apiKey: string,
  prompt: string,
  model: string = 'gpt-5.5'
): Promise<string> {
  const { apiBaseUrl } = getSettings();
  const candidates = [model, 'gpt-5.5'].filter((value, index, list) => list.indexOf(value) === index);
  let lastError = '';

  for (const candidate of candidates) {
    const response = await authorizedFetch(apiKey, `${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: candidate,
        messages: [
          {
            role: 'system',
            content: 'You are a prompt optimization assistant. Rewrite the user description into a more specific prompt for image or video generation. Return only the optimized prompt in Chinese.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok) {
      const message = extractMessage(data) || `Prompt optimize failed: ${response.status}`;
      lastError = message;
      if (message.includes('无可用渠道') || message.toLowerCase().includes('no available channel')) {
        console.warn(`[API] Prompt optimize model ${candidate} unavailable, trying fallback.`);
        continue;
      }
      throw new Error(message);
    }

    const object = asObject(data);
    const choices = asArray(object.choices);
    const firstChoice = asObject(choices[0]);
    const message = asObject(firstChoice.message);
    return readString(message, 'content') || prompt;
  }

  throw new Error(lastError || 'Prompt optimize failed');
}

export async function batchOptimizePrompts(
  apiKey: string,
  prompt: string,
  count: number = 5,
  model: string = 'gpt-5.5'
): Promise<string[]> {
  const { apiBaseUrl } = getSettings();
  const candidates = [model, 'gpt-5.5'].filter((value, index, list) => list.indexOf(value) === index);
  let lastError = '';

  for (const candidate of candidates) {
    const response = await authorizedFetch(apiKey, `${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: candidate,
        messages: [
          {
            role: 'system',
            content: `You are a scene variation assistant. Based on the user topic, output ${count} different Chinese prompts with different scenes, compositions, or camera angles. Separate each prompt with ---.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok) {
      const message = extractMessage(data) || `Batch prompt optimize failed: ${response.status}`;
      lastError = message;
      if (message.includes('无可用渠道') || message.toLowerCase().includes('no available channel')) {
        console.warn(`[API] Batch optimize model ${candidate} unavailable, trying fallback.`);
        continue;
      }
      throw new Error(message);
    }

    const object = asObject(data);
    const choices = asArray(object.choices);
    const firstChoice = asObject(choices[0]);
    const message = asObject(firstChoice.message);
    const content = readString(message, 'content') || prompt;
    const prompts = content
      .split('---')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (prompts.length >= 2) {
      return prompts.slice(0, count);
    }

    return Array.from({ length: count }, () => prompt);
  }

  throw new Error(lastError || 'Batch prompt optimize failed');
}

function parseImageResponse(rawData: unknown): { taskId: string; status: TaskStatus; imageUrl?: string } {
  const object = asObject(rawData);
  let imageUrl: string | undefined;

  const data = asArray(object.data);
  if (data.length > 0) {
    const firstItem = asObject(data[0]);
    imageUrl = readString(firstItem, 'url');

    if (!imageUrl) {
      const base64Image = readString(firstItem, 'b64_json')
        || readString(firstItem, 'b64')
        || readString(firstItem, 'base64')
        || readString(firstItem, 'image_base64');

      if (base64Image) {
        imageUrl = `data:image/png;base64,${base64Image}`;
      }
    }
  }

  if (!imageUrl) {
    const choices = asArray(object.choices);
    const firstChoice = asObject(choices[0]);
    const message = asObject(firstChoice.message);
    const content = message.content;

    if (Array.isArray(content)) {
      for (const item of content) {
        const block = asObject(item);
        if (readString(block, 'type') === 'image_url') {
          const imageUrlObject = asObject(block.image_url);
          const candidate = readString(imageUrlObject, 'url');
          if (candidate) {
            imageUrl = candidate;
            break;
          }
        }
      }
    } else if (typeof content === 'string') {
      if (content.startsWith('data:image') || content.startsWith('http')) {
        imageUrl = content;
      } else {
        const markdownMatch = content.match(/!\[.*?\]\(([^)]+)\)/);
        imageUrl = markdownMatch?.[1];
      }
    }
  }

  if (!imageUrl) {
    imageUrl = findFirstStringByKeys(rawData, ['image_url', 'imageUrl', 'url']);
  }

  if (!imageUrl) {
    const base64Image = findFirstStringByKeys(rawData, ['b64_json', 'b64', 'base64', 'image_base64']);
    if (base64Image) {
      imageUrl = `data:image/png;base64,${base64Image}`;
    }
  }

  return {
    taskId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    status: 'completed',
    imageUrl,
  };
}

export async function createImage2Image(
  apiKey: string,
  prompt: string,
  subModel: string = 'gpt-image-2',
  options: {
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    resolution?: '720P' | '1080P' | '2K' | '4K';
    negativePrompt?: string;
  } = {},
  referenceImageData?: string | string[]
): Promise<{ taskId: string; status: TaskStatus; imageUrl?: string }> {
  const { apiBaseUrl } = getSettings();
  const aspectRatio = options.aspectRatio || '1:1';
  const resolution = options.resolution || '2K';
  const { width, height } = calculateImageDimensions(resolution, aspectRatio);
  const size = toGptImageSize(aspectRatio);
  const normalizedRefs = (Array.isArray(referenceImageData)
    ? referenceImageData
    : referenceImageData
      ? [referenceImageData]
      : [])
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);

  if (normalizedRefs.length > 0) {
    const formData = new FormData();
    formData.append('model', subModel);
    formData.append('prompt', prompt);
    formData.append('size', size);
    formData.append('aspect_ratio', aspectRatio);
    formData.append('width', String(width));
    formData.append('height', String(height));
    normalizedRefs.forEach((imageData, index) => {
      appendImageEditField(formData, 'image', imageData, index + 1);
    });

    const response = await authorizedFetch(apiKey, `${apiBaseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });

    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(extractMessage(data) || `Image2 edit failed: ${response.status}`);
    }

    return parseImageResponse(data);
  }

  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: subModel,
      prompt,
      n: 1,
      size,
      aspect_ratio: aspectRatio,
      width,
      height,
      image_size: { width, height },
    }),
  });

  const data = await parseJsonSafe(response);
  if (response.ok) {
    return parseImageResponse(data);
  }

  const fallbackResponse = await authorizedFetch(apiKey, `${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: subModel,
      messages: [{ role: 'user', content: prompt }],
      response_modalities: ['image'],
      aspect_ratio: aspectRatio,
      width,
      height,
      image_size: { width, height },
      negative_prompt: options.negativePrompt || '',
    }),
  });

  const fallbackData = await parseJsonSafe(fallbackResponse);
  if (!fallbackResponse.ok) {
    throw new Error(extractMessage(fallbackData) || `Image2 fallback failed: ${fallbackResponse.status}`);
  }

  return parseImageResponse(fallbackData);
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const { apiBaseUrl } = getSettings();
    const response = await authorizedFetch(apiKey, `${apiBaseUrl}/models`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.status !== 401;
  } catch {
    return false;
  }
}
