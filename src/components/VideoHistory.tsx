import { useEffect, useMemo, useState } from 'react';
import { HistoryRecord } from '../types';
import { clearHistory, deleteHistory, getHistory } from '../services/storage';
import { releaseImageUrl, resolveImageUrl } from '../services/mediaStore';
import { formatDate } from '../utils/constants';
import { VideoPlayer } from './VideoPlayer';

interface VideoHistoryProps {
  onPromptSelect?: (prompt: string) => void;
}

function useResolvedUrl(url?: string): string {
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

function getGroupTitle(record: HistoryRecord, today: Date, yesterday: Date): string {
  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return '更早';
  }

  createdAt.setHours(0, 0, 0, 0);

  if (createdAt.getTime() === today.getTime()) {
    return '今天';
  }

  if (createdAt.getTime() === yesterday.getTime()) {
    return '昨天';
  }

  return '更早';
}

function HistoryDetailsModal({
  record,
  onClose,
}: {
  record: HistoryRecord;
  onClose: () => void;
}) {
  const mediaUrl = useResolvedUrl(record.videoUrl);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">素材详情</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <VideoPlayer
            src={record.videoUrl}
            thumbnail={record.thumbnailUrl}
            isImage={record.generationType === 'image'}
            className="aspect-video rounded-2xl"
          />

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">提示词</label>
              <p className="text-sm text-gray-800 mt-1 p-4 bg-gray-50 rounded-xl">{record.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">模型</label>
                <p className="text-sm text-gray-800 mt-1 font-semibold uppercase">{record.model}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">创建时间</label>
                <p className="text-sm text-gray-800 mt-1">{formatDate(record.createdAt)}</p>
              </div>
              {record.duration && (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">时长</label>
                  <p className="text-sm text-gray-800 mt-1 font-semibold">{record.duration}s</p>
                </div>
              )}
              {record.options && 'aspectRatio' in record.options && (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">比例</label>
                  <p className="text-sm text-gray-800 mt-1 font-semibold">{record.options.aspectRatio}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">素材链接</label>
              <div className="mt-1 flex gap-3">
                <input
                  type="text"
                  value={mediaUrl}
                  readOnly
                  className="flex-1 px-4 py-3 text-sm border-2 border-gray-300 rounded-xl bg-gray-50"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(mediaUrl)}
                  className="px-5 py-3 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  复制
                </button>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl hover:shadow-glow transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  打开
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoHistory({ onPromptSelect }: VideoHistoryProps) {
  const [records, setRecords] = useState<HistoryRecord[]>(getHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) {
      return records;
    }

    const query = searchQuery.toLowerCase();
    return records.filter((record) => (
      record.prompt.toLowerCase().includes(query)
      || record.model.toLowerCase().includes(query)
    ));
  }, [records, searchQuery]);

  const groupedRecords = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const buckets = new Map<string, HistoryRecord[]>([
      ['今天', []],
      ['昨天', []],
      ['更早', []],
    ]);

    filteredRecords.forEach((record) => {
      const title = getGroupTitle(record, today, yesterday);
      const bucket = buckets.get(title);
      if (bucket) {
        bucket.push(record);
      }
    });

    return Array.from(buckets.entries())
      .map(([title, items]) => ({ title, records: items }))
      .filter((group) => group.records.length > 0);
  }, [filteredRecords]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    更早: true,
  });

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleDelete = (id: string) => {
    deleteHistory(id);
    setRecords(getHistory());
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
  };

  const handleClearAll = () => {
    clearHistory();
    setRecords([]);
    setSelectedRecord(null);
    setShowConfirmClear(false);
  };

  const handleUsePrompt = (prompt: string) => {
    onPromptSelect?.(prompt);
  };

  const handleDownload = async (record: HistoryRecord) => {
    const mediaUrl = await resolveImageUrl(record.videoUrl);
    if (!mediaUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `${record.generationType === 'image' ? 'image' : 'video'}-${record.id}.${record.generationType === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDownload = async () => {
    const selectedRecords = records.filter((record) => selectedIds.has(record.id));
    if (selectedRecords.length === 0) {
      return;
    }

    for (let index = 0; index < selectedRecords.length; index += 1) {
      const record = selectedRecords[index];
      setTimeout(() => {
        void handleDownload(record);
      }, index * 500);
    }

    setTimeout(() => {
      setIsBatchMode(false);
      setSelectedIds(new Set());
    }, selectedRecords.length * 500 + 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索历史记录..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm transition-all"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-3">
          {records.length > 0 && (
            <>
              <button
                onClick={() => setIsBatchMode(!isBatchMode)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  isBatchMode
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isBatchMode ? '退出批量' : '批量操作'}
              </button>
              {isBatchMode && selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDownload}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载选中 ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => setShowConfirmClear(true)}
                className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                清空全部
              </button>
            </>
          )}
          <span className="px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">
            {filteredRecords.length} 条记录
          </span>
        </div>
      </div>

      {groupedRecords.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-dashed border-gray-300">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-100 to-accent-100 rounded-3xl flex items-center justify-center mb-6 animate-float">
            <svg className="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium text-lg">{searchQuery ? '没有找到结果' : '暂无历史记录'}</p>
          <p className="text-gray-400 text-sm mt-2">生成完成的图片和视频会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedRecords.map((group) => (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200"></div>
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <span>{group.title}</span>
                  <span className="opacity-50">({group.records.length})</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${collapsedGroups[group.title] ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isBatchMode && !collapsedGroups[group.title] && (
                  <button
                    onClick={() => {
                      const allSelected = group.records.every((record) => selectedIds.has(record.id));
                      if (allSelected) {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          group.records.forEach((record) => next.delete(record.id));
                          return next;
                        });
                        return;
                      }

                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        group.records.forEach((record) => next.add(record.id));
                        return next;
                      });
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1"
                  >
                    {group.records.every((record) => selectedIds.has(record.id)) ? '取消全选' : '全选'}
                  </button>
                )}
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              {!collapsedGroups[group.title] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {group.records.map((record) => (
                    <div
                      key={record.id}
                      className={`group relative bg-white border-2 rounded-2xl overflow-hidden hover:shadow-card transition-all duration-300 ${
                        selectedIds.has(record.id)
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-primary-400'
                      }`}
                    >
                      {isBatchMode && (
                        <div className="absolute top-3 left-3 z-20">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(record.id)}
                              onChange={() => toggleSelection(record.id)}
                              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </label>
                        </div>
                      )}

                      <div className="relative">
                        <VideoPlayer
                          src={record.videoUrl}
                          thumbnail={record.thumbnailUrl}
                          isImage={record.generationType === 'image'}
                          className="aspect-video"
                          onDownload={() => {
                            void handleDownload(record);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>

                      <div className="p-4">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-3">{record.prompt}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            <span className="uppercase font-semibold text-primary-600">{record.model}</span>
                            {record.duration && <span className="font-medium">{record.duration}s</span>}
                          </div>
                          <span>{formatDate(record.createdAt)}</span>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleUsePrompt(record.prompt)}
                            className="flex-1 px-3 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors flex items-center justify-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            复用提示词
                          </button>
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="px-2.5 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedRecord && (
        <HistoryDetailsModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-3xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">清空全部历史记录？</h3>
            <p className="text-sm text-gray-600 mb-6 text-center leading-relaxed">
              这会永久删除当前的 {records.length} 条记录，此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-glow transition-all"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
