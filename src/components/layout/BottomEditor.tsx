import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  VideoModel, 
  VeoSubModel, 
  SoraSubModel, 
  GrokSubModel, 
  GeminiSubModel, 
  GenerationType,
  ImageModel 
} from '../../types';
import { 
  ASPECT_RATIOS, 
  DURATION_OPTIONS, 
  IMAGE_RESOLUTION_OPTIONS,
  generateId 
} from '../../utils/constants';
import { optimizePrompt, batchOptimizePrompts } from '../../services/allapi';

interface BottomEditorProps {
  apiKey: string;
  generationType: GenerationType;
  model: VideoModel | ImageModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  geminiSubModel: GeminiSubModel;
  batchMode: boolean;
  onGenerate: (data: GenerateData) => void;
  onGenerationTypeChange: (type: GenerationType) => void;
  initialPrompt?: string;
  onPromptUsed?: () => void;
}

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

interface BatchPrompt {
  id: string;
  prompt: string;
}

export function BottomEditor({
  apiKey,
  generationType,
  model,
  veoSubModel,
  soraSubModel,
  grokSubModel,
  geminiSubModel,
  batchMode,
  onGenerate,
  onGenerationTypeChange,
  initialPrompt,
  onPromptUsed,
}: BottomEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '3:4'>('16:9');
  const [duration, setDuration] = useState(4);
  const [resolution, setResolution] = useState('2K');
  const [useImage, setUseImage] = useState(false);
  const [imageData, setImageData] = useState<string>();
  const [imageData2, setImageData2] = useState<string>();
  const [imageType, setImageType] = useState<'reference' | 'start-end'>('reference');
  const [batchPrompts, setBatchPrompts] = useState<BatchPrompt[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBatchOptimizing, setIsBatchOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Filter aspect ratios based on generation type
  const availableAspectRatios = generationType === 'image' 
    ? ASPECT_RATIOS // Image supports all ratios
    : ASPECT_RATIOS.filter(ar => ar.value === '16:9' || ar.value === '9:16' || ar.value === '1:1');

  // Duration options for video only
  const availableDurations = generationType === 'video' 
    ? DURATION_OPTIONS[model as keyof typeof DURATION_OPTIONS] || [4]
    : [];

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onPromptUsed?.();
    }
  }, [initialPrompt, onPromptUsed]);

  // Reset duration when switching models
  useEffect(() => {
    if (generationType === 'video' && availableDurations.length > 0) {
      setDuration(availableDurations[0]);
    }
  }, [model, generationType, availableDurations]);

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect2 = () => {
    fileInputRef2.current?.click();
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

  const handleFileChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageData2(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImages = () => {
    setImageData(undefined);
    setImageData2(undefined);
    setUseImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (fileInputRef2.current) {
      fileInputRef2.current.value = '';
    }
  };

  const handleOptimizePrompt = useCallback(async () => {
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
  }, [prompt, apiKey]);

  // Batch optimize - generate 5 variations
  const handleBatchOptimize = useCallback(async () => {
    if (!prompt.trim()) {
      alert('请先输入基础提示词');
      return;
    }

    setIsBatchOptimizing(true);
    try {
      const variations = await batchOptimizePrompts(apiKey, prompt);
      // Add all variations to batch prompts
      const newBatchPrompts = variations.map((variation) => ({
        id: generateId(),
        prompt: variation,
      }));
      setBatchPrompts(prev => [...prev, ...newBatchPrompts]);
      alert(`已生成 ${variations.length} 个优化版本！`);
    } catch (error) {
      console.error('批量优化失败:', error);
      alert('批量优化失败，请检查网络或API密钥');
    } finally {
      setIsBatchOptimizing(false);
    }
  }, [prompt, apiKey]);

  const addBatchPrompt = () => {
    if (prompt.trim()) {
      setBatchPrompts(prev => [...prev, { id: generateId(), prompt: prompt.trim() }]);
      setPrompt('');
    }
  };

  const removeBatchPrompt = (id: string) => {
    setBatchPrompts(prev => prev.filter(bp => bp.id !== id));
  };

  const handleGenerate = () => {
    if (!apiKey.trim()) {
      alert('请先输入您的 API 密钥');
      return;
    }

    const promptsToProcess = batchMode
      ? batchPrompts.filter(bp => bp.prompt.trim()).map(bp => bp.prompt)
      : [prompt.trim()];

    if (promptsToProcess.length === 0) {
      alert('请至少输入一个提示词');
      return;
    }

    onGenerate({
      generationType,
      model,
      veoSubModel,
      soraSubModel,
      grokSubModel,
      geminiSubModel,
      prompts: promptsToProcess,
      imageData: useImage ? imageData : undefined,
      imageData2: useImage && imageType === 'start-end' ? imageData2 : undefined,
      imageType: useImage ? imageType : undefined,
      aspectRatio,
      duration,
      resolution,
      negativePrompt,
    });
  };

  return (
    <div className="fixed bottom-0 left-20 right-0 bg-white border-t border-gray-200 p-6 z-50">
      <div className="max-w-6xl mx-auto">
        {/* Generation Type Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => onGenerationTypeChange('image')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              generationType === 'image' 
                ? 'bg-purple-50 text-purple-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎨 生图
          </button>
          <button
            onClick={() => onGenerationTypeChange('video')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              generationType === 'video' 
                ? 'bg-blue-50 text-blue-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎬 生视频
          </button>
        </div>

        {/* Image/Video Upload - Only for Video models (Veo, Grok) or Image with img2img */}
        {generationType === 'video' && (model === 'veo' || model === 'grok') && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setUseImage(false)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                !useImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              文字输入
            </button>
            <button
              onClick={() => setUseImage(true)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                useImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              图片输入
            </button>

            {useImage && (
              <>
                <div className="h-6 w-px bg-gray-300 mx-2" />
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
                  onClick={handleImageSelect}
                  className="ml-2 px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
                >
                  {imageType === 'reference' ? (imageData ? '更换图片' : '选择图片') : '首帧'}
                </button>
                {imageType === 'start-end' && (
                  <button
                    onClick={handleImageSelect2}
                    className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    {imageData2 ? '更换尾帧' : '选择尾帧'}
                  </button>
                )}
                {(imageData || imageData2) && (
                  <button
                    onClick={handleClearImages}
                    className="ml-2 text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    清除
                  </button>
                )}
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={fileInputRef2}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange2}
              className="hidden"
            />
          </div>
        )}

        {/* Prompt Input */}
        {!batchMode ? (
          <div className="mb-4 relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={generationType === 'image' ? "描述您想要生成的图像..." : "描述您想要生成的视频内容..."}
              rows={3}
              className="w-full px-4 py-3 pr-32 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
            {/* AI Optimize Buttons */}
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
                {isOptimizing ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    优化中
                  </span>
                ) : (
                  <span>AI优化</span>
                )}
              </button>
              <button
                onClick={handleBatchOptimize}
                disabled={isBatchOptimizing || !prompt.trim()}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isBatchOptimizing || !prompt.trim()
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                }`}
                title="一键生成5个不同风格的变体"
              >
                {isBatchOptimizing ? '生成中...' : '批量×5'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入提示词，然后点击添加..."
                rows={2}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
              <button
                onClick={addBatchPrompt}
                disabled={!prompt.trim()}
                className="px-4 py-3 bg-blue-50 text-blue-600 font-semibold text-sm rounded-xl hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                添加
              </button>
              <button
                onClick={handleBatchOptimize}
                disabled={isBatchOptimizing || !prompt.trim()}
                className="px-4 py-3 bg-purple-50 text-purple-600 font-semibold text-sm rounded-xl hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBatchOptimizing ? '生成中...' : 'AI批量×5'}
              </button>
            </div>
            {batchPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {batchPrompts.map((bp, idx) => (
                  <div
                    key={bp.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200"
                  >
                    <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                    <span className="text-sm text-gray-700 max-w-xs truncate">{bp.prompt}</span>
                    <button
                      onClick={() => removeBatchPrompt(bp.id)}
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

        {/* Bottom Row: Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Settings */}
          <div className="flex-1 flex items-center gap-3">
            {/* Negative Prompt - Only for Veo */}
            {generationType === 'video' && model === 'veo' && (
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="反向提示词..."
                className="w-48 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            )}

            {/* Aspect Ratio */}
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1' | '4:3' | '3:4')}
              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableAspectRatios.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>

            {/* Duration - Video only */}
            {generationType === 'video' && availableDurations.length > 0 && (
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableDurations.map(d => (
                  <option key={d} value={d}>{d}秒</option>
                ))}
              </select>
            )}

            {/* Resolution - Image only */}
            {generationType === 'image' && (
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {IMAGE_RESOLUTION_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Right: Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!apiKey || (!batchMode && !prompt.trim()) || (batchMode && batchPrompts.length === 0)}
            className={`px-8 py-3 font-bold rounded-xl transition-all shadow-lg ${
              generationType === 'image'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-400'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400'
            } disabled:cursor-not-allowed`}
          >
            {batchMode ? `生成 ${batchPrompts.length} 个${generationType === 'image' ? '图片' : '视频'}` : `生成${generationType === 'image' ? '图片' : '视频'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
