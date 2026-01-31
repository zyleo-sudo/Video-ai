import { POLLING_CONFIG } from '../utils/constants';
import { getSettings } from './storage';
import {
  VideoModel,
  VeoOptions,
  SoraOptions,
  GrokOptions,
  TaskStatus,
} from '../types';

// Create Veo video generation task (OpenAI format)
export async function createVeoVideo(
  apiKey: string,
  prompt: string,
  subModel: string = 'veo_3_1-fast-4K',
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  // 使用 OpenAI 格式视频创建端点
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;

  // OpenAI格式需要使用FormData
  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(options.duration || 2));
  formData.append('watermark', 'false');

  // 转换宽高比为OpenAI格式
  const ratioMap: Record<string, string> = {
    '16:9': '16x9',
    '9:16': '9x16',
    '1:1': '1x1',
  };
  formData.append('size', ratioMap[options.aspectRatio || '16:9'] || '16x9');

  console.log('[API] 调用 Veo 视频生成 API (OpenAI格式)');
  console.log('[API] URL:', url);
  console.log('[API] 子模型:', subModel);
  console.log('[API] FormData: model=', subModel, 'prompt=', prompt, 'seconds=', String(options.duration || 2), 'size=', ratioMap[options.aspectRatio || '16:9']);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  console.log('[API] 响应状态:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error('[API] 错误响应:', error);
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('[API] 成功响应原始数据:', JSON.stringify(rawData, null, 2));
  return {
    taskId: rawData.id,
    status: mapVeoStatus(rawData.status),
  };
}

// Create Veo video with image input (OpenAI format)
export async function createVeoVideoWithImage(
  apiKey: string,
  prompt: string,
  imageData: string,
  subModel: string = 'veo_3_1-fast-4K',
  options: Omit<VeoOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  // 使用 OpenAI 格式视频创建端点 (multipart/form-data)
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;

  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(options.duration || 2));
  formData.append('watermark', 'false');

  // 转换宽高比为OpenAI格式
  const ratioMap: Record<string, string> = {
    '16:9': '16x9',
    '9:16': '9x16',
    '1:1': '1x1',
  };
  formData.append('size', ratioMap[options.aspectRatio || '16:9'] || '16x9');

  // 将base64图片转换为Blob
  const imageBlob = base64ToBlob(imageData);
  formData.append('input_reference', imageBlob, 'reference.png');

  console.log('[API] 调用 Veo 图片转视频 API (OpenAI格式)');
  console.log('[API] URL:', url);
  console.log('[API] 子模型:', subModel);
  console.log('[API] 提示词:', prompt);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    console.log('[API] 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[API] 错误响应:', error);
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('[API] 成功响应原始数据:', JSON.stringify(rawData, null, 2));
    return {
      taskId: rawData.id,
      status: mapVeoStatus(rawData.status),
    };
  } catch (error) {
    console.error('[API] 请求失败:', error);
    throw error;
  }
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Query Veo task status (OpenAI format)
export async function queryVeoTask(
  apiKey: string,
  taskId: string,
  _model: string = 'veo_3_1-fast-4K'
): Promise<{
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  progress?: number;
  errorMessage?: string;
}> {
  // 使用 OpenAI 格式查询端点
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos/${taskId}`;

  console.log('[API] 查询 Veo 任务状态 (OpenAI格式)');
  console.log('[API] URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  console.log('[API] 查询响应状态:', response.status, response.statusText);

  if (!response.ok) {
    throw new Error(`Failed to query task: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('[API] 查询响应原始数据:', JSON.stringify(rawData, null, 2));

  // OpenAI格式API返回 { id, status, video_url, enhanced_prompt, status_update_time, progress, error }
  return {
    status: mapVeoStatus(rawData.status),
    videoUrl: rawData.video_url || undefined,
    thumbnailUrl: undefined,
    duration: rawData.seconds ? parseInt(rawData.seconds) : undefined,
    progress: rawData.progress !== undefined ? rawData.progress : undefined,
    errorMessage: rawData.error?.message || undefined,
  };
}

// Create Sora video generation task
export async function createSoraVideo(
  apiKey: string,
  prompt: string,
  subModel: string = 'sora-2-all',
  _options: Omit<SoraOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  // 使用 Veo 相同的视频创建端点
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;

  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(_options.duration || 10));
  formData.append('watermark', 'false');

  // 转换宽高比
  const ratioMap: Record<string, string> = {
    '16:9': '16x9',
    '9:16': '9x16',
    '1:1': '1x1',
    '4:3': '4x3',
    '3:4': '3x4',
  };
  formData.append('size', ratioMap[_options.aspectRatio || '16:9'] || '16x9');

  console.log('[API] 调用 Sora 视频生成 API');
  console.log('[API] URL:', url);
  console.log('[API] 子模型:', subModel);
  console.log('[API] 提示词:', prompt);
  console.log('[API] 时长:', _options.duration || 10);
  console.log('[API] 宽高比:', ratioMap[_options.aspectRatio || '16:9']);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  console.log('[API] 响应状态:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error('[API] 错误响应:', error);
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('[API] 成功响应原始数据:', JSON.stringify(rawData, null, 2));
  return {
    taskId: rawData.id,
    status: mapSoraStatus(rawData.status),
  };
}

// Create Sora video with image input
export async function createSoraVideoWithImage(
  apiKey: string,
  prompt: string,
  imageData: string,
  subModel: string = 'sora-2-all',
  _options: Omit<SoraOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  // 使用视频创建端点
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;

  const formData = new FormData();
  formData.append('model', subModel);
  formData.append('prompt', prompt);
  formData.append('seconds', String(_options.duration || 10));
  formData.append('watermark', 'false');

  // 转换宽高比
  const ratioMap: Record<string, string> = {
    '16:9': '16x9',
    '9:16': '9x16',
    '1:1': '1x1',
    '4:3': '4x3',
    '3:4': '3x4',
  };
  formData.append('size', ratioMap[_options.aspectRatio || '16:9'] || '16x9');

  // 将base64图片转换为Blob
  const imageBlob = base64ToBlob(imageData);
  formData.append('input_reference', imageBlob, 'reference.png');

  console.log('[API] 调用 Sora 图片转视频 API');
  console.log('[API] URL:', url);
  console.log('[API] 子模型:', subModel);
  console.log('[API] 提示词:', prompt);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    console.log('[API] 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[API] 错误响应:', error);
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('[API] 成功响应原始数据:', JSON.stringify(rawData, null, 2));
    return {
      taskId: rawData.id,
      status: mapSoraStatus(rawData.status),
    };
  } catch (error) {
    console.error('[API] 请求失败:', error);
    throw error;
  }
}

// Create Grok video generation task
export async function createGrokVideo(
  apiKey: string,
  prompt: string,
  _subModel: string = 'grok-video-3',
  options: Omit<GrokOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/video/create`;

  // Grok API 使用 JSON 格式
  // 转换宽高比：Grok 支持 "2:3", "3:2", "1:1"
  const ratioMap: Record<string, string> = {
    '16:9': '3:2',  // 横向视频
    '9:16': '2:3',  // 竖向视频
    '1:1': '1:1',   // 方形
  };

  const requestBody = {
    model: 'grok-video-3',
    prompt: prompt,
    aspect_ratio: ratioMap[options.aspectRatio || '16:9'] || '3:2',
    size: '720P',  // 只支持 720P
    images: [],  // 纯文本生成时为空数组
  };

  console.log('[API] 调用 Grok 视频生成 API');
  console.log('[API] URL:', url);
  console.log('[API] 模型:', requestBody.model);
  console.log('[API] 请求体:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[API] 响应状态:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error('[API] 错误响应:', error);
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('[API] 成功响应原始数据:', JSON.stringify(rawData, null, 2));
  return {
    taskId: rawData.id,
    status: mapGrokStatus(rawData.status),
  };
}

// Create Grok video with image input
// NOTE: Grok API 目前只支持图片 URL，不支持 base64 直接上传
// 如果需要图片转视频功能，需要先将图片上传到可访问的 URL
export async function createGrokVideoWithImage(
  _apiKey: string,
  _prompt: string,
  _imageData: string,
  _subModel: string = 'grok-video-3',
  _options: Omit<GrokOptions, 'subModel'> = {}
): Promise<{ taskId: string; status: TaskStatus }> {
  console.error('[API] Grok 图片转视频需要图片 URL，当前不支持 base64 上传');
  throw new Error('Grok 图片转视频暂未支持，请先使用文字生成');
}

// Query Grok task status
export async function queryGrokTask(
  apiKey: string,
  taskId: string,
  _model: string = 'grok-video-3-10s'
): Promise<{
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  progress?: number;
  errorMessage?: string;
}> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/video/query?id=${taskId}`;

  console.log('[API] 查询 Grok 任务状态');
  console.log('[API] URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  console.log('[API] 查询响应状态:', response.status, response.statusText);

  if (!response.ok) {
    throw new Error(`Failed to query task: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('[API] 查询响应原始数据:', JSON.stringify(rawData, null, 2));

  return {
    status: mapGrokStatus(rawData.status),
    videoUrl: rawData.video_url || undefined,
    thumbnailUrl: rawData.cover_url || undefined,
    progress: undefined,
    errorMessage: rawData.error?.message || undefined,
  };
}

// Query Sora task status
export async function querySoraTask(
  apiKey: string,
  taskId: string,
  _model: string = 'sora-2'
): Promise<{
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  progress?: number;
  errorMessage?: string;
}> {
  // 使用统一查询端点
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/video/query?id=${taskId}`;

  console.log('[API] 查询 Sora 任务状态');
  console.log('[API] URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  console.log('[API] 查询响应状态:', response.status, response.statusText);

  if (!response.ok) {
    throw new Error(`Failed to query task: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('[API] 查询响应原始数据:', JSON.stringify(rawData, null, 2));

  // API直接返回 { id, status, video_url, enhanced_prompt, status_update_time }
  return {
    status: mapSoraStatus(rawData.status),
    videoUrl: rawData.video_url || undefined,
    thumbnailUrl: undefined, // Sora API doesn't return cover_url in query response
    progress: undefined,
    errorMessage: rawData.error?.message || undefined,
  };
}

// Poll task status until completion
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
  duration?: number;
}> {
  let attempts = 0;
  let currentInterval = POLLING_CONFIG.interval;

  while (attempts < POLLING_CONFIG.maxAttempts) {
    try {
      const result =
        model === 'veo'
          ? await queryVeoTask(apiKey, taskId, apiModel || 'veo_3_1-fast-4K')
          : model === 'grok'
            ? await queryGrokTask(apiKey, taskId, apiModel || 'grok-video-3-10s')
            : await querySoraTask(apiKey, taskId, apiModel || 'sora-2');

      // 使用 API 返回的真实进度，如果没有则用计算值
      const progress = result.progress !== undefined ? result.progress : (attempts / POLLING_CONFIG.maxAttempts) * 100;
      onProgress?.(result.status, progress);

      if (result.status === 'completed') {
        return {
          status: result.status,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          progress: 100,
          ...(result as any).duration && { duration: (result as any).duration },
        };
      }

      if (result.status === 'failed') {
        return {
          status: 'failed',
          errorMessage: result.errorMessage || 'Video generation failed',
          progress: result.progress,
        };
      }

      // Exponential backoff
      await sleep(currentInterval);
      currentInterval *= POLLING_CONFIG.backoffMultiplier;
      attempts++;
    } catch (error) {
      console.error('[API] 轮询错误:', error);
      if (attempts >= POLLING_CONFIG.maxAttempts - 1) {
        throw error;
      }
      await sleep(currentInterval);
      attempts++;
    }
  }

  return {
    status: 'failed',
    errorMessage: 'Task timed out',
  };
}

// Helper functions
function mapVeoStatus(status: string): TaskStatus {
  const statusMap: Record<string, TaskStatus> = {
    pending: 'pending',
    processing: 'processing',
    succeeded: 'completed',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
    SUBMITTED: 'pending',
    QUEUED: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  };
  return statusMap[status] || 'pending';
}

function mapSoraStatus(status: string): TaskStatus {
  const statusMap: Record<string, TaskStatus> = {
    pending: 'pending',
    processing: 'processing',
    succeeded: 'completed',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
    SUBMITTED: 'pending',
    QUEUED: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  };
  return statusMap[status] || 'pending';
}

function mapGrokStatus(status: string): TaskStatus {
  const statusMap: Record<string, TaskStatus> = {
    pending: 'pending',
    processing: 'processing',
    succeeded: 'completed',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
    SUBMITTED: 'pending',
    QUEUED: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  };
  return statusMap[status] || 'pending';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Optimize prompt using OpenAI chat
export async function optimizePrompt(
  apiKey: string,
  prompt: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/chat/completions`;

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个专业的视频生成提示词优化专家。你的任务是将用户简单的中文描述转换为详细、生动、专业的视频生成提示词。请遵循以下原则：\n1. 保留核心主题和元素\n2. 增加细节描述（颜色、光线、氛围、动作等）\n3. 优化画面构图和镜头语言\n4. 确保提示词适合AI视频生成模型理解\n5. 只返回优化后的提示词，不要任何解释或额外内容'
      },
      {
        role: 'user',
        content: `请优化这个视频生成提示词：${prompt}`
      }
    ],
    temperature: 0.7,
    max_tokens: 500,
  };

  console.log('[API] 调用 OpenAI 聊天接口优化提示词');
  console.log('[API] URL:', url);
  console.log('[API] 原始提示词:', prompt);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[API] 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[API] 错误响应:', error);
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] 成功响应:', JSON.stringify(data, null, 2));

    const optimizedPrompt = data.choices?.[0]?.message?.content || prompt;
    console.log('[API] 优化后的提示词:', optimizedPrompt);

    return optimizedPrompt;
  } catch (error) {
    console.error('[API] 提示词优化失败:', error);
    throw error;
  }
}

// Batch optimize prompts - generate 5 variations
export async function batchOptimizePrompts(
  apiKey: string,
  prompt: string,
  model: string = 'gpt-4o-mini'
): Promise<string[]> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/chat/completions`;

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个专业的AI绘画提示词优化专家。用户的请求是同一个场景的批量生成，需要你生成5个不同角度/构图/风格的变体提示词。\n\n要求：\n1. 保持核心主题一致\n2. 每个变体在以下方面有所不同：\n   - 构图角度（特写/中景/远景）\n   - 光线氛围（清晨/黄昏/阴天/晴天）\n   - 艺术风格（写实/油画/水彩/赛博朋克等）\n   - 色彩调性（暖色/冷色/黑白/高饱和等）\n   - 情绪氛围（宁静/激烈/神秘/温馨等）\n3. 每个提示词详细且完整\n4. 用中文输出\n5. 直接返回5个提示词，用 "---" 分隔，不要有其他内容'
      },
      {
        role: 'user',
        content: `请为以下场景生成5个不同版本的绘画提示词：${prompt}`
      }
    ],
    temperature: 0.9,
    max_tokens: 2000,
  };

  console.log('[API] 调用批量提示词优化');
  console.log('[API] 原始提示词:', prompt);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || prompt;
    
    // 解析返回的内容，用 "---" 分隔
    const prompts = content.split('---').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    
    // 如果解析不到5个，就返回原始提示词的5个副本
    if (prompts.length < 2) {
      // 尝试用换行符分隔
      const lines = content.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 10);
      if (lines.length >= 2) {
        return lines.slice(0, 5);
      }
      // 如果还是不够，返回优化后的提示词和原始提示词的组合
      return [content, prompt, prompt, prompt, prompt].slice(0, 5);
    }
    
    return prompts.slice(0, 5);
  } catch (error) {
    console.error('[API] 批量提示词优化失败:', error);
    // 失败时返回原始提示词的5个副本
    return [prompt, prompt, prompt, prompt, prompt];
  }
}

// Create Gemini image generation task
export async function createGeminiImage(
  apiKey: string,
  prompt: string,
  subModel: string = 'gemini-3-pro-image-preview',
  options: {
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    resolution?: '720P' | '1080P' | '2K' | '4K';
    negativePrompt?: string;
  } = {}
): Promise<{ taskId: string; status: TaskStatus; imageUrl?: string }> {
  const { apiBaseUrl } = getSettings();

  // 根据宽高比和分辨率计算正确的尺寸
  function calculateSize(res: string, ratio: string): string {
    const baseRes: Record<string, number> = {
      '720P': 720,
      '1080P': 1080,
      '2K': 1440,
      '4K': 2160,
    };
    const height = baseRes[res] || 1440;

    const ratioMap: Record<string, { w: number; h: number }> = {
      '1:1': { w: 1, h: 1 },
      '16:9': { w: 16, h: 9 },
      '9:16': { w: 9, h: 16 },
      '4:3': { w: 4, h: 3 },
      '3:4': { w: 3, h: 4 },
    };

    const r = ratioMap[ratio] || { w: 1, h: 1 };
    const width = Math.round(height * (r.w / r.h));

    return `${width}x${height}`;
  }

  const size = calculateSize(options.resolution || '2K', options.aspectRatio || '1:1');
  const aspectRatio = options.aspectRatio || '1:1';

  // 尝试使用专门的图像生成 API (/images/generations)
  let url = `${apiBaseUrl}/images/generations`;
  let requestBody: any = {
    model: subModel,
    prompt: prompt,
    size: size,
    n: 1,
  };

  // 如果 API 支持 aspect_ratio 参数
  if (aspectRatio !== '16:9') {
    requestBody.aspect_ratio = aspectRatio;
  }

  console.log('[API] 尝试使用 /images/generations 端点');
  console.log('[API] URL:', url);
  console.log('[API] 模型:', subModel);
  console.log('[API] 提示词:', prompt);
  console.log('[API] 参数:', { size, aspectRatio });
  console.log('[API] 请求体:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[API] 响应状态:', response.status, response.statusText);

    // 如果 /images/generations 不支持，回退到 /chat/completions
    if (response.status === 404 || response.status === 400) {
      console.log('[API] /images/generations 不支持，回退到 /chat/completions');

      url = `${apiBaseUrl}/chat/completions`;
      requestBody = {
        model: subModel,
        messages: [{ role: 'user', content: prompt }],
        response_modalities: ['image'],
        size: size,
        aspect_ratio: aspectRatio,
        negative_prompt: options.negativePrompt || '',
        temperature: 0.7,
      };

      console.log('[API] Fallback 请求体:', JSON.stringify(requestBody, null, 2));

      const fallbackResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!fallbackResponse.ok) {
        const error = await fallbackResponse.json().catch(() => ({ message: fallbackResponse.statusText }));
        console.error('[API] Fallback 也失败:', error);
        throw new Error(error.message || `API error: ${fallbackResponse.status}`);
      }

      const rawData = await fallbackResponse.json();
      console.log('[API] Fallback 响应成功');
      return parseImageResponse(rawData);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[API] 错误响应:', error);
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('[API] 成功响应原始数据:', JSON.stringify(rawData, null, 2));
    return parseImageResponse(rawData);

  } catch (error) {
    console.error('[API] 图像生成失败:', error);
    throw error;
  }
}

// 解析图片响应
function parseImageResponse(rawData: any): { taskId: string; status: TaskStatus; imageUrl?: string } {
  let imageUrl = null;

  // 检查 /images/generations 标准格式 (data 数组)
  if (rawData.data && Array.isArray(rawData.data) && rawData.data[0]?.url) {
    imageUrl = rawData.data[0].url;
  }
  // 检查 /chat/completions 格式
  else {
    const content = rawData.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'image_url' && item.image_url?.url) {
          imageUrl = item.image_url.url;
          break;
        }
      }
    } else if (content && typeof content === 'string') {
      if (content.startsWith('data:image') || content.startsWith('http')) {
        imageUrl = content;
      } else if (content.includes('![') && content.includes('](')) {
        const match = content.match(/!\[.*?\]\(([^)]+)\)/);
        if (match && match[1]) {
          imageUrl = match[1];
        }
      }
    }

    if (!imageUrl) {
      imageUrl = rawData.image_url || rawData.url;
    }
  }

  console.log('[API] 解析后的图片 URL:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'null');

  const taskId = generateId();
  return {
    taskId,
    status: 'completed' as TaskStatus,
    imageUrl,
  };
}

// Generate unique ID for image tasks
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validate API key
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const { apiBaseUrl } = getSettings();
    const response = await fetch(`${apiBaseUrl}/video/create?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.status !== 401;
  } catch {
    return false;
  }
}
