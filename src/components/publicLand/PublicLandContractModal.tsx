import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, FileSignature, Calendar, User, DollarSign } from 'lucide-react';
import { PublicLandParcel, PublicLandContract } from '../../types';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { CurrencyInput } from '../common/CurrencyInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface PublicLandContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: PublicLandParcel | null;
  onSuccess: () => void;
}

export const PublicLandContractModal: React.FC<PublicLandContractModalProps> = ({
  isOpen,
  onClose,
  parcel,
  onSuccess,
}) => {
  const defaultStartDate = new Date().toISOString().split('T')[0];
  const endDateDefault = new Date();
  endDateDefault.setFullYear(endDateDefault.getFullYear() + 5);
  const defaultEndDate = endDateDefault.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    contractNumber: `${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}/HĐTĐ-UBND`,
    tenantName: parcel?.tenantName || '',
    tenantCccd: parcel?.tenantCccd || '',
    tenantPhone: parcel?.tenantPhone || '',
    tenantAddress: parcel?.tenantAddress || 'Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng',
    signedDate: defaultStartDate,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    leaseDurationYears: 5,
    annualRent: parcel?.annualRent || 10000000,
    paymentTerms: 'Nộp 1 lần vào tháng 01 hàng năm tại Ban tài chính xã',
    notes: 'Hợp đồng thuê khoán sản xuất nông nghiệp quỹ đất 5% theo Luật Đất đai 2024.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && parcel) {
      setFormData({
        contractNumber: parcel.contractNumber || `${String((parcel.contracts?.length || 0) + 1).padStart(2, '0')}/HĐTĐ-UBND`,
        tenantName: parcel.tenantName || '',
        tenantCccd: parcel.tenantCccd || '',
        tenantPhone: parcel.tenantPhone || '',
        tenantAddress: parcel.tenantAddress || (parcel.location ? (parcel.location.toLowerCase().includes('xã lãnh ngọc') ? parcel.location : `${parcel.location}, xã Lãnh Ngọc, thành phố Đà Nẵng`) : 'Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng'),
        signedDate: defaultStartDate,
        startDate: parcel.leaseStartDate || defaultStartDate,
        endDate: parcel.leaseEndDate || defaultEndDate,
        leaseDurationYears: parcel.leaseDurationYears || 5,
        annualRent: parcel.annualRent || 10000000,
        paymentTerms: 'Nộp 1 lần vào tháng 01 hàng năm tại Ban tài chính xã',
        notes: 'Hợp đồng thuê khoán sản xuất nông nghiệp quỹ đất 5% theo Luật Đất đai 2024.',
      });
      setErrorMsg('');
    }
  }, [parcel, isOpen]);

  if (!isOpen || !parcel) return null;

  const handleDurationChange = (years: number) => {
    const start = new Date(formData.startDate || defaultStartDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + years);
    setFormData({
      ...formData,
      leaseDurationYears: years,
      endDate: end.toISOString().split('T')[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantName) {
      setErrorMsg('Vui lòng nhập họ tên người / hộ gia đình thuê đất.');
      return;
    }
    if (!formData.annualRent || formData.annualRent <= 0) {
      setErrorMsg('Vui lòng nhập mức tiền thuê đất hàng năm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updated = await apiService.createPublicLandContract(parcel.id, formData);
      if (updated) {
        await localVault.upsertLocalPublicLand(updated);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create contract error:', err);
      setErrorMsg(err.message || 'Không thể tạo hợp đồng thuê đất công ích.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                Lập Hợp Đồng Thuê Đất Công Ích (Đất 5%)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Thửa số {parcel.parcel}, TBĐ {parcel.mapSheet} ({parcel.area.toLocaleString()} m²) - {parcel.location}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Hợp đồng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Số Hợp đồng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contractNumber}
                onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-medium focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày ký hợp đồng (dd/mm/yyyy)
              </label>
              <VietnameseDateInput
                required
                value={formData.signedDate}
                onChange={(val) => setFormData({ ...formData, signedDate: val })}
              />
            </div>
          </div>

          {/* Bên thuê */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Bên Thuê Đất (Bên B)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Họ tên người thuê <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Thành"
                  value={formData.tenantName}
                  onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số CCCD / CMND
                </label>
                <input
                  type="text"
                  placeholder="VD: 048079001234"
                  value={formData.tenantCccd}
                  onChange={(e) => setFormData({ ...formData, tenantCccd: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  placeholder="VD: 0905111222"
                  value={formData.tenantPhone}
                  onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-1">
              <VillageAddressInput
                label="Địa chỉ thường trú người thuê"
                mode="address"
                placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                value={formData.tenantAddress}
                onChange={(val) => setFormData({ ...formData, tenantAddress: val })}
              />
            </div>
          </div>

          {/* Thời hạn & Giá thuê */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Thời Hạn & Giá Thuê
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Thời hạn thuê
                </label>
                <select
                  value={formData.leaseDurationYears}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value={1}>1 năm (Thuê mùa vụ)</option>
                  <option value={2}>2 năm</option>
                  <option value={3}>3 năm</option>
                  <option value={5}>5 năm (Tối đa Luật Đất đai)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Từ ngày (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.startDate}
                  onChange={(val) => setFormData({ ...formData, startDate: val })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Đến ngày (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.endDate}
                  onChange={(val) => setFormData({ ...formData, endDate: val })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giá thuê hàng năm (VNĐ/năm) <span className="text-rose-500">*</span>
                </label>
                <CurrencyInput
                  required
                  value={formData.annualRent}
                  onChange={(val) => setFormData({ ...formData, annualRent: val })}
                  placeholder="VD: 10.000.000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tổng giá trị toàn hợp đồng
                </label>
                <div className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
                  <span>{(formData.annualRent * formData.leaseDurationYears).toLocaleString('vi-VN')} VNĐ</span>
                  <span className="text-[10px] text-slate-400">({formData.leaseDurationYears} năm)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phương thức & Điều khoản nộp tiền
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
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
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lập hợp đồng...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ký & Lưu Hợp Đồng
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
