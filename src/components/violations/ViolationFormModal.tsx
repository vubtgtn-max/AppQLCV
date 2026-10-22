import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, FileText, CheckCircle2, User, MapPin } from 'lucide-react';
import { LandViolationCase, ViolationType, ViolationSeverity, ViolationStatus } from '../../types';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { DecimalAreaInput } from '../common/DecimalAreaInput';
import { CurrencyInput } from '../common/CurrencyInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { FileUpload } from '../common/FileUpload';

interface ViolationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  violationToEdit: LandViolationCase | null;
  onSuccess: () => void;
}

export const ViolationFormModal: React.FC<ViolationFormModalProps> = ({
  isOpen,
  onClose,
  violationToEdit,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<LandViolationCase>>({
    title: '',
    violatorName: '',
    violatorCccd: '',
    violatorPhone: '',
    violatorAddress: '',
    location: '',
    parcel: '',
    mapSheet: '',
    violatedArea: 0,
    violationType: 'illegal_construction',
    severity: 'medium',
    status: 'detected',
    discoveryDate: new Date().toISOString().split('T')[0],
    handlerId: 'user_hoaivu',
    handlerName: 'Đoàn Văn Hoài Vũ',
    assignedLeaderId: 'user_thaicongcan',
    assignedLeaderName: 'Thái Công Cần',
    violationDescription: '',
    constructionDetails: '',
    fineAmount: 0,
    finePaymentStatus: 'unpaid',
    remedialMeasure: 'Buộc khôi phục lại tình trạng ban đầu của đất trước khi vi phạm; buộc tháo dỡ công trình xây dựng trái phép.',
    remedialStatus: 'not_started',
    notes: '',
    attachments: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (violationToEdit) {
      setFormData({
        ...violationToEdit,
        attachments: violationToEdit.attachments || [],
      });
    } else {
      setFormData({
        title: '',
        violatorName: '',
        violatorCccd: '',
        violatorPhone: '',
        violatorAddress: '',
        location: '',
        parcel: '',
        mapSheet: '',
        violatedArea: 50,
        violationType: 'illegal_construction',
        severity: 'medium',
        status: 'detected',
        discoveryDate: new Date().toISOString().split('T')[0],
        handlerId: 'user_hoaivu',
        handlerName: 'Đoàn Văn Hoài Vũ',
        assignedLeaderId: 'user_thaicongcan',
        assignedLeaderName: 'Thái Công Cần',
        violationDescription: '',
        constructionDetails: '',
        fineAmount: 0,
        finePaymentStatus: 'unpaid',
        remedialMeasure: 'Buộc khôi phục lại tình trạng ban đầu của đất trước khi vi phạm; buộc tháo dỡ công trình xây dựng trái phép.',
        remedialStatus: 'not_started',
        notes: '',
        attachments: [],
      });
    }
    setErrorMsg('');
  }, [violationToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.violatorName || !formData.location) {
      setErrorMsg('Vui lòng nhập họ tên đối tượng vi phạm và địa bàn vi phạm.');
      return;
    }
    if (!formData.violationDescription) {
      setErrorMsg('Vui lòng nhập mô tả chi tiết hành vi vi phạm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const generatedTitle =
        formData.title ||
        `${
          formData.violationType === 'illegal_construction'
            ? 'Xây dựng công trình trái phép'
            : formData.violationType === 'encroachment'
            ? 'Lấn chiếm đất đai / hành lang công cộng'
            : formData.violationType === 'unauthorized_land_use_change'
            ? 'Tự ý chuyển mục đích sử dụng đất trái phép'
            : formData.violationType === 'land_destruction'
            ? 'Hủy hoại đất / khai thác đất trái phép'
            : 'Vi phạm trật tự xây dựng & đất đai'
        } của hộ ${formData.violatorName} tại ${formData.location}`;

      const payload = {
        ...formData,
        title: generatedTitle,
      };

      if (violationToEdit) {
        const updated = await apiService.updateViolation(violationToEdit.id, payload);
        try {
          const current = await localVault.loadViolationsLocally();
          const next = current.map((v) => (v.id === updated.id ? updated : v));
          await localVault.saveViolationsLocally(next);
        } catch (_) {}
      } else {
        const created = await apiService.createViolation(payload);
        try {
          const current = await localVault.loadViolationsLocally();
          await localVault.saveViolationsLocally([created, ...current]);
        } catch (_) {}
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving violation case:', err);
      setErrorMsg(err.message || 'Không thể lưu hồ sơ vi phạm.');
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
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                {violationToEdit ? `Sửa Vụ Việc Vi Phạm [${violationToEdit.code}]` : 'Lập Hồ Sơ Vi Phạm Trật Tự Xây Dựng & Đất Đai'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Theo dõi, xử phạt VPHC và áp dụng biện pháp khắc phục hậu quả cấp xã
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

          {/* Section 1: Đối tượng vi phạm */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 border-b border-rose-100 dark:border-rose-950 pb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> 1. Thông Tin Đối Tượng Vi Phạm
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Họ tên cá nhân / Tổ chức vi phạm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Quyết"
                  value={formData.violatorName || ''}
                  onChange={(e) => setFormData({ ...formData, violatorName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số CCCD / Mã số doanh nghiệp
                </label>
                <input
                  type="text"
                  placeholder="VD: 048083002345"
                  value={formData.violatorCccd || ''}
                  onChange={(e) => setFormData({ ...formData, violatorCccd: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại liên lạc
                </label>
                <input
                  type="text"
                  placeholder="VD: 0905999111"
                  value={formData.violatorPhone || ''}
                  onChange={(e) => setFormData({ ...formData, violatorPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <VillageAddressInput
                  label="Địa chỉ thường trú / Trụ sở đối tượng vi phạm"
                  mode="address"
                  placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                  value={formData.violatorAddress || ''}
                  onChange={(val) => setFormData({ ...formData, violatorAddress: val })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vị trí & Hành vi vi phạm */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 border-b border-rose-100 dark:border-rose-950 pb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> 2. Vị Trí & Hành Vi Vi Phạm
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <VillageAddressInput
                  label="Địa bàn / Thôn vi phạm"
                  required
                  mode="location"
                  placeholder="VD: Thôn Tiên Hiệp, ven Tỉnh lộ..."
                  value={formData.location || ''}
                  onChange={(val) => setFormData({ ...formData, location: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số thửa đất (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="VD: 88"
                  value={formData.parcel || ''}
                  onChange={(e) => setFormData({ ...formData, parcel: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tờ bản đồ số (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="VD: 07"
                  value={formData.mapSheet || ''}
                  onChange={(e) => setFormData({ ...formData, mapSheet: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Loại hành vi vi phạm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.violationType || 'illegal_construction'}
                  onChange={(e) => setFormData({ ...formData, violationType: e.target.value as ViolationType })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="illegal_construction">🏗️ Xây dựng không phép / sai phép</option>
                  <option value="encroachment">🚧 Lấn chiếm đất công / HLAT giao thông / đê điều</option>
                  <option value="unauthorized_land_use_change">🌾 Tự ý chuyển mục đích sử dụng đất (đất lúa...)</option>
                  <option value="land_destruction">⛏️ Hủy hoại đất / khai thác đất trái phép</option>
                  <option value="obstacle_creation">🧱 Xây rào / cản trở lối đi chung</option>
                  <option value="other">⚠️ Vi phạm khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Diện tích đất vi phạm (m²)
                </label>
                <DecimalAreaInput
                  placeholder="VD: 180,5"
                  value={formData.violatedArea || 0}
                  onChange={(val) => setFormData({ ...formData, violatedArea: val })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mức độ tính chất vi phạm
                </label>
                <select
                  value={formData.severity || 'medium'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as ViolationSeverity })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="low">Nhẹ (Quy mô nhỏ / Chưa xây kiên cố)</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Nghiêm trọng (Xây dựng kiên cố / Diện tích lớn)</option>
                  <option value="critical">Đặc biệt nghiêm trọng (Tái phạm / Vượt thẩm quyền xã)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chi tiết hành vi vi phạm <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Mô tả cụ thể hành vi vi phạm: đổ đất đá san lấp đất lúa, dựng nhà khung thép lợp mái tôn làm kho xưởng trái phép..."
                value={formData.violationDescription || ''}
                onChange={(e) => setFormData({ ...formData, violationDescription: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hiện trạng công trình vi phạm (kết cấu, vật liệu, diện tích sàn)
              </label>
              <input
                type="text"
                placeholder="VD: Nhà khung thép 1 tầng, sàn bê tông 180m², cao 5.2m, vách tôn"
                value={formData.constructionDetails || ''}
                onChange={(e) => setFormData({ ...formData, constructionDetails: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Section 3: Tiến trình xử lý & Cán bộ thụ lý */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 border-b border-rose-100 dark:border-rose-950 pb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 3. Tiến Trình Xử Lý & Cán Bộ Thụ Lý
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái xử lý
                </label>
                <select
                  value={formData.status || 'detected'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ViolationStatus })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="detected">🔍 Mới phát hiện / Đang lập BB kiểm tra</option>
                  <option value="minute_issued">📋 Đã lập Biên bản VPHC / Đình chỉ</option>
                  <option value="sanction_decided">⚖️ Đã ra Quyết định xử phạt VPHC</option>
                  <option value="enforcement_pending">🚨 Quá hạn tự nguyện / Chuẩn bị cưỡng chế</option>
                  <option value="enforced">🔨 Đã thực hiện cưỡng chế tháo dỡ</option>
                  <option value="resolved">✅ Đã chấp hành xong (Đã nộp phạt & khắc phục)</option>
                  <option value="forwarded_to_district">🏛️ Đã chuyển hồ sơ lên UBND huyện</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ngày phát hiện vi phạm (dd/mm/yyyy)
                </label>
                <VietnameseDateInput
                  value={formData.discoveryDate || ''}
                  onChange={(val) => setFormData({ ...formData, discoveryDate: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cán bộ thụ lý (Địa chính - Xây dựng)
                </label>
                <input
                  type="text"
                  value={formData.handlerName || 'Đoàn Văn Hoài Vũ'}
                  onChange={(e) => setFormData({ ...formData, handlerName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền xử phạt (VNĐ)
                </label>
                <CurrencyInput
                  value={formData.fineAmount || 0}
                  onChange={(val) => setFormData({ ...formData, fineAmount: val })}
                  placeholder="VD: 4.000.000"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-rose-600 dark:text-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tình trạng nộp phạt
                </label>
                <select
                  value={formData.finePaymentStatus || 'unpaid'}
                  onChange={(e) => setFormData({ ...formData, finePaymentStatus: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="unpaid">Chưa nộp tiền phạt vào Kho bạc</option>
                  <option value="paid">Đã nộp phạt đủ vào Kho bạc Nhà nước</option>
                  <option value="delayed">Xin gia hạn thời gian nộp phạt</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Biện pháp khắc phục hậu quả áp dụng
              </label>
              <input
                type="text"
                placeholder="VD: Buộc khôi phục lại tình trạng ban đầu của đất; buộc tháo dỡ công trình xây dựng..."
                value={formData.remedialMeasure || ''}
                onChange={(e) => setFormData({ ...formData, remedialMeasure: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Section 4: Tệp đính kèm & Ảnh hiện trường */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <FileUpload
                attachments={formData.attachments || []}
                onChange={(newAttachments) => setFormData({ ...formData, attachments: newAttachments })}
                label="Tệp đính kèm & Ảnh chụp hiện trường vi phạm"
                helperText="Hỗ trợ tải lên ảnh hiện trường (JPG, PNG), biên bản quét (PDF), quyết định xử phạt (tối đa 50MB/tệp)"
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {violationToEdit ? 'Cập nhật vụ việc' : 'Lưu hồ sơ vi phạm'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
