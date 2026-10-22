import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileBadge,
  Paperclip,
} from 'lucide-react';

export interface PreviewableFile {
  name: string;
  url: string;
  size?: number;
  contentType?: string;
  stepTitle?: string;
  stepIndex?: number;
  uploadedAt?: string;
  uploadedByName?: string;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: PreviewableFile | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    // Reset zoom and rotation when opening a new file
    setZoomLevel(1);
    setRotation(0);
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const fileName = file.name || 'Tệp đính kèm';
  const fileUrl = file.url;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const isImage =
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext) ||
    file.contentType?.startsWith('image/');
  const isPdf = ext === 'pdf' || file.contentType === 'application/pdf';
  const isWord = ['doc', 'docx'].includes(ext);
  const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/20">
              {isImage && <ImageIcon className="w-4 h-4 text-emerald-400" />}
              {isPdf && <FileText className="w-4 h-4 text-rose-400" />}
              {isWord && <FileBadge className="w-4 h-4 text-blue-400" />}
              {isExcel && <FileSpreadsheet className="w-4 h-4 text-teal-400" />}
              {!isImage && !isPdf && !isWord && !isExcel && (
                <Paperclip className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate max-w-[420px]" title={fileName}>
                  {fileName}
                </h3>
                {file.stepTitle && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    {file.stepTitle}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                {file.size ? <span>{formatFileSize(file.size)}</span> : null}
                {file.uploadedByName && <span>• Tải bởi: {file.uploadedByName}</span>}
                {file.uploadedAt && <span>• {new Date(file.uploadedAt).toLocaleString('vi-VN')}</span>}
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Image zoom & rotate controls */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15 mr-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={handleRotateCcw}
                  className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Xoay trái 90°"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotateCw}
                  className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Xoay phải 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Đặt lại góc nhìn"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
              title="Tải tệp này về máy tính"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </a>

            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 hover:text-white text-slate-300 transition cursor-pointer ml-1"
              title="Đóng xem trước (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 bg-slate-900/90 relative overflow-auto flex items-center justify-center p-4">
          {/* 1. Image Viewer */}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-full object-contain select-none shadow-2xl rounded-sm"
              />
            </div>
          )}

          {/* 2. PDF Viewer */}
          {isPdf && (
            <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-inner flex flex-col">
              <iframe
                src={`${fileUrl}#view=FitH`}
                title={fileName}
                className="w-full h-full border-none"
              />
            </div>
          )}

          {/* 3. Word / Office / Other Document Viewer */}
          {!isImage && !isPdf && (
            <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-700 shadow-inner">
                {isWord && <FileBadge className="w-8 h-8 text-blue-600" />}
                {isExcel && <FileSpreadsheet className="w-8 h-8 text-teal-600" />}
                {!isWord && !isExcel && <FileText className="w-8 h-8 text-slate-600" />}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-base break-words">
                  {fileName}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Định dạng văn bản: <span className="font-mono uppercase font-bold text-slate-700">{ext}</span>
                  {file.size ? ` • ${formatFileSize(file.size)}` : ''}
                </p>
                {file.stepTitle && (
                  <p className="text-xs text-emerald-800 font-semibold mt-1">
                    Thuộc bước: {file.stepTitle}
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs text-left leading-relaxed">
                <p className="font-semibold mb-0.5">ℹ️ Hướng dẫn xem tài liệu:</p>
                <p>
                  Tệp văn bản Word/Excel có thể mở trực tiếp bằng Microsoft Office trên máy tính của bạn sau khi tải về, hoặc mở trong ứng dụng web hỗ trợ.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={fileUrl}
                  download={fileName}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải tệp về máy (.doc/.docx)</span>
                </a>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Mở tab mới</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
