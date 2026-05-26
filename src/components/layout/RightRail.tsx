import { useEffect, useMemo, useState } from 'react';
import { getHistory } from '../../services/storage';
import { releaseImageUrl, resolveImageUrl } from '../../services/mediaStore';
import { HistoryRecord, VideoTask } from '../../types';

interface RightRailProps {
  selectedTask: VideoTask | null;
  tasks: VideoTask[];
  onTaskClick: (task: VideoTask) => void;
  onPromptSelect: (prompt: string) => void;
  onUseAsImageSource?: (task: VideoTask) => void;
  onUseAsVideoSource?: (task: VideoTask) => void;
  onUseBatchAsVideoSource?: (task: VideoTask) => void;
}

interface MediaThumbProps {
  item: Pick<VideoTask, 'generationType' | 'prompt' | 'thumbnailUrl' | 'videoUrl'>;
  className?: string;
  autoPlay?: boolean;
}

function useResolvedMedia(url?: string): string {
  const [resolvedUrl, setResolvedUrl] = useState('');

  useEffect(() => {
    let active = true;
    let currentUrl = '';

    async function loadUrl(): Promise<void> {
      const nextUrl = await resolveImageUrl(url);
      if (!active) {
        releaseImageUrl(nextUrl);
        return;
      }

      currentUrl = nextUrl;
      setResolvedUrl(nextUrl);
    }

    setResolvedUrl('');
    void loadUrl();

    return () => {
      active = false;
      releaseImageUrl(currentUrl);
    };
  }, [url]);

  return resolvedUrl || url || '';
}

function MediaThumb({ item, className = '', autoPlay = false }: MediaThumbProps) {
  const imageUrl = useResolvedMedia(item.thumbnailUrl || item.videoUrl);
  const videoUrl = useResolvedMedia(item.videoUrl);

  if (item.generationType === 'image') {
    return <img src={imageUrl} className={className} alt={item.prompt} />;
  }

  return (
    <video
      src={videoUrl}
      className={className}
      muted
      loop
      autoPlay={autoPlay}
      playsInline
    />
  );
}

export function RightRail({
  selectedTask,
  tasks,
  onTaskClick,
  onPromptSelect,
  onUseAsImageSource,
  onUseAsVideoSource,
  onUseBatchAsVideoSource,
}: RightRailProps) {
  const history = getHistory();
  const [previewItem, setPreviewItem] = useState<HistoryRecord | null>(null);
  const [selectedTaskMediaUrl, setSelectedTaskMediaUrl] = useState('');

  const batchItems = useMemo(() => {
    if (!selectedTask?.batchId) {
      return [];
    }

    return tasks.filter((task) => task.batchId === selectedTask.batchId && task.generationType === 'image');
  }, [selectedTask, tasks]);

  const completedBatchItems = useMemo(
    () => batchItems.filter((task) => task.status === 'completed'),
    [batchItems]
  );

  useEffect(() => {
    let active = true;
    let currentUrl = '';

    async function loadSelectedTaskMedia(): Promise<void> {
      if (!selectedTask?.videoUrl) {
        setSelectedTaskMediaUrl('');
        return;
      }

      const resolvedUrl = await resolveImageUrl(selectedTask.videoUrl);
      if (!active) {
        releaseImageUrl(resolvedUrl);
        return;
      }

      currentUrl = resolvedUrl;
      setSelectedTaskMediaUrl(resolvedUrl);
    }

    setSelectedTaskMediaUrl('');
    void loadSelectedTaskMedia();

    return () => {
      active = false;
      releaseImageUrl(currentUrl);
    };
  }, [selectedTask]);

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col z-30 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
          <span className="text-blue-500">档</span>
          创作档案
        </h3>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
          {history.length} 条记录
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedTask ? (
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">当前选中</h4>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-3 border border-gray-200">
                {selectedTaskMediaUrl ? (
                  selectedTask.generationType === 'image' ? (
                    <img src={selectedTaskMediaUrl} className="w-full h-full object-cover" alt={selectedTask.prompt} />
                  ) : (
                    <video src={selectedTaskMediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl">预览</div>
                )}
              </div>
              <h5 className="text-sm font-bold text-gray-800 line-clamp-1">{selectedTask.model.toUpperCase()} 任务</h5>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">{selectedTask.prompt}</p>
              {selectedTask.generationType === 'image' && selectedTask.status === 'completed' && onUseAsImageSource && (
                <button
                  onClick={() => onUseAsImageSource(selectedTask)}
                  className="mt-3 w-full px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
                >
                  用这张图继续生图
                </button>
              )}
              {selectedTask.generationType === 'image' && selectedTask.status === 'completed' && onUseAsVideoSource && (
                <button
                  onClick={() => onUseAsVideoSource(selectedTask)}
                  className="mt-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  用这张图生成视频
                </button>
              )}
              {selectedTask.generationType === 'image' && completedBatchItems.length > 1 && onUseBatchAsVideoSource && (
                <button
                  onClick={() => onUseBatchAsVideoSource(selectedTask)}
                  className="mt-2 w-full px-4 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  一键生成这批 {completedBatchItems.length} 个短视频
                </button>
              )}
            </div>

            {batchItems.length > 1 && (
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">同批图片</h4>
                  <span className="text-[10px] text-gray-500">{completedBatchItems.length}/{batchItems.length} 已完成</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {batchItems.slice(0, 9).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onTaskClick(item)}
                      className={`aspect-square rounded-xl overflow-hidden border transition-colors ${
                        item.id === selectedTask.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {item.videoUrl ? (
                        <MediaThumb item={item} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                          {item.status}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">最近历史</h4>
              <HistoryList
                history={history}
                onSelect={onTaskClick}
                onPromptSelect={onPromptSelect}
                onPreview={setPreviewItem}
              />
            </div>
          </div>
        ) : (
          <div className="p-5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">最近历史</h4>
            <HistoryList
              history={history}
              onSelect={(item) => onTaskClick(item as VideoTask)}
              onPromptSelect={onPromptSelect}
              onPreview={setPreviewItem}
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">累计生成</span>
          <span className="font-bold text-gray-900">{history.length} 条素材</span>
        </div>
      </div>

      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}

function HistoryList({
  history,
  onSelect,
  onPromptSelect,
  onPreview,
}: {
  history: HistoryRecord[];
  onSelect: (item: VideoTask) => void;
  onPromptSelect: (prompt: string) => void;
  onPreview?: (item: HistoryRecord) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-10 opacity-30">
        <div className="text-4xl mb-2">档</div>
        <p className="text-xs font-bold">暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.slice(0, 10).map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item as VideoTask)}
          className="group flex gap-3 p-2 rounded-xl hover:bg-blue-50 transition-all cursor-pointer border border-transparent hover:border-blue-100"
        >
          <div
            className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(event) => {
              event.stopPropagation();
              onPreview?.(item);
            }}
          >
            <MediaThumb item={item} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-gray-800 line-clamp-2 leading-tight mb-1">{item.prompt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded lowercase">
                  {item.model}
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onPromptSelect(item.prompt);
                  }}
                  className="text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:underline"
                >
                  复用提示词
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

function PreviewModal({ item, onClose }: { item: HistoryRecord; onClose: () => void }) {
  const mediaUrl = useResolvedMedia(item.videoUrl);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl overflow-hidden max-w-4xl max-h-[90vh] w-full mx-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">
            {item.generationType === 'image' ? '图片预览' : '视频预览'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {item.generationType === 'image' ? (
            <img src={mediaUrl} className="max-w-full max-h-[70vh] mx-auto rounded-lg" alt={item.prompt} />
          ) : (
            <video src={mediaUrl} className="w-full max-h-[70vh] rounded-lg" controls autoPlay />
          )}
          <p className="text-gray-400 mt-4 text-sm line-clamp-2">{item.prompt}</p>
        </div>
      </div>
    </div>
  );
}
