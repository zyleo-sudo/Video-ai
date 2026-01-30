import { VideoTask } from '../../types';
import { getHistory } from '../../services/storage';

interface RightRailProps {
  selectedTask: VideoTask | null;
  onTaskClick: (task: VideoTask) => void;
  onPromptSelect: (prompt: string) => void;
}

export function RightRail({ selectedTask, onTaskClick, onPromptSelect }: RightRailProps) {
  const history = getHistory();

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col z-30 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
          <span className="text-blue-500">📋</span> 创作档案
        </h3>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
          {history.length} 记录
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedTask ? (
          <div className="p-5 space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">当前选中</h4>
              <button className="text-[10px] text-blue-600 font-bold hover:underline">详情</button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-3 border border-gray-200">
                {selectedTask.videoUrl ? (
                  <video src={selectedTask.videoUrl} className="w-full h-full object-cover" muted loop autoPlay />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">🎬</div>
                )}
              </div>
              <h5 className="text-sm font-bold text-gray-800 line-clamp-1">{selectedTask.model.toUpperCase()} 任务</h5>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">{selectedTask.prompt}</p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">生成历史</h4>
              <HistoryList history={history} onSelect={onTaskClick} onPromptSelect={onPromptSelect} />
            </div>
          </div>
        ) : (
          <div className="p-5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">最近记录</h4>
            <HistoryList history={history} onSelect={(item) => onTaskClick(item as any)} onPromptSelect={onPromptSelect} />
          </div>
        )}
      </div>

      {/* Bottom Stats Badge */}
      <div className="p-4 bg-gray-50/50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">今日已处理</span>
          <span className="font-bold text-gray-900">{history.length} 个视频</span>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ history, onSelect, onPromptSelect }: { history: any[], onSelect: (item: any) => void, onPromptSelect: (prompt: string) => void }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-10 opacity-30">
        <div className="text-4xl mb-2">🐚</div>
        <p className="text-xs font-bold">暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.slice(0, 10).map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="group flex gap-3 p-2 rounded-xl hover:bg-blue-50 transition-all cursor-pointer border border-transparent hover:border-blue-100"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} className="w-full h-full object-cover" />
            ) : item.videoUrl ? (
              <video src={item.videoUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight mb-1">{item.prompt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded lowercase">{item.model}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPromptSelect(item.prompt);
                  }}
                  className="text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:underline"
                >
                  重用提示词
                </button>
              </div>
              <span className="text-[9px] text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
