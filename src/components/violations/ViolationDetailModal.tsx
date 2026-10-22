import React, { useState, useRef } from 'react';
import {
  X,
  ShieldAlert,
  FileText,
  Calendar,
  User,
  Scale,
  Hammer,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Edit,
  Camera,
  Image,
  ExternalLink,
  Plus,
  Upload,
  Download,
  Trash2,
  Paperclip,
  Eye,
} from 'lucide-react';
import { LandViolationCase, ViolationEvidenceItem, Attachment } from '../../types';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize } from '../../utils/date';
import { convertNumberToVietnameseWords } from './ViolationPrintModal';

interface ViolationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  violation: LandViolationCase | null;
  onOpenEdit: (v: LandViolationCase) => void;
  onOpenProcess: (v: LandViolationCase) => void;
  onOpenPrint: (v: LandViolationCase) => void;
  onReload: () => void;
}

export const ViolationDetailModal: React.FC<ViolationDetailModalProps> = ({
  isOpen,
  onClose,
  violation,
  onOpenEdit,
  onOpenProcess,
  onOpenPrint,
  onReload,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  if (!isOpen || !violation) return null;

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceUrl) return;
    setIsSubmittingEvidence(true);
    try {
      await apiService.addViolationEvidence(violation.id, {
        url: evidenceUrl,
        name: evidenceCaption || 'Ảnh tư liệu hiện trường vi phạm',
        caption: evidenceCaption,
        category: 'photo_violation',
      });
      setEvidenceUrl('');
      setEvidenceCaption('');
      setIsAddingEvidence(false);
      onReload();
    } catch (err: any) {
      console.error('Error adding evidence:', err);
      alert('Không thể lưu tư liệu ảnh: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !violation) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await apiService.uploadFiles(files, user?.id || 'admin', user?.name || 'Cán bộ');
      const currentAttachments = violation.attachments || [];
      const updatedAttachments = [...currentAttachments, ...uploaded];
      const updated = await apiService.updateViolation(violation.id, { attachments: updatedAttachments });
      if (updated) {
        await localVault.upsertLocalViolation(updated);
      }
      onReload();
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'Không thể tải lên tệp đính kèm.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!violation) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa tệp này?')) return;
    try {
      const updatedAttachments = (violation.attachments || []).filter((a) => a.id !== attId);
      const updated = await apiService.updateViolation(violation.id, { attachments: updatedAttachments });
      if (updated) {
        await localVault.upsertLocalViolation(updated);
      }
      onReload();
    } catch (err: any) {
      alert('Không thể xóa tệp: ' + (err.message || 'Lỗi hệ thống'));
    }
  };

  const getStatusBadge = () => {
    switch (violation.status) {
      case 'detected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Mới phát hiện / Đang kiểm tra
          </span>
        );
      case 'minute_issued':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
            Đã lập BB VPHC / Đình chỉ
          </span>
        );
      case 'sanction_decided':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
            Đã ra QĐ xử phạt VPHC
          </span>
        );
      case 'enforcement_pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Quá hạn / Chuẩn bị cưỡng chế
          </span>
        );
      case 'enforced':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800 flex items-center gap-1">
            <Hammer className="w-3 h-3" /> Đã cưỡng chế tháo dỡ
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Đã chấp hành xong
          </span>
        );
      case 'forwarded_to_district':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
            Chuyển UBND huyện xử phạt
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                  {violation.code}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                  {violation.title}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đối tượng: <b>{violation.violatorName}</b> • {violation.location} • Phát hiện: {violation.discoveryDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrint(violation)}
              title="In biên bản / Quyết định"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenEdit(violation);
              }}
              title="Sửa thông tin"
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tiến trình xử lý:</span>
              {getStatusBadge()}
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenProcess(violation);
              }}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
            >
              <Scale className="w-3.5 h-3.5" /> Cập nhật tiến trình & QĐ xử phạt
            </button>
          </div>

          {/* Section 1: Đối tượng & Vị trí vi phạm */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
              <User className="w-3.5 h-3.5 text-rose-600" /> Đối Tượng & Vị Trí Vi Phạm
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-bold">Cá nhân / Tổ chức vi phạm</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{violation.violatorName}</div>
                {violation.violatorCccd && <div className="text-slate-600 dark:text-slate-400">CCCD: {violation.violatorCccd}</div>}
                {violation.violatorPhone && <div className="text-slate-600 dark:text-slate-400">SĐT: {violation.violatorPhone}</div>}
                {violation.violatorAddress && <div className="text-slate-600 dark:text-slate-400">Địa chỉ: {violation.violatorAddress}</div>}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-bold">Vị trí & Quy mô vi phạm</span>
                <div className="font-semibold text-slate-900 dark:text-white">{violation.location}</div>
                <div className="text-slate-600 dark:text-slate-400">
                  Thửa đất: <b>{violation.parcel || 'Chưa xác định'}</b> • TBĐ: <b>{violation.mapSheet || 'Chưa xác định'}</b>
                </div>
                <div className="text-rose-600 dark:text-rose-400 font-bold">
                  Diện tích vi phạm: {violation.violatedArea ? `${violation.violatedArea.toLocaleString()} m²` : 'Chưa đo đạc cụ thể'}
                </div>
                <div className="text-slate-500">Cán bộ phụ trách: {violation.handlerName}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Hành vi vi phạm cụ thể:</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{violation.violationDescription}</p>
              </div>
              {violation.constructionDetails && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Quy mô công trình vi phạm:</span>
                  <p className="text-slate-600 dark:text-slate-400">{violation.constructionDetails}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Quyết định xử phạt & Biện pháp khắc phục */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
              <Scale className="w-3.5 h-3.5 text-blue-600" /> Kết Quả Xử Phạt VPHC & Biện Pháp Khắc Phục
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Số Biên bản VPHC:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {violation.minuteNumber || 'Chưa lập'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số Quyết định xử phạt:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {violation.sanctionDecisionNumber || 'Chưa ban hành'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Số tiền xử phạt:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {violation.fineAmount ? `${violation.fineAmount.toLocaleString()} VNĐ` : '0 đ'}
                  </span>
                </div>
                {violation.fineAmount > 0 && (
                  <div className="text-[11px] text-slate-500 italic text-right">
                    (Bằng chữ: {convertNumberToVietnameseWords(violation.fineAmount)})
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400">Tình trạng nộp phạt:</span>
                  {violation.finePaymentStatus === 'paid' ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã nộp Kho bạc {violation.fineReceiptNumber ? `(${violation.fineReceiptNumber})` : ''}
                    </span>
                  ) : (
                    <span className="font-bold text-rose-600 dark:text-rose-400">Chưa nộp tiền phạt</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <span className="text-slate-400 block font-medium">Biện pháp khắc phục hậu quả:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{violation.remedialMeasure}</p>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400">Hạn hoàn thành:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{violation.remedialDeadline || 'Chưa ấn định'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tiến độ khắc phục:</span>
                  {violation.remedialStatus === 'completed' ? (
                    <span className="font-bold text-emerald-600">Đã tháo dỡ / trả lại đất</span>
                  ) : violation.remedialStatus === 'in_progress' ? (
                    <span className="font-bold text-amber-600">Đang thực hiện tháo dỡ</span>
                  ) : (
                    <span className="font-bold text-rose-600">Chưa tự giác thực hiện</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cưỡng chế */}
            {violation.enforcementDecisionNumber && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 uppercase">
                  <Hammer className="w-3.5 h-3.5" /> Quyết định cưỡng chế thi hành: {violation.enforcementDecisionNumber}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Ngày ban hành: {violation.enforcementDecisionDate || '...'} • Ngày dự kiến cưỡng chế: <b>{violation.enforcementPlanDate || '...'}</b>
                </div>
                {violation.enforcementNotes && (
                  <p className="text-slate-500 dark:text-slate-400 italic">{violation.enforcementNotes}</p>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Hồ sơ tài liệu scan & Ảnh hiện trường */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-rose-500" /> Tệp Đính Kèm & Tư Liệu Hiện Trường ({(violation.attachments?.length || 0) + (violation.evidences?.length || 0)})
              </h3>

              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Đang tải lên...' : 'Tải tệp / ảnh lên'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingEvidence(!isAddingEvidence)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Thêm ảnh bằng đường dẫn URL ngoài"
                >
                  <Plus className="w-3 h-3" /> Thêm URL ảnh
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="p-2 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-rose-500 hover:text-rose-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isUploading && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Đang xử lý tải tệp lên hệ thống và mã hóa lưu trữ bền vững...</span>
              </div>
            )}

            {isAddingEvidence && (
              <form onSubmit={handleAddEvidence} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Đường dẫn ảnh / URL:</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: https://... hoặc /uploads/anh.jpg"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Chú thích ảnh:</label>
                    <input
                      type="text"
                      placeholder="VD: Hiện trường công trình xây dựng móng lấn chiếm"
                      value={evidenceCaption}
                      onChange={(e) => setEvidenceCaption(e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingEvidence(false)}
                    className="px-2.5 py-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEvidence}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Lưu ảnh
                  </button>
                </div>
              </form>
            )}

            {/* Danh sách tệp đính kèm (Attachments) */}
            {violation.attachments && violation.attachments.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                  Tài liệu & Tệp scan biên bản ({violation.attachments.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {violation.attachments.map((att: Attachment) => {
                    const isImg = att.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name);
                    return (
                      <div
                        key={att.id}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs hover:border-rose-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isImg ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isImg ? <Camera className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                              {att.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(att.size || 0)} • {att.uploadedAt ? att.uploadedAt.split('T')[0] : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {att.url && (
                            <>
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                                title="Xem tệp"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={att.url}
                                download={att.name}
                                className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                                title="Tải xuống máy"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Xóa tệp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Danh sách ảnh hiện trường (Evidences) */}
            {violation.evidences && violation.evidences.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                  Ảnh chụp hiện trường vi phạm ({violation.evidences.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {violation.evidences.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="aspect-video w-full rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        {ev.url.startsWith('http') || ev.url.startsWith('/') || ev.url.startsWith('data:') ? (
                          <img
                            src={ev.url}
                            alt={ev.caption || ev.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Image className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={ev.caption || ev.name}>
                        {ev.caption || ev.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{ev.uploadedAt?.split('T')[0] || ''}</span>
                        {ev.url && (
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Mở lớn
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!violation.attachments || violation.attachments.length === 0) &&
              (!violation.evidences || violation.evidences.length === 0) && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-400 text-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <Upload className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-medium">Chưa có tệp scan hoặc ảnh hiện trường đính kèm.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Bấm vào đây để chọn tệp từ máy tính tải lên hồ sơ này.</p>
                </div>
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
