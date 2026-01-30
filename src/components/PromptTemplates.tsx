import { useState } from 'react';
import { PromptTemplate } from '../types';
import { PROMPT_TEMPLATES, getCategories, applyTemplate } from '../utils/prompts';

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
}

export function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const categories = ['全部', ...getCategories()];
  const filteredTemplates = selectedCategory === '全部'
    ? PROMPT_TEMPLATES
    : PROMPT_TEMPLATES.filter(t => t.category === selectedCategory);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      '电影效果': 'from-purple-500 to-pink-500',
      '电商广告': 'from-blue-500 to-cyan-500',
      '社交媒体': 'from-orange-500 to-yellow-500',
      '教育科普': 'from-green-500 to-teal-500',
      '风景旅游': 'from-cyan-500 to-blue-500',
      '艺术创意': 'from-pink-500 to-rose-500',
      '商业展示': 'from-gray-700 to-gray-900',
    };
    return colors[category] || 'from-primary-500 to-accent-500';
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      '电影效果': '🎬',
      '电商广告': '🛍️',
      '社交媒体': '📱',
      '教育科普': '📚',
      '风景旅游': '🌄',
      '艺术创意': '🎨',
      '商业展示': '🏢',
    };
    return emojis[category] || '📋';
  };

  const handleTemplateClick = (template: PromptTemplate) => {
    if (template.variables && template.variables.length > 0) {
      setSelectedTemplate(template);
      setVariableValues({});
      setShowVariableModal(true);
    } else {
      onSelect(template.prompt);
    }
  };

  const handleApplyVariables = () => {
    if (selectedTemplate) {
      const prompt = applyTemplate(selectedTemplate, variableValues);
      onSelect(prompt);
      setShowVariableModal(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const isActive = selectedCategory === category;
          const categoryEmoji = getCategoryEmoji(category);
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r text-white shadow-glow scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isActive ? getCategoryColor(category) : ''}`}
            >
              <span className="flex items-center gap-2">
                {categoryEmoji}
                {category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => handleTemplateClick(template)}
            className="group relative p-5 text-left bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl hover:border-primary-400 hover:shadow-card transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-bold text-gray-900 text-base group-hover:text-primary-600 transition-colors">
                {template.name}
              </h4>
              {template.variables && template.variables.length > 0 && (
                <span className="text-xs font-semibold bg-accent-100 text-accent-700 px-2.5 py-1 rounded-full border border-accent-200">
                  可定制
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{template.description}</p>
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg p-3 border border-primary-100">
              <p className="text-sm text-gray-700 line-clamp-2 font-medium">{template.prompt}</p>
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </button>
        ))}
      </div>

      {/* Variable modal */}
      {showVariableModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11 5h-1.172z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">自定义模板</h3>
                <p className="text-sm text-gray-500">{selectedTemplate.name}</p>
              </div>
            </div>

            <div className="space-y-5 mb-8">
              {selectedTemplate.variables?.map(variable => (
                <div key={variable}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {variable.charAt(0).toUpperCase() + variable.slice(1)}
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => setVariableValues({ ...variableValues, [variable]: e.target.value })}
                    placeholder={`输入 ${variable}...`}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
              ))}

              {/* Preview */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">预览</label>
                <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-200">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {applyTemplate(selectedTemplate, variableValues)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowVariableModal(false)}
                className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleApplyVariables}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-glow transition-all"
              >
                应用模板
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
