import React, { useState, useMemo, useEffect } from 'react';
import { DocumentItem, DocumentType, Attachment } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/date';
import { exportToExcel } from '../utils/export';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';
import {
  FileText,
  Search,
  Plus,
  FileSpreadsheet,
  Calendar,
  User as UserIcon,
  Paperclip,
  Download,
  Eye,
  Edit3,
  Trash2,
  Building2,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';

interface DocumentsPageProps {
  onOpenCreate: () => void;
  onOpenEdit: (doc: DocumentItem) => void;
  onDeleteDocument: (doc: DocumentItem) => void;
  onOpenViewer?: (attachment: Attachment) => void;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'Công văn',
  'Quyết định',
  'Thông báo',
  'Tờ trình',
  'Báo cáo',
  'Biên bản',
  'Kế hoạch',
  'Giấy mời',
  'Khác',
];

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  onOpenCreate,
  onOpenEdit,
  onDeleteDocument,
  onOpenViewer,
}) => {
  const { documents, users } = useRealtime();
  const { user, isAdmin, isLeader, isClerk, canModifyRecord } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [initialAttachmentIdx, setInitialAttachmentIdx] = useState<number>(0);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuDocId(null);
    if (activeMenuDocId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuDocId]);

  useEffect(() => {
    if (previewDoc) {
      const updated = documents.find((d) => d.id === previewDoc.id);
      if (updated) setPreviewDoc(updated);
      else setPreviewDoc(null);
    }
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = (doc.number || '').toLowerCase().includes(q);
        const matchTitle = (doc.title || '').toLowerCase().includes(q);
        const matchAuth = (doc.issuingAuthority || '').toLowerCase().includes(q);
        const matchOwner = (doc.ownerName || '').toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchAuth && !matchOwner) return false;
      }
      if (selectedType !== 'all' && doc.type !== selectedType) return false;
      if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false;
      return true;
    });
  }, [documents, searchQuery, selectedType, selectedStatus]);

  const handleExport = () => {
    const data = filteredDocuments.map((d) => ({
      'Số / Ký hiệu': d.number,
      'Loại văn bản': d.type,
      'Trích yếu nội dung': d.title,
      'Ngày ban hành': d.issueDate,
      'Cơ quan ban hành': d.issuingAuthority || '',
      'Cán bộ phụ trách': d.ownerName || '',
      'Chỉ đạo xử lý': d.direction || '',
      'Trạng thái': d.status,
    }));
    exportToExcel(data, `Quan_ly_van_ban_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Quản lý Văn bản Đến & Đi</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
              {filteredDocuments.length} văn bản
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu trữ, tra cứu Công văn, Quyết định, Tờ trình, Thông báo và tệp đính kèm điện tử.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ban hành / Tiếp nhận văn bản</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm số ký hiệu, trích yếu văn bản..."
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            >
              <option value="all">Tất cả loại văn bản</option>
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Chưa xử lý">Chưa xử lý</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Lưu trữ">Lưu trữ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Số / Ký hiệu</th>
                <th className="py-2.5 px-3">Loại</th>
                <th className="py-2.5 px-3 min-w-[260px]">Trích yếu nội dung</th>
                <th className="py-2.5 px-3">Cơ quan ban hành</th>
                <th className="py-2.5 px-3">Ngày BH</th>
                <th className="py-2.5 px-3">Cán bộ phụ trách</th>
                <th className="py-2.5 px-3">Đính kèm</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Không tìm thấy văn bản phù hợp.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => {
                      setPreviewDoc(doc);
                      setInitialAttachmentIdx(0);
                    }}
                    className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {doc.number}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {doc.type}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                        {doc.title}
                      </p>
                      {doc.direction && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 italic mt-0.5 font-medium">
                          Chỉ đạo: {doc.direction}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {doc.issuingAuthority || 'UBND Xã'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                      {formatDate(doc.issueDate)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {doc.ownerName || '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {doc.attachments?.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {doc.attachments.map((att, idx) => (
                            <button
                              key={att.id || idx}
                              onClick={() => {
                                setPreviewDoc(doc);
                                setInitialAttachmentIdx(idx);
                              }}
                              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
                              title={`Xem trước tệp: ${att.name}`}
                            >
                              <Paperclip className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[80px]">{att.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Không có</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Preview Eye Button */}
                        <button
                          onClick={() => {
                            setPreviewDoc(doc);
                            setInitialAttachmentIdx(0);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                          title="Xem trước toàn bộ văn bản"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canModifyRecord(doc) ? (
                          <>
                            <button
                              onClick={() => onOpenEdit(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* 3-dot Secondary Menu */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  activeMenuDocId === doc.id
                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                    : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                                }`}
                                title="Thao tác khác"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuDocId === doc.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                >
                                  <button
                                    onClick={() => {
                                      setActiveMenuDocId(null);
                                      setPreviewDoc(doc);
                                      setInitialAttachmentIdx(0);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                    Xem trước văn bản
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button
                                    onClick={() => {
                                      setActiveMenuDocId(null);
                                      onDeleteDocument(doc);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    Xóa văn bản này
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none">
                            Chỉ xem
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Full Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        initialAttachmentIndex={initialAttachmentIdx}
        onOpenEdit={previewDoc && canModifyRecord(previewDoc) ? onOpenEdit : undefined}
      />
    </div>
  );
};
