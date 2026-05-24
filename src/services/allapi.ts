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

function readNumber(object: JsonObject, key: string): number | undefined {
  const value = object[key];
  return typeof value === 'number' ? value : undefined;
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

type TaskQueryResult = {
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  progress?: number;
  errorMessage?: string;
};

function parseTaskQueryResult(data: unknown): TaskQueryResult {
  const object = asObject(data);

  return {
    status: mapStatus(readString(object, 'status')),
    videoUrl: readString(object, 'video_url') || readString(object, 'url'),
    thumbnailUrl: readString(object, 'cover_url') || readString(object, 'thumbnail_url'),
    progress: readNumber(object, 'progress'),
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

  if (taskId.startsWith('veo3')) {
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
  _subModel: string = 'grok-video-3',
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
      model: 'grok-video-3',
      prompt,
      aspect_ratio: options.aspectRatio === '9:16' ? '2:3' : options.aspectRatio === '1:1' ? '1:1' : '3:2',
      size: '720P',
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
  _apiKey: string,
  _prompt: string,
  _imageData: string,
  _subModel: string = 'grok-video-3',
  _options: Omit<GrokOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  throw new Error('Grok 图生视频当前不可用，请改用 Veo 或 Sora');
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
  model: string = 'deepseek-v4-flash'
): Promise<string> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是专业的视频提示词优化助手。请把用户的中文描述改写成更具体、更适合生成视频的提示词，只返回优化后的提示词。',
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
    throw new Error(extractMessage(data) || `Prompt optimize failed: ${response.status}`);
  }

  const object = asObject(data);
  const choices = asArray(object.choices);
  const firstChoice = asObject(choices[0]);
  const message = asObject(firstChoice.message);
  return readString(message, 'content') || prompt;
}

export async function batchOptimizePrompts(
  apiKey: string,
  prompt: string,
  count: number = 5,
  model: string = 'deepseek-v4-flash'
): Promise<string[]> {
  const { apiBaseUrl } = getSettings();
  const response = await authorizedFetch(apiKey, `${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `你是专业的视觉提示词助手。请基于用户给出的主题，输出 ${count} 条不同场景、不同构图或不同机位的中文提示词，用 --- 分隔。`,
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
    throw new Error(extractMessage(data) || `Batch prompt optimize failed: ${response.status}`);
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

function parseImageResponse(rawData: unknown): { taskId: string; status: TaskStatus; imageUrl?: string } {
  const object = asObject(rawData);
  let imageUrl: string | undefined;

  const data = asArray(object.data);
  if (data.length > 0) {
    imageUrl = readString(asObject(data[0]), 'url');
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
    imageUrl = readString(object, 'image_url') || readString(object, 'url');
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
  subModel: string = 'image2',
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
  const normalizedRefs = (Array.isArray(referenceImageData)
    ? referenceImageData
    : referenceImageData
      ? [referenceImageData]
      : [])
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);

  if (normalizedRefs.length > 0) {
    const response = await authorizedFetch(apiKey, `${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: subModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...normalizedRefs.map((url) => ({ type: 'image_url', image_url: { url } })),
            ],
          },
        ],
        response_modalities: ['image'],
        aspect_ratio: aspectRatio,
        width,
        height,
        image_size: { width, height },
        negative_prompt: options.negativePrompt || '',
      }),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(extractMessage(data) || `Image2 generation failed: ${response.status}`);
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
