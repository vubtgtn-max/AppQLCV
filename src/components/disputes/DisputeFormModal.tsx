import React, { useState, useEffect } from 'react';
import { X, Scale, User, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { DisputeCase, DisputeType, DisputeStatus } from '../../types';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { DecimalAreaInput } from '../common/DecimalAreaInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { addWorkingDays } from '../../utils/date';
import { localVault } from '../../services/localVault';

interface DisputeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  disputeToEdit: DisputeCase | null;
  onSuccess: (dispute: DisputeCase) => void;
}

export const DisputeFormModal: React.FC<DisputeFormModalProps> = ({
  isOpen,
  onClose,
  disputeToEdit,
  onSuccess,
}) => {
  const { users, refreshData } = useRealtime();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDue = addWorkingDays(todayStr, 30);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    disputeType: 'boundary' as DisputeType,
    status: 'received' as DisputeStatus,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    receivedDate: todayStr,
    deadlineDate: defaultDue,
    handlerId: '',
    handlerName: '',
    assignedLeaderId: '',
    assignedLeaderName: '',
    location: 'Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng',
    parcel: '',
    mapSheet: '',
    area: 0,
    disputedArea: 0,
    landType: 'Đất ở nông thôn (ONT)',
    certificateStatus: 'has_cert' as 'has_cert' | 'no_cert' | 'in_process' | 'overlap_cert',
    certificateNumber: '',
    partyA: {
      name: '',
      cccd: '',
      phone: '',
      address: '',
      claim: '',
    },
    partyB: {
      name: '',
      cccd: '',
      phone: '',
      address: '',
      claim: '',
    },
    notes: '',
  });

  useEffect(() => {
    if (disputeToEdit) {
      setFormData({
        code: disputeToEdit.code,
        title: disputeToEdit.title,
        disputeType: disputeToEdit.disputeType,
        status: disputeToEdit.status,
        priority: disputeToEdit.priority,
        receivedDate: disputeToEdit.receivedDate,
        deadlineDate: disputeToEdit.deadlineDate,
        handlerId: disputeToEdit.handlerId,
        handlerName: disputeToEdit.handlerName,
        assignedLeaderId: disputeToEdit.assignedLeaderId || '',
        assignedLeaderName: disputeToEdit.assignedLeaderName || '',
        location: disputeToEdit.location,
        parcel: disputeToEdit.parcel,
        mapSheet: disputeToEdit.mapSheet,
        area: disputeToEdit.area,
        disputedArea: disputeToEdit.disputedArea,
        landType: disputeToEdit.landType,
        certificateStatus: disputeToEdit.certificateStatus,
        certificateNumber: disputeToEdit.certificateNumber || '',
        partyA: {
          name: disputeToEdit.partyA.name,
          cccd: disputeToEdit.partyA.cccd || '',
          phone: disputeToEdit.partyA.phone || '',
          address: disputeToEdit.partyA.address,
          claim: disputeToEdit.partyA.claim,
        },
        partyB: {
          name: disputeToEdit.partyB.name,
          cccd: disputeToEdit.partyB.cccd || '',
          phone: disputeToEdit.partyB.phone || '',
          address: disputeToEdit.partyB.address,
          claim: disputeToEdit.partyB.claim,
        },
        notes: disputeToEdit.notes || '',
      });
    } else {
      setFormData({
        code: '',
        title: '',
        disputeType: 'boundary',
        status: 'received',
        priority: 'medium',
        receivedDate: todayStr,
        deadlineDate: defaultDue,
        handlerId: users[0]?.id || '',
        handlerName: users[0]?.name || '',
        assignedLeaderId: users.find((u) => u.role === 'leader')?.id || '',
        assignedLeaderName: users.find((u) => u.role === 'leader')?.name || '',
        location: 'Thôn 1, xã Lãnh Ngọc',
        parcel: '',
        mapSheet: '',
        area: 0,
        disputedArea: 0,
        landType: 'Đất ở nông thôn (ONT)',
        certificateStatus: 'has_cert',
        certificateNumber: '',
        partyA: {
          name: '',
          cccd: '',
          phone: '',
          address: 'Thôn 1, xã Lãnh Ngọc',
          claim: '',
        },
        partyB: {
          name: '',
          cccd: '',
          phone: '',
          address: 'Thôn 1, xã Lãnh Ngọc',
          claim: '',
        },
        notes: '',
      });
    }
    setErrorMsg('');
  }, [disputeToEdit, isOpen, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề vụ việc tranh chấp');
      return;
    }
    if (!formData.partyA.name.trim() || !formData.partyB.name.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ họ tên Bên A (Bên yêu cầu) và Bên B (Bên bị tranh chấp)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let saved: DisputeCase;
      if (disputeToEdit) {
        saved = await apiService.updateDispute(disputeToEdit.id, formData);
      } else {
        saved = await apiService.createDispute(formData);
      }
      try {
        await localVault.upsertLocalDispute(saved);
      } catch (_) {}
      await refreshData();
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu hồ sơ tranh chấp');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {disputeToEdit ? `Chỉnh sửa vụ tranh chấp [${disputeToEdit.code}]` : 'Tiếp nhận hồ sơ tranh chấp đất đai mới'}
              </h2>
              <p className="text-xs text-slate-500">Luật Đất đai 2024 - Hòa giải tranh chấp tại UBND cấp xã</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. General Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-gray-200 pb-2">
              <span>1. Thông tin tiếp nhận & Thụ lý</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề vụ tranh chấp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: Tranh chấp ranh giới quyền sử dụng đất giữa hộ ông A và hộ bà B..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 text-sm focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dạng tranh chấp</label>
                <select
                  value={formData.disputeType}
                  onChange={(e) => setFormData({ ...formData, disputeType: e.target.value as DisputeType })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="boundary">Ranh giới, mốc giới</option>
                  <option value="encroachment">Lấn, chiếm đất đai</option>
                  <option value="pathway">Ngõ đi chung, lối đi, thoát nước</option>
                  <option value="overlapping">Chồng lấn ranh bản đồ / GCN</option>
                  <option value="inheritance">Thừa kế quyền sử dụng đất</option>
                  <option value="transfer">Chuyển nhượng viết tay</option>
                  <option value="other">Tranh chấp khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái giải quyết</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as DisputeStatus })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="received">Mới tiếp nhận đơn</option>
                  <option value="verifying">Đang xác minh hiện trường</option>
                  <option value="verified">Đã lập Biên bản xác minh</option>
                  <option value="reported">Đã lập Báo cáo thẩm tra</option>
                  <option value="scheduled">Đã mời hòa giải</option>
                  <option value="resolved_success">Hòa giải thành</option>
                  <option value="resolved_failure">Hòa giải không thành</option>
                  <option value="withdrawn">Đình chỉ / Rút đơn</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mức độ ưu tiên</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Hỏa tốc / Nóng</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày tiếp nhận đơn (dd/mm/yyyy)</label>
                <VietnameseDateInput
                  value={formData.receivedDate}
                  onChange={(rDate) => {
                    if (!rDate) {
                      setFormData({
                        ...formData,
                        receivedDate: '',
                      });
                      return;
                    }
                    const newDue = addWorkingDays(rDate, 30);
                    setFormData({
                      ...formData,
                      receivedDate: rDate,
                      deadlineDate: newDue,
                    });
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Hạn hòa giải (30 ngày làm việc - trừ T7, CN, Lễ)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const baseDate = formData.receivedDate || todayStr;
                        setFormData({ ...formData, deadlineDate: addWorkingDays(baseDate, 30) });
                      }}
                      className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition cursor-pointer"
                      title="Cộng 30 ngày làm việc tính từ ngày tiếp nhận"
                    >
                      30 ngày LV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const baseDate = formData.receivedDate || todayStr;
                        setFormData({ ...formData, deadlineDate: addWorkingDays(baseDate, 45) });
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-300 transition cursor-pointer"
                      title="Cộng 45 ngày làm việc theo Luật Đất đai (trừ T7, CN, Lễ)"
                    >
                      45 ngày LV
                    </button>
                  </div>
                </div>
                <VietnameseDateInput
                  value={formData.deadlineDate}
                  onChange={(val) => setFormData({ ...formData, deadlineDate: val })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cán bộ phụ trách thụ lý</label>
                <select
                  value={formData.handlerId}
                  onChange={(e) => {
                    const selected = users.find((u) => u.id === e.target.value);
                    setFormData({
                      ...formData,
                      handlerId: e.target.value,
                      handlerName: selected?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lãnh đạo UBND chỉ đạo</label>
                <select
                  value={formData.assignedLeaderId}
                  onChange={(e) => {
                    const selected = users.find((u) => u.id === e.target.value);
                    setFormData({
                      ...formData,
                      assignedLeaderId: e.target.value,
                      assignedLeaderName: selected?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- Chọn lãnh đạo chỉ đạo --</option>
                  {users
                    .filter((u) => u.role === 'leader' || u.role === 'admin')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.position || 'Lãnh đạo'})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Parcel Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-gray-200 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>2. Thửa đất tranh chấp</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thửa đất số</label>
                <input
                  type="text"
                  placeholder="VD: 45"
                  value={formData.parcel}
                  onChange={(e) => setFormData({ ...formData, parcel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tờ bản đồ số</label>
                <input
                  type="text"
                  placeholder="VD: 12"
                  value={formData.mapSheet}
                  onChange={(e) => setFormData({ ...formData, mapSheet: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diện tích thửa (m²)</label>
                <DecimalAreaInput
                  value={formData.area || 0}
                  onChange={(val) => setFormData({ ...formData, area: val })}
                  placeholder="VD: 150,5"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">DT tranh chấp (m²)</label>
                <DecimalAreaInput
                  value={formData.disputedArea || 0}
                  onChange={(val) => setFormData({ ...formData, disputedArea: val })}
                  placeholder="VD: 25,4"
                  className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs focus:outline-hidden font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <VillageAddressInput
                  label="Địa bàn / Thôn xóm"
                  mode="location"
                  placeholder="VD: Thôn Tiên Hiệp..."
                  value={formData.location}
                  onChange={(val) => setFormData({ ...formData, location: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại đất</label>
                <input
                  type="text"
                  value={formData.landType}
                  onChange={(e) => setFormData({ ...formData, landType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tình trạng Giấy chứng nhận</label>
                <select
                  value={formData.certificateStatus}
                  onChange={(e) => setFormData({ ...formData, certificateStatus: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                >
                  <option value="has_cert">Đã cấp GCNQSDĐ</option>
                  <option value="no_cert">Chưa cấp GCNQSDĐ</option>
                  <option value="overlap_cert">Chồng lấn / Cấp trùng GCN</option>
                  <option value="in_process">Đang làm thủ tục cấp</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Parties Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 border-b border-gray-200 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>3. Các bên tranh chấp</span>
            </h3>

            {/* Bên A */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Bên A: Người làm đơn / Người yêu cầu giải quyết</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.partyA.name}
                    onChange={(e) => setFormData({ ...formData, partyA: { ...formData.partyA, name: e.target.value } })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={formData.partyA.cccd}
                    onChange={(e) => setFormData({ ...formData, partyA: { ...formData.partyA, cccd: e.target.value } })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={formData.partyA.phone}
                    onChange={(e) => setFormData({ ...formData, partyA: { ...formData.partyA, phone: e.target.value } })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="pt-1">
                <VillageAddressInput
                  label="Địa chỉ thường trú Bên A"
                  mode="address"
                  placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                  value={formData.partyA.address}
                  onChange={(val) => setFormData({ ...formData, partyA: { ...formData.partyA, address: val } })}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Nội dung yêu cầu / Căn cứ đưa ra</label>
                <textarea
                  rows={2}
                  value={formData.partyA.claim}
                  onChange={(e) => setFormData({ ...formData, partyA: { ...formData.partyA, claim: e.target.value } })}
                  placeholder="Yêu cầu tháo dỡ công trình, trả lại đất theo Giấy chứng nhận..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Bên B */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span>Bên B: Người bị khiếu nại / Người bị tranh chấp</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.partyB.name}
                    onChange={(e) => setFormData({ ...formData, partyB: { ...formData.partyB, name: e.target.value } })}
                    placeholder="Trần Thị B"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={formData.partyB.cccd}
                    onChange={(e) => setFormData({ ...formData, partyB: { ...formData.partyB, cccd: e.target.value } })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={formData.partyB.phone}
                    onChange={(e) => setFormData({ ...formData, partyB: { ...formData.partyB, phone: e.target.value } })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="pt-1">
                <VillageAddressInput
                  label="Địa chỉ thường trú Bên B"
                  mode="address"
                  placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                  value={formData.partyB.address}
                  onChange={(val) => setFormData({ ...formData, partyB: { ...formData.partyB, address: val } })}
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Ý kiến phản bác / Lý lẽ của Bên B</label>
                <textarea
                  rows={2}
                  value={formData.partyB.claim}
                  onChange={(e) => setFormData({ ...formData, partyB: { ...formData.partyB, claim: e.target.value } })}
                  placeholder="Gia đình sử dụng ổn định từ lâu theo ranh cây bụi cũ..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú & Dự kiến hướng giải quyết</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            {isSubmitting ? 'Đang lưu...' : disputeToEdit ? 'Lưu thay đổi' : 'Tạo hồ sơ tranh chấp'}
          </button>
        </div>
      </div>
    </div>
  );
};
