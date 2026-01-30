import React, { useState, useRef, useEffect } from 'react';
import { VideoTask } from '../../types';
import { STATUS_COLORS } from '../../utils/constants';

interface VideoNodeProps {
    task: VideoTask;
    onClick: () => void;
    onDrag: (x: number, y: number) => void;
    onRemove: (taskId: string) => void;
}

export function VideoNode({ task, onClick, onDrag, onRemove }: VideoNodeProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [pos, setPos] = useState(task.position || { x: 100, y: 100 });
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (task.position) {
            setPos(task.position);
        }
    }, [task.position]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            setPos({ x: newX, y: newY });
            onDrag(newX, newY);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            ref={nodeRef}
            className={`absolute group select-none transition-shadow duration-300 ${isDragging ? 'z-50' : 'z-10'}`}
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={handleMouseDown}
        >
            <div
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className={`
          w-72 bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-4 shadow-xl 
          transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer
          ${isDragging ? 'ring-2 ring-blue-400 border-blue-200' : 'border-gray-100'}
        `}
            >
                {/* Status Indicator */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[task.status]}`}>
                            {task.status}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">#{task.id.slice(-4)}</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(task.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="移除节点"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Media Content */}
                <div className="relative aspect-video bg-gray-900 rounded-xl mb-3 overflow-hidden border border-gray-100/20 shadow-inner group/media">
                    {(task.status === 'completed' && task.videoUrl) ? (
                        <>
                            <video
                                src={task.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                onMouseOver={(e) => e.currentTarget.play()}
                                onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            />
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); window.open(task.videoUrl, '_blank'); }}
                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-all transform hover:scale-110"
                                    title="全屏播放"
                                >
                                    <span className="text-white text-lg">▶</span>
                                </button>
                                <a
                                    href={task.videoUrl}
                                    download={`video-${task.id}.mp4`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-all transform hover:scale-110"
                                    title="下载视频"
                                >
                                    <span className="text-white text-lg">↓</span>
                                </a>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            {task.status === 'processing' ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                        <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full"></div>
                                        <div
                                            className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"
                                        ></div>
                                        <span className="text-[10px] text-blue-300 font-bold">{Math.floor(task.progress || 0)}%</span>
                                    </div>
                                    <span className="text-[10px] text-blue-300/60 mt-2 font-medium tracking-widest uppercase">Processing</span>
                                </div>
                            ) : task.status === 'failed' ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl mb-1">⚠️</span>
                                    <span className="text-[10px] text-red-400 font-bold uppercase text-center px-4">Generation Failed</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">🎬</span>
                                    <span className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-widest">Pending</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Info */}
                <h4 className="text-xs font-bold text-gray-800 mb-1 line-clamp-1">{task.model.toUpperCase()} Generation</h4>
                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed h-8">
                    {task.prompt}
                </p>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] text-blue-600 font-bold">V</div>
                        <div className="w-5 h-5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] text-indigo-600 font-bold">A</div>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Connection Anchor Points (TAPNOW Style) */}
            <div className="absolute top-1/2 -left-1 w-2 h-2 bg-blue-400 rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0"></div>
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-blue-400 rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0"></div>
        </div>
    );
}
