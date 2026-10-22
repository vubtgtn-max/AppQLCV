import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, DollarSign, Calendar } from 'lucide-react';
import { PublicLandParcel } from '../../types';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { CurrencyInput } from '../common/CurrencyInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface PublicLandPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: PublicLandParcel | null;
  onSuccess: () => void;
}

export const PublicLandPaymentModal: React.FC<PublicLandPaymentModalProps> = ({
  isOpen,
  onClose,
  parcel,
  onSuccess,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [amount, setAmount] = useState<number>(parcel?.annualRent || 0);
  const [receiptNumber, setReceiptNumber] = useState<string>(
    `BL-${currentYear}-${String(Math.floor(Math.random() * 9000) + 1000)}`
  );
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('Nộp đủ tiền thuê đất công ích năm theo hợp đồng');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && parcel) {
      setYear(currentYear);
      setAmount(parcel.annualRent || 0);
      setReceiptNumber(`BL-${currentYear}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
      setPaidDate(new Date().toISOString().split('T')[0]);
      setNote('Nộp đủ tiền thuê đất công ích năm theo hợp đồng');
      setErrorMsg('');
    }
  }, [parcel, isOpen, currentYear]);

  if (!isOpen || !parcel) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền nộp hợp lệ.');
      return;
    }
    if (!receiptNumber) {
      setErrorMsg('Vui lòng nhập số biên lai thu tiền.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updated = await apiService.recordPublicLandPayment(parcel.id, {
        year,
        amount,
        receiptNumber,
        paidDate,
        note,
      });
      if (updated) {
        await localVault.upsertLocalPublicLand(updated);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Record payment error:', err);
      setErrorMsg(err.message || 'Không thể ghi nhận thanh toán.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Thu Tiền Thuê Đất Công Ích (5%)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Thửa {parcel.parcel}, TBĐ {parcel.mapSheet} - {parcel.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Người thuê đất:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{parcel.tenantName || 'Chưa có thông tin'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Số Hợp đồng:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{parcel.contractNumber || 'HĐ-UBND'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Giá thuê khoán/năm:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{Number(parcel.annualRent || 0).toLocaleString('vi-VN')} đ</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Năm nộp ngân sách
              </label>
              <input
                type="number"
                min="2020"
                max="2035"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Số tiền nộp (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                required
                value={amount}
                onChange={(val) => setAmount(val)}
                placeholder="VD: 10.000.000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Số biên lai thu tiền <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày thu tiền (dd/mm/yyyy)
              </label>
              <VietnameseDateInput
                required
                value={paidDate}
                onChange={(val) => setPaidDate(val)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú thu nộp
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Xác nhận nộp tiền
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
