import { POLLING_CONFIG } from '../utils/constants';
import { getSettings } from './storage';
import {
  VideoModel,
  VeoOptions,
  SoraOptions,
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
