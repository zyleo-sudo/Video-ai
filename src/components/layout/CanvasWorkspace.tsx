import React, { useState, useRef } from 'react';
import { VideoTask } from '../../types';
import { VideoNode } from '../canvas/VideoNode';

interface CanvasWorkspaceProps {
    tasks: VideoTask[];
    onTaskClick: (task: VideoTask) => void;
    onUpdateTaskPosition: (taskId: string, x: number, y: number) => void;
    onRemoveTask: (taskId: string) => void;
}

export function CanvasWorkspace({ tasks, onTaskClick, onUpdateTaskPosition, onRemoveTask }: CanvasWorkspaceProps) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && (e.target as HTMLElement).classList.contains('canvas-area')) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY;
            const zoomFactor = 0.95;
            const newScale = delta > 0 ? scale * zoomFactor : scale / zoomFactor;
            setScale(Math.min(Math.max(newScale, 0.1), 3));
        } else {
            setOffset(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-[#f8fafc] canvas-area cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
                backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                backgroundSize: `${30 * scale}px ${30 * scale}px`,
                backgroundPosition: `${offset.x}px ${offset.y}px`
            }}
        >
            <div
                className="absolute transition-transform duration-75 ease-out will-change-transform"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: '0 0'
                }}
            >
                {tasks.map(task => (
                    <VideoNode
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                        onDrag={(x, y) => onUpdateTaskPosition(task.id, x, y)}
                        onRemove={onRemoveTask}
                    />
                ))}

                {tasks.length === 0 && (
                    <div className="absolute left-[50vw] top-[30vh] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-30 select-none pointer-events-none">
                        <div className="text-8xl mb-6">🎬</div>
                        <h2 className="text-3xl font-bold text-gray-400">开始您的创作</h2>
                        <p className="text-lg text-gray-400 mt-2">在下方输入提示词点击生成，节点将出现在画布上</p>
                    </div>
                )}
            </div>

            {/* Canvas UI Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
                <button
                    onClick={() => setScale(s => Math.min(s + 0.1, 3))}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 border border-gray-100 transition-colors"
                >
                    <span className="text-xl">＋</span>
                </button>
                <button
                    onClick={() => setScale(s => Math.max(s - 0.1, 0.1))}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 border border-gray-100 transition-colors"
                >
                    <span className="text-xl">－</span>
                </button>
                <button
                    onClick={() => { setOffset({ x: 0, y: 0 }); setScale(1); }}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-blue-600 border border-gray-100 transition-colors"
                >
                    <span className="text-lg">🎯</span>
                </button>
            </div>
        </div>
    );
}
