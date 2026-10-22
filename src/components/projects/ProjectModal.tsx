import React, { useState } from 'react';
import {
  X,
  Building2,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  FileText,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { LandProject, ProjectMilestones, ProjectStatus } from '../../types';
import { useRealtime } from '../../contexts/RealtimeContext';
import { useAuth } from '../../contexts/AuthContext';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { DecimalAreaInput } from '../common/DecimalAreaInput';
import { CurrencyInput } from '../common/CurrencyInput';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: Partial<LandProject>) => Promise<void>;
  project?: LandProject | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  project,
}) => {
  const { users } = useRealtime();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'milestones'>('info');
  const [loading, setLoading] = useState(false);
  const submittingRef = React.useRef(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<LandProject>>({
    code: project?.code || `DA-${new Date().getFullYear()}-001`,
    name: project?.name || '',
    location: project?.location || 'Xã Lãnh Ngọc',
    decisionNumber: project?.decisionNumber || '',
    decisionDate: project?.decisionDate || '',
    investor: project?.investor || 'Ban Quản lý Dự án Đầu tư Xây dựng thành phố / UBND xã Lãnh Ngọc',
    totalArea: project?.totalArea || 0,
    totalHouseholds: project?.totalHouseholds || 0,
    totalBudget: project?.totalBudget || 0,
    status: project?.status || 'planning',
    managerId: project?.managerId || currentUser?.id || 'user_hoaivu',
    managerName: project?.managerName || currentUser?.name || 'Đoàn Văn Hoài Vũ',
    startDate: project?.startDate || new Date().toISOString().split('T')[0],
    targetDate: project?.targetDate || '',
    description: project?.description || '',
    notes: project?.notes || '',
    milestones: project?.milestones || {
      noticeOfRecovery: { issued: false, number: '', date: '', notes: '' },
      surveyAndInventory: { completed: false, completedCount: 0, totalCount: 0, notes: '' },
      publicPlan: { isPublic: false, startDate: '', endDate: '', feedbackCount: 0, notes: '' },
      approvalDecision: { approved: false, number: '', date: '', approvedBudget: 0, notes: '' },
      recoveryDecision: { issued: false, number: '', date: '', notes: '' },
      paymentAndHandover: { isCompleted: false, notes: '' },
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      submittingRef.current = false;
      setLoading(false);
      return;
    }
    setActiveTab('info');
    setError(null);
    setFormData({
      code: project?.code || `DA-${new Date().getFullYear()}-001`,
      name: project?.name || '',
      location: project?.location || 'Xã Lãnh Ngọc',
      decisionNumber: project?.decisionNumber || '',
      decisionDate: project?.decisionDate || '',
      investor: project?.investor || 'Ban Quản lý Dự án Đầu tư Xây dựng thành phố / UBND xã Lãnh Ngọc',
      totalArea: project?.totalArea || 0,
      totalHouseholds: project?.totalHouseholds || 0,
      totalBudget: project?.totalBudget || 0,
      status: project?.status || 'planning',
      managerId: project?.managerId || currentUser?.id || 'user_hoaivu',
      managerName: project?.managerName || currentUser?.name || 'Đoàn Văn Hoài Vũ',
      startDate: project?.startDate || new Date().toISOString().split('T')[0],
      targetDate: project?.targetDate || '',
      description: project?.description || '',
      notes: project?.notes || '',
      milestones: project?.milestones || {
        noticeOfRecovery: { issued: false, number: '', date: '', notes: '' },
        surveyAndInventory: { completed: false, completedCount: 0, totalCount: 0, notes: '' },
        publicPlan: { isPublic: false, startDate: '', endDate: '', feedbackCount: 0, notes: '' },
        approvalDecision: { approved: false, number: '', date: '', approvedBudget: 0, notes: '' },
        recoveryDecision: { issued: false, number: '', date: '', notes: '' },
        paymentAndHandover: { isCompleted: false, notes: '' },
      },
    });
  }, [project, isOpen, currentUser?.id, currentUser?.name]);

  if (!isOpen) return null;

  const handleManagerChange = (managerId: string) => {
    const selected = users.find((u) => u.id === managerId);
    setFormData((prev) => ({
      ...prev,
      managerId,
      managerName: selected ? selected.name : prev.managerName,
    }));
  };

  const updateMilestone = <K extends keyof ProjectMilestones>(
    key: K,
    val: Partial<ProjectMilestones[K]>
  ) => {
    setFormData((prev) => ({
      ...prev,
      milestones: {
        ...(prev.milestones as ProjectMilestones),
        [key]: {
          ...(prev.milestones?.[key] || {}),
          ...val,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!formData.name?.trim()) {
      setError('Vui lòng nhập tên dự án bồi thường, GPMB.');
      return;
    }
    setError(null);
    submittingRef.current = true;
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lưu dự án thất bại.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {project ? 'Cập nhật Dự án GPMB' : 'Thêm mới Dự án Bồi thường, GPMB'}
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi tiến độ, mốc pháp lý, phê duyệt phương án và danh sách hộ dân
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

        {/* Tab Buttons */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Thông tin chung dự án
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'milestones'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            2. Các mốc tiến độ pháp lý GPMB
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'info' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã dự án <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: DA-2026-001"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên dự án thu hồi đất & GPMB <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Dự án Nâng cấp, mở rộng đường ĐH.01 đoạn qua xã..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <VillageAddressInput
                    label="Địa điểm thu hồi đất / Tuyến đi qua / Thôn"
                    mode="location"
                    placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                    value={formData.location || ''}
                    onChange={(val) => setFormData({ ...formData, location: val })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chủ đầu tư / Cơ quan lập phương án
                  </label>
                  <input
                    type="text"
                    value={formData.investor || ''}
                    onChange={(e) => setFormData({ ...formData, investor: e.target.value })}
                    placeholder="VD: Ban Quản lý Dự án thành phố hoặc UBND xã Lãnh Ngọc"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Quyết định chủ trương / phê duyệt
                  </label>
                  <input
                    type="text"
                    value={formData.decisionNumber || ''}
                    onChange={(e) => setFormData({ ...formData, decisionNumber: e.target.value })}
                    placeholder="VD: 128/QĐ-UBND"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày ban hành Quyết định (dd/mm/yyyy)
                  </label>
                  <VietnameseDateInput
                    value={formData.decisionDate || ''}
                    onChange={(val) => setFormData({ ...formData, decisionDate: val })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái tiến độ dự án
                  </label>
                  <select
                    value={formData.status || 'planning'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-medium bg-white"
                  >
                    <option value="planning">1. Lập chủ trương / Chuẩn bị</option>
                    <option value="surveying">2. Đang kiểm đếm hiện trạng</option>
                    <option value="publicizing">3. Đang niêm yết công khai PA</option>
                    <option value="approving">4. Đang thẩm định & phê duyệt PA</option>
                    <option value="paying">5. Đang chi trả tiền bồi thường</option>
                    <option value="handing_over">6. Đang bàn giao mặt bằng</option>
                    <option value="completed">7. Đã hoàn thành 100% GPMB</option>
                    <option value="paused">8. Đang tạm dừng / Vướng mắc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tổng diện tích thu hồi (m²) <span className="text-[10px] font-normal text-slate-400">(dùng dấu ,)</span>
                  </label>
                  <DecimalAreaInput
                    value={formData.totalArea}
                    onChange={(val) => setFormData({ ...formData, totalArea: val })}
                    placeholder="VD: 14580,5"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tổng số hộ bị ảnh hưởng
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      value={formData.totalHouseholds || ''}
                      onChange={(e) => setFormData({ ...formData, totalHouseholds: parseInt(e.target.value) || 0 })}
                      placeholder="VD: 28"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tổng kinh phí bồi thường (VNĐ)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-emerald-600" />
                    <CurrencyInput
                      value={formData.totalBudget}
                      onChange={(val) => setFormData({ ...formData, totalBudget: val })}
                      placeholder="Nhập số tiền tùy ý..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cán bộ địa chính phụ trách
                  </label>
                  <select
                    value={formData.managerId || ''}
                    onChange={(e) => handleManagerChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.position || u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày bắt đầu triển khai (dd/mm/yyyy)
                  </label>
                  <VietnameseDateInput
                    value={formData.startDate || ''}
                    onChange={(val) => setFormData({ ...formData, startDate: val })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hạn hoàn thành GPMB (dd/mm/yyyy)
                  </label>
                  <VietnameseDateInput
                    value={formData.targetDate || ''}
                    onChange={(val) => setFormData({ ...formData, targetDate: val })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả quy mô & tính chất công trình
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Tuyến giao thông huyết mạch liên xã, quy mô mặt đường mở rộng từ 5m lên 9m..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú chỉ đạo & tiến độ tổng thể
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú các vướng mắc chung hoặc chỉ đạo của Thường trực Đảng ủy, UBND xã..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
                />
              </div>
            </div>
          ) : (
            /* Tab 2: Milestones */
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  Cập nhật các mốc pháp lý trọng tâm theo quy định của Luật Đất đai để theo dõi chặt chẽ trình tự GPMB.
                </span>
              </div>

              {/* Milestone 1: Thông báo thu hồi đất */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Thông báo thu hồi đất</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.milestones?.noticeOfRecovery?.issued}
                      onChange={(e) => updateMilestone('noticeOfRecovery', { issued: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Đã ban hành thông báo</span>
                  </label>
                </div>
                {formData.milestones?.noticeOfRecovery?.issued && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Số Thông báo</label>
                      <input
                        type="text"
                        value={formData.milestones?.noticeOfRecovery?.number || ''}
                        onChange={(e) => updateMilestone('noticeOfRecovery', { number: e.target.value })}
                        placeholder="VD: 45/TB-UBND"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ngày ban hành (dd/mm/yyyy)</label>
                      <VietnameseDateInput
                        value={formData.milestones?.noticeOfRecovery?.date || ''}
                        onChange={(val) => updateMilestone('noticeOfRecovery', { date: val })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ghi chú niêm yết</label>
                      <input
                        type="text"
                        value={formData.milestones?.noticeOfRecovery?.notes || ''}
                        onChange={(e) => updateMilestone('noticeOfRecovery', { notes: e.target.value })}
                        placeholder="Đã niêm yết đủ 30 ngày tại thôn..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Milestone 2: Đo đạc & Kiểm đếm */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Đo đạc, trích lục & Kiểm đếm hiện trạng</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.milestones?.surveyAndInventory?.completed}
                      onChange={(e) => updateMilestone('surveyAndInventory', { completed: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Đã hoàn thành kiểm đếm 100%</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Số hộ đã kiểm đếm</label>
                    <input
                      type="number"
                      value={formData.milestones?.surveyAndInventory?.completedCount || ''}
                      onChange={(e) => updateMilestone('surveyAndInventory', { completedCount: parseInt(e.target.value) || 0 })}
                      placeholder="VD: 28"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Tổng số hộ cần kiểm đếm</label>
                    <input
                      type="number"
                      value={formData.milestones?.surveyAndInventory?.totalCount || formData.totalHouseholds || ''}
                      onChange={(e) => updateMilestone('surveyAndInventory', { totalCount: parseInt(e.target.value) || 0 })}
                      placeholder="VD: 28"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ghi chú kiểm đếm</label>
                    <input
                      type="text"
                      value={formData.milestones?.surveyAndInventory?.notes || ''}
                      onChange={(e) => updateMilestone('surveyAndInventory', { notes: e.target.value })}
                      placeholder="Đã xác nhận nguồn gốc đất..."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Milestone 3: Công khai phương án */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Lập & Niêm yết công khai dự thảo Phương án bồi thường</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.milestones?.publicPlan?.isPublic}
                      onChange={(e) => updateMilestone('publicPlan', { isPublic: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Đã niêm yết công khai</span>
                  </label>
                </div>
                {formData.milestones?.publicPlan?.isPublic && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ngày bắt đầu niêm yết</label>
                      <VietnameseDateInput
                        value={formData.milestones?.publicPlan?.startDate || ''}
                        onChange={(val) => updateMilestone('publicPlan', { startDate: val })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ngày kết thúc niêm yết</label>
                      <VietnameseDateInput
                        value={formData.milestones?.publicPlan?.endDate || ''}
                        onChange={(val) => updateMilestone('publicPlan', { endDate: val })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Số ý kiến phản ánh</label>
                      <input
                        type="number"
                        value={formData.milestones?.publicPlan?.feedbackCount || ''}
                        onChange={(e) => updateMilestone('publicPlan', { feedbackCount: parseInt(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ghi chú giải trình</label>
                      <input
                        type="text"
                        value={formData.milestones?.publicPlan?.notes || ''}
                        onChange={(e) => updateMilestone('publicPlan', { notes: e.target.value })}
                        placeholder="Đã tổ chức đối thoại giải trình..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Milestone 4: Phê duyệt phương án */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      4
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Thẩm định & Quyết định Phê duyệt Phương án bồi thường</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.milestones?.approvalDecision?.approved}
                      onChange={(e) => updateMilestone('approvalDecision', { approved: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Đã có QĐ Phê duyệt</span>
                  </label>
                </div>
                {formData.milestones?.approvalDecision?.approved && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Số Quyết định phê duyệt</label>
                      <input
                        type="text"
                        value={formData.milestones?.approvalDecision?.number || ''}
                        onChange={(e) => updateMilestone('approvalDecision', { number: e.target.value })}
                        placeholder="VD: 215/QĐ-UBND"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ngày phê duyệt (dd/mm/yyyy)</label>
                      <VietnameseDateInput
                        value={formData.milestones?.approvalDecision?.date || ''}
                        onChange={(val) => updateMilestone('approvalDecision', { date: val })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Tổng kinh phí phê duyệt (VNĐ)</label>
                      <CurrencyInput
                        value={formData.milestones?.approvalDecision?.approvedBudget}
                        onChange={(val) => updateMilestone('approvalDecision', { approvedBudget: val })}
                        placeholder="Nhập số tiền tùy ý..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ghi chú</label>
                      <input
                        type="text"
                        value={formData.milestones?.approvalDecision?.notes || ''}
                        onChange={(e) => updateMilestone('approvalDecision', { notes: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Milestone 5: Quyết định thu hồi đất */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      5
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Ban hành Quyết định thu hồi đất (từng hộ/tổng thể)</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.milestones?.recoveryDecision?.issued}
                      onChange={(e) => updateMilestone('recoveryDecision', { issued: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Đã ban hành QĐ thu hồi</span>
                  </label>
                </div>
                {formData.milestones?.recoveryDecision?.issued && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Số Quyết định thu hồi</label>
                      <input
                        type="text"
                        value={formData.milestones?.recoveryDecision?.number || ''}
                        onChange={(e) => updateMilestone('recoveryDecision', { number: e.target.value })}
                        placeholder="VD: 216/QĐ-UBND"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ngày ban hành QĐ (dd/mm/yyyy)</label>
                      <VietnameseDateInput
                        value={formData.milestones?.recoveryDecision?.date || ''}
                        onChange={(val) => updateMilestone('recoveryDecision', { date: val })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Tình hình gửi QĐ đến hộ</label>
                      <input
                        type="text"
                        value={formData.milestones?.recoveryDecision?.notes || ''}
                        onChange={(e) => updateMilestone('recoveryDecision', { notes: e.target.value })}
                        placeholder="Đã trao tận tay từng hộ dân..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Milestone 6: Chi trả tiền & Bàn giao mặt bằng */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      6
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">Chi trả tiền bồi thường & Bàn giao mặt bằng</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.milestones?.paymentAndHandover?.isCompleted}
                      onChange={(e) => updateMilestone('paymentAndHandover', { isCompleted: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Đã hoàn thành chi trả 100%</span>
                  </label>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Ghi chú tình hình chi trả & vận động hộ</label>
                  <textarea
                    rows={2}
                    value={formData.milestones?.paymentAndHandover?.notes || ''}
                    onChange={(e) => updateMilestone('paymentAndHandover', { notes: e.target.value })}
                    placeholder="VD: Đã chi trả xong đợt 1 cho 22 hộ. Còn 6 hộ đang vận động..."
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white resize-none"
                  />
                </div>
              </div>
            </div>
          )}

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
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Đang lưu...' : project ? 'Lưu thay đổi' : 'Tạo dự án mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
