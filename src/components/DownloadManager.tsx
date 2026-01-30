import { useState, useEffect } from 'react';
import { DownloadItem } from '../types';
import { getDownloads, addDownload as saveDownload, updateDownload, deleteDownload, clearCompletedDownloads } from '../services/storage';
import { formatFileSize } from '../utils/constants';

interface DownloadManagerProps {
  downloads: DownloadItem[];
  onDownloadsChange: () => void;
}

export function DownloadManager({ downloads, onDownloadsChange }: DownloadManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const completedCount = downloads.filter(d => d.status === 'completed').length;

  useEffect(() => {
    let interval: number | null = null;

    if (activeDownloads.length > 0) {
      interval = window.setInterval(() => {
        activeDownloads.forEach(download => {
          simulateProgress(download.id);
        });
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [downloads]);

  const simulateProgress = (id: string) => {
    const download = downloads.find(d => d.id === id);
    if (!download || download.status !== 'downloading') return;

    const increment = Math.random() * 5 + 2;
    const newProgress = Math.min(download.progress + increment, 100);
    const newDownloaded = (download.totalBytes * newProgress) / 100;

    updateDownload(id, {
      progress: newProgress,
      downloadedBytes: newDownloaded,
      status: newProgress >= 100 ? 'completed' : 'downloading',
      completedAt: newProgress >= 100 ? new Date() : undefined,
    });

    onDownloadsChange();
  };

  const handleDelete = (id: string) => {
    deleteDownload(id);
    onDownloadsChange();
  };

  const handleClearCompleted = () => {
    clearCompletedDownloads();
    onDownloadsChange();
  };

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading':
        return (
          <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'paused':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (!isExpanded && activeDownloads.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed state - show active download count */}
      {!isExpanded && activeDownloads.length > 0 && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="relative">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {activeDownloads.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeDownloads.length}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">
            {activeDownloads.length} {activeDownloads.length === 1 ? 'download' : 'downloads'}
          </span>
        </button>
      )}

      {/* Expanded state */}
      {isExpanded && (
        <div className="w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Downloads</h3>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear completed
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Downloads list */}
          <div className="max-h-80 overflow-auto">
            {downloads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <p className="text-sm">No downloads yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {downloads.map(download => (
                  <div key={download.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(download.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{download.filename}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{formatFileSize(download.downloadedBytes)}</span>
                          <span>/</span>
                          <span>{formatFileSize(download.totalBytes)}</span>
                          <span>•</span>
                          <span>{Math.round(download.progress)}%</span>
                        </div>

                        {/* Progress bar */}
                        {download.status === 'downloading' && (
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${download.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(download.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to manage downloads
export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(getDownloads());

  const refreshDownloads = () => {
    setDownloads(getDownloads());
  };

  const addDownload = (taskId: string, videoUrl: string, filename: string) => {
    const download: DownloadItem = {
      id: `dl-${Date.now()}`,
      taskId,
      videoUrl,
      filename,
      progress: 0,
      status: 'downloading',
      downloadedBytes: 0,
      totalBytes: 50 * 1024 * 1024, // Estimate
      createdAt: new Date(),
    };

    // Save to storage
    saveDownload(download);
    setDownloads([download, ...downloads]);

    // Trigger browser download
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mark as completed after a delay (simulated)
    setTimeout(() => {
      updateDownload(download.id, {
        progress: 100,
        status: 'completed',
        completedAt: new Date(),
      });
      refreshDownloads();
    }, 2000);
  };

  return {
    downloads,
    addDownload,
    refreshDownloads,
  };
}
