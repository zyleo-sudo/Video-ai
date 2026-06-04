import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { batchOptimizePrompts, optimizePrompt } from '../../services/allapi';
import {
  GenerationType,
  GrokSubModel,
  ImageModel,
  ImageSubModel,
  SoraSubModel,
  VeoSubModel,
  VideoModel,
} from '../../types';
import {
  ASPECT_RATIOS,
  DURATION_OPTIONS,
  IMAGE_RESOLUTION_OPTIONS,
  MODEL_CONFIGS,
  generateId,
} from '../../utils/constants';

interface SeedImage {
  dataUrl: string;
  prompt: string;
  sourceTaskId: string;
}

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

interface BottomEditorProps {
  apiKey: string;
  optimizeApiKey: string;
  imageApiKey: string;
  videoApiKey: string;
  generationType: GenerationType;
  model: VideoModel | ImageModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  imageSubModel: ImageSubModel;
  batchMode: boolean;
  onGenerate: (data: GenerateData) => Promise<void>;
  onGenerationTypeChange: (type: GenerationType) => void;
  initialPrompt?: string;
  onPromptUsed?: () => void;
  seedImages?: SeedImage[];
  onSeedImagesConsumed?: () => void;
}

interface BatchPrompt {
  id: string;
  prompt: string;
}

export function BottomEditor({
  apiKey,
  optimizeApiKey,
  imageApiKey,
  videoApiKey,
  generationType,
  model,
  veoSubModel,
  soraSubModel,
  grokSubModel,
  imageSubModel,
  batchMode,
  onGenerate,
  onGenerationTypeChange,
  initialPrompt,
  onPromptUsed,
  seedImages = [],
  onSeedImagesConsumed,
}: BottomEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '3:4'>('16:9');
  const [duration, setDuration] = useState(4);
  const [resolution, setResolution] = useState('2K');
  const [imageCount, setImageCount] = useState(4);
  const [variationCount, setVariationCount] = useState(10);
  const [useImage, setUseImage] = useState(false);
  const [imageData, setImageData] = useState<string>();
  const [imageData2, setImageData2] = useState<string>();
  const [imageType, setImageType] = useState<'reference' | 'start-end'>('reference');
  const [batchPrompts, setBatchPrompts] = useState<BatchPrompt[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBatchOptimizing, setIsBatchOptimizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const supportsImageInput = generationType === 'image'
    || (generationType === 'video' && MODEL_CONFIGS[model as VideoModel]?.supportsImage);

  const availableAspectRatios = useMemo(() => (
    generationType === 'image'
      ? ASPECT_RATIOS
      : ASPECT_RATIOS.filter((item) => item.value === '16:9' || item.value === '9:16' || item.value === '1:1')
  ), [generationType]);

  const availableDurations = useMemo(() => (
    generationType === 'video'
      ? DURATION_OPTIONS[model as keyof typeof DURATION_OPTIONS] || [4]
      : []
  ), [generationType, model]);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onPromptUsed?.();
    }
  }, [initialPrompt, onPromptUsed]);

  useEffect(() => {
    if (seedImages.length === 0) {
      return;
    }

    setUseImage(true);
    setImageData(seedImages[0]?.dataUrl);
    setImageData2(seedImages[1]?.dataUrl);
    if (!prompt.trim()) {
      setPrompt(seedImages[0]?.prompt || '');
    }
    onSeedImagesConsumed?.();
  }, [onSeedImagesConsumed, prompt, seedImages]);

  useEffect(() => {
    if (generationType === 'video' && availableDurations.length > 0) {
      setDuration(availableDurations[0]);
    }
  }, [availableDurations, generationType]);

  useEffect(() => {
    if (generationType === 'video' && model === 'grok' && imageType === 'start-end') {
      setImageType('reference');
      setImageData2(undefined);
    }
  }, [generationType, imageType, model]);

  const handleFileSelect = useCallback((slot: 'primary' | 'secondary') => {
    if (slot === 'primary') {
      fileInputRef.current?.click();
      return;
    }

    fileInputRef2.current?.click();
  }, []);

  const handleFileChange = useCallback((slot: 'primary' | 'secondary', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      if (slot === 'primary') {
        setImageData(reader.result);
      } else {
        setImageData2(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearImages = useCallback(() => {
    setImageData(undefined);
    setImageData2(undefined);
    setUseImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (fileInputRef2.current) {
      fileInputRef2.current.value = '';
    }
  }, []);

  const handleOptimizePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      alert('请先输入提示词');
      return;
    }

    setIsOptimizing(true);
    try {
      const optimizedPrompt = await optimizePrompt(optimizeApiKey || apiKey, prompt);
      setPrompt(optimizedPrompt);
    } catch (error) {
      console.error('[BottomEditor] Prompt optimize failed:', error);
      alert('提示词优化失败，请检查网络或 API Key');
    } finally {
      setIsOptimizing(false);
    }
  }, [apiKey, optimizeApiKey, prompt]);

  const handleBatchOptimize = useCallback(async () => {
    if (!prompt.trim()) {
      alert('请先输入基础提示词');
      return;
    }

    setIsBatchOptimizing(true);
    try {
      const targetCount = batchMode ? Math.max(2, variationCount) : Math.max(2, imageCount);
      const variations = await batchOptimizePrompts(optimizeApiKey || apiKey, prompt, targetCount);
      setBatchPrompts((prev) => [
        ...prev,
        ...variations.map((variation) => ({ id: generateId(), prompt: variation })),
      ]);
    } catch (error) {
      console.error('[BottomEditor] Batch optimize failed:', error);
      alert('批量场景扩写失败，请检查网络或 API Key');
    } finally {
      setIsBatchOptimizing(false);
    }
  }, [apiKey, batchMode, imageCount, optimizeApiKey, prompt, variationCount]);

  const handleAddBatchPrompt = useCallback(() => {
    if (!prompt.trim()) {
      return;
    }

    setBatchPrompts((prev) => [...prev, { id: generateId(), prompt: prompt.trim() }]);
    setPrompt('');
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    const activeApiKey = generationType === 'image'
      ? (imageApiKey || apiKey)
      : (videoApiKey || apiKey);

    if (!activeApiKey.trim()) {
      alert(generationType === 'image' ? '请先填写生图 API Key' : '请先填写生视频 API Key');
      return;
    }

    const promptsToProcess = batchMode
      ? batchPrompts.filter((item) => item.prompt.trim()).map((item) => item.prompt.trim())
      : generationType === 'image' && imageCount > 1
        ? (() => {
            const explicitVariants = batchPrompts
              .filter((item) => item.prompt.trim())
              .map((item) => item.prompt.trim())
              .slice(0, imageCount);

            if (explicitVariants.length > 0) {
              return explicitVariants;
            }

            return Array.from({ length: imageCount }, () => prompt.trim());
          })()
        : [prompt.trim()];

    if (promptsToProcess.length === 0 || !promptsToProcess[0]) {
      alert('请至少输入一个提示词');
      return;
    }

    if (generationType === 'video' && useImage && imageType === 'start-end' && (!imageData || !imageData2)) {
      alert('首尾帧模式需要同时上传起始图和结束图');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus(
      generationType === 'image' && !batchMode && imageCount > 1
        ? '正在批量生成图片任务...'
        : generationType === 'image'
          ? '正在提交生图任务...'
          : '正在提交视频任务...'
    );

    try {
      await onGenerate({
        generationType,
        model,
        veoSubModel,
        soraSubModel,
        grokSubModel,
        imageSubModel,
        prompts: promptsToProcess,
        imageData: useImage ? imageData : undefined,
        imageData2: useImage && (generationType === 'image' || imageType === 'start-end') ? imageData2 : undefined,
        imageType: generationType === 'video' && useImage ? imageType : undefined,
        aspectRatio,
        duration,
        resolution,
        negativePrompt,
        imageCount,
        variationCount,
      });
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  }, [
    apiKey,
    aspectRatio,
    batchMode,
    batchPrompts,
    duration,
    generationType,
    grokSubModel,
    imageApiKey,
    imageCount,
    imageData,
    imageData2,
    imageSubModel,
    imageType,
    model,
    negativePrompt,
    onGenerate,
    prompt,
    resolution,
    soraSubModel,
    useImage,
    variationCount,
    veoSubModel,
    videoApiKey,
  ]);

  return (
    <div className="fixed bottom-0 left-20 right-0 bg-white border-t border-gray-200 p-6 z-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => onGenerationTypeChange('image')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              generationType === 'image'
                ? 'bg-purple-50 text-purple-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            生图
          </button>
          <button
            onClick={() => onGenerationTypeChange('video')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              generationType === 'video'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            生视频
          </button>
        </div>

        {supportsImageInput && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setUseImage(false)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                !useImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              纯文本
            </button>
            <button
              onClick={() => setUseImage(true)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                useImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              图片输入
            </button>

            {useImage && generationType === 'video' && model !== 'grok' && (
              <>
                <div className="h-6 w-px bg-gray-300 mx-1" />
                <button
                  onClick={() => setImageType('reference')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    imageType === 'reference' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  参考图
                </button>
                <button
                  onClick={() => setImageType('start-end')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    imageType === 'start-end' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  首尾帧
                </button>
              </>
            )}

            {useImage && (
              <>
                <button
                  onClick={() => handleFileSelect('primary')}
                  className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
                >
                  {generationType === 'image'
                    ? imageData ? '替换参考图 A' : '选择参考图 A'
                    : imageData ? '替换起始图' : '选择起始图'}
                </button>
                {(generationType === 'image' || (model !== 'grok' && imageType === 'start-end')) && (
                  <button
                    onClick={() => handleFileSelect('secondary')}
                    className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    {generationType === 'image'
                      ? imageData2 ? '替换参考图 B' : '选择参考图 B'
                      : imageData2 ? '替换结束图' : '选择结束图'}
                  </button>
                )}
                {(imageData || imageData2) && (
                  <button
                    onClick={handleClearImages}
                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    清空图片
                  </button>
                )}
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleFileChange('primary', event)}
              className="hidden"
            />
            <input
              ref={fileInputRef2}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleFileChange('secondary', event)}
              className="hidden"
            />
          </div>
        )}

        {useImage && imageData && (
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
              <img src={imageData} alt="seed-a" className="w-14 h-14 rounded-lg object-cover" />
              <div className="text-xs text-blue-700">
                <div className="font-semibold">已接入主参考图</div>
                <div>这张图会作为下一次生成的输入</div>
              </div>
            </div>
            {imageData2 && (
              <div className="flex items-center gap-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl">
                <img src={imageData2} alt="seed-b" className="w-14 h-14 rounded-lg object-cover" />
                <div className="text-xs text-purple-700">
                  <div className="font-semibold">{generationType === 'image' ? '已接入第二参考图' : '已接入结束帧'}</div>
                  <div>{generationType === 'image' ? '会参与图像融合生成' : '会参与视频首尾过渡'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            {generationStatus}
          </div>
        )}

        {!batchMode ? (
          <div className="mb-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={generationType === 'image' ? '描述你想生成的图片...' : '描述你想生成的视频内容...'}
                rows={3}
                className="w-full px-4 py-3 pr-36 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing || !prompt.trim()}
                  className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                    isOptimizing || !prompt.trim()
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  {isOptimizing ? '优化中...' : 'AI 优化'}
                </button>
                {generationType === 'image' && (
                  <button
                    onClick={handleBatchOptimize}
                    disabled={isBatchOptimizing || !prompt.trim()}
                    className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                      isBatchOptimizing || !prompt.trim()
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                    }`}
                  >
                    {isBatchOptimizing ? '生成中...' : `场景变体 x${imageCount}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="输入提示词，然后加入批量队列..."
                rows={2}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
              <button
                onClick={handleAddBatchPrompt}
                disabled={!prompt.trim()}
                className="px-4 py-3 bg-blue-50 text-blue-600 font-semibold text-sm rounded-xl hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                加入
              </button>
              <button
                onClick={handleBatchOptimize}
                disabled={isBatchOptimizing || !prompt.trim()}
                className="px-4 py-3 bg-purple-50 text-purple-600 font-semibold text-sm rounded-xl hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBatchOptimizing ? '生成中...' : `AI 批量 x${variationCount}`}
              </button>
            </div>

            {batchPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {batchPrompts.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200"
                  >
                    <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
                    <span className="text-sm text-gray-700 max-w-xs truncate">{item.prompt}</span>
                    <button
                      onClick={() => setBatchPrompts((prev) => prev.filter((entry) => entry.id !== item.id))}
                      className="text-gray-400 hover:text-red-600"
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
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-wrap items-center gap-3">
            {generationType === 'video' && model === 'veo' && (
              <input
                type="text"
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                placeholder="反向提示词..."
                className="w-48 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            )}

            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value as '16:9' | '9:16' | '1:1' | '4:3' | '3:4')}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableAspectRatios.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            {generationType === 'video' && availableDurations.length > 0 && (
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableDurations.map((item) => (
                  <option key={item} value={item}>{item} 秒</option>
                ))}
              </select>
            )}

            {generationType === 'image' && (
              <>
                <select
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {IMAGE_RESOLUTION_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                {!batchMode ? (
                  <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm text-gray-700">
                    数量
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={imageCount}
                      onChange={(event) => setImageCount(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
                      className="w-16 bg-transparent focus:outline-none"
                    />
                  </label>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm text-gray-700">
                    变体数
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={variationCount}
                      onChange={(event) => setVariationCount(Math.min(20, Math.max(2, Number(event.target.value) || 2)))}
                      className="w-16 bg-transparent focus:outline-none"
                    />
                  </label>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => void handleGenerate()}
            disabled={
              isGenerating
              || !((generationType === 'image' ? (imageApiKey || apiKey) : (videoApiKey || apiKey)).trim())
              || (!batchMode && !prompt.trim())
              || (batchMode && batchPrompts.length === 0)
            }
            className={`px-8 py-3 font-bold rounded-xl transition-all shadow-lg ${
              generationType === 'image'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-400'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400'
            } disabled:cursor-not-allowed`}
          >
            {isGenerating
              ? generationStatus
              : generationType === 'image'
                ? `生成图片${batchMode ? ` (${batchPrompts.length} 条提示词)` : ` x${imageCount}`}`
                : `生成视频${batchMode ? ` (${batchPrompts.length} 条提示词)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
