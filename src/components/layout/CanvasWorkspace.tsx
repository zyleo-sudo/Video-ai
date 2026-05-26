import { useRef, useState } from 'react';
import { VideoTask } from '../../types';
import { VideoNode } from '../canvas/VideoNode';

interface CanvasWorkspaceProps {
  tasks: VideoTask[];
  onTaskClick: (task: VideoTask) => void;
  onUpdateTaskPosition: (taskId: string, x: number, y: number) => void;
  onRemoveTask: (taskId: string) => void;
  onUseAsImageSource?: (task: VideoTask) => void;
  onUseAsVideoSource?: (task: VideoTask) => void;
  onUseBatchAsVideoSource?: (task: VideoTask) => void;
}

export function CanvasWorkspace({
  tasks,
  onTaskClick,
  onUpdateTaskPosition,
  onRemoveTask,
  onUseAsImageSource,
  onUseAsVideoSource,
  onUseBatchAsVideoSource,
}: CanvasWorkspaceProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 0 && (event.target as HTMLElement).classList.contains('canvas-area')) {
      setIsDragging(true);
      setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) {
      return;
    }

    setOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const zoomFactor = 0.95;
      const nextScale = event.deltaY > 0 ? scale * zoomFactor : scale / zoomFactor;
      setScale(Math.min(Math.max(nextScale, 0.1), 3));
      return;
    }

    setOffset((prev) => ({
      x: prev.x - event.deltaX,
      y: prev.y - event.deltaY,
    }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-[#f8fafc] canvas-area cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onWheel={handleWheel}
      style={{
        backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
        backgroundSize: `${30 * scale}px ${30 * scale}px`,
        backgroundPosition: `${offset.x}px ${offset.y}px`,
      }}
    >
      <div
        className="absolute transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {tasks.map((task) => (
          <VideoNode
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onDrag={(x, y) => onUpdateTaskPosition(task.id, x, y)}
            onRemove={onRemoveTask}
            onUseAsImageSource={onUseAsImageSource}
            onUseAsVideoSource={onUseAsVideoSource}
            onUseBatchAsVideoSource={onUseBatchAsVideoSource}
          />
        ))}

        {tasks.length === 0 && (
          <div className="absolute left-[50vw] top-[30vh] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-30 select-none pointer-events-none">
            <div className="text-8xl mb-6">视</div>
            <h2 className="text-3xl font-bold text-gray-400">开始你的创作</h2>
            <p className="text-lg text-gray-400 mt-2">在下方输入提示词，任务节点会出现在画布中</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
        <button
          onClick={() => setScale((value) => Math.min(value + 0.1, 3))}
          className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 border border-gray-100 transition-colors"
        >
          <span className="text-xl">+</span>
        </button>
        <button
          onClick={() => setScale((value) => Math.max(value - 0.1, 0.1))}
          className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 border border-gray-100 transition-colors"
        >
          <span className="text-xl">-</span>
        </button>
        <button
          onClick={() => {
            setOffset({ x: 0, y: 0 });
            setScale(1);
          }}
          className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 border border-gray-100 transition-colors"
        >
          <span className="text-lg">◎</span>
        </button>
      </div>
    </div>
  );
}
