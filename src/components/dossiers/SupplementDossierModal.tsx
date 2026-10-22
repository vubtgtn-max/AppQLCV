import React, { useState, useEffect } from 'react';
import { Dossier } from '../../types';
import { formatDate } from '../../utils/date';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { FileQuestion, X, Printer, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface SupplementDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: Dossier | null;
  onConfirm: (data: {
    supplementDate: string;
    supplementNote: string;
    printSlip: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const QUICK_SUGGESTIONS = [
  'Bổ sung bản sao CCCD gắn chip và giấy xác nhận thông tin cư trú.',
  'Bổ sung văn bản thỏa thuận phân chia di sản thừa kế có chứng thực.',
  'Bổ sung trích lục bản đồ địa chính thửa đất có kiểm tra thực địa.',
  'Bổ sung hợp đồng tặng cho / chuyển nhượng quyền sử dụng đất.',
  'Bổ sung đơn đề nghị xác định lại hạn mức đất ở theo hiện trạng.',
  'Bổ sung giấy xác nhận tình trạng hôn nhân / độc thân.',
  'Bổ sung văn bản cam kết ranh giới, mốc giới không tranh chấp với các hộ liền kề.',
];

export const SupplementDossierModal: React.FC<SupplementDossierModalProps> = ({
  isOpen,
  onClose,
  dossier,
  onConfirm,
  isSubmitting = false,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(today);
  const [note, setNote] = useState<string>('');
  const [printSlip, setPrintSlip] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial state when dossier changes or modal opens
  useEffect(() => {
    if (isOpen && dossier) {
      setDate(dossier.supplementDate || today);
      setNote(dossier.supplementNote || '');
      setErrorMsg(null);
    }
  }, [isOpen, dossier, today]);

  if (!isOpen || !dossier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrorMsg('Vui lòng nhập chi tiết các loại giấy tờ, tài liệu yêu cầu công dân bổ sung.');
      return;
    }
    setErrorMsg(null);
    await onConfirm({
      supplementDate: date || today,
      supplementNote: note.trim(),
      printSlip,
    });
  };

  const handleAppendSuggestion = (tpl: string) => {
    setNote((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tpl;
      if (trimmed.includes(tpl)) return prev;
      return `${trimmed}\n- ${tpl}`;
    });
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full my-auto shadow-2xl border border-amber-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Yêu cầu bổ sung, hoàn thiện hồ sơ (Mẫu số 02)
              </h3>
              <p className="text-xs text-amber-900 mt-0.5 font-medium">
                Mã hồ sơ: <span className="font-bold font-mono text-slate-900">{dossier.code}</span> • Chủ hộ:{' '}
                <span className="font-bold text-slate-900">{dossier.owner}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Local State for instant zero-lag typing */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quy định hành chính notice */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Nguyên tắc tính thời hạn giải quyết:</span>
            </div>
            <p>
              • Thời gian công dân hoàn thiện bổ sung <strong>không tính vào thời hạn giải quyết</strong> của cơ quan nhà nước.
            </p>
            <p>
              • Khi công dân nộp đủ và cán bộ bấm <strong>"Nhận đủ bổ sung"</strong>, thời hạn giải quyết sẽ được <strong>tính lại từ đầu trọn vẹn</strong> (ví dụ thủ tục {dossier.procedure} sẽ cộng đủ thời gian chuẩn).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ngày ra phiếu yêu cầu bổ sung (dd/mm/yyyy) <span className="text-rose-500">*</span>
            </label>
            <VietnameseDateInput
              value={date}
              onChange={(val) => setDate(val)}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Danh mục giấy tờ, tài liệu yêu cầu công dân bổ sung <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {note.length} ký tự
              </span>
            </div>
            <textarea
              rows={5}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Nhập chi tiết các loại giấy tờ, nội dung cần công dân hoàn thiện bổ sung..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none leading-relaxed transition resize-y font-sans"
              autoFocus
            />

            {/* Quick Templates */}
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Mẫu gợi ý nội dung nhanh (bấm để thêm vào ô trên):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAppendSuggestion(tpl)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-[11px] text-slate-700 border border-slate-200 hover:border-amber-300 transition cursor-pointer text-left"
                    title={tpl}
                  >
                    + {tpl.slice(0, 42)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printSlip}
                onChange={(e) => setPrintSlip(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-medium flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                Mở <b>Phiếu yêu cầu bổ sung hồ sơ (Mẫu số 02)</b> để in ngay sau khi lưu
              </span>
            </label>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 bg-white border border-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận & Lưu yêu cầu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
