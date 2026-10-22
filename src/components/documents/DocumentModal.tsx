import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DocumentItem, DocumentType, Attachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { useModalDraft } from '../../hooks/useModalDraft';
import { FileUpload } from '../common/FileUpload';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { X, FileText, AlertTriangle, Sparkles } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentToEdit?: DocumentItem | null;
  onSuccess: () => void;
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

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  documentToEdit,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { users } = useRealtime();

  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Công văn');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuingAuthority, setIssuingAuthority] = useState('UBND Huyện');
  const [ownerId, setOwnerId] = useState('');
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState<'Chưa xử lý' | 'Đang xử lý' | 'Đã hoàn thành' | 'Lưu trữ'>('Đang xử lý');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevOpenRef = React.useRef(false);
  const prevEditIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevEditIdRef.current = undefined;
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isEditTargetChanged = documentToEdit?.id !== prevEditIdRef.current;

    if (isNewlyOpened || isEditTargetChanged) {
      prevOpenRef.current = true;
      prevEditIdRef.current = documentToEdit?.id || null;

      if (documentToEdit) {
        setNumber(documentToEdit.number || '');
        setTitle(documentToEdit.title || '');
        setType(documentToEdit.type || 'Công văn');
        setIssueDate(documentToEdit.issueDate || new Date().toISOString().split('T')[0]);
        setIssuingAuthority(documentToEdit.issuingAuthority || 'UBND Huyện');
        setOwnerId(documentToEdit.ownerId || '');
        setDirection(documentToEdit.direction || '');
        setStatus(documentToEdit.status || 'Đang xử lý');
        setAttachments(documentToEdit.attachments || []);
      } else {
        setNumber('');
        setTitle('');
        setType('Công văn');
        setIssueDate(new Date().toISOString().split('T')[0]);
        setIssuingAuthority('UBND Huyện');
        setOwnerId(user?.id || users[0]?.id || '');
        setDirection('');
        setStatus('Đang xử lý');
        setAttachments([]);
      }
      setErrorMsg(null);
    }
  }, [isOpen, documentToEdit]);

  const documentDraftData = useMemo(
    () => ({
      number,
      title,
      type,
      issueDate,
      issuingAuthority,
      ownerId,
      direction,
      status,
    }),
    [number, title, type, issueDate, issuingAuthority, ownerId, direction, status]
  );

  const handleRestoreDocumentDraft = useCallback((draft: typeof documentDraftData) => {
    if (draft.number) setNumber(draft.number);
    if (draft.title) setTitle(draft.title);
    if (draft.type) setType(draft.type);
    if (draft.issueDate) setIssueDate(draft.issueDate);
    if (draft.issuingAuthority) setIssuingAuthority(draft.issuingAuthority);
    if (draft.ownerId) setOwnerId(draft.ownerId);
    if (draft.direction !== undefined) setDirection(draft.direction);
    if (draft.status) setStatus(draft.status);
  }, []);

  const {
    lastSavedTime: draftSavedTime,
    isDraftSaving,
    hasRestoredDraft,
    restoredDraftTime,
    clearDraft,
    discardDraft,
  } = useModalDraft({
    formKey: `document_${documentToEdit?.id || 'new'}`,
    isOpen,
    isEditing: Boolean(documentToEdit),
    formData: documentDraftData,
    onRestore: handleRestoreDocumentDraft,
    hasMeaningfulData: (data) => Boolean(data.number?.trim() || data.title?.trim() || data.direction?.trim()),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg(null);

    if (!number.trim() || !title.trim() || !issueDate) {
      setErrorMsg('Vui lòng điền số/ký hiệu, trích yếu và ngày ban hành.');
      return;
    }

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      if (documentToEdit) {
        await apiService.updateDocument(documentToEdit.id, {
          number,
          title,
          type,
          issueDate,
          issuingAuthority,
          ownerId,
          direction,
          status,
          attachments,
        });
      } else {
        await apiService.createDocument({
          number,
          title,
          type,
          issueDate,
          issuingAuthority,
          ownerId,
          direction,
          status,
          attachments,
          createdBy: user?.id,
          createdByName: user?.name,
        });
      }

      clearDraft();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu văn bản');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Sticky Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {documentToEdit ? 'Chỉnh sửa văn bản' : 'Tiếp nhận / Ban hành văn bản mới'}
                </h2>
                {draftSavedTime && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-medium" title="Bản nháp được lưu định kỳ vào bộ nhớ máy tính để chống mất dữ liệu khi tắt máy">
                    <span className={`w-1.5 h-1.5 rounded-full ${isDraftSaving ? 'bg-amber-500 animate-ping' : 'bg-cyan-500'}`} />
                    <span>{isDraftSaving ? 'Đang lưu nháp...' : `Đã lưu nháp lúc ${draftSavedTime}`}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between p-0">
          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {hasRestoredDraft && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Đã khôi phục dữ liệu văn bản bạn đang nhập dở lúc <strong>{restoredDraftTime}</strong> để chống mất mát do gián đoạn.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  discardDraft();
                  if (!documentToEdit) {
                    setNumber('');
                    setTitle('');
                    setDirection('');
                  }
                }}
                className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold transition cursor-pointer shrink-0 self-end sm:self-auto"
              >
                Xóa nháp & Nhập mới
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Loại văn bản <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số / Ký hiệu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="VD: 142/UBND-TNMT"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày ban hành (dd/mm/yyyy)</label>
              <VietnameseDateInput
                required
                value={issueDate}
                onChange={(val) => setIssueDate(val)}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Trích yếu nội dung văn bản <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: V/v kiểm tra hiện trạng và lập phương án đền bù GPMB tuyến đường..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cơ quan ban hành</label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="VD: UBND Huyện / Sở TNMT..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cán bộ phụ trách</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Chưa xử lý">Chưa xử lý</option>
                <option value="Đã hoàn thành">Đã hoàn thành</option>
                <option value="Lưu trữ">Lưu trữ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ý kiến chỉ đạo xử lý văn bản</label>
            <input
              type="text"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="Chỉ đạo của Lãnh đạo UBND giao chuyên viên..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            />
          </div>

          <FileUpload
            attachments={attachments}
            onChange={setAttachments}
            label="Tệp văn bản toàn văn (PDF/DOCX/Ảnh scan)"
          />

          </div>

          {/* Sticky Actions Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-gray-200 transition-colors text-xs cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-colors shadow-xs disabled:opacity-50 text-xs cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu...' : documentToEdit ? 'Cập nhật văn bản' : 'Lưu văn bản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
