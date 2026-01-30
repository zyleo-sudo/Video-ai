import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { CanvasWorkspace } from './components/layout/CanvasWorkspace';
import { BottomEditor } from './components/layout/BottomEditor';
import { RightRail } from './components/layout/RightRail';
import { PromptTemplates } from './components/PromptTemplates';
import { VideoTask, VideoModel, VeoSubModel, SoraSubModel, GrokSubModel, AppSettings } from './types';
import { getApiKey, setApiKey as setApiKeyToStorage, getSettings, setSettings as setSettingsToStorage, getTasks as getTasksFromStorage, setTasks as setTasksToStorage, addTask as addTaskToStorage } from './services/storage';
import {
  createVeoVideo,
  createVeoVideoWithImage,
  createSoraVideo,
  createSoraVideoWithImage,
  createGrokVideo,
  createGrokVideoWithImage,
  pollTaskStatus,
} from './services/allapi';
import { addHistory } from './services/storage';
import { VideoHistory } from './components/VideoHistory';
import { generateId } from './utils/constants';

type NavItemType = 'generate' | 'templates' | 'tasks' | 'history' | 'settings';

interface GenerateData {
  model: VideoModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  prompts: string[];
  imageData?: string;
  imageData2?: string;
  imageType?: 'reference' | 'start-end';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration: number;
  negativePrompt: string;
}

function App() {
  // Settings and state
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [apiKey, setApiKey] = useState(getApiKey());
  const [activeNav, setActiveNav] = useState<NavItemType>('generate');
  const [tasks, setTasks] = useState<VideoTask[]>(getTasksFromStorage());
  const [selectedTask, setSelectedTask] = useState<VideoTask | null>(null);

  // Model settings
  const [model, setModel] = useState<VideoModel>(appSettings.defaultModel);
  const [veoSubModel, setVeoSubModel] = useState<VeoSubModel>(appSettings.defaultVeoSubModel);
  const [soraSubModel, setSoraSubModel] = useState<SoraSubModel>(appSettings.defaultSoraSubModel);
  const [grokSubModel, setGrokSubModel] = useState<GrokSubModel>(appSettings.defaultGrokSubModel);
  const [batchMode, setBatchMode] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');

  // Sync tasks to localStorage
  useEffect(() => {
    setTasksToStorage(tasks);
  }, [tasks]);

  const handleModelChange = useCallback((newModel: VideoModel) => {
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
      alert('请先输入您的 API 密钥');
      setActiveNav('settings');
      return;
    }

    for (const promptText of data.prompts) {
      const task = createTask(promptText, data);
      setTasks(prev => [task, ...prev]);
      addTaskToStorage(task);

      try {
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
          audioEnabled: true, // 音画同出
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
            result = await createVeoVideo(apiKey, promptText, data.veoSubModel, veoOptions);
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
          data.model,
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
            model: data.model,
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
          console.error('视频生成失败:', pollResult.errorMessage);
          alert(`视频生成失败: ${pollResult.errorMessage || '未知错误'}`);
        }
      } catch (error) {
        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, status: 'failed', errorMessage: error instanceof Error ? error.message : '未知错误' } : t
        ));
        console.error('Generation error:', error);
        alert(`生成出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };

  const createTask = (promptText: string, data: GenerateData): VideoTask => {
    return {
      id: generateId(),
      prompt: promptText,
      model: data.model,
      status: 'pending',
      createdAt: new Date(),
      progress: 0,
      options: data.model === 'veo'
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
          model={model}
          veoSubModel={veoSubModel}
          soraSubModel={soraSubModel}
          grokSubModel={grokSubModel}
          batchMode={batchMode}
          onModelChange={handleModelChange}
          onVeoSubModelChange={handleVeoSubModelChange}
          onSoraSubModelChange={handleSoraSubModelChange}
          onGrokSubModelChange={handleGrokSubModelChange}
          onBatchModeChange={setBatchMode}
        />

        <main className="flex-1 relative overflow-hidden bg-[#f8fafc]">
          {activeNav === 'templates' && (
            <div className="h-full overflow-auto p-8 bg-white/50 backdrop-blur-md">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">灵感模板</h2>
                    <p className="text-gray-500">选择一个专业提示词模板开始创作</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('generate')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  >
                    返回画布
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
                    <h2 className="text-2xl font-bold text-gray-900">历史档案</h2>
                    <p className="text-gray-500">回顾您的创作足迹并重用灵感</p>
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
            />
          )}

          {activeNav === 'settings' && (
            <div className="h-full overflow-auto bg-white p-8">
              <div className="max-w-2xl mx-auto py-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">⚙️</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">应用设置</h2>
                    <p className="text-gray-500">管理您的 API 配置和默认参数</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* API Section */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">API 设置</h3>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">API 密钥 (API Key)</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder="请输入您的 API 密钥..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-400">目前支持 allapi.store 及其兼容的中转站</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">API 中转/基础地址 (Proxy Base URL)</label>
                      <input
                        type="text"
                        value={appSettings.apiBaseUrl}
                        onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono"
                      />
                      <p className="mt-2 text-xs text-gray-400">如果您使用的是自建中转站，请修改此项（需包含 /v1 路径）</p>
                    </div>
                  </section>

                  {/* Redesign Note */}
                  <section className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="text-lg">🎨</span> UI 风格提示
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      当前已开启<b>无限画布</b>模式。您可以在“生成”或“任务”页面随意拖拽节点、缩放视野。
                      如果“AI 优化”功能由于中转地址不匹配无法使用，请在上方正确配置您的基础地址。
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
          model={model}
          veoSubModel={veoSubModel}
          soraSubModel={soraSubModel}
          grokSubModel={grokSubModel}
          batchMode={batchMode}
          onGenerate={handleGenerate}
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
              <h3 className="text-xl font-bold text-gray-900">任务详情</h3>
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
              {selectedTask.errorMessage && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">错误信息</label>
                  <p className="text-sm text-red-600 mt-1.5 p-4 bg-red-50 rounded-xl border border-red-100">{selectedTask.errorMessage}</p>
                </div>
              )}
              {selectedTask.videoUrl && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">视频链接</label>
                  <div className="mt-2 flex gap-3">
                    <input
                      type="text"
                      value={selectedTask.videoUrl}
                      readOnly
                      className="flex-1 px-4 py-3 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedTask.videoUrl!)}
                      className="px-5 py-3 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      复制
                    </button>
                    <a
                      href={selectedTask.videoUrl}
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
