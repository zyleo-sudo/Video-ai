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
  GROK_SUB_MODELS,
  IMAGE_MODEL_CONFIGS,
  IMAGE_SUB_MODELS,
  MODEL_CONFIGS,
  SORA_SUB_MODELS,
  VEO_SUB_MODELS,
} from '../../utils/constants';

const APP_VERSION = 'v1.0.19';

interface TopBarProps {
  generationType: GenerationType;
  model: VideoModel | ImageModel;
  veoSubModel: VeoSubModel;
  soraSubModel: SoraSubModel;
  grokSubModel: GrokSubModel;
  imageSubModel: ImageSubModel;
  batchMode: boolean;
  onModelChange: (model: VideoModel | ImageModel) => void;
  onVeoSubModelChange: (subModel: VeoSubModel) => void;
  onSoraSubModelChange: (subModel: SoraSubModel) => void;
  onGrokSubModelChange: (subModel: GrokSubModel) => void;
  onImageSubModelChange: (subModel: ImageSubModel) => void;
  onBatchModeChange: (batchMode: boolean) => void;
}

export function TopBar({
  generationType,
  model,
  veoSubModel,
  soraSubModel,
  grokSubModel,
  imageSubModel,
  batchMode,
  onModelChange,
  onVeoSubModelChange,
  onSoraSubModelChange,
  onGrokSubModelChange,
  onImageSubModelChange,
  onBatchModeChange,
}: TopBarProps) {
  return (
    <div className="fixed top-0 left-20 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={model}
            onChange={(event) => onModelChange(event.target.value as VideoModel | ImageModel)}
            className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {generationType === 'video'
              ? Object.entries(MODEL_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))
              : Object.entries(IMAGE_MODEL_CONFIGS).map(([key, config]) => (
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

        {generationType === 'video' && model === 'veo' && (
          <SelectWithOptions value={veoSubModel} onChange={onVeoSubModelChange} options={VEO_SUB_MODELS} />
        )}
        {generationType === 'video' && model === 'sora' && (
          <SelectWithOptions value={soraSubModel} onChange={onSoraSubModelChange} options={SORA_SUB_MODELS} />
        )}
        {generationType === 'video' && model === 'grok' && (
          <SelectWithOptions value={grokSubModel} onChange={onGrokSubModelChange} options={GROK_SUB_MODELS} />
        )}
        {generationType === 'image' && (
          <SelectWithOptions value={imageSubModel} onChange={onImageSubModelChange} options={IMAGE_SUB_MODELS} />
        )}
      </div>

      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => onBatchModeChange(false)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            !batchMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          单个
        </button>
        <button
          onClick={() => onBatchModeChange(true)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            batchMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          批量
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-blue-700">{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}

function SelectWithOptions<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Record<T, { name: string }>;
}) {
  const entries = Object.entries(options) as Array<[T, { name: string }]>;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      >
        {entries.map(([key, config]) => (
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
  );
}
