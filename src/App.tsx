import { useCallback, useEffect, useMemo, useState } from 'react';
import { PromptTemplates } from './components/PromptTemplates';
import { VideoHistory } from './components/VideoHistory';
import { CanvasWorkspace } from './components/layout/CanvasWorkspace';
import { BottomEditor } from './components/layout/BottomEditor';
import { RightRail } from './components/layout/RightRail';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import {
  AppSettings,
  GenerationType,
  GrokSubModel,
  ImageModel,
  ImageSubModel,
  SoraSubModel,
  VeoSubModel,
  VideoModel,
  VideoTask,
} from './types';
import {
  batchOptimizePrompts,
  createGrokVideo,
  createGrokVideoWithImage,
  createImage2Image,
  createSoraVideo,
  createSoraVideoWithImage,
  createVeoVideoAuto,
  createVeoVideoWithImage,
  pollTaskStatus,
} from './services/allapi';
import {
  addHistory,
  addTask as addTaskToStorage,
  getApiKey,
  getImageApiKey,
  getOptimizeApiKey,
  getSettings,
  getTasks as getTasksFromStorage,
  getVideoApiKey,
  setApiKey as setApiKeyToStorage,
  setImageApiKey as setImageApiKeyToStorage,
  setOptimizeApiKey as setOptimizeApiKeyToStorage,
  setSettings as setSettingsToStorage,
  setTasks as setTasksToStorage,
  setVideoApiKey as setVideoApiKeyToStorage,
} from './services/storage';
import { generateId } from './utils/constants';
import {
  deleteImageData,
  pruneStoredImages,
  releaseImageUrl,
  resolveImageDataUrl,
  resolveImageUrl,
  saveImageData,
} from './services/mediaStore';

type NavItemType = 'generate' | 'templates' | 'tasks' | 'history' | 'settings';

interface GenerateData {
  generationType: GenerationType;
  model: VideoModel | ImageModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  imageSubModel: ImageSubModel;
  prompts: string[];
  imageData?: string;
  imageData2?: string;
  imageType?: 'reference' | 'start-end';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration: number;
  resolution: string;
  negativePrompt: string;
  imageCount: number;
  variationCount: number;
}

interface EditorSeedImage {
  dataUrl: string;
  prompt: string;
  sourceTaskId: string;
}

interface VideoBatchRunOptions {
  prompt?: string;
  model?: VideoModel;
  duration?: number;
}

function isRetriableImageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return [
    'no available channel',
    'channel',
    'upstream',
    'timeout',
    'timed out',
    'failed to fetch',
    'service unavailable',
    'too many requests',
    '无可用渠道',
    '上游',
    '楗卞拰',
    '瓒呮椂',
  ].some((keyword) => message.includes(keyword)) || /(^|\\D)(429|500|502|503|504)(\\D|$)/.test(message);
}

function App() {
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [apiKey, setApiKey] = useState(getApiKey());
  const [optimizeApiKey, setOptimizeApiKey] = useState(getOptimizeApiKey() || getApiKey());
  const [imageApiKey, setImageApiKey] = useState(getImageApiKey() || getApiKey());
  const [videoApiKey, setVideoApiKey] = useState(getVideoApiKey() || getApiKey());
  const [activeNav, setActiveNav] = useState<NavItemType>('generate');
  const [tasks, setTasks] = useState<VideoTask[]>(getTasksFromStorage());
  const [selectedTask, setSelectedTask] = useState<VideoTask | null>(null);
  const [generationType, setGenerationType] = useState<GenerationType>(appSettings.defaultGenerationType || 'video');
  const [model, setModel] = useState<VideoModel | ImageModel>(appSettings.defaultModel);
  const [veoSubModel, setVeoSubModel] = useState<VeoSubModel>(appSettings.defaultVeoSubModel);
  const [soraSubModel, setSoraSubModel] = useState<SoraSubModel>(appSettings.defaultSoraSubModel);
  const [grokSubModel, setGrokSubModel] = useState<GrokSubModel>(appSettings.defaultGrokSubModel);
  const [imageSubModel, setImageSubModel] = useState<ImageSubModel>(appSettings.defaultImageSubModel || 'gpt-image-2');
  const [batchMode, setBatchMode] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [selectedTaskMediaUrl, setSelectedTaskMediaUrl] = useState('');
  const [editorSeedImages, setEditorSeedImages] = useState<EditorSeedImage[]>([]);

  const imageTasks = useMemo(() => tasks.filter((task) => task.generationType === 'image'), [tasks]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const next = { ...prev, ...updates };
      setSettingsToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    let currentUrl = '';

    async function loadSelectedTaskMedia(): Promise<void> {
      if (!selectedTask?.videoUrl) {
        setSelectedTaskMediaUrl('');
        return;
      }

      const resolvedUrl = await resolveImageUrl(selectedTask.videoUrl);
      if (!active) {
        releaseImageUrl(resolvedUrl);
        return;
      }

      currentUrl = resolvedUrl;
      setSelectedTaskMediaUrl(resolvedUrl);
    }

    void loadSelectedTaskMedia();

    return () => {
      active = false;
      releaseImageUrl(currentUrl);
    };
  }, [selectedTask]);

  useEffect(() => {
    setTasksToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    void pruneStoredImages();
  }, []);

  const handleGenerationTypeChange = useCallback((type: GenerationType) => {
    setGenerationType(type);

    if (type === 'image') {
      setModel('image2');
      updateSettings({
        defaultGenerationType: type,
        defaultModel: 'image2',
      });
      return;
    }

    setModel('veo');
    updateSettings({
      defaultGenerationType: type,
      defaultModel: 'veo',
    });
  }, [updateSettings]);

  const handleModelChange = useCallback((nextModel: VideoModel | ImageModel) => {
    setModel(nextModel);
    updateSettings({ defaultModel: nextModel });
  }, [updateSettings]);

  const handleApiKeyChange = useCallback((newKey: string) => {
    setApiKey(newKey);
    setApiKeyToStorage(newKey);
    updateSettings({ apiKey: newKey });
  }, [updateSettings]);

  const handleOptimizeApiKeyChange = useCallback((newKey: string) => {
    setOptimizeApiKey(newKey);
    setOptimizeApiKeyToStorage(newKey);
    updateSettings({ optimizeApiKey: newKey });
  }, [updateSettings]);

  const handleImageApiKeyChange = useCallback((newKey: string) => {
    setImageApiKey(newKey);
    setImageApiKeyToStorage(newKey);
    updateSettings({ imageApiKey: newKey });
  }, [updateSettings]);

  const handleVideoApiKeyChange = useCallback((newKey: string) => {
    setVideoApiKey(newKey);
    setVideoApiKeyToStorage(newKey);
    updateSettings({ videoApiKey: newKey });
  }, [updateSettings]);

  const handleUpdateTaskPosition = useCallback((taskId: string, x: number, y: number) => {
    setTasks((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, position: { x, y } } : task
    )));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const taskToDelete = prev.find((task) => task.id === taskId);
      if (taskToDelete?.videoUrl) {
        void deleteImageData(taskToDelete.videoUrl);
      }

      return prev.filter((task) => task.id !== taskId);
    });
    setSelectedTask((prev) => (prev?.id === taskId ? null : prev));
  }, []);

  const handleUseTaskAsImageSource = useCallback(async (task: VideoTask) => {
    if (task.generationType !== 'image' || !task.videoUrl) {
      return;
    }

    const dataUrl = await resolveImageDataUrl(task.videoUrl);
    if (!dataUrl) {
      alert('无法读取这张图作为生图输入');
      return;
    }

    setGenerationType('image');
    setModel('image2');
    updateSettings({
      defaultGenerationType: 'image',
      defaultModel: 'image2',
    });
    setEditorSeedImages([
      {
        dataUrl,
        prompt: task.prompt,
        sourceTaskId: task.id,
      },
    ]);
    setGlobalPrompt(task.prompt);
    setActiveNav('generate');
  }, [updateSettings]);

  const handleUseTaskAsVideoSource = useCallback(async (task: VideoTask) => {
    if (task.generationType !== 'image' || !task.videoUrl) {
      return;
    }

    const dataUrl = await resolveImageDataUrl(task.videoUrl);
    if (!dataUrl) {
      alert('无法读取这张图作为视频输入');
      return;
    }

    setGenerationType('video');
    setModel('veo');
    updateSettings({
      defaultGenerationType: 'video',
      defaultModel: 'veo',
    });
    setEditorSeedImages([
      {
        dataUrl,
        prompt: task.prompt,
        sourceTaskId: task.id,
      },
    ]);
    setGlobalPrompt(task.prompt);
    setActiveNav('generate');
  }, [updateSettings]);

  const createTask = useCallback((
    promptText: string,
    data: GenerateData,
    overrides?: Partial<VideoTask>
  ): VideoTask => ({
    id: generateId(),
    prompt: promptText,
    model: data.model,
    status: 'pending',
    createdAt: new Date(),
    progress: 0,
    generationType: data.generationType,
    options: data.generationType === 'image'
      ? {
          subModel: data.imageSubModel,
          aspectRatio: data.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
          resolution: data.resolution as '720P' | '1080P' | '2K' | '4K',
          negativePrompt: data.negativePrompt,
        }
      : data.model === 'veo'
        ? {
            subModel: data.veoSubModel,
            aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1',
            duration: data.duration,
            negativePrompt: data.negativePrompt,
            imageType: data.imageType,
          }
        : data.model === 'grok'
          ? {
              subModel: data.grokSubModel,
              aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1',
              duration: data.duration,
              audioEnabled: true,
            }
          : {
              subModel: data.soraSubModel,
              aspectRatio: data.aspectRatio,
              duration: data.duration,
            },
    imageData: data.imageData,
    position: { x: 100 + (Math.random() * 200), y: 100 + (Math.random() * 200) },
    ...overrides,
  }), []);

  const finalizeImageTask = useCallback(async (
    task: VideoTask,
    promptText: string,
    data: GenerateData
  ): Promise<void> => {
    const maxAttempts = task.batchId ? 3 : 2;
    let lastErrorMessage = '??????';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      setTasks((prev) => prev.map((current) => (
        current.id === task.id
          ? {
              ...current,
              status: 'processing',
              progress: Math.min(90, Math.round(((attempt - 1) / maxAttempts) * 100)),
              errorMessage: attempt > 1 ? `??????? (${attempt}/${maxAttempts})` : undefined,
            }
          : current
      )));

      try {
        const result = await createImage2Image(
          imageApiKey || apiKey,
          promptText,
          data.imageSubModel,
          {
            aspectRatio: data.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
            resolution: data.resolution as '720P' | '1080P' | '2K' | '4K',
            negativePrompt: data.negativePrompt,
          },
          [data.imageData, data.imageData2].filter((value): value is string => Boolean(value))
        );

        if (result.status === 'completed' && result.imageUrl) {
          const storedImageUrl = result.imageUrl.startsWith('data:image')
            ? await saveImageData(task.id, result.imageUrl)
            : result.imageUrl;

          setTasks((prev) => prev.map((current) => (
            current.id === task.id
              ? {
                  ...current,
                  status: 'completed',
                  videoUrl: storedImageUrl,
                  thumbnailUrl: storedImageUrl,
                  progress: 100,
                  completedAt: new Date(),
                  errorMessage: undefined,
                }
              : current
          )));

          addHistory({
            id: task.id,
            prompt: promptText,
            model: data.model,
            createdAt: new Date(),
            videoUrl: storedImageUrl,
            thumbnailUrl: storedImageUrl,
            options: {
              subModel: data.imageSubModel,
              aspectRatio: data.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
              resolution: data.resolution as '720P' | '1080P' | '2K' | '4K',
              negativePrompt: data.negativePrompt,
            },
            generationType: 'image',
            batchId: task.batchId,
            sourceTaskId: task.sourceTaskId,
            batchLabel: task.batchLabel,
          });
          return;
        }

        lastErrorMessage = '??????';
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : '??????';
        console.error(`[App] Image generation attempt ${attempt} failed:`, error);

        if (attempt < maxAttempts && isRetriableImageError(error)) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          continue;
        }
      }

      break;
    }

    setTasks((prev) => prev.map((current) => (
      current.id === task.id
        ? { ...current, status: 'failed', progress: 100, errorMessage: lastErrorMessage }
        : current
    )));
  }, [apiKey, imageApiKey]);

  const finalizeVideoTask = useCallback(async (
    task: VideoTask,
    promptText: string,
    data: GenerateData
  ): Promise<void> => {
    const veoOptions = {
      aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1',
      duration: data.duration,
      negativePrompt: data.negativePrompt,
    };
    const soraOptions = {
      aspectRatio: data.aspectRatio,
      duration: data.duration,
    };
    const grokOptions = {
      aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1',
      duration: data.duration,
      audioEnabled: true,
    };

    let result: { taskId: string; status: string };
    if (data.model === 'veo') {
      if (data.imageType === 'start-end' && (!data.imageData || !data.imageData2)) {
        throw new Error('首尾帧模式需要同时提供起始图和结束图');
      }

      result = data.imageData
        ? await createVeoVideoWithImage(videoApiKey || apiKey, promptText, data.imageData, data.veoSubModel, {
            ...veoOptions,
            imageType: data.imageType,
            imageData2: data.imageData2,
          })
        : await createVeoVideoAuto(videoApiKey || apiKey, promptText, data.veoSubModel, veoOptions);
    } else if (data.model === 'grok') {
      result = data.imageData
        ? await createGrokVideoWithImage(videoApiKey || apiKey, promptText, data.imageData, data.grokSubModel, grokOptions)
        : await createGrokVideo(videoApiKey || apiKey, promptText, data.grokSubModel, grokOptions);
    } else {
      result = data.imageData
        ? await createSoraVideoWithImage(videoApiKey || apiKey, promptText, data.imageData, data.soraSubModel, soraOptions)
        : await createSoraVideo(videoApiKey || apiKey, promptText, data.soraSubModel, soraOptions);
    }

    const subModel = data.model === 'veo'
      ? data.veoSubModel
      : data.model === 'grok'
        ? data.grokSubModel
        : data.soraSubModel;

    const pollResult = await pollTaskStatus(
      videoApiKey || apiKey,
      data.model as VideoModel,
      result.taskId,
      subModel,
      (status, progress) => {
        setTasks((prev) => prev.map((current) => (
          current.id === task.id ? { ...current, status, progress } : current
        )));
      }
    );

    if (pollResult.status === 'completed' && pollResult.videoUrl) {
      setTasks((prev) => prev.map((current) => (
        current.id === task.id
          ? {
              ...current,
              status: 'completed',
              videoUrl: pollResult.videoUrl,
              thumbnailUrl: pollResult.thumbnailUrl,
              progress: 100,
              completedAt: new Date(),
            }
          : current
      )));

      addHistory({
        id: task.id,
        prompt: promptText,
        model: data.model,
        createdAt: new Date(),
        videoUrl: pollResult.videoUrl,
        thumbnailUrl: pollResult.thumbnailUrl,
        duration: data.duration,
        options: data.model === 'veo'
          ? {
              subModel: data.veoSubModel,
              aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1',
              duration: data.duration,
              negativePrompt: data.negativePrompt,
              imageType: data.imageType,
            }
          : data.model === 'grok'
            ? {
                subModel: data.grokSubModel,
                aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1',
                duration: data.duration,
                audioEnabled: true,
              }
            : {
                subModel: data.soraSubModel,
                aspectRatio: data.aspectRatio,
                duration: data.duration,
              },
        generationType: 'video',
        batchId: task.batchId,
        sourceTaskId: task.sourceTaskId,
        batchLabel: task.batchLabel,
      });
      return;
    }

    setTasks((prev) => prev.map((current) => (
      current.id === task.id
        ? { ...current, status: 'failed', errorMessage: pollResult.errorMessage || '视频生成失败' }
        : current
    )));

    if (pollResult.status === 'failed') {
      alert(`视频生成失败: ${pollResult.errorMessage || '未知错误'}`);
    }
  }, [apiKey, videoApiKey]);

  const handleGenerate = useCallback(async (data: GenerateData) => {
    const activeApiKey = data.generationType === 'image'
      ? (imageApiKey || apiKey)
      : (videoApiKey || apiKey);

    if (!activeApiKey.trim()) {
      alert(data.generationType === 'image' ? '请先填写生图 API Key' : '请先填写生视频 API Key');
      setActiveNav('settings');
      return;
    }

    const useBatchVariations = false;

    let promptsToRun = data.prompts;
    if (useBatchVariations) {
      promptsToRun = await batchOptimizePrompts(optimizeApiKey || apiKey, data.prompts[0], data.imageCount);
    }

    const batchId = promptsToRun.length > 1 ? generateId() : undefined;
    const batchLabel = batchId
      ? `${data.generationType === 'image' ? '图片批次' : '视频批次'} ${promptsToRun.length}`
      : undefined;

    for (const promptText of promptsToRun) {
      const task = createTask(promptText, data, {
        batchId,
        batchLabel,
      });

      setTasks((prev) => [task, ...prev]);
      addTaskToStorage(task);

      try {
        if (data.generationType === 'image') {
          await finalizeImageTask(task, promptText, data);
        } else {
          await finalizeVideoTask(task, promptText, data);
        }
      } catch (error) {
        console.error('[App] Generation failed:', error);
        setTasks((prev) => prev.map((current) => (
          current.id === task.id
            ? {
                ...current,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : '未知错误',
              }
            : current
        )));
        alert(`生成出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }, [apiKey, createTask, finalizeImageTask, finalizeVideoTask, imageApiKey, optimizeApiKey, videoApiKey]);

  const handleUseBatchAsVideoSource = useCallback(async (
    task: VideoTask,
    options?: VideoBatchRunOptions
  ) => {
    if (!task.batchId) {
      await handleUseTaskAsVideoSource(task);
      return;
    }

    const batchItems = imageTasks.filter((item) => (
      item.batchId === task.batchId
      && item.generationType === 'image'
      && item.status === 'completed'
      && item.videoUrl
    ));

    if (batchItems.length === 0) {
      alert('这批图片还没有可用素材');
      return;
    }

    const seedImages = await Promise.all(batchItems.map(async (item) => ({
      task: item,
      dataUrl: await resolveImageDataUrl(item.videoUrl),
    })));

    const validSeeds = seedImages.filter((item): item is { task: VideoTask; dataUrl: string } => Boolean(item.dataUrl));
    if (validSeeds.length === 0) {
      alert('这批图片暂时无法读取为视频输入');
      return;
    }

    const videoModel = options?.model || 'veo';
    const duration = options?.duration || 4;
    const batchId = generateId();
    const batchLabel = `视频批次 ${validSeeds.length}`;

    for (const seed of validSeeds) {
      const prompt = options?.prompt || seed.task.prompt || task.prompt;
      const videoData: GenerateData = {
        generationType: 'video',
        model: videoModel,
        veoSubModel,
        soraSubModel,
        grokSubModel,
        imageSubModel,
        prompts: [prompt],
        imageData: seed.dataUrl,
        imageType: 'reference',
        aspectRatio: (
          (seed.task.options && 'aspectRatio' in seed.task.options && typeof seed.task.options.aspectRatio === 'string')
            ? seed.task.options.aspectRatio
            : '16:9'
        ) as '16:9' | '9:16' | '1:1' | '4:3' | '3:4',
        duration,
        resolution: '2K',
        negativePrompt: '',
        imageCount: 1,
        variationCount: 1,
      };

      const videoTask = createTask(prompt, videoData, {
        batchId,
        batchLabel,
        sourceTaskId: seed.task.id,
      });

      setTasks((prev) => [videoTask, ...prev]);
      addTaskToStorage(videoTask);

      try {
        await finalizeVideoTask(videoTask, prompt, videoData);
      } catch (error) {
        console.error('[App] Batch video generation failed:', error);
        setTasks((prev) => prev.map((current) => (
          current.id === videoTask.id
            ? {
                ...current,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : '未知错误',
              }
            : current
        )));
      }
    }

    setGenerationType('video');
    setModel(videoModel);
    setActiveNav('tasks');
  }, [
    createTask,
    finalizeVideoTask,
    grokSubModel,
    handleUseTaskAsVideoSource,
    imageSubModel,
    imageTasks,
    soraSubModel,
    veoSubModel,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          generationType={generationType}
          model={model}
          veoSubModel={veoSubModel}
          soraSubModel={soraSubModel}
          grokSubModel={grokSubModel}
          imageSubModel={imageSubModel}
          batchMode={batchMode}
          onModelChange={handleModelChange}
          onVeoSubModelChange={(value) => {
            setVeoSubModel(value);
            updateSettings({ defaultVeoSubModel: value });
          }}
          onSoraSubModelChange={(value) => {
            setSoraSubModel(value);
            updateSettings({ defaultSoraSubModel: value });
          }}
          onGrokSubModelChange={(value) => {
            setGrokSubModel(value);
            updateSettings({ defaultGrokSubModel: value });
          }}
          onImageSubModelChange={(value) => {
            setImageSubModel(value);
            updateSettings({ defaultImageSubModel: value });
          }}
          onBatchModeChange={setBatchMode}
        />

        <main className="flex-1 relative overflow-hidden bg-[#f8fafc]">
          {activeNav === 'templates' && (
            <div className="h-full overflow-auto p-8 bg-white/50 backdrop-blur-md">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">灵感模板</h2>
                    <p className="text-gray-500">选择一个提示词模板开始创作</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('generate')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  >
                    返回画布
                  </button>
                </div>
                <PromptTemplates onSelect={(prompt) => {
                  setGlobalPrompt(prompt);
                  setActiveNav('generate');
                }} />
              </div>
            </div>
          )}

          {activeNav === 'history' && (
            <div className="h-full overflow-auto p-8 bg-white/50 backdrop-blur-md">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">历史档案</h2>
                    <p className="text-gray-500">查看历史记录并复用灵感</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('generate')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  >
                    返回画布
                  </button>
                </div>
                <VideoHistory onPromptSelect={(prompt) => {
                  setGlobalPrompt(prompt);
                  setActiveNav('generate');
                }} />
              </div>
            </div>
          )}

          {(activeNav === 'tasks' || activeNav === 'generate') && (
            <CanvasWorkspace
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onUpdateTaskPosition={handleUpdateTaskPosition}
              onRemoveTask={handleDeleteTask}
              onUseAsImageSource={handleUseTaskAsImageSource}
              onUseAsVideoSource={handleUseTaskAsVideoSource}
              onUseBatchAsVideoSource={handleUseBatchAsVideoSource}
            />
          )}

          {activeNav === 'settings' && (
            <div className="h-full overflow-auto bg-white p-8">
              <div className="max-w-2xl mx-auto py-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">设</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">应用设置</h2>
                    <p className="text-gray-500">管理你的 API 配置和默认参数</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">API 配置</h3>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">提示词优化 API Key</label>
                      <input
                        type="password"
                        value={optimizeApiKey}
                        onChange={(event) => handleOptimizeApiKeyChange(event.target.value)}
                        placeholder="用于 AI 优化提示词，模型默认 GPT5.5"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-400">文本优化、场景扩写、批量变体都走这把 Key。</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">生图 API Key</label>
                      <input
                        type="password"
                        value={imageApiKey}
                        onChange={(event) => handleImageApiKeyChange(event.target.value)}
                        placeholder="用于 gpt-image-2 生图"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-400">图片生成只走这把 Key，方便单独排查渠道和配额问题。</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">生视频 API Key</label>
                      <input
                        type="password"
                        value={videoApiKey}
                        onChange={(event) => handleVideoApiKeyChange(event.target.value)}
                        placeholder="用于 Veo / Sora / Grok 生视频"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-400">视频提交和轮询都走这把 Key。</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">通用备用 API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(event) => handleApiKeyChange(event.target.value)}
                        placeholder="可留空，仅在专用 Key 未填写时兜底"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-400">为了兼容旧配置保留，三类专用 Key 为空时才会回退到这里。</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">API 中转基础地址</label>
                      <input
                        type="text"
                        value={appSettings.apiBaseUrl}
                        onChange={(event) => updateSettings({ apiBaseUrl: event.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono"
                      />
                      <p className="mt-2 text-xs text-gray-400">当前三个 Key 默认共用同一个站点地址，保留 `/v1` 即可。</p>
                    </div>
                  </section>

                  <section className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">推</span> 当前工作流
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      现在支持先用 image2 批量生成图片，再将同一批图片一键生成短视频。你也可以从画布里选中任意单张图片，继续走图生视频流程。
                    </p>
                  </section>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {activeNav === 'generate' && (
        <BottomEditor
          apiKey={apiKey}
          optimizeApiKey={optimizeApiKey}
          imageApiKey={imageApiKey}
          videoApiKey={videoApiKey}
          generationType={generationType}
          model={model}
          veoSubModel={veoSubModel}
          soraSubModel={soraSubModel}
          grokSubModel={grokSubModel}
          imageSubModel={imageSubModel}
          batchMode={batchMode}
          onGenerate={handleGenerate}
          onGenerationTypeChange={handleGenerationTypeChange}
          initialPrompt={globalPrompt}
          onPromptUsed={() => setGlobalPrompt('')}
          seedImages={editorSeedImages}
          onSeedImagesConsumed={() => setEditorSeedImages([])}
        />
      )}

      <RightRail
        selectedTask={selectedTask}
        tasks={tasks}
        onTaskClick={setSelectedTask}
        onPromptSelect={(prompt) => {
          setGlobalPrompt(prompt);
          setActiveNav('generate');
        }}
        onUseAsImageSource={handleUseTaskAsImageSource}
        onUseAsVideoSource={handleUseTaskAsVideoSource}
        onUseBatchAsVideoSource={handleUseBatchAsVideoSource}
      />

      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">浠诲姟璇︽儏</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">提示词</label>
                <p className="text-sm text-gray-800 mt-1.5 p-4 bg-gray-50 rounded-xl border border-gray-100">{selectedTask.prompt}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">模型</label>
                  <p className="text-sm text-gray-800 mt-1 font-semibold uppercase">{selectedTask.model}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">状态</label>
                  <p className="text-sm text-gray-800 mt-1 font-semibold uppercase">{selectedTask.status}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">创建时间</label>
                  <p className="text-sm text-gray-800 mt-1">{selectedTask.createdAt.toLocaleString()}</p>
                </div>
              </div>

              {selectedTask.batchLabel && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">批次</label>
                  <p className="text-sm text-purple-700 mt-1 font-semibold">{selectedTask.batchLabel}</p>
                </div>
              )}

              {selectedTask.errorMessage && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">错误信息</label>
                  <p className="text-sm text-red-600 mt-1.5 p-4 bg-red-50 rounded-xl border border-red-100">{selectedTask.errorMessage}</p>
                </div>
              )}

              {selectedTask.generationType === 'image' && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void handleUseTaskAsImageSource(selectedTask)}
                    className="px-5 py-3 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    用这张图继续生图
                  </button>
                  <button
                    onClick={() => void handleUseTaskAsVideoSource(selectedTask)}
                    className="px-5 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    用这张图生成视频
                  </button>
                  {selectedTask.batchId && (
                    <button
                      onClick={() => void handleUseBatchAsVideoSource(selectedTask)}
                      className="px-5 py-3 text-sm font-semibold text-purple-700 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                    >
                      用这批图一键生成视频
                    </button>
                  )}
                </div>
              )}

              {selectedTask.videoUrl && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">绱犳潗閾炬帴</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="text"
                      value={selectedTaskMediaUrl || selectedTask.videoUrl}
                      readOnly
                      className="flex-1 px-4 py-3 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedTaskMediaUrl || selectedTask.videoUrl || '')}
                      className="px-5 py-3 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      复制
                    </button>
                    <a
                      href={selectedTaskMediaUrl || selectedTask.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      打开
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


