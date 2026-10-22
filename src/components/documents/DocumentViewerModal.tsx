import React from 'react';
import { Attachment } from '../../types';
import { X, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { formatFileSize } from '../../utils/date';

interface DocumentViewerModalProps {
  attachment: Attachment | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  const isImage = attachment.contentType.startsWith('image/');
  const isPdf = attachment.contentType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {isPdf ? (
              <FileText className="w-5 h-5 text-rose-600 shrink-0" />
            ) : isImage ? (
              <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{attachment.name}</h3>
              <p className="text-[10px] text-slate-500">
                {formatFileSize(attachment.size)} • {attachment.uploadedByName || 'Cán bộ tải lên'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={attachment.url}
              download={attachment.name}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải xuống</span>
            </a>
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs font-semibold transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở tab mới</span>
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer body */}
        <div className="flex-1 bg-gray-100 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
          {isImage ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-gray-200 bg-white"
            />
          ) : isPdf ? (
            <iframe
              src={attachment.url}
              title={attachment.name}
              className="w-full h-[70vh] rounded-lg border border-gray-300 bg-white shadow-xs"
            />
          ) : (
            <div className="text-center p-8 space-y-3 bg-white border border-gray-200 rounded-xl max-w-md shadow-xs">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">
                Định dạng {attachment.contentType} không hỗ trợ xem trước trực tiếp.
              </p>
              <a
                href={attachment.url}
                download={attachment.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Tải tệp về máy tính để mở
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
