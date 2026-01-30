import { VideoTask } from '../../types';
import { getHistory } from '../../services/storage';

type WorkspaceTabType = 'tasks' | 'history' | 'empty';

interface WorkspaceProps {
  activeTab: WorkspaceTabType;
  tasks?: VideoTask[];
  onTaskClick?: (task: VideoTask) => void;
}

export function Workspace({ activeTab, tasks = [], onTaskClick }: WorkspaceProps) {
  const history = getHistory();

  // Empty state for generate tab
  if (activeTab === 'empty') {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🎬</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">开始创建您的视频</h3>
          <p className="text-gray-600">在下方输入提示词并调整参数来生成视频</p>
        </div>
      </div>
    );
  }

  // Tasks tab
  if (activeTab === 'tasks') {
    if (tasks.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📝</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-600">开始生成视频后，任务将显示在这里</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${task.status === 'processing' ? 'bg-yellow-400 animate-pulse' :
                      task.status === 'completed' ? 'bg-green-400' :
                        task.status === 'failed' ? 'bg-red-400' :
                          'bg-gray-400'
                    }`} />
                  <span className="text-sm font-semibold text-gray-600 uppercase">{task.status}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {task.createdAt.toLocaleTimeString()}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{task.prompt}</h4>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="font-semibold uppercase">{task.model}</span>
                {task.progress !== undefined && task.progress > 0 && (
                  <span className="text-blue-600">{Math.round(task.progress)}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // History tab
  if (activeTab === 'history') {
    if (history.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🕐</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">暂无历史记录</h3>
            <p className="text-gray-600">生成的视频将显示在这里</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all group"
            >
              <div className="aspect-video bg-gray-100 relative">
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 line-clamp-2 leading-tight">{item.prompt}</h4>
                  {item.videoUrl && (
                    <a
                      href={item.videoUrl}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="下载"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="font-bold border border-gray-100 px-1.5 py-0.5 rounded text-[10px] uppercase">{item.model}</span>
                    <span>{item.duration}s</span>
                  </div>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
