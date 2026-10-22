import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, FileText, Scale, Hammer, AlertTriangle } from 'lucide-react';
import { LandViolationCase, ViolationStatus } from '../../types';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { convertNumberToVietnameseWords } from './ViolationPrintModal';
import { CurrencyInput } from '../common/CurrencyInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { FileUpload } from '../common/FileUpload';
import { Attachment } from '../../types';

interface ViolationProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  violation: LandViolationCase | null;
  onSuccess: () => void;
}

export const ViolationProcessModal: React.FC<ViolationProcessModalProps> = ({
  isOpen,
  onClose,
  violation,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    status: (violation?.status || 'detected') as ViolationStatus,
    minuteNumber: violation?.minuteNumber || `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}/BB-VPHC`,
    minuteDate: violation?.minuteDate || new Date().toISOString().split('T')[0],
    inspectionMinuteNumber: violation?.inspectionMinuteNumber || `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}/BB-KT`,
    inspectionDate: violation?.inspectionDate || new Date().toISOString().split('T')[0],

    sanctionDecisionNumber: violation?.sanctionDecisionNumber || '',
    sanctionDecisionDate: violation?.sanctionDecisionDate || '',
    sanctionAuthority: violation?.sanctionAuthority || 'commune',
    fineAmount: violation?.fineAmount || 0,
    finePaymentStatus: violation?.finePaymentStatus || 'unpaid',
    finePaymentDate: violation?.finePaymentDate || '',
    fineReceiptNumber: violation?.fineReceiptNumber || '',

    remedialMeasure: violation?.remedialMeasure || 'Buộc khôi phục lại tình trạng ban đầu của đất; buộc tháo dỡ công trình xây dựng vi phạm.',
    remedialDeadline: violation?.remedialDeadline || '',
    remedialStatus: violation?.remedialStatus || 'not_started',

    enforcementDecisionNumber: violation?.enforcementDecisionNumber || '',
    enforcementDecisionDate: violation?.enforcementDecisionDate || '',
    enforcementPlanDate: violation?.enforcementPlanDate || '',
    enforcementNotes: violation?.enforcementNotes || '',
    attachments: (violation?.attachments || []) as Attachment[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && violation) {
      setFormData({
        status: violation.status,
        minuteNumber: violation.minuteNumber || `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}/BB-VPHC`,
        minuteDate: violation.minuteDate || new Date().toISOString().split('T')[0],
        inspectionMinuteNumber: violation.inspectionMinuteNumber || `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}/BB-KT`,
        inspectionDate: violation.inspectionDate || new Date().toISOString().split('T')[0],
        sanctionDecisionNumber: violation.sanctionDecisionNumber || '',
        sanctionDecisionDate: violation.sanctionDecisionDate || '',
        sanctionAuthority: violation.sanctionAuthority || 'commune',
        fineAmount: violation.fineAmount || 0,
        finePaymentStatus: violation.finePaymentStatus || 'unpaid',
        finePaymentDate: violation.finePaymentDate || '',
        fineReceiptNumber: violation.fineReceiptNumber || '',
        remedialMeasure: violation.remedialMeasure || 'Buộc khôi phục lại tình trạng ban đầu của đất; buộc tháo dỡ công trình xây dựng vi phạm.',
        remedialDeadline: violation.remedialDeadline || '',
        remedialStatus: violation.remedialStatus || 'not_started',
        enforcementDecisionNumber: violation.enforcementDecisionNumber || '',
        enforcementDecisionDate: violation.enforcementDecisionDate || '',
        enforcementPlanDate: violation.enforcementPlanDate || '',
        enforcementNotes: violation.enforcementNotes || '',
        attachments: violation.attachments || [],
      });
      setErrorMsg('');
    }
  }, [violation, isOpen]);

  if (!isOpen || !violation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updated = await apiService.updateViolation(violation.id, formData);
      if (updated) {
        await localVault.upsertLocalViolation(updated);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update violation process error:', err);
      setErrorMsg(err.message || 'Không thể cập nhật tiến trình xử lý.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Cập Nhật Tiến Trình Xử Lý Vi Phạm [{violation.code}]
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đối tượng: {violation.violatorName} ({violation.location})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Trạng thái tổng thể */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
              Trạng thái hồ sơ xử lý hiện tại
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ViolationStatus })}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="detected">🔍 1. Mới phát hiện / Đang lập BB kiểm tra hiện trường</option>
              <option value="minute_issued">📋 2. Đã lập Biên bản VPHC / Đình chỉ thi công</option>
              <option value="sanction_decided">⚖️ 3. Đã ban hành Quyết định xử phạt VPHC</option>
              <option value="enforcement_pending">🚨 4. Quá hạn tự nguyện chấp hành / Chuẩn bị cưỡng chế</option>
              <option value="enforced">🔨 5. Đã tổ chức cưỡng chế tháo dỡ công trình</option>
              <option value="resolved">✅ 6. Đã chấp hành xong hoàn toàn (Nộp phạt + Khắc phục)</option>
              <option value="forwarded_to_district">🏛️ 7. Đã chuyển hồ sơ lên UBND cấp huyện xử lý</option>
            </select>
          </div>

          {/* Giai đoạn 1: Biên bản vi phạm */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> 1. Biên Bản Kiểm Tra Hiện Trường & Biên Bản VPHC
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số Biên bản kiểm tra hiện trường
                </label>
                <input
                  type="text"
                  placeholder="VD: 02/BB-KT"
                  value={formData.inspectionMinuteNumber}
                  onChange={(e) => setFormData({ ...formData, inspectionMinuteNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Ngày lập biên bản kiểm tra (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.inspectionDate}
                  onChange={(val) => setFormData({ ...formData, inspectionDate: val })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số Biên bản vi phạm hành chính (VPHC)
                </label>
                <input
                  type="text"
                  placeholder="VD: 04/BB-VPHC"
                  value={formData.minuteNumber}
                  onChange={(e) => setFormData({ ...formData, minuteNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-medium text-blue-600 dark:text-blue-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Ngày lập Biên bản VPHC (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.minuteDate}
                  onChange={(val) => setFormData({ ...formData, minuteDate: val })}
                />
              </div>
            </div>
          </div>

          {/* Giai đoạn 2: Quyết định xử phạt & Thu nộp */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-rose-600" /> 2. Quyết Định Xử Phạt VPHC & Nộp Kho Bạc
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số Quyết định xử phạt
                </label>
                <input
                  type="text"
                  placeholder="VD: 18/QĐ-XPHC"
                  value={formData.sanctionDecisionNumber}
                  onChange={(e) => setFormData({ ...formData, sanctionDecisionNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Ngày ban hành QĐ (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.sanctionDecisionDate}
                  onChange={(val) => setFormData({ ...formData, sanctionDecisionDate: val })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Cơ quan ban hành
                </label>
                <select
                  value={formData.sanctionAuthority}
                  onChange={(e) => setFormData({ ...formData, sanctionAuthority: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="commune">Chủ tịch UBND xã Lãnh Ngọc</option>
                  <option value="district">Chủ tịch UBND huyện (Vượt thẩm quyền xã)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số tiền xử phạt (VNĐ)
                </label>
                <CurrencyInput
                  value={formData.fineAmount}
                  onChange={(val) => setFormData({ ...formData, fineAmount: val })}
                  placeholder="VD: 4.000.000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-rose-600"
                />
                {formData.fineAmount > 0 && (
                  <p className="text-[10px] text-slate-500 italic mt-1 leading-tight line-clamp-2">
                    {convertNumberToVietnameseWords(formData.fineAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tình trạng nộp phạt
                </label>
                <select
                  value={formData.finePaymentStatus}
                  onChange={(e) => setFormData({ ...formData, finePaymentStatus: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="unpaid">Chưa nộp tiền phạt</option>
                  <option value="paid">Đã nộp vào Kho bạc</option>
                  <option value="delayed">Đang xin gia hạn nộp</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số biên lai nộp Kho bạc
                </label>
                <input
                  type="text"
                  placeholder="VD: BL-VP-0033"
                  value={formData.fineReceiptNumber}
                  onChange={(e) => setFormData({ ...formData, fineReceiptNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Giai đoạn 3: Khắc phục hậu quả & Cưỡng chế */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Hammer className="w-3.5 h-3.5 text-amber-600" /> 3. Biện Pháp Khắc Phục Hậu Quả & Cưỡng Chế
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nội dung biện pháp khắc phục
              </label>
              <input
                type="text"
                value={formData.remedialMeasure}
                onChange={(e) => setFormData({ ...formData, remedialMeasure: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Thời hạn hoàn thành khắc phục (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.remedialDeadline}
                  onChange={(val) => setFormData({ ...formData, remedialDeadline: val })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tiến độ khắc phục thực tế
                </label>
                <select
                  value={formData.remedialStatus}
                  onChange={(e) => setFormData({ ...formData, remedialStatus: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="not_started">Chưa tự giác thực hiện</option>
                  <option value="in_progress">Đang tiến hành tháo dỡ / khắc phục</option>
                  <option value="completed">Đã tháo dỡ / trả lại nguyên trạng</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-2">
                Hồ sơ phương án cưỡng chế (Áp dụng khi quá thời hạn tự giác thi hành):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Số QĐ cưỡng chế</label>
                  <input
                    type="text"
                    placeholder="VD: 03/QĐ-CCXP"
                    value={formData.enforcementDecisionNumber}
                    onChange={(e) => setFormData({ ...formData, enforcementDecisionNumber: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Ngày ban hành QĐ cưỡng chế</label>
                  <VietnameseDateInput
                    value={formData.enforcementDecisionDate}
                    onChange={(val) => setFormData({ ...formData, enforcementDecisionDate: val })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Ngày dự kiến cưỡng chế</label>
                  <VietnameseDateInput
                    value={formData.enforcementPlanDate}
                    onChange={(val) => setFormData({ ...formData, enforcementPlanDate: val })}
                  />
                </div>
              </div>
            </div>

            {/* Tệp scan đính kèm */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60">
              <FileUpload
                attachments={formData.attachments || []}
                onChange={(att) => setFormData({ ...formData, attachments: att })}
                label="Tệp scan Biên bản VPHC & Quyết định xử phạt"
                helperText="Đính kèm tệp PDF hoặc ảnh chụp biên bản có chữ ký, mộc đỏ lưu trữ"
                maxFiles={20}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lưu Tiến Trình Xử Lý
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
