import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Attachment } from '../../types';
import { apiService, isAbortError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize } from '../../utils/date';

interface FileUploadProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  isResult?: boolean;
  label?: string;
  helperText?: string;
  maxFiles?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  attachments,
  onChange,
  isResult = false,
  label = 'Tệp đính kèm',
  helperText = 'Hỗ trợ PDF, DOCX, XLSX, PNG, JPG (tối đa 50MB)',
  maxFiles = 10,
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isUploadingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingRef.current) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    isUploadingRef.current = true;
    setUploadError(null);
    setIsUploading(true);

    try {
      const fileList = Array.from(files) as File[];
      const uploadedAttachments = await apiService.uploadFiles(
        fileList,
        user?.id || 'anonymous',
        user?.name || 'Cán bộ',
        isResult,
        controller.signal
      );

      onChange([...attachments, ...uploadedAttachments]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      if (isAbortError(err)) return;
      setUploadError(err.message || 'Lỗi tải tệp lên máy chủ');
    } finally {
      isUploadingRef.current = false;
      if (abortControllerRef.current === controller) {
        setIsUploading(false);
      }
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isPdf = (type: string) => type === 'application/pdf';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-800">
          {label} {isResult && <span className="text-emerald-700 font-bold">(Minh chứng kết quả)</span>}
        </label>
        <span className="text-[11px] text-slate-500">{attachments.length} / {maxFiles} tệp</span>
      </div>

      <div
        onClick={() => {
          if (isUploadingRef.current || isUploading) return;
          fileInputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
          isResult
            ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50'
            : 'border-gray-300 bg-gray-50/50 hover:bg-blue-50/30'
        } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        />
        <div className="flex flex-col items-center justify-center gap-1 text-slate-600">
          <Upload className={`w-5 h-5 ${isResult ? 'text-emerald-600' : 'text-blue-600'}`} />
          <p className="text-xs font-medium">
            {isUploading ? 'Đang tải tệp lên máy chủ...' : 'Nhấp để chọn tệp hoặc kéo thả vào đây'}
          </p>
          <p className="text-[10px] text-slate-400">{helperText}</p>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1 mt-2 max-h-40 overflow-y-auto pr-1">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isPdf(file.contentType) ? (
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                ) : isImage(file.contentType) ? (
                  <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div className="truncate">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-800 hover:text-blue-600 truncate block text-xs"
                  >
                    {file.name}
                  </a>
                  <span className="text-[10px] text-slate-500">
                    {formatFileSize(file.size)} • {file.uploadedByName || 'Cán bộ'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                {file.isResult && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Kết quả
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(file.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
