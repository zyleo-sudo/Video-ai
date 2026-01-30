import { VideoTask, TaskStatus } from '../types';
import { STATUS_COLORS, formatDate } from '../utils/constants';

interface TaskListProps {
  tasks: VideoTask[];
  onTaskClick?: (task: VideoTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskRegenerate?: (task: VideoTask) => void;
}

export function TaskList({ tasks, onTaskClick, onTaskDelete, onTaskRegenerate }: TaskListProps) {
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    const labels: Record<TaskStatus, string> = {
      'pending': '等待中',
      'processing': '生成中',
      'completed': '已完成',
      'failed': '失败',
    };
    return labels[status];
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-100 to-accent-100 rounded-3xl flex items-center justify-center mb-6 animate-float">
          <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium text-lg">暂无任务</p>
        <p className="text-gray-400 text-sm mt-2">创建视频开始您的创作之旅</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <div
          key={task.id}
          onClick={() => onTaskClick?.(task)}
          className="group relative bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:border-primary-400 hover:shadow-card transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Status and main content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Status icon */}
              <div className={`flex-shrink-0 p-2.5 rounded-xl ${STATUS_COLORS[task.status]}`}>
                {getStatusIcon(task.status)}
              </div>

              {/* Task details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[task.status]}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{task.model}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{task.prompt}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatDate(task.createdAt)}</span>
                  {task.options && 'aspectRatio' in task.options && (
                    <>
                      <span>•</span>
                      <span>{task.options.aspectRatio}</span>
                    </>
                  )}
                  {task.progress !== undefined && task.status === 'processing' && (
                    <>
                      <span>•</span>
                      <span className="text-primary-600 font-semibold">{Math.round(task.progress)}%</span>
                    </>
                  )}
                </div>

                {/* Error message */}
                {task.status === 'failed' && task.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-xs text-red-700 font-medium">{task.errorMessage}</p>
                  </div>
                )}

                {/* Progress bar for processing tasks */}
                {task.status === 'processing' && (
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-300 relative"
                      style={{ width: `${task.progress || 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Video thumbnail for completed tasks */}
            {task.status === 'completed' && task.thumbnailUrl && (
              <div className="flex-shrink-0">
                <img
                  src={task.thumbnailUrl}
                  alt=""
                  className="w-28 h-20 object-cover rounded-xl shadow-md"
                  loading="lazy"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Regenerate button for failed tasks */}
              {task.status === 'failed' && onTaskRegenerate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskRegenerate(task);
                  }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                  title="重新生成"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}

              {/* Delete button */}
              {onTaskDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskDelete(task.id);
                  }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Video URL for completed tasks */}
          {task.status === 'completed' && task.videoUrl && (
            <a
              href={task.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-xl transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              打开视频
            </a>
          )}

          {/* Hover effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/3 to-accent-500/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>
      ))}
    </div>
  );
}
