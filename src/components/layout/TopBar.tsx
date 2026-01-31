import { 
  VideoModel, 
  ImageModel,
  VeoSubModel, 
  SoraSubModel, 
  GrokSubModel,
  GeminiSubModel,
  GenerationType 
} from '../../types';
import { 
  MODEL_CONFIGS, 
  IMAGE_MODEL_CONFIGS,
  VEO_SUB_MODELS, 
  SORA_SUB_MODELS, 
  GROK_SUB_MODELS,
  GEMINI_SUB_MODELS 
} from '../../utils/constants';

// 版本�?- 从构建时注入
const APP_VERSION = 'v1.0.2';

interface TopBarProps {
  generationType: GenerationType;
  model: VideoModel | ImageModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  geminiSubModel: GeminiSubModel;
  batchMode: boolean;
  onModelChange: (model: VideoModel | ImageModel) => void;
  onVeoSubModelChange: (subModel: VeoSubModel) => void;
  onSoraSubModelChange: (subModel: SoraSubModel) => void;
  onGrokSubModelChange: (subModel: GrokSubModel) => void;
  onGeminiSubModelChange: (subModel: GeminiSubModel) => void;
  onBatchModeChange: (batchMode: boolean) => void;
}

export function TopBar({
  generationType,
  model,
  veoSubModel,
  soraSubModel,
  grokSubModel,
  geminiSubModel,
  batchMode,
  onModelChange,
  onVeoSubModelChange,
  onSoraSubModelChange,
  onGrokSubModelChange,
  onGeminiSubModelChange,
  onBatchModeChange,
}: TopBarProps) {
  return (
    <div className="fixed top-0 left-20 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      {/* Left Section - Model Selection */}
      <div className="flex items-center gap-4">
        {/* Model Selector */}
        <div className="relative">
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value as VideoModel | ImageModel)}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {generationType === 'video' ? (
              // Video models
              Object.entries(MODEL_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))
            ) : (
              // Image models
              Object.entries(IMAGE_MODEL_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Sub-model Selector - Video Models */}
        {generationType === 'video' && model === 'veo' && (
          <div className="relative">
            <select
              value={veoSubModel}
              onChange={(e) => onVeoSubModelChange(e.target.value as VeoSubModel)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              {Object.entries(VEO_SUB_MODELS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {generationType === 'video' && model === 'sora' && (
          <div className="relative">
            <select
              value={soraSubModel}
              onChange={(e) => onSoraSubModelChange(e.target.value as SoraSubModel)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              {Object.entries(SORA_SUB_MODELS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {generationType === 'video' && model === 'grok' && (
          <div className="relative">
            <select
              value={grokSubModel}
              onChange={(e) => onGrokSubModelChange(e.target.value as GrokSubModel)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              {Object.entries(GROK_SUB_MODELS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Sub-model Selector - Image Models */}
        {generationType === 'image' && model === 'gemini-3-pro' && (
          <div className="relative">
            <select
              value={geminiSubModel}
              onChange={(e) => onGeminiSubModelChange(e.target.value as GeminiSubModel)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
            >
              {Object.entries(GEMINI_SUB_MODELS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Center Section - Batch Mode Toggle */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => onBatchModeChange(false)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            !batchMode
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          单个
        </button>
        <button
          onClick={() => onBatchModeChange(true)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            batchMode
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          批量
        </button>
      </div>

      {/* Right Section - Search & Version */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索..."
            className="w-64 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Version Badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-blue-700">{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
