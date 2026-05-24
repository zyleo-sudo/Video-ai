import { useEffect, useRef, useState } from 'react';
import { VideoTask } from '../../types';
import { STATUS_COLORS } from '../../utils/constants';
import { releaseImageUrl, resolveImageUrl } from '../../services/mediaStore';

interface VideoNodeProps {
  task: VideoTask;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
  onRemove: (taskId: string) => void;
  onUseAsVideoSource?: (task: VideoTask) => void;
  onUseBatchAsVideoSource?: (task: VideoTask) => void;
}

export function VideoNode({
  task,
  onClick,
  onDrag,
  onRemove,
  onUseAsVideoSource,
  onUseBatchAsVideoSource,
}: VideoNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState(task.position || { x: 100, y: 100 });
  const [showPreview, setShowPreview] = useState(false);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState('');
  const nodeRef = useRef<HTMLDivElement>(null);

  const mediaUrl = resolvedMediaUrl || task.videoUrl;
  const isImageTask = task.generationType === 'image';

  useEffect(() => {
    if (task.position) {
      setPos(task.position);
    }
  }, [task.position]);

  useEffect(() => {
    let active = true;
    let currentUrl = '';

    async function loadMediaUrl(): Promise<void> {
      if (!task.videoUrl) {
        setResolvedMediaUrl('');
        return;
      }

      const nextUrl = await resolveImageUrl(task.videoUrl);
      if (!active) {
        releaseImageUrl(nextUrl);
        return;
      }

      currentUrl = nextUrl;
      setResolvedMediaUrl(nextUrl);
    }

    void loadMediaUrl();

    return () => {
      active = false;
      releaseImageUrl(currentUrl);
    };
  }, [task.videoUrl]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent): void {
      if (!isDragging) {
        return;
      }

      const newX = event.clientX - dragStart.x;
      const newY = event.clientY - dragStart.y;
      setPos({ x: newX, y: newY });
      onDrag(newX, newY);
    }

    function handleMouseUp(): void {
      setIsDragging(false);
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, isDragging, onDrag]);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: event.clientX - pos.x, y: event.clientY - pos.y });
  };

  const handleDownload = async (): Promise<void> => {
    if (!mediaUrl) {
      return;
    }

    const filename = isImageTask ? `image-${task.id}.png` : `video-${task.id}.mp4`;

    try {
      if (mediaUrl.startsWith('data:image') || mediaUrl.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('[VideoNode] Download failed:', error);
      window.open(mediaUrl, '_blank');
    }
  };

  return (
    <>
      <div
        ref={nodeRef}
        className={`absolute group select-none transition-shadow duration-300 ${isDragging ? 'z-50' : 'z-10'}`}
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={handleMouseDown}
      >
        <div
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={`
            w-72 bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-xl
            transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer
            ${isDragging ? 'ring-2 ring-blue-400 border-blue-200' : 'border-gray-100'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[task.status]}`}>
                {task.status}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">#{task.id.slice(-4)}</span>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRemove(task.id);
              }}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="移除节点"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative aspect-video bg-gray-900 rounded-xl mb-3 overflow-hidden border border-gray-100/20 shadow-inner group/media">
            {task.status === 'completed' && mediaUrl ? (
              <>
                {isImageTask ? (
                  <img src={mediaUrl} className="w-full h-full object-cover" alt={task.prompt} />
                ) : (
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    onMouseOver={(event) => event.currentTarget.play()}
                    onMouseOut={(event) => {
                      event.currentTarget.pause();
                      event.currentTarget.currentTime = 0;
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowPreview(true);
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-all"
                    title={isImageTask ? '查看图片' : '预览视频'}
                  >
                    <span className="text-white text-lg">{isImageTask ? '图' : '播'}</span>
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDownload();
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-all"
                    title={isImageTask ? '下载图片' : '下载视频'}
                  >
                    <span className="text-white text-lg">下</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                {task.status === 'processing' ? (
                  <div className="flex flex-col items-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] text-blue-300 font-bold">{Math.floor(task.progress || 0)}%</span>
                    </div>
                    <span className="text-[10px] text-blue-300/60 mt-2 font-medium tracking-widest uppercase">Processing</span>
                  </div>
                ) : task.status === 'failed' ? (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">!</span>
                    <span className="text-[10px] text-red-400 font-bold uppercase text-center px-4">Generation Failed</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">
                      {isImageTask ? '图' : '视'}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-widest">Pending</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <h4 className="text-xs font-bold text-gray-800 mb-1 line-clamp-1">{task.model.toUpperCase()}</h4>
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed h-8">{task.prompt}</p>
          {task.batchLabel && (
            <p className="text-[10px] text-purple-600 mt-2 line-clamp-1">{task.batchLabel}</p>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
            <span className="text-[10px] text-gray-400">
              {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex items-center gap-2">
              {isImageTask && task.status === 'completed' && task.batchId && onUseBatchAsVideoSource && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onUseBatchAsVideoSource(task);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  整批转视频
                </button>
              )}
              {isImageTask && task.status === 'completed' && onUseAsVideoSource && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onUseAsVideoSource(task);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  继续做视频
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPreview && mediaUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" onClick={() => setShowPreview(false)}>
          <div
            className="bg-gray-900 rounded-2xl overflow-hidden max-w-4xl max-h-[90vh] w-full mx-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">{isImageTask ? '图片预览' : '视频预览'}</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {isImageTask ? (
                <img src={mediaUrl} className="max-w-full max-h-[70vh] mx-auto rounded-lg" alt={task.prompt} />
              ) : (
                <video src={mediaUrl} className="w-full max-h-[70vh] rounded-lg" controls autoPlay />
              )}
              <p className="text-gray-400 mt-4 text-sm line-clamp-2">{task.prompt}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
