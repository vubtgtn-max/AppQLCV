import React, { useState, useEffect } from 'react';
import { X, Landmark, FileText, CheckCircle2 } from 'lucide-react';
import { PublicLandParcel, PublicLandStatus, PublicLandPaymentStatus } from '../../types';
import { apiService } from '../../services/api';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { DecimalAreaInput } from '../common/DecimalAreaInput';
import { CurrencyInput } from '../common/CurrencyInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { localVault } from '../../services/localVault';

interface PublicLandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelToEdit: PublicLandParcel | null;
  onSuccess: () => void;
}

export const PublicLandFormModal: React.FC<PublicLandFormModalProps> = ({
  isOpen,
  onClose,
  parcelToEdit,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<PublicLandParcel>>({
    parcel: '',
    mapSheet: '',
    location: '',
    area: 0,
    landType: 'Đất trồng lúa (LUC)',
    planningPurpose: 'Sản xuất nông nghiệp chất lượng cao',
    status: 'available',
    annualRent: 0,
    paymentStatus: 'paid',
    contractNumber: '',
    tenantName: '',
    tenantCccd: '',
    tenantPhone: '',
    tenantAddress: '',
    leaseStartDate: '',
    leaseEndDate: '',
    leaseDurationYears: 5,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (parcelToEdit) {
      setFormData({
        ...parcelToEdit,
      });
    } else {
      setFormData({
        parcel: '',
        mapSheet: '',
        location: '',
        area: 1000,
        landType: 'Đất trồng lúa (LUC)',
        planningPurpose: 'Sản xuất nông nghiệp chất lượng cao',
        status: 'available',
        annualRent: 0,
        paymentStatus: 'paid',
        contractNumber: '',
        tenantName: '',
        tenantCccd: '',
        tenantPhone: '',
        tenantAddress: '',
        leaseStartDate: '',
        leaseEndDate: '',
        leaseDurationYears: 5,
        notes: '',
      });
    }
    setErrorMsg('');
  }, [parcelToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parcel || !formData.mapSheet) {
      setErrorMsg('Vui lòng nhập Số thửa đất và Tờ bản đồ số.');
      return;
    }
    if (!formData.location) {
      setErrorMsg('Vui lòng nhập Vị trí / Xứ đồng / Thôn.');
      return;
    }
    if (!formData.area || Number(formData.area) <= 0) {
      setErrorMsg('Diện tích thửa đất phải lớn hơn 0 m².');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let saved: PublicLandParcel;
      if (parcelToEdit) {
        saved = await apiService.updatePublicLand(parcelToEdit.id, formData);
      } else {
        saved = await apiService.createPublicLand(formData);
      }
      try {
        if (saved) await localVault.upsertLocalPublicLand(saved);
      } catch (_) {}
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving public land parcel:', err);
      setErrorMsg(err.message || 'Không thể lưu thông tin thửa đất công ích.');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                {parcelToEdit ? `Sửa Thửa Đất Công Ích [${parcelToEdit.code}]` : 'Thêm Mới Thửa Đất Công Ích (Đất 5%)'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quản lý quỹ đất nông nghiệp sử dụng vào mục đích công ích của UBND xã
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
            <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Section: Thông tin định danh thửa đất */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-950 pb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 1. Vị trí & Hồ sơ Địa chính
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số thửa đất <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 128"
                  value={formData.parcel || ''}
                  onChange={(e) => setFormData({ ...formData, parcel: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tờ bản đồ số <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 04"
                  value={formData.mapSheet || ''}
                  onChange={(e) => setFormData({ ...formData, mapSheet: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Diện tích (m²) <span className="text-rose-500">*</span>
                </label>
                <DecimalAreaInput
                  required
                  placeholder="VD: 4500,5"
                  value={formData.area || 0}
                  onChange={(val) => setFormData({ ...formData, area: val })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <VillageAddressInput
                  label="Vị trí / Xứ đồng / Thôn"
                  required
                  mode="location"
                  placeholder="VD: Thôn Tiên Hiệp (hoặc bấm chọn/gõ thôn mới...)"
                  value={formData.location || ''}
                  onChange={(val) => setFormData({ ...formData, location: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Loại đất theo hiện trạng
                </label>
                <select
                  value={formData.landType || 'Đất trồng lúa (LUC)'}
                  onChange={(e) => setFormData({ ...formData, landType: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Đất trồng lúa (LUC)">Đất chuyên trồng lúa nước (LUC)</option>
                  <option value="Đất hoa màu (HNK)">Đất trồng cây hàng năm khác (HNK)</option>
                  <option value="Đất cây lâu năm (CLN)">Đất trồng cây lâu năm (CLN)</option>
                  <option value="Nuôi trồng thủy sản (NTS)">Đất nuôi trồng thủy sản (NTS)</option>
                  <option value="Đất nông nghiệp khác (NKH)">Đất nông nghiệp khác (NKH)</option>
                  <option value="Đất mặt nước chuyên dùng (MNC)">Đất mặt nước chuyên dùng (MNC)</option>
                  <option value="Đất công ích chưa sử dụng">Đất công ích chưa đưa vào sử dụng</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mục đích quy hoạch sử dụng đất công ích
              </label>
              <input
                type="text"
                placeholder="VD: Canh tác nông nghiệp lúa 2 vụ / Trồng cây công ích / Đấu thầu tạo nguồn thu"
                value={formData.planningPurpose || ''}
                onChange={(e) => setFormData({ ...formData, planningPurpose: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section: Tình trạng quản lý & cho thuê */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-950 pb-1 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> 2. Hiện Trạng Khai Thác & Hợp Đồng Cho Thuê
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái quản lý hiện tại
                </label>
                <select
                  value={formData.status || 'available'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as PublicLandStatus })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="available">🌱 Đang để trống (Chưa cho thuê / Chờ đấu giá)</option>
                  <option value="leased">📄 Đang cho thuê theo Hợp đồng</option>
                  <option value="expired">⚠️ Hợp đồng đã hết hạn (Chờ thanh lý/gia hạn)</option>
                  <option value="auctioning">🔨 Đang hoàn thiện hồ sơ tổ chức đấu giá</option>
                  <option value="encroached">⛔ Đang bị lấn chiếm / Tranh chấp</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tiền thuê đất hàng năm (VNĐ/năm)
                </label>
                <CurrencyInput
                  placeholder="VD: 13.500.000"
                  value={formData.annualRent || 0}
                  onChange={(val) => setFormData({ ...formData, annualRent: val })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>
            </div>

            {formData.status === 'leased' && (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Họ tên người / Hộ gia đình thuê
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Văn Thành"
                      value={formData.tenantName || ''}
                      onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Số CCCD người thuê
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 048079001234"
                      value={formData.tenantCccd || ''}
                      onChange={(e) => setFormData({ ...formData, tenantCccd: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 0905111222"
                      value={formData.tenantPhone || ''}
                      onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <VillageAddressInput
                      label="Địa chỉ thường trú người thuê"
                      mode="address"
                      placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                      value={formData.tenantAddress || ''}
                      onChange={(val) => setFormData({ ...formData, tenantAddress: val })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Số Hợp đồng thuê
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 04/HĐTĐ-UBND"
                      value={formData.contractNumber || ''}
                      onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Ngày bắt đầu hợp đồng (dd/mm/yyyy)
                    </label>
                    <VietnameseDateInput
                      value={formData.leaseStartDate || ''}
                      onChange={(val) => setFormData({ ...formData, leaseStartDate: val })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Ngày hết hạn hợp đồng (dd/mm/yyyy)
                    </label>
                    <VietnameseDateInput
                      value={formData.leaseEndDate || ''}
                      onChange={(val) => setFormData({ ...formData, leaseEndDate: val })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tình trạng nộp tiền thuê đất
                    </label>
                    <select
                      value={formData.paymentStatus || 'paid'}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PublicLandPaymentStatus })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="paid">✅ Đã nộp đủ vào ngân sách</option>
                      <option value="partially_paid">⏳ Đã nộp một phần</option>
                      <option value="unpaid">⚠️ Chưa nộp</option>
                      <option value="overdue">🚨 Quá hạn nộp tiền thuê</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Số biên lai thu tiền gần nhất
                    </label>
                    <input
                      type="text"
                      placeholder="VD: BL-2026-0012"
                      value={formData.paymentReceiptNumber || ''}
                      onChange={(e) => setFormData({ ...formData, paymentReceiptNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú theo dõi
              </label>
              <textarea
                rows={2}
                placeholder="Thông tin về nguồn gốc quỹ đất 5%, hiện trạng sử dụng, lịch sử trúng đấu giá..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {parcelToEdit ? 'Cập nhật thửa đất' : 'Lưu thửa đất 5%'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
