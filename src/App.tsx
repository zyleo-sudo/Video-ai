import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { CanvasWorkspace } from './components/layout/CanvasWorkspace';
import { BottomEditor } from './components/layout/BottomEditor';
import { RightRail } from './components/layout/RightRail';
import { PromptTemplates } from './components/PromptTemplates';
import { 
  VideoTask, 
  VideoModel, 
  ImageModel,
  VeoSubModel, 
  SoraSubModel, 
  GrokSubModel, 
  GeminiSubModel,
  GenerationType,
  AppSettings 
} from './types';
import { getApiKey, setApiKey as setApiKeyToStorage, getSettings, setSettings as setSettingsToStorage, getTasks as getTasksFromStorage, setTasks as setTasksToStorage, addTask as addTaskToStorage } from './services/storage';
import {
  createVeoVideoAuto,
  createVeoVideoWithImage,
  createSoraVideo,
  createSoraVideoWithImage,
  createGrokVideo,
  createGrokVideoWithImage,
  createGeminiImage,
  pollTaskStatus,
} from './services/allapi';
import { addHistory } from './services/storage';
import { VideoHistory } from './components/VideoHistory';
import { generateId } from './utils/constants';
import { releaseImageUrl, resolveImageUrl, saveImageData } from './services/mediaStore';

type NavItemType = 'generate' | 'templates' | 'tasks' | 'history' | 'settings';

interface GenerateData {
  generationType: GenerationType;
  model: VideoModel | ImageModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  geminiSubModel: GeminiSubModel;
  prompts: string[];
  imageData?: string;
  imageData2?: string;
  imageType?: 'reference' | 'start-end';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration: number;
  resolution: string;
  negativePrompt: string;
}

function App() {
  // Settings and state
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [apiKey, setApiKey] = useState(getApiKey());
  const [activeNav, setActiveNav] = useState<NavItemType>('generate');
  const [tasks, setTasks] = useState<VideoTask[]>(getTasksFromStorage());
  const [selectedTask, setSelectedTask] = useState<VideoTask | null>(null);

  // Generation type and model settings
  const [generationType, setGenerationType] = useState<GenerationType>(appSettings.defaultGenerationType || 'video');
  const [model, setModel] = useState<VideoModel | ImageModel>(appSettings.defaultModel);
  const [veoSubModel, setVeoSubModel] = useState<VeoSubModel>(appSettings.defaultVeoSubModel);
  const [soraSubModel, setSoraSubModel] = useState<SoraSubModel>(appSettings.defaultSoraSubModel);
  const [grokSubModel, setGrokSubModel] = useState<GrokSubModel>(appSettings.defaultGrokSubModel);
  const [geminiSubModel, setGeminiSubModel] = useState<GeminiSubModel>(appSettings.defaultGeminiSubModel || 'gemini-3.1-flash-image-preview');
  const [batchMode, setBatchMode] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [selectedTaskMediaUrl, setSelectedTaskMediaUrl] = useState('');

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

  // Sync tasks to localStorage
  useEffect(() => {
    setTasksToStorage(tasks);
  }, [tasks]);

  const handleGenerationTypeChange = useCallback((type: GenerationType) => {
    setGenerationType(type);
    updateSettings({ defaultGenerationType: type });
    // Switch to appropriate default model when changing type
    if (type === 'image') {
      setModel('gemini-3.1-flash-image-preview');
      updateSettings({ defaultModel: 'gemini-3.1-flash-image-preview' });
    } else {
      setModel('veo');
      updateSettings({ defaultModel: 'veo' });
    }
  }, []);

  const handleModelChange = useCallback((newModel: VideoModel | ImageModel) => {
    setModel(newModel);
    updateSettings({ defaultModel: newModel });
  }, []);

  const handleVeoSubModelChange = useCallback((subModel: VeoSubModel) => {
    setVeoSubModel(subModel);
    updateSettings({ defaultVeoSubModel: subModel });
  }, []);

  const handleSoraSubModelChange = useCallback((subModel: SoraSubModel) => {
    setSoraSubModel(subModel);
    updateSettings({ defaultSoraSubModel: subModel });
  }, []);

  const handleGrokSubModelChange = useCallback((subModel: GrokSubModel) => {
    setGrokSubModel(subModel);
    updateSettings({ defaultGrokSubModel: subModel });
  }, []);

  const handleGeminiSubModelChange = useCallback((subModel: GeminiSubModel) => {
    setGeminiSubModel(subModel);
    updateSettings({ defaultGeminiSubModel: subModel });
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...appSettings, ...updates };
    setAppSettings(newSettings);
    setSettingsToStorage(updates);
  };

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    setApiKeyToStorage(newKey);
  };



  const handleUpdateTaskPosition = useCallback((taskId: string, x: number, y: number) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, position: { x, y } } : t
    ));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const handleGenerate = async (data: GenerateData) => {
    if (!apiKey.trim()) {
      alert('璇峰厛杈撳叆鎮ㄧ殑 API 瀵嗛挜');
      setActiveNav('settings');
      return;
    }

    for (const promptText of data.prompts) {
      const task = createTask(promptText, data);
      setTasks(prev => [task, ...prev]);
      addTaskToStorage(task);

      try {
        // 鍥惧儚鐢熸垚
        if (data.generationType === 'image') {
          console.log('[App] 寮�濮嬪浘鍍忕敓鎴愶紝妯″瀷:', data.model);
          
          const geminiOptions = {
            aspectRatio: data.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
            resolution: data.resolution as '720P' | '1080P' | '2K' | '4K',
            negativePrompt: data.negativePrompt,
          };
          const referenceImages = [data.imageData, data.imageData2].filter((value): value is string => Boolean(value));

          const result = await createGeminiImage(
            apiKey,
            promptText,
            data.geminiSubModel,
            geminiOptions,
            referenceImages.length > 0 ? referenceImages : undefined
          );

          // 鍥惧儚鐢熸垚瀹屾垚锛圙emini 鏄悓姝ヨ繑鍥烇級
          if (result.status === 'completed' && result.imageUrl) {
            console.log('[App] 鍥惧儚鐢熸垚瀹屾垚:', result);
            console.log('[App] 鍥剧墖 URL:', result.imageUrl.substring(0, 100) + '...');
            console.log('[App] 浠诲姟 generationType:', task.generationType);

            const storedImageUrl = result.imageUrl.startsWith('data:image')
              ? await saveImageData(task.id, result.imageUrl)
              : result.imageUrl;

            setTasks(prev => prev.map(t =>
              t.id === task.id ? {
                ...t,
                status: 'completed',
                videoUrl: storedImageUrl,
                progress: 100,
                completedAt: new Date(),
              } : t
            ));

            // 娣诲姞鍒板巻鍙茶褰?
            addHistory({
              id: task.id,
              prompt: promptText,
              model: data.model as VideoModel,
              createdAt: new Date(),
              videoUrl: storedImageUrl,
              thumbnailUrl: storedImageUrl,
              options: {
                subModel: data.geminiSubModel,
                aspectRatio: data.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
                resolution: data.resolution as '720P' | '1080P' | '2K' | '4K',
              },
              generationType: 'image',
            });
          } else {
            // 鐢熸垚澶辫触
            setTasks(prev => prev.map(t =>
              t.id === task.id ? { ...t, status: 'failed', errorMessage: '鍥惧儚鐢熸垚澶辫触' } : t
            ));
          }
          
          continue; // 璺宠繃鍚庣画瑙嗛杞閫昏緫
        }

        // 瑙嗛鐢熸垚
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
          audioEnabled: true, // 闊崇敾鍚屽嚭
        };

        let result;
        if (data.model === 'veo') {
          if (data.imageData) {
            result = await createVeoVideoWithImage(
              apiKey,
              promptText,
              data.imageData,
              data.veoSubModel,
              veoOptions
            );
          } else {
            result = await createVeoVideoAuto(apiKey, promptText, data.veoSubModel, veoOptions);
          }
        } else if (data.model === 'grok') {
          if (data.imageData) {
            result = await createGrokVideoWithImage(
              apiKey,
              promptText,
              data.imageData,
              data.grokSubModel,
              grokOptions
            );
          } else {
            result = await createGrokVideo(apiKey, promptText, data.grokSubModel, grokOptions);
          }
        } else {
          if (data.imageData) {
            result = await createSoraVideoWithImage(
              apiKey,
              promptText,
              data.imageData,
              data.soraSubModel,
              soraOptions
            );
          } else {
            result = await createSoraVideo(apiKey, promptText, data.soraSubModel, soraOptions);
          }
        }

        const subModel = data.model === 'veo' ? data.veoSubModel : data.model === 'grok' ? data.grokSubModel : data.soraSubModel;

        const pollResult = await pollTaskStatus(
          apiKey,
          data.model as VideoModel,
          result.taskId,
          subModel,
          (status, progress) => {
            setTasks(prev => prev.map(t =>
              t.id === task.id ? { ...t, status, progress } : t
            ));
          }
        );

        if (pollResult.status === 'completed' && pollResult.videoUrl) {
          const finalVideoUrl = pollResult.videoUrl;
          const finalThumbnailUrl = pollResult.thumbnailUrl;

          setTasks(prev => prev.map(t =>
            t.id === task.id ? {
              ...t,
              status: 'completed',
              videoUrl: finalVideoUrl,
              thumbnailUrl: finalThumbnailUrl,
              progress: 100
            } : t
          ));

          addHistory({
            id: task.id,
            prompt: promptText,
            model: data.model as VideoModel,
            createdAt: new Date(),
            videoUrl: finalVideoUrl,
            thumbnailUrl: finalThumbnailUrl,
            duration: data.duration,
            options: data.model === 'veo'
              ? { subModel: data.veoSubModel, aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1', duration: data.duration, negativePrompt: data.negativePrompt, imageType: data.imageType }
              : { subModel: data.soraSubModel, aspectRatio: data.aspectRatio, duration: data.duration },
          });
        } else if (pollResult.status === 'failed') {
          setTasks(prev => prev.map(t =>
            t.id === task.id ? { ...t, status: 'failed', errorMessage: pollResult.errorMessage } : t
          ));
          console.error('瑙嗛鐢熸垚澶辫触:', pollResult.errorMessage);
          alert(`瑙嗛鐢熸垚澶辫触: ${pollResult.errorMessage || '鏈煡閿欒'}`);
        }
      } catch (error) {
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, status: 'failed', errorMessage: error instanceof Error ? error.message : '鏈煡閿欒' } : t
        ));
        console.error('Generation error:', error);
        alert(`鐢熸垚鍑洪敊: ${error instanceof Error ? error.message : '鏈煡閿欒'}`);
      }
    }
  };

  const createTask = (promptText: string, data: GenerateData): VideoTask => {
    return {
      id: generateId(),
      prompt: promptText,
      model: data.model as VideoModel,
      status: 'pending',
      createdAt: new Date(),
      progress: 0,
      generationType: data.generationType,
      options: data.generationType === 'image'
        ? { subModel: data.geminiSubModel, aspectRatio: data.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4', resolution: data.resolution as '720P' | '1080P' | '2K' | '4K' }
        : data.model === 'veo'
          ? { subModel: data.veoSubModel, aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1', duration: data.duration, negativePrompt: data.negativePrompt, imageType: data.imageType }
          : data.model === 'grok'
            ? { subModel: data.grokSubModel, aspectRatio: data.aspectRatio as '16:9' | '9:16' | '1:1', duration: data.duration, audioEnabled: true }
            : { subModel: data.soraSubModel, aspectRatio: data.aspectRatio, duration: data.duration },
      imageData: data.imageData,
      position: { x: 100 + (Math.random() * 200), y: 100 + (Math.random() * 200) },
    };
  };

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
          geminiSubModel={geminiSubModel}
          batchMode={batchMode}
          onModelChange={handleModelChange}
          onVeoSubModelChange={handleVeoSubModelChange}
          onSoraSubModelChange={handleSoraSubModelChange}
          onGrokSubModelChange={handleGrokSubModelChange}
          onGeminiSubModelChange={handleGeminiSubModelChange}
          onBatchModeChange={setBatchMode}
        />

        <main className="flex-1 relative overflow-hidden bg-[#f8fafc]">
          {activeNav === 'templates' && (
            <div className="h-full overflow-auto p-8 bg-white/50 backdrop-blur-md">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">鐏垫劅妯℃澘</h2>
                    <p className="text-gray-500">选择一个提示词模板开始创作</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('generate')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  >
                    杩斿洖鐢诲竷
                  </button>
                </div>
                <PromptTemplates onSelect={(prompt) => {
                  // This will be handled by BottomEditor since we pass prompt as initialPrompt?
                  // Wait, BottomEditor doesn't take initialPrompt. VideoGenerator did.
                  // I need to make sure BottomEditor takes the prompt or we have a way to set it.
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
                    <h2 className="text-2xl font-bold text-gray-900">鍘嗗彶妗ｆ</h2>
                    <p className="text-gray-500">查看历史记录并复用灵感</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('generate')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  >
                    杩斿洖鐢诲竷
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
            />
          )}

          {activeNav === 'settings' && (
            <div className="h-full overflow-auto bg-white p-8">
              <div className="max-w-2xl mx-auto py-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">鈿欙笍</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">搴旂敤璁剧疆</h2>
                    <p className="text-gray-500">管理您的 API 配置和默认参数</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* API Section */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">API 璁剧疆</h3>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">API 瀵嗛挜 (API Key)</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder="璇疯緭鍏ユ偍鐨?API 瀵嗛挜..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-400">鐩墠鏀寔 allapi.store 鍙婂叾鍏煎鐨勪腑杞珯</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">API 涓浆/鍩虹鍦板潃 (Proxy Base URL)</label>
                      <input
                        type="text"
                        value={appSettings.apiBaseUrl}
                        onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono"
                      />
                      <p className="mt-2 text-xs text-gray-400">如果使用自建中转站，请填写包含 /v1 的基础地址</p>
                    </div>
                  </section>

                  {/* Redesign Note */}
                  <section className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">馃帹</span> UI 椋庢牸鎻愮ず
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      当前已启用无限画布模式，您可以在“生成”和“任务”页自由拖拽节点、缩放视图。
                      如果 AI 优化功能不可用，请先检查上方 API 基础地址配置。
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
          generationType={generationType}
          model={model}
          veoSubModel={veoSubModel}
          soraSubModel={soraSubModel}
          grokSubModel={grokSubModel}
          geminiSubModel={geminiSubModel}
          batchMode={batchMode}
          onGenerate={handleGenerate}
          onGenerationTypeChange={handleGenerationTypeChange}
          initialPrompt={globalPrompt}
          onPromptUsed={() => setGlobalPrompt('')}
        />
      )}

      <RightRail
        selectedTask={selectedTask}
        onTaskClick={setSelectedTask}
        onPromptSelect={(prompt) => {
          setGlobalPrompt(prompt);
          setActiveNav('generate');
        }}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">妯″瀷</label>
                  <p className="text-sm text-gray-800 mt-1 font-semibold uppercase">{selectedTask.model}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">状态</label>
                  <p className="text-sm text-gray-800 mt-1 font-semibold uppercase">{selectedTask.status}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">鍒涘缓鏃堕棿</label>
                  <p className="text-sm text-gray-800 mt-1">{selectedTask.createdAt.toLocaleString()}</p>
                </div>
              </div>
              {selectedTask.errorMessage && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">閿欒淇℃伅</label>
                  <p className="text-sm text-red-600 mt-1.5 p-4 bg-red-50 rounded-xl border border-red-100">{selectedTask.errorMessage}</p>
                </div>
              )}
              {selectedTask.videoUrl && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">瑙嗛閾炬帴</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="text"
                      value={selectedTaskMediaUrl || selectedTask.videoUrl}
                      readOnly
                      className="flex-1 px-4 py-3 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedTaskMediaUrl || selectedTask.videoUrl!)}
                      className="px-5 py-3 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      澶嶅埗
                    </button>
                    <a
                      href={selectedTaskMediaUrl || selectedTask.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      鎵撳紑
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

