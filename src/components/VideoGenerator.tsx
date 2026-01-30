import { useState, useRef, useEffect } from 'react';
import { VideoModel, VideoTask, VeoSubModel, SoraSubModel } from '../types';
import {
   createVeoVideo,
   createVeoVideoWithImage,
   createSoraVideo,
   createSoraVideoWithImage,
   pollTaskStatus,
   optimizePrompt,
 } from '../services/allapi';
import { addHistory, getSettings, setSettings } from '../services/storage';
import { MODEL_CONFIGS, ASPECT_RATIOS, DURATION_OPTIONS, generateId, VEO_SUB_MODELS, SORA_SUB_MODELS, VEO_MODEL_ORDER } from '../utils/constants';

interface VideoGeneratorProps {
  apiKey: string;
  onTaskAdd?: (task: VideoTask) => void;
  onTasksUpdate?: () => void;
  initialPrompt?: string;
  onPromptUsed?: () => void;
}

interface BatchPrompt {
  id: string;
  prompt: string;
  image?: string;
}

export function VideoGenerator({ apiKey, onTaskAdd, onTasksUpdate, initialPrompt, onPromptUsed }: VideoGeneratorProps) {
  // 从设置中读取默认值
  const settings = getSettings();

  const [model, setModel] = useState<VideoModel>(settings.defaultModel);
  const [veoSubModel, setVeoSubModel] = useState<VeoSubModel>(settings.defaultVeoSubModel);
  const [soraSubModel, setSoraSubModel] = useState<SoraSubModel>(settings.defaultSoraSubModel);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '3:4'>('16:9');
  const [duration, setDuration] = useState(4);
  const [imageData, setImageData] = useState<string>();
  const [batchMode, setBatchMode] = useState(false);
  const [batchPrompts, setBatchPrompts] = useState<BatchPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply initial prompt from templates/history
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onPromptUsed?.();
    }
  }, [initialPrompt, onPromptUsed]);

  const modelConfig = MODEL_CONFIGS[model];
  const availableAspectRatios = ASPECT_RATIOS.filter(ar =>
    modelConfig.supportedAspectRatios.includes(ar.value)
  );
  const availableDurations = DURATION_OPTIONS[model as keyof typeof DURATION_OPTIONS];

  useEffect(() => {
    setDuration(availableDurations[0]);
  }, [model]);

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageData(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVeoSubModelChange = (subModel: VeoSubModel) => {
    setVeoSubModel(subModel);
    setSettings({ defaultVeoSubModel: subModel });
  };

  const handleSoraSubModelChange = (subModel: SoraSubModel) => {
    setSoraSubModel(subModel);
    setSettings({ defaultSoraSubModel: subModel });
  };

  const handleModelChange = (newModel: VideoModel) => {
    setModel(newModel);
    setSettings({ defaultModel: newModel });
  };

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) {
      alert('请先输入提示词');
      return;
    }

    setIsOptimizing(true);
    try {
      const optimizedPrompt = await optimizePrompt(apiKey, prompt);
      setPrompt(optimizedPrompt);
    } catch (error) {
      console.error('提示词优化失败:', error);
      alert('提示词优化失败，请检查网络或API密钥');
    } finally {
      setIsOptimizing(false);
    }
  };

  const createTask = (promptText: string, image?: string): VideoTask => {
    return {
      id: generateId(),
      prompt: promptText,
      model,
      status: 'pending',
      createdAt: new Date(),
      progress: 0,
      options: model === 'veo'
        ? { subModel: veoSubModel, aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1', duration, negativePrompt }
        : { subModel: soraSubModel, aspectRatio, duration },
      imageData: image,
    };
  };

  const handleGenerate = async () => {
    console.log('=== 开始生成视频 ===');
    console.log('API Key 存在:', !!apiKey);
    console.log('模型:', model);
    console.log('Veo 子模型:', veoSubModel);
    console.log('Sora 子模型:', soraSubModel);
    console.log('提示词:', prompt);
    console.log('宽高比:', aspectRatio);
    console.log('时长:', duration);

    if (!apiKey.trim()) {
      alert('请先输入您的 API 密钥');
      return;
    }

    const promptsToProcess = batchMode
      ? batchPrompts.filter(bp => bp.prompt.trim())
      : [{ id: generateId(), prompt: prompt.trim(), image: imageData }];

    if (promptsToProcess.length === 0) {
      alert('请至少输入一个提示词');
      return;
    }

    console.log('待处理提示词数量:', promptsToProcess.length);

    setIsGenerating(true);
    setProgress(0);

    for (let i = 0; i < promptsToProcess.length; i++) {
      const batchPrompt = promptsToProcess[i];
      const task = createTask(batchPrompt.prompt, batchPrompt.image || imageData);
      onTaskAdd?.(task);

      try {
        console.log(`处理第 ${i + 1}/${promptsToProcess.length} 个提示词`);

        let result;
        if (model === 'veo') {
          console.log('调用 Veo API, 子模型:', veoSubModel);
          const veoOptions = { aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1', duration, negativePrompt };
          console.log('Veo 选项:', veoOptions);

          if (batchPrompt.image || imageData) {
            console.log('使用图片输入');
            result = await createVeoVideoWithImage(
              apiKey,
              batchPrompt.prompt,
              batchPrompt.image || imageData!,
              veoSubModel,
              veoOptions
            );
          } else {
            console.log('使用文字输入');
            result = await createVeoVideo(apiKey, batchPrompt.prompt, veoSubModel, veoOptions);
          }
        } else {
          console.log('调用 Sora API, 子模型:', soraSubModel);
          const soraOptions = { aspectRatio, duration };
          console.log('Sora 选项:', soraOptions);

          if (batchPrompt.image || imageData) {
            console.log('使用图片输入');
            result = await createSoraVideoWithImage(
              apiKey,
              batchPrompt.prompt,
              batchPrompt.image || imageData!,
              soraSubModel,
              soraOptions
            );
          } else {
            console.log('使用文字输入');
            result = await createSoraVideo(apiKey, batchPrompt.prompt, soraSubModel, soraOptions);
          }
        }

        console.log('API 返回结果:', result);
        console.log('任务 ID:', result.taskId);
        console.log('开始轮询任务状态...');

        const subModel = model === 'veo' ? veoSubModel : soraSubModel;
        const apiModel = subModel;

        const pollResult = await pollTaskStatus(
          apiKey,
          model,
          result.taskId,
          apiModel,
          (_status, prog) => {
            onTasksUpdate?.();
            const totalProgress = ((i * 100) + prog) / promptsToProcess.length;
            setProgress(totalProgress);
          }
        );

        console.log('轮询结果:', pollResult);

        if (pollResult.status === 'completed' && pollResult.videoUrl) {
          console.log('视频生成成功! URL:', pollResult.videoUrl);
          addHistory({
            id: task.id,
            prompt: batchPrompt.prompt,
            model,
            createdAt: new Date(),
            videoUrl: pollResult.videoUrl,
            thumbnailUrl: pollResult.thumbnailUrl,
            duration,
            options: model === 'veo'
              ? { subModel: veoSubModel, aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1', duration, negativePrompt }
              : { subModel: soraSubModel, aspectRatio, duration },
          });
        } else if (pollResult.status === 'failed') {
          console.error('视频生成失败:', pollResult.errorMessage);
          alert(`视频生成失败: ${pollResult.errorMessage || '未知错误'}`);
        } else {
          console.warn('视频生成未完成，状态:', pollResult.status);
        }

        onTasksUpdate?.();
      } catch (error) {
        console.error('Generation error:', error);
        alert(`生成出错: ${error instanceof Error ? error.message : '未知错误'}\n\n请打开浏览器控制台 (F12) 查看详细日志`);
        onTasksUpdate?.();
      }
    }

    setIsGenerating(false);
    setProgress(0);

    if (!batchMode) {
      setPrompt('');
      setNegativePrompt('');
    } else {
      setBatchPrompts([]);
    }
  };

  const addBatchPrompt = () => {
    if (prompt.trim()) {
      setBatchPrompts(prev => [...prev, { id: generateId(), prompt: prompt.trim() }]);
      setPrompt('');
    }
  };

  const removeBatchPrompt = (id: string) => {
    setBatchPrompts(prev => prev.filter(bp => bp.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Model selection */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">生成视频</h2>
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setBatchMode(false)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              !batchMode
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            单个生成
          </button>
          <button
            onClick={() => setBatchMode(true)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              batchMode
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            批量生成
          </button>
        </div>
      </div>

      {/* Model selector */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(MODEL_CONFIGS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleModelChange(key as VideoModel)}
            className={`relative p-5 rounded-2xl transition-all duration-300 text-left border-2 ${
              model === key
                ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-accent-50 shadow-card'
                : 'border-gray-200 hover:border-primary-300 hover:shadow-soft'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{config.name}</h3>
                <p className="text-sm text-gray-600 mt-2">
                  最长 {config.maxDuration}秒 • {config.supportsImage ? '✓ 图片输入' : '文字输入'}
                </p>
              </div>
              {model === key && (
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-glow">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Sub-model selector for Veo */}
      {model === 'veo' && (
        <div className="mt-4">
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            选择 Veo 模型
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {VEO_MODEL_ORDER.map(key => {
              const config = VEO_SUB_MODELS[key];
              return (
                <button
                  key={key}
                  onClick={() => handleVeoSubModelChange(key)}
                  className={`p-4 rounded-xl text-left transition-all duration-300 border-2 ${
                    veoSubModel === key
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-accent-50 shadow-glow'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-soft'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">{config.name}</span>
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{config.priceLabel}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{config.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-model selector for Sora */}
      {model === 'sora' && (
        <div className="mt-4">
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            选择 Sora 模型
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(SORA_SUB_MODELS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleSoraSubModelChange(key as SoraSubModel)}
                className={`p-4 rounded-xl text-left transition-all duration-300 border-2 ${
                  soraSubModel === key
                    ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-accent-50 shadow-glow'
                    : 'border-gray-200 hover:border-primary-300 hover:shadow-soft'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">{config.name}</span>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{config.priceLabel}</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">{config.description}</p>
              </button>
            ))}
          </div>
        </div>
       )}

       {/* Image input (optional) - Veo only */}
       {model === 'veo' && (
         <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-white hover:border-primary-300 hover:shadow-soft transition-all duration-300">
           <div className="flex items-center justify-between mb-3">
             <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
               <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586 4.586a2 2 0 012.828 0L16 16m-2-2l1.586 1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
               参考图片（可选）
             </label>
             {imageData && (
               <button
                 onClick={handleClearImage}
                 className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
               >
                 移除
               </button>
             )}
           </div>

           {imageData ? (
             <div className="relative">
               <img
                 src={imageData}
                 alt="参考图片"
                 className="w-full max-h-64 object-contain rounded-xl shadow-md"
               />
             </div>
           ) : (
             <button
               onClick={handleImageSelect}
               className="w-full p-8 rounded-xl hover:bg-gray-100 transition-colors group"
             >
               <div className="text-center">
                 <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                   <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                   </svg>
                 </div>
                 <p className="text-sm font-semibold text-gray-700">点击上传图片</p>
                 <p className="text-xs text-gray-500 mt-1">支持 JPG、PNG，最大 10MB</p>
               </div>
             </button>
           )}
           <input
             ref={fileInputRef}
             type="file"
             accept="image/jpeg,image/png"
             onChange={handleFileChange}
             className="hidden"
           />
         </div>
        )}

      {/* Prompt input(s) */}
      {batchMode ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              批量提示词 ({batchPrompts.length})
            </label>
            <button
              onClick={addBatchPrompt}
              disabled={!prompt.trim()}
              className="text-sm font-semibold text-primary-600 hover:text-primary-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加到批量
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="在此输入您的提示词，然后点击 '+ 添加到批量'..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all shadow-sm"
          />

          {batchPrompts.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-auto">
              {batchPrompts.map((bp) => (
                <div
                  key={bp.id}
                  className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <span className="flex-1 text-sm text-gray-700 line-clamp-2">{bp.prompt}</span>
                  <button
                    onClick={() => removeBatchPrompt(bp.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
       ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              提示词
            </label>
            <button
              onClick={handleOptimizePrompt}
              disabled={isOptimizing || !prompt.trim()}
              className={`text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isOptimizing || !prompt.trim()
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-primary-600 bg-primary-50 hover:bg-primary-100 hover:shadow-glow'
              }`}
            >
              <svg className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isOptimizing ? '优化中...' : 'AI 优化'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述您想要生成的视频内容..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all shadow-sm"
          />
        </div>
      )}

      {/* Negative prompt */}
      {model === 'veo' && (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            反向提示词（可选）
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="描述视频中要避免的内容..."
            rows={2}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-all shadow-sm"
          />
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">宽高比</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1' | '4:3' | '3:4')}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm transition-all"
          >
            {availableAspectRatios.map(ar => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">时长</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm transition-all"
          >
            {availableDurations.map(d => (
              <option key={d} value={d}>{d}秒</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={
          isGenerating ||
          !apiKey ||
          (!batchMode && !prompt.trim()) ||
          (batchMode && batchPrompts.length === 0)
        }
        className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold text-lg rounded-2xl hover:from-primary-700 hover:to-accent-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-glow disabled:shadow-none relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {progress > 0 ? `${Math.round(progress)}%` : '生成中...'}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {batchMode ? `生成 ${batchPrompts.length} 个视频` : '生成视频'}
            </>
          )}
        </span>
      </button>
    </div>
  );
}
