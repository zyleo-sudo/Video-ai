import { useState } from 'react';
import { getApiKey, setApiKey, clearApiKey, getSettings, setSettings } from '../services/storage';
import { VEO_SUB_MODELS, SORA_SUB_MODELS } from '../utils/constants';
import { VeoSubModel, SoraSubModel } from '../types';

interface HeaderProps {
  onApiKeyChange?: (key: string) => void;
}

export function Header({ onApiKeyChange }: HeaderProps) {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [tempKey, setTempKey] = useState('');
  const [settings, setSettingsState] = useState(getSettings());
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveApiKey = () => {
    if (tempKey.trim()) {
      setApiKey(tempKey.trim());
      setApiKeyState(tempKey.trim());
      setShowApiKeyInput(false);
      onApiKeyChange?.(tempKey.trim());
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyState('');
    setShowApiKeyInput(true);
    onApiKeyChange?.('');
  };

  const handleSettingChange = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettingsState(newSettings);
    setSettings({ [key]: value });
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-glow animate-float">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Video AI</h1>
              <p className="text-xs text-gray-500">智能视频生成</p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* API Key status */}
            {apiKey ? (
              <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">已连接</span>
                <button
                  onClick={handleClearApiKey}
                  className="text-xs text-green-600 hover:text-green-800 underline"
                >
                  更改
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowApiKeyInput(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl shadow-glow transition-all duration-300"
              >
                设置密钥
              </button>
            )}

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                showSettings
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="设置"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="pb-6 border-t border-gray-100 pt-6 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-6 border border-primary-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">配置 API 密钥</h3>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="请输入您的 ALLAPI 密钥..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={!tempKey.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-glow transition-all duration-300 font-semibold"
                >
                  保存
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-600 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                从{' '}
                <a
                  href="https://allapi.store"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium underline underline-offset-2"
                >
                  allapi.store
                </a>
                {' '}获取您的 API 密钥
              </p>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="pb-6 border-t border-gray-100 pt-6 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">默认设置</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Default Model */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">默认模型</label>
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => handleSettingChange('defaultModel', e.target.value as 'veo' | 'sora')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all"
                  >
                    <option value="veo">Google Veo</option>
                    <option value="sora">OpenAI Sora</option>
                  </select>
                </div>

                {/* Default Aspect Ratio */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">默认宽高比</label>
                  <select
                    value={settings.defaultAspectRatio}
                    onChange={(e) => handleSettingChange('defaultAspectRatio', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all"
                  >
                    <option value="16:9">16:9 (横屏)</option>
                    <option value="9:16">9:16 (竖屏)</option>
                    <option value="1:1">1:1 (方形)</option>
                  </select>
                </div>

                {/* Default Veo Sub-Model */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">默认 Veo 模型</label>
                  <select
                    value={settings.defaultVeoSubModel}
                    onChange={(e) => handleSettingChange('defaultVeoSubModel', e.target.value as VeoSubModel)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all"
                  >
                    {Object.entries(VEO_SUB_MODELS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name} - {config.priceLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Sora Sub-Model */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">默认 Sora 模型</label>
                  <select
                    value={settings.defaultSoraSubModel}
                    onChange={(e) => handleSettingChange('defaultSoraSubModel', e.target.value as SoraSubModel)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all"
                  >
                    {Object.entries(SORA_SUB_MODELS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name} - {config.priceLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Concurrent Tasks */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">最大并发任务数</label>
                  <select
                    value={settings.maxConcurrentTasks}
                    onChange={(e) => handleSettingChange('maxConcurrentTasks', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all"
                  >
                    <option value="1">1 个</option>
                    <option value="3">3 个</option>
                    <option value="5">5 个</option>
                    <option value="10">10 个</option>
                  </select>
                </div>

                {/* Auto Download */}
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoDownload}
                      onChange={(e) => handleSettingChange('autoDownload', e.target.checked)}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                    <span className="text-sm text-gray-700 font-medium">自动下载完成的视频</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
