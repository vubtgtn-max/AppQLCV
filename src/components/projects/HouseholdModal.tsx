import React, { useState } from 'react';
import {
  X,
  User,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Save,
  Home,
  Layers,
  Phone,
  CreditCard,
  Building,
  Calculator,
  Sparkles,
} from 'lucide-react';
import {
  ProjectHousehold,
  HouseholdPaymentStatus,
  HouseholdHandoverStatus,
  HouseholdObstacleCategory,
} from '../../types';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { DecimalAreaInput } from '../common/DecimalAreaInput';
import { CurrencyInput } from '../common/CurrencyInput';

interface HouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (householdData: Partial<ProjectHousehold>) => Promise<void>;
  household?: ProjectHousehold | null;
  projectId: string;
  defaultLocation?: string;
  nextStt?: number;
}

export const HouseholdModal: React.FC<HouseholdModalProps> = ({
  isOpen,
  onClose,
  onSave,
  household,
  projectId,
  defaultLocation,
  nextStt = 1,
}) => {
  const [loading, setLoading] = useState(false);
  const submittingRef = React.useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Smart Compensation Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcUnitPrice, setCalcUnitPrice] = useState<number>(2500000);
  const [calcHouseAsset, setCalcHouseAsset] = useState<number>(0);
  const [calcCropAsset, setCalcCropAsset] = useState<number>(0);
  const [calcSupportFactor, setCalcSupportFactor] = useState<number>(1.5);
  const [calcBonusAmount, setCalcBonusAmount] = useState<number>(15000000);

  const [formData, setFormData] = useState<Partial<ProjectHousehold>>({
    projectId,
    stt: household?.stt || nextStt || 1,
    ownerName: household?.ownerName || '',
    cccd: household?.cccd || '',
    phone: household?.phone || '',
    address: household?.address || defaultLocation || 'Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng',
    mapSheet: household?.mapSheet || '',
    parcel: household?.parcel || '',
    landType: household?.landType || 'Đất ở nông thôn (ONT)',
    totalArea: household?.totalArea || 0,
    compensationAmount: household?.compensationAmount || 0,
    
    // Legal Milestones
    noticeOfRecoveryIssued: household?.noticeOfRecoveryIssued ?? true,
    noticeNumber: household?.noticeNumber || '',
    noticeDate: household?.noticeDate || '',
    inventoryDone: household?.inventoryDone ?? true,
    inventoryDate: household?.inventoryDate || '',
    approvalDecisionIssued: household?.approvalDecisionIssued ?? true,
    approvalDecisionNumber: household?.approvalDecisionNumber || '',
    approvalDecisionDate: household?.approvalDecisionDate || '',
    recoveryDecisionIssued: household?.recoveryDecisionIssued ?? true,
    recoveryDecisionNumber: household?.recoveryDecisionNumber || '',
    recoveryDecisionDate: household?.recoveryDecisionDate || '',

    // Payment
    paymentStatus: household?.paymentStatus || 'unpaid',
    paidAmount: household?.paidAmount || 0,
    paidDate: household?.paidDate || '',
    paymentReceiptNumber: household?.paymentReceiptNumber || '',

    // Handover
    handoverStatus: household?.handoverStatus || 'not_yet',
    handoverArea: household?.handoverArea || 0,
    handoverDate: household?.handoverDate || '',

    // Resettlement
    resettlementStatus: household?.resettlementStatus || 'not_required',
    resettlementPlot: household?.resettlementPlot || '',

    // Obstacles & Difficulties
    hasObstacle: household?.hasObstacle ?? false,
    obstacleCategory: household?.obstacleCategory || undefined,
    obstacleCategoryName: household?.obstacleCategoryName || '',
    obstacleDetail: household?.obstacleDetail || '',
    actionPlan: household?.actionPlan || '',
    campaignCount: household?.campaignCount || 0,
    notes: household?.notes || '',
  });

  React.useEffect(() => {
    if (!isOpen) {
      submittingRef.current = false;
      setLoading(false);
      return;
    }
    setError(null);
    setShowCalculator(false);
    setFormData({
      projectId,
      stt: household?.stt || nextStt || 1,
      ownerName: household?.ownerName || '',
      cccd: household?.cccd || '',
      phone: household?.phone || '',
      address: household?.address || defaultLocation || 'Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng',
      mapSheet: household?.mapSheet || '',
      parcel: household?.parcel || '',
      landType: household?.landType || 'Đất ở nông thôn (ONT)',
      totalArea: household?.totalArea || 0,
      compensationAmount: household?.compensationAmount || 0,
      noticeOfRecoveryIssued: household?.noticeOfRecoveryIssued ?? true,
      noticeNumber: household?.noticeNumber || '',
      noticeDate: household?.noticeDate || '',
      inventoryDone: household?.inventoryDone ?? true,
      inventoryDate: household?.inventoryDate || '',
      approvalDecisionIssued: household?.approvalDecisionIssued ?? true,
      approvalDecisionNumber: household?.approvalDecisionNumber || '',
      approvalDecisionDate: household?.approvalDecisionDate || '',
      recoveryDecisionIssued: household?.recoveryDecisionIssued ?? true,
      recoveryDecisionNumber: household?.recoveryDecisionNumber || '',
      recoveryDecisionDate: household?.recoveryDecisionDate || '',
      paymentStatus: household?.paymentStatus || 'unpaid',
      paidAmount: household?.paidAmount || 0,
      paidDate: household?.paidDate || '',
      paymentReceiptNumber: household?.paymentReceiptNumber || '',
      handoverStatus: household?.handoverStatus || 'not_yet',
      handoverArea: household?.handoverArea || 0,
      handoverDate: household?.handoverDate || '',
      resettlementStatus: household?.resettlementStatus || 'not_required',
      resettlementPlot: household?.resettlementPlot || '',
      hasObstacle: household?.hasObstacle ?? false,
      obstacleCategory: household?.obstacleCategory || undefined,
      obstacleCategoryName: household?.obstacleCategoryName || '',
      obstacleDetail: household?.obstacleDetail || '',
      actionPlan: household?.actionPlan || '',
      campaignCount: household?.campaignCount || 0,
      notes: household?.notes || '',
    });
  }, [household, projectId, defaultLocation, nextStt, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!formData.ownerName?.trim()) {
      setError('Vui lòng nhập tên chủ hộ gia đình.');
      return;
    }
    setError(null);
    submittingRef.current = true;
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lưu thông tin hộ dân thất bại.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handlePaymentStatusChange = (status: HouseholdPaymentStatus) => {
    setFormData((prev) => {
      const next: Partial<ProjectHousehold> = { ...prev, paymentStatus: status };
      if (status === 'paid' && (!prev.paidAmount || prev.paidAmount === 0)) {
        next.paidAmount = prev.compensationAmount || 0;
        if (!prev.paidDate) next.paidDate = new Date().toISOString().split('T')[0];
      } else if (status === 'unpaid' || status === 'refused') {
        next.paidAmount = 0;
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {household ? `Chi tiết Hộ dân: ${household.ownerName}` : 'Thêm Hộ dân vào Dự án GPMB'}
              </h2>
              <p className="text-xs text-slate-500">
                Quản lý hồ sơ bồi thường, mốc thu hồi, tình trạng nhận tiền và vướng mắc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Thông tin chủ hộ & Thửa đất */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              1. Thông tin Chủ hộ & Thửa đất thu hồi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số thứ tự (STT)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.stt || 1}
                  onChange={(e) => setFormData({ ...formData, stt: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-bold text-indigo-700 text-center"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên chủ hộ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ownerName || ''}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số CCCD / CMND</label>
                <input
                  type="text"
                  value={formData.cccd || ''}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                  placeholder="VD: 048085001234"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0905123456"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <VillageAddressInput
                  label="Địa chỉ cư trú / Thôn"
                  mode="address"
                  placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                  value={formData.address || ''}
                  onChange={(val) => setFormData({ ...formData, address: val })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tờ bản đồ số</label>
                <input
                  type="text"
                  value={formData.mapSheet || ''}
                  onChange={(e) => setFormData({ ...formData, mapSheet: e.target.value })}
                  placeholder="VD: 12"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thửa đất số</label>
                <input
                  type="text"
                  value={formData.parcel || ''}
                  onChange={(e) => setFormData({ ...formData, parcel: e.target.value })}
                  placeholder="VD: 45"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại đất thu hồi</label>
                <input
                  type="text"
                  value={formData.landType || ''}
                  onChange={(e) => setFormData({ ...formData, landType: e.target.value })}
                  placeholder="VD: ONT, CLN, LUC"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diện tích thu hồi (m²)</label>
                <DecimalAreaInput
                  value={formData.totalArea}
                  onChange={(val) => setFormData({ ...formData, totalArea: val })}
                  placeholder="VD: 240,5"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Mốc pháp lý bồi thường & Quyết định */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              2. Trình tự Pháp lý thu hồi đất & Bồi thường
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thông báo thu hồi đất */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.noticeOfRecoveryIssued}
                    onChange={(e) => setFormData({ ...formData, noticeOfRecoveryIssued: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">1. Đã ban hành Thông báo thu hồi đất</span>
                </label>
                {formData.noticeOfRecoveryIssued && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Số TB (VD: 45/TB)"
                      value={formData.noticeNumber || ''}
                      onChange={(e) => setFormData({ ...formData, noticeNumber: e.target.value })}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <VietnameseDateInput
                      value={formData.noticeDate || ''}
                      onChange={(val) => setFormData({ ...formData, noticeDate: val })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Kiểm đếm hiện trạng */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.inventoryDone}
                    onChange={(e) => setFormData({ ...formData, inventoryDone: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">2. Đã đo đạc, kiểm đếm hiện trạng</span>
                </label>
                {formData.inventoryDone && (
                  <div className="pt-1">
                    <VietnameseDateInput
                      value={formData.inventoryDate || ''}
                      onChange={(val) => setFormData({ ...formData, inventoryDate: val })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Quyết định phê duyệt phương án */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.approvalDecisionIssued}
                    onChange={(e) => setFormData({ ...formData, approvalDecisionIssued: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">3. Đã có QĐ Phê duyệt Phương án</span>
                </label>
                {formData.approvalDecisionIssued && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Số QĐ (VD: 215/QĐ)"
                      value={formData.approvalDecisionNumber || ''}
                      onChange={(e) => setFormData({ ...formData, approvalDecisionNumber: e.target.value })}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <VietnameseDateInput
                      value={formData.approvalDecisionDate || ''}
                      onChange={(val) => setFormData({ ...formData, approvalDecisionDate: val })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Quyết định thu hồi đất */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.recoveryDecisionIssued}
                    onChange={(e) => setFormData({ ...formData, recoveryDecisionIssued: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">4. Đã ban hành QĐ Thu hồi đất</span>
                </label>
                {formData.recoveryDecisionIssued && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Số QĐ (VD: 216/QĐ)"
                      value={formData.recoveryDecisionNumber || ''}
                      onChange={(e) => setFormData({ ...formData, recoveryDecisionNumber: e.target.value })}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <VietnameseDateInput
                      value={formData.recoveryDecisionDate || ''}
                      onChange={(val) => setFormData({ ...formData, recoveryDecisionDate: val })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Chi trả tiền bồi thường & Bàn giao mặt bằng */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                3. Tiền bồi thường, Chi trả & Bàn giao mặt bằng
              </h3>
              <button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{showCalculator ? 'Ẩn bảng tính tự động' : '⚡ Bảng tính bồi thường tự động'}</span>
              </button>
            </div>

            {/* Smart Compensation Calculator Panel */}
            {showCalculator && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      Trợ lý Tính toán Bồi thường & Hỗ trợ (Nghị định 88/2024/NĐ-CP)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    DT thu hồi: {Number(formData.totalArea || 0).toLocaleString('vi-VN')} m²
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Đơn giá đất theo bảng giá (VNĐ/m²)
                    </label>
                    <CurrencyInput
                      value={calcUnitPrice}
                      onChange={(val) => setCalcUnitPrice(val)}
                      placeholder="VD: 2.500.000"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Bồi thường nhà & công trình (VNĐ)
                    </label>
                    <CurrencyInput
                      value={calcHouseAsset}
                      onChange={(val) => setCalcHouseAsset(val)}
                      placeholder="Nhập số tiền..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Bồi thường cây cối & hoa màu (VNĐ)
                    </label>
                    <CurrencyInput
                      value={calcCropAsset}
                      onChange={(val) => setCalcCropAsset(val)}
                      placeholder="Nhập số tiền..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Hệ số hỗ trợ chuyển đổi nghề (lần)
                    </label>
                    <select
                      value={calcSupportFactor}
                      onChange={(e) => setCalcSupportFactor(parseFloat(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="1">1.0 lần (Đất phi nông nghiệp)</option>
                      <option value="1.5">1.5 lần (Mức chuẩn địa phương)</option>
                      <option value="2">2.0 lần (Đất trồng cây lâu năm)</option>
                      <option value="3">3.0 lần (Đất trồng lúa / hàng năm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Thưởng tiến độ bàn giao nhanh (VNĐ)
                    </label>
                    <CurrencyInput
                      value={calcBonusAmount}
                      onChange={(val) => setCalcBonusAmount(val)}
                      placeholder="VD: 15.000.000"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const landPart = (formData.totalArea || 0) * calcUnitPrice;
                        const careerPart = (formData.totalArea || 0) * (calcUnitPrice * 0.15) * calcSupportFactor;
                        const total = Math.round(landPart + calcHouseAsset + calcCropAsset + careerPart + calcBonusAmount);
                        setFormData({ ...formData, compensationAmount: total });
                      }}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Áp dụng kết quả tính</span>
                    </button>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Dự tính: Đất ({Math.round((formData.totalArea || 0) * calcUnitPrice).toLocaleString('vi-VN')} đ) + Tài sản ({(calcHouseAsset + calcCropAsset).toLocaleString('vi-VN')} đ) + Hỗ trợ/Thưởng ({Math.round((formData.totalArea || 0) * (calcUnitPrice * 0.15) * calcSupportFactor + calcBonusAmount).toLocaleString('vi-VN')} đ)
                  </span>
                  <span className="font-bold text-emerald-800">
                    = {Math.round((formData.totalArea || 0) * calcUnitPrice + calcHouseAsset + calcCropAsset + (formData.totalArea || 0) * (calcUnitPrice * 0.15) * calcSupportFactor + calcBonusAmount).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tổng tiền bồi thường được duyệt (VNĐ)
                </label>
                <CurrencyInput
                  value={formData.compensationAmount}
                  onChange={(val) => setFormData({ ...formData, compensationAmount: val })}
                  placeholder="VD: 850.000.000 (nhập số tiền tùy ý)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-emerald-700 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tình trạng chi trả tiền bồi thường
                </label>
                <select
                  value={formData.paymentStatus || 'unpaid'}
                  onChange={(e) => handlePaymentStatusChange(e.target.value as HouseholdPaymentStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold bg-white"
                >
                  <option value="paid">✅ Đã nhận đủ tiền (100%)</option>
                  <option value="partially_paid">⏳ Đã nhận một phần</option>
                  <option value="unpaid">⏱ Chưa nhận tiền</option>
                  <option value="refused">❌ Không nhận tiền / Từ chối</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền thực tế đã nhận (VNĐ)
                </label>
                <CurrencyInput
                  value={formData.paidAmount}
                  onChange={(val) => setFormData({ ...formData, paidAmount: val })}
                  placeholder="VD: 850.000.000 (nhập số tiền tùy ý)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold text-emerald-800 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày nhận tiền</label>
                <VietnameseDateInput
                  value={formData.paidDate || ''}
                  onChange={(val) => setFormData({ ...formData, paidDate: val })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Phiếu chi / Biên lai</label>
                <input
                  type="text"
                  value={formData.paymentReceiptNumber || ''}
                  onChange={(e) => setFormData({ ...formData, paymentReceiptNumber: e.target.value })}
                  placeholder="VD: PC-2026-045"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tình trạng bàn giao mặt bằng</label>
                <select
                  value={formData.handoverStatus || 'not_yet'}
                  onChange={(e) => setFormData({ ...formData, handoverStatus: e.target.value as HouseholdHandoverStatus })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-medium bg-white"
                >
                  <option value="handed_over">🟢 Đã bàn giao toàn bộ</option>
                  <option value="partial_handover">🟡 Đã bàn giao một phần</option>
                  <option value="not_yet">🔴 Chưa bàn giao mặt bằng</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tình trạng Tái định cư (TĐC)</label>
                <select
                  value={formData.resettlementStatus || 'not_required'}
                  onChange={(e) => setFormData({ ...formData, resettlementStatus: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-medium bg-white"
                >
                  <option value="not_required">Không thuộc diện TĐC</option>
                  <option value="eligible">Đủ điều kiện bố trí TĐC (Chưa nhận đất)</option>
                  <option value="allocated">Đã giao đất / nhận lô TĐC</option>
                  <option value="monetary">Tự lo chỗ ở (Nhận tiền tự tìm TĐC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí Lô Tái định cư (nếu có)</label>
                <input
                  type="text"
                  value={formData.resettlementPlot || ''}
                  onChange={(e) => setFormData({ ...formData, resettlementPlot: e.target.value })}
                  placeholder="VD: Lô B1-05 (Khu TĐC Đồng Cây Cóc)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Theo dõi Khó khăn vướng mắc & Nhật ký vận động */}
          <div className="p-4 border border-amber-200 rounded-xl bg-amber-50/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                4. Theo dõi Khó khăn, vướng mắc & Vận động đối thoại
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.hasObstacle}
                  onChange={(e) => setFormData({ ...formData, hasObstacle: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-800">Có khó khăn, vướng mắc</span>
              </label>
            </div>

            {formData.hasObstacle && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Phân loại nhóm vướng mắc
                    </label>
                    <select
                      value={formData.obstacleCategory || ''}
                      onChange={(e) => {
                        const val = e.target.value as HouseholdObstacleCategory;
                        const names: Record<string, string> = {
                          price_dispute: 'Đơn giá bồi thường đất & cây trồng thấp',
                          boundary_dispute: 'Tranh chấp ranh giới / Quyền thừa kế',
                          origin_dispute: 'Tranh chấp nguồn gốc đất / Giấy tờ chưa rõ',
                          resettlement_demand: 'Yêu cầu thêm lô TĐC hoặc vị trí thuận lợi',
                          compensation_policy: 'Đề nghị bổ sung bồi thường tài sản vật kiến trúc',
                          court_lawsuit: 'Đang khởi kiện hoặc khiếu nại tại Tòa án/Thanh tra',
                          other: 'Nguyên nhân khác',
                        };
                        setFormData({
                          ...formData,
                          obstacleCategory: val,
                          obstacleCategoryName: names[val] || 'Khó khăn vướng mắc khác',
                        });
                      }}
                      className="w-full px-3 py-2 text-sm border border-amber-300 rounded-xl bg-white font-medium"
                    >
                      <option value="">-- Chọn nhóm nguyên nhân --</option>
                      <option value="price_dispute">Đơn giá bồi thường đất & cây trồng thấp</option>
                      <option value="boundary_dispute">Tranh chấp ranh giới / Quyền thừa kế</option>
                      <option value="origin_dispute">Tranh chấp nguồn gốc đất / Giấy tờ chưa rõ</option>
                      <option value="resettlement_demand">Yêu cầu thêm lô TĐC hoặc vị trí thuận lợi</option>
                      <option value="compensation_policy">Đề nghị bổ sung bồi thường tài sản kiến trúc</option>
                      <option value="court_lawsuit">Đang khởi kiện hoặc khiếu nại tại Tòa án</option>
                      <option value="other">Nguyên nhân vướng mắc khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Số lần đã tổ chức vận động, đối thoại
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.campaignCount || ''}
                      onChange={(e) => setFormData({ ...formData, campaignCount: parseInt(e.target.value) || 0 })}
                      placeholder="VD: 3"
                      className="w-full px-3 py-2 text-sm border border-amber-300 rounded-xl bg-white font-bold text-amber-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Chi tiết nội dung kiến nghị / nguyên nhân không nhận tiền
                  </label>
                  <textarea
                    rows={2}
                    value={formData.obstacleDetail || ''}
                    onChange={(e) => setFormData({ ...formData, obstacleDetail: e.target.value })}
                    placeholder="VD: Hộ dân không đồng ý đơn giá đất nông nghiệp 2.500.000 đ/m2, đề nghị hỗ trợ chuyển đổi nghề nghiệp..."
                    className="w-full px-3 py-2 text-sm border border-amber-300 rounded-xl bg-white outline-hidden resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Kế hoạch & Biện pháp xử lý tiếp theo
                  </label>
                  <textarea
                    rows={2}
                    value={formData.actionPlan || ''}
                    onChange={(e) => setFormData({ ...formData, actionPlan: e.target.value })}
                    placeholder="VD: Hội đồng GPMB phối hợp Mặt trận xã đối thoại lần 4 ngày 05/09; nếu không đồng thuận sẽ lập hồ sơ gửi tiền vào Kho bạc..."
                    className="w-full px-3 py-2 text-sm border border-amber-300 rounded-xl bg-white outline-hidden resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ghi chú thêm về đặc điểm hộ dân..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Đang lưu...' : household ? 'Lưu thông tin hộ' : 'Thêm hộ dân'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
