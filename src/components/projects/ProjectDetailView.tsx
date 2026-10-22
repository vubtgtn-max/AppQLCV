import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Layers,
  ChevronRight,
  Home,
  ShieldAlert,
  Phone,
  HelpCircle,
  FileSpreadsheet,
  Printer,
  X,
  MoreVertical,
} from 'lucide-react';
import {
  LandProject,
  ProjectHousehold,
  HouseholdPaymentStatus,
  HouseholdHandoverStatus,
} from '../../types';
import { apiService } from '../../services/api';
import { useRealtime } from '../../contexts/RealtimeContext';
import { useAuth } from '../../contexts/AuthContext';
import { HouseholdModal } from './HouseholdModal';
import { HouseholdBatchImportModal } from './HouseholdBatchImportModal';
import { ProjectModal } from './ProjectModal';
import { ProjectReportsView } from './ProjectReportsView';
import { GpmbDocumentsModal } from './GpmbDocumentsModal';
import { formatDate } from '../../utils/date';

interface ProjectDetailViewProps {
  project: LandProject;
  onBack: () => void;
  onRefresh: () => void;
  onDeleteProject?: (project: LandProject) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBack,
  onRefresh,
  onDeleteProject,
}) => {
  const { users } = useRealtime();
  const { isAdmin, isLeader } = useAuth();
  const [activeTab, setActiveTab] = useState<'households' | 'matrix' | 'milestones' | 'obstacles' | 'overview' | 'reports'>('households');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterHandover, setFilterHandover] = useState<string>('all');
  const [filterObstacle, setFilterObstacle] = useState<string>('all');

  // Modals state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<ProjectHousehold | null>(null);
  const [docHousehold, setDocHousehold] = useState<ProjectHousehold | null>(null);
  const [householdToDelete, setHouseholdToDelete] = useState<ProjectHousehold | null>(null);
  const [isDeletingHousehold, setIsDeletingHousehold] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeHouseholdMenuId, setActiveHouseholdMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveHouseholdMenuId(null);
    if (activeHouseholdMenuId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeHouseholdMenuId]);

  const households = useMemo(() => {
    const raw = project.households || [];
    const sttSet = new Set(raw.map((h) => h.stt).filter(Boolean));
    const hasDuplicateOrInvalidStt = sttSet.size < raw.length;
    return raw.map((h, idx) => ({
      ...h,
      stt: hasDuplicateOrInvalidStt ? idx + 1 : h.stt || idx + 1,
    }));
  }, [project.households]);

  // Summary Metrics
  const totalCount = households.length > 0 ? households.length : project.totalHouseholds || 0;
  const paidHouseholds = households.filter((h) => h.paymentStatus === 'paid');
  const partiallyPaidHouseholds = households.filter((h) => h.paymentStatus === 'partially_paid');
  const unpaidHouseholds = households.filter((h) => h.paymentStatus === 'unpaid');
  const refusedHouseholds = households.filter((h) => h.paymentStatus === 'refused');

  const handedOverHouseholds = households.filter((h) => h.handoverStatus === 'handed_over');
  const obstacleHouseholds = households.filter((h) => h.hasObstacle || h.paymentStatus === 'refused');

  const totalCompensation = households.reduce((sum, h) => sum + (h.compensationAmount || 0), 0) || project.totalBudget || 0;
  const totalPaid = households.reduce((sum, h) => sum + (h.paidAmount || 0), 0);
  const paymentRate = totalCompensation > 0 ? Math.round((totalPaid / totalCompensation) * 100) : 0;
  const householdPaidRate = totalCount > 0 ? Math.round((paidHouseholds.length / totalCount) * 100) : 0;

  // Filtered Households
  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (h.ownerName || '').toLowerCase().includes(q);
        const matchCccd = (h.cccd || '').toLowerCase().includes(q);
        const matchParcel = (h.parcel || '').toLowerCase().includes(q);
        const matchAddress = (h.address || '').toLowerCase().includes(q);
        const matchNotes = (h.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchCccd && !matchParcel && !matchAddress && !matchNotes) {
          return false;
        }
      }

      // Filter Payment
      if (filterPayment !== 'all') {
        if (filterPayment === 'paid' && h.paymentStatus !== 'paid') return false;
        if (filterPayment === 'unpaid' && h.paymentStatus !== 'unpaid') return false;
        if (filterPayment === 'refused' && h.paymentStatus !== 'refused') return false;
        if (filterPayment === 'partially_paid' && h.paymentStatus !== 'partially_paid') return false;
      }

      // Filter Handover
      if (filterHandover !== 'all') {
        if (filterHandover === 'handed_over' && h.handoverStatus !== 'handed_over') return false;
        if (filterHandover === 'not_yet' && h.handoverStatus !== 'not_yet') return false;
      }

      // Filter Obstacle
      if (filterObstacle !== 'all') {
        if (filterObstacle === 'has_obstacle' && !h.hasObstacle && h.paymentStatus !== 'refused') return false;
        if (filterObstacle === 'no_obstacle' && (h.hasObstacle || h.paymentStatus === 'refused')) return false;
      }

      return true;
    });
  }, [households, searchQuery, filterPayment, filterHandover, filterObstacle]);

  const householdsByVillage = useMemo(() => {
    const map: Record<string, ProjectHousehold[]> = {};
    for (const h of households) {
      const village = h.address || 'Khu vực chung / Chưa phân thôn';
      if (!map[village]) map[village] = [];
      map[village].push(h);
    }
    return Object.entries(map);
  }, [households]);

  // Actions
  const handleSaveHousehold = async (data: Partial<ProjectHousehold>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (selectedHousehold) {
        await apiService.updateHousehold(project.id, selectedHousehold.id, data);
      } else {
        await apiService.addHousehold(project.id, data);
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Lưu hộ dân thất bại.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHousehold = (household: ProjectHousehold) => {
    setHouseholdToDelete(household);
  };

  const handleConfirmDeleteHousehold = async () => {
    if (!householdToDelete) return;
    setIsDeletingHousehold(true);
    try {
      await apiService.deleteHousehold(project.id, householdToDelete.id);
      setHouseholdToDelete(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Xóa hộ dân thất bại.');
    } finally {
      setIsDeletingHousehold(false);
    }
  };

  const handleBatchImport = async (list: Partial<ProjectHousehold>[]) => {
    setActionLoading(true);
    try {
      await apiService.batchImportHouseholds(project.id, list);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Nhập danh sách thất bại.');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProject = async (data: Partial<LandProject>) => {
    if (isUpdatingProject) return;
    setIsUpdatingProject(true);
    try {
      await apiService.updateProject(project.id, data);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Cập nhật dự án thất bại.');
      throw err;
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const exportHouseholdCSV = () => {
    const headers = [
      'STT',
      'Họ và tên chủ hộ',
      'CCCD',
      'Số điện thoại',
      'Địa chỉ/Thôn',
      'Tờ BĐ',
      'Thửa đất',
      'Loại đất',
      'Diện tích (m2)',
      'Tiền bồi thường (VNĐ)',
      'Đã nhận tiền',
      'Số tiền đã nhận (VNĐ)',
      'Ngày nhận tiền',
      'Số phiếu chi',
      'Bàn giao mặt bằng',
      'Tái định cư',
      'Có vướng mắc',
      'Nhóm vướng mắc',
      'Chi tiết vướng mắc',
      'Kế hoạch xử lý',
      'Số lần vận động',
      'Ghi chú',
    ];

    const rows = households.map((h, i) => [
      h.stt || i + 1,
      `"${h.ownerName || ''}"`,
      `"${h.cccd || ''}"`,
      `"${h.phone || ''}"`,
      `"${h.address || ''}"`,
      h.mapSheet || '',
      h.parcel || '',
      `"${h.landType || ''}"`,
      h.totalArea ? Number(h.totalArea).toLocaleString('vi-VN') : 0,
      h.compensationAmount || 0,
      h.paymentStatus === 'paid' ? 'Đã nhận đủ' : h.paymentStatus === 'refused' ? 'Từ chối nhận' : 'Chưa nhận',
      h.paidAmount || 0,
      h.paidDate ? formatDate(h.paidDate) : '',
      `"${h.paymentReceiptNumber || ''}"`,
      h.handoverStatus === 'handed_over' ? 'Đã bàn giao' : 'Chưa bàn giao',
      `"${h.resettlementPlot || h.resettlementStatus || ''}"`,
      h.hasObstacle ? 'CÓ VƯỚNG MẮC' : 'Bình thường',
      `"${h.obstacleCategoryName || ''}"`,
      `"${(h.obstacleDetail || '').replace(/"/g, '""')}"`,
      `"${(h.actionPlan || '').replace(/"/g, '""')}"`,
      h.campaignCount || 0,
      `"${(h.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Ho_Dan_${project.code}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Back & Header Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Quay lại Danh sách Dự án GPMB</span>
            </button>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                {project.code}
              </span>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 leading-tight">
                {project.name}
              </h1>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {project.location}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {project.investor}
              </span>
              {project.decisionNumber && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  QĐ số: {project.decisionNumber} ({project.decisionDate ? formatDate(project.decisionDate) : 'Chưa rõ'})
                </span>
              )}
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsEditProjectOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Sửa dự án & Mốc
            </button>
            {onDeleteProject && (
              <button
                onClick={() => onDeleteProject(project)}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Xóa dự án này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa dự án</span>
              </button>
            )}
            <button
              onClick={exportHouseholdCSV}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất danh sách Excel (CSV)
            </button>
            <button
              onClick={() => {
                setSelectedHousehold(null);
                setIsHouseholdModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm hộ dân
            </button>
          </div>
        </div>

        {/* High-level stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500">Tổng số hộ ảnh hưởng</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
              {totalCount} <span className="text-[11px] font-normal text-slate-500">hộ</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="text-[11px] font-medium text-emerald-700">Đã nhận tiền bồi thường</div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5 flex items-baseline gap-1">
              {paidHouseholds.length} <span className="text-[11px] font-normal text-emerald-600">({householdPaidRate}%)</span>
            </div>
          </div>

          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
            <div className="text-[11px] font-medium text-rose-700">Chưa / Từ chối nhận</div>
            <div className="text-lg font-bold text-rose-800 mt-0.5 flex items-baseline gap-1">
              {unpaidHouseholds.length + refusedHouseholds.length}{' '}
              <span className="text-[11px] font-normal text-rose-600">
                ({refusedHouseholds.length} từ chối)
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <div className="text-[11px] font-medium text-blue-700">Đã bàn giao mặt bằng</div>
            <div className="text-lg font-bold text-blue-800 mt-0.5 flex items-baseline gap-1">
              {handedOverHouseholds.length}{' '}
              <span className="text-[11px] font-normal text-blue-600">
                ({totalCount > 0 ? Math.round((handedOverHouseholds.length / totalCount) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <div className="text-[11px] font-medium text-amber-800">Số hộ có vướng mắc</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5 flex items-baseline gap-1">
              {obstacleHouseholds.length} <span className="text-[11px] font-normal text-amber-700">hộ</span>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <div className="text-[11px] font-medium text-indigo-700">Tiến độ giải ngân</div>
            <div className="text-lg font-bold text-indigo-900 mt-0.5 flex items-baseline gap-1">
              {paymentRate}%
            </div>
            <div className="text-[10px] text-indigo-600 truncate mt-0.5 font-medium">
              {(totalPaid / 1000000000).toFixed(2)} tỷ / {(totalCompensation / 1000000000).toFixed(2)} tỷ
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-2 gap-4 lg:gap-8 overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('households')}
          className={`py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'households'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Danh sách Hộ dân & Chi trả bồi thường ({households.length})
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          Ma trận Tiến độ GPMB theo Thôn
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'milestones'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Tiến độ & 6 Mốc Pháp lý GPMB
        </button>

        <button
          onClick={() => setActiveTab('obstacles')}
          className={`py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'obstacles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Theo dõi Khó khăn & Vận động ({obstacleHouseholds.length})
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Thông tin chi tiết & Ghi chú dự án
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Báo cáo Tiến độ (Tuần/Tháng/Quý)
        </button>
      </div>

      {/* Tab 1: Danh sách hộ dân */}
      {activeTab === 'households' && (
        <div className="bg-white rounded-b-2xl p-6 shadow-xs border border-slate-200 border-t-0 space-y-4 -mt-6">
          {/* Filters & Search Row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên chủ hộ, CCCD, số thửa, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Payment Filter */}
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả chi trả</option>
                <option value="paid">✅ Đã nhận đủ tiền ({paidHouseholds.length})</option>
                <option value="unpaid">⏱ Chưa nhận tiền ({unpaidHouseholds.length})</option>
                <option value="refused">❌ Từ chối nhận tiền ({refusedHouseholds.length})</option>
              </select>

              {/* Handover Filter */}
              <select
                value={filterHandover}
                onChange={(e) => setFilterHandover(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả mặt bằng</option>
                <option value="handed_over">🟢 Đã bàn giao ({handedOverHouseholds.length})</option>
                <option value="not_yet">🔴 Chưa bàn giao ({totalCount - handedOverHouseholds.length})</option>
              </select>

              {/* Obstacle Filter */}
              <select
                value={filterObstacle}
                onChange={(e) => setFilterObstacle(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả hộ</option>
                <option value="has_obstacle">⚠️ Có khó khăn vướng mắc ({obstacleHouseholds.length})</option>
                <option value="no_obstacle">Thuận lợi</option>
              </select>

              {/* Import Excel */}
              <button
                onClick={() => setIsBatchImportOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Nhập từ Excel
              </button>
            </div>
          </div>

          {/* Households Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3 min-w-[160px]">Họ tên chủ hộ</th>
                  <th className="py-3 px-3 min-w-[110px]">Thửa / Tờ BĐ</th>
                  <th className="py-3 px-3 min-w-[90px] text-right">Diện tích (m²)</th>
                  <th className="py-3 px-3 min-w-[140px] text-right">Tiền bồi thường</th>
                  <th className="py-3 px-3 min-w-[150px]">Mốc pháp lý đã hoàn tất</th>
                  <th className="py-3 px-3 min-w-[130px]">Trạng thái Nhận tiền</th>
                  <th className="py-3 px-3 min-w-[120px]">Bàn giao mặt bằng</th>
                  <th className="py-3 px-3 min-w-[160px]">Khó khăn / Ghi chú</th>
                  <th className="py-3 px-3 w-20 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHouseholds.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Không có hộ dân nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredHouseholds.map((h, index) => {
                    const isPaid = h.paymentStatus === 'paid';
                    const isRefused = h.paymentStatus === 'refused';
                    const isHandedOver = h.handoverStatus === 'handed_over';

                    return (
                      <tr
                        key={h.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          h.hasObstacle || isRefused ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-medium text-slate-500">
                          {h.stt || index + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{h.ownerName}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {h.cccd && <span>CCCD: {h.cccd}</span>}
                            {h.phone && <span>• SĐT: {h.phone}</span>}
                          </div>
                          {h.address && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {h.address}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            Thửa: {h.parcel || '-'} / Tờ: {h.mapSheet || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium truncate max-w-[110px]">
                            {h.landType || 'Đất ở'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">
                          {h.totalArea ? Number(h.totalArea).toLocaleString('vi-VN') : '0'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-slate-900">
                            {Number(h.compensationAmount || 0).toLocaleString('vi-VN')} đ
                          </div>
                          {h.paidAmount && h.paidAmount > 0 ? (
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              Đã nhận: {Number(h.paidAmount).toLocaleString('vi-VN')} đ
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {h.noticeOfRecoveryIssued ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800" title={`TB số: ${h.noticeNumber || ''}`}>
                                1. TB thu hồi
                              </span>
                            ) : null}
                            {h.inventoryDone ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                                2. Kiểm đếm
                              </span>
                            ) : null}
                            {h.approvalDecisionIssued ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800" title={`QĐ duyệt: ${h.approvalDecisionNumber || ''}`}>
                                3. Duyệt PA
                              </span>
                            ) : null}
                            {h.recoveryDecisionIssued ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-800" title={`QĐ thu hồi: ${h.recoveryDecisionNumber || ''}`}>
                                4. QĐ thu hồi
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {isPaid ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã nhận đủ tiền
                              </span>
                              {h.paidDate && (
                                <div className="text-[10px] text-slate-400 mt-0.5">Ngày: {formatDate(h.paidDate)}</div>
                              )}
                            </div>
                          ) : isRefused ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                Không nhận / Từ chối
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Chưa nhận tiền
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isHandedOver ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đã bàn giao
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              <Clock className="w-3.5 h-3.5 text-rose-500" />
                              Chưa bàn giao
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {h.hasObstacle || isRefused ? (
                            <div className="space-y-0.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                                {h.obstacleCategoryName || 'Có vướng mắc'}
                              </span>
                              <div className="text-[10px] text-slate-600 line-clamp-2" title={h.obstacleDetail}>
                                {h.obstacleDetail || h.notes || 'Chưa ghi chi tiết nguyên nhân'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">{h.notes || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDocHousehold(h)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer transition-colors"
                              title="Xuất trọn bộ hồ sơ GPMB (Biên bản kiểm đếm, xác nhận nguồn gốc, bảng tính, bàn giao)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedHousehold(h);
                                setIsHouseholdModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer transition-colors"
                              title="Sửa thông tin hộ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 3-dot Secondary Menu */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveHouseholdMenuId(activeHouseholdMenuId === h.id ? null : h.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  activeHouseholdMenuId === h.id
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                                }`}
                                title="Thao tác khác"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeHouseholdMenuId === h.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                >
                                  <button
                                    onClick={() => {
                                      setActiveHouseholdMenuId(null);
                                      setDocHousehold(h);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    In hồ sơ GPMB & Bảng tính
                                  </button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button
                                    onClick={() => {
                                      setActiveHouseholdMenuId(null);
                                      handleDeleteHousehold(h);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    Xóa hộ dân này
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Matrix GPMB theo Thôn */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-b-2xl p-6 shadow-xs border border-slate-200 border-t-0 space-y-6 -mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Ma trận Tiến độ GPMB theo Thôn & Từng Hộ dân
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bản đồ nhiệt phân loại trạng thái bồi thường trực quan. Bấm vào bất kỳ hộ nào để xem phương án hoặc in biên bản kiểm đếm.
              </p>
            </div>

            {/* Color Legend */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Đã nhận tiền & Bàn giao
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Chờ nhận tiền / Đã duyệt
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Có vướng mắc / Kiến nghị
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Từ chối / Chưa đồng thuận
              </span>
            </div>
          </div>

          {/* Grouped by Address/Village */}
          {householdsByVillage.map(([villageName, hList]) => {
            const vPaid = hList.filter((h) => h.paymentStatus === 'paid').length;
            const vHanded = hList.filter((h) => h.handoverStatus === 'handed_over').length;
            const vObstacle = hList.filter((h) => h.hasObstacle || h.paymentStatus === 'refused').length;
            const percentPaid = Math.round((vPaid / (hList.length || 1)) * 100);

            return (
              <div key={villageName} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-sm">{villageName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {hList.length} hộ bị ảnh hưởng
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-700 font-semibold">Đã nhận: {vPaid}/{hList.length} ({percentPaid}%)</span>
                    <span className="text-blue-700 font-semibold">Đã bàn giao: {vHanded} hộ</span>
                    {vObstacle > 0 && (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {vObstacle} hộ vướng mắc
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid of Household Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {hList.map((h) => {
                    const isPaidAndHanded = h.paymentStatus === 'paid' && h.handoverStatus === 'handed_over';
                    const isRefused = h.paymentStatus === 'refused';
                    const hasObs = h.hasObstacle && !isRefused;

                    let cardStyle = 'bg-blue-50/80 border-blue-200 text-blue-900 hover:border-blue-400';
                    let badgeLabel = 'Chờ nhận tiền';
                    let badgeClass = 'bg-blue-100 text-blue-800';

                    if (isPaidAndHanded) {
                      cardStyle = 'bg-emerald-50/80 border-emerald-300 text-emerald-950 hover:border-emerald-500';
                      badgeLabel = 'Đã bàn giao';
                      badgeClass = 'bg-emerald-100 text-emerald-800';
                    } else if (isRefused) {
                      cardStyle = 'bg-rose-50/80 border-rose-300 text-rose-950 hover:border-rose-500';
                      badgeLabel = 'Từ chối nhận';
                      badgeClass = 'bg-rose-100 text-rose-800';
                    } else if (hasObs) {
                      cardStyle = 'bg-amber-50/80 border-amber-300 text-amber-950 hover:border-amber-500';
                      badgeLabel = h.obstacleCategoryName || 'Có vướng mắc';
                      badgeClass = 'bg-amber-100 text-amber-800';
                    } else if (h.paymentStatus === 'paid') {
                      cardStyle = 'bg-emerald-50/50 border-emerald-200 text-emerald-900';
                      badgeLabel = 'Đã nhận tiền';
                      badgeClass = 'bg-emerald-100 text-emerald-800';
                    }

                    return (
                      <div
                        key={h.id || h.stt}
                        className={`p-3 rounded-xl border transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between ${cardStyle}`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate max-w-[130px] text-slate-900">
                              {h.stt}. {h.ownerName}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <p>Thửa: <strong>{h.parcel || '...'}</strong> • TBĐ: <strong>{h.mapSheet || '...'}</strong> • {Number(h.totalArea || 0).toLocaleString('vi-VN')} m²</p>
                            <p className="font-semibold text-slate-800">
                              BT: {Number(h.compensationAmount || 0).toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setDocHousehold(h)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                            title="In trọn bộ biên bản"
                          >
                            <FileText className="w-3 h-3" />
                            <span>In hồ sơ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHousehold(h);
                              setIsHouseholdModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Milestones & Legal Pipeline */}
      {activeTab === 'milestones' && (
        <div className="bg-white rounded-b-2xl p-6 shadow-xs border border-slate-200 border-t-0 space-y-6 -mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Trình tự 6 Mốc Pháp lý GPMB theo quy định
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi quá trình từ Thông báo thu hồi đất, Kiểm đếm, Niêm yết, Phê duyệt đến Chi trả & Bàn giao
              </p>
            </div>
            <button
              onClick={() => setIsEditProjectOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Cập nhật Mốc pháp lý
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className={`p-4 rounded-xl border ${project.milestones?.noticeOfRecovery?.issued ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-sm font-bold text-slate-800">Thông báo thu hồi đất</h3>
                {project.milestones?.noticeOfRecovery?.issued && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ĐÃ BAN HÀNH
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Số văn bản: <strong>{project.milestones?.noticeOfRecovery?.number || 'Chưa cập nhật'}</strong></div>
                <div>Ngày ban hành: <strong>{project.milestones?.noticeOfRecovery?.date ? formatDate(project.milestones.noticeOfRecovery.date) : 'Chưa cập nhật'}</strong></div>
                <div>Ghi chú: {project.milestones?.noticeOfRecovery?.notes || 'Đã niêm yết công khai tại thôn và trụ sở UBND xã'}</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-xl border ${project.milestones?.surveyAndInventory?.completed ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-sm font-bold text-slate-800">Đo đạc, trích lục & Kiểm đếm hiện trạng</h3>
                {project.milestones?.surveyAndInventory?.completed && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    HOÀN THÀNH 100%
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Số hộ đã kiểm đếm: <strong>{project.milestones?.surveyAndInventory?.completedCount || households.filter(h => h.inventoryDone).length} / {project.milestones?.surveyAndInventory?.totalCount || totalCount} hộ</strong></div>
                <div>Ghi chú: {project.milestones?.surveyAndInventory?.notes || 'Đo đạc hiện trạng, xác nhận nguồn gốc đất đai'}</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-xl border ${project.milestones?.publicPlan?.isPublic ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-sm font-bold text-slate-800">Lập & Niêm yết công khai Phương án bồi thường</h3>
                {project.milestones?.publicPlan?.isPublic && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ĐÃ CÔNG KHAI
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Thời gian niêm yết: {project.milestones?.publicPlan?.startDate ? formatDate(project.milestones.publicPlan.startDate) : 'Từ ngày...'} đến {project.milestones?.publicPlan?.endDate ? formatDate(project.milestones.publicPlan.endDate) : '...'}</div>
                <div>Số ý kiến phản ánh: <strong>{project.milestones?.publicPlan?.feedbackCount || 0} ý kiến</strong></div>
                <div>Ghi chú: {project.milestones?.publicPlan?.notes || 'Tiếp thu, đối thoại giải trình với các hộ dân'}</div>
              </div>
            </div>

            {/* Step 4 */}
            <div className={`p-4 rounded-xl border ${project.milestones?.approvalDecision?.approved ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="text-sm font-bold text-slate-800">Quyết định Phê duyệt Phương án bồi thường</h3>
                {project.milestones?.approvalDecision?.approved && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ĐÃ PHÊ DUYỆT
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Số QĐ: <strong>{project.milestones?.approvalDecision?.number || project.decisionNumber || 'Chưa cập nhật'}</strong></div>
                <div>Ngày duyệt: <strong>{(project.milestones?.approvalDecision?.date || project.decisionDate) ? formatDate(project.milestones?.approvalDecision?.date || project.decisionDate) : 'Chưa rõ'}</strong></div>
                <div>Kinh phí duyệt: <strong className="text-emerald-700">{Number(project.milestones?.approvalDecision?.approvedBudget || totalCompensation).toLocaleString('vi-VN')} đ</strong></div>
              </div>
            </div>

            {/* Step 5 */}
            <div className={`p-4 rounded-xl border ${project.milestones?.recoveryDecision?.issued ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">5</span>
                <h3 className="text-sm font-bold text-slate-800">Ban hành Quyết định thu hồi đất</h3>
                {project.milestones?.recoveryDecision?.issued && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ĐÃ BAN HÀNH
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Số QĐ thu hồi: <strong>{project.milestones?.recoveryDecision?.number || 'Chưa có'}</strong></div>
                <div>Ngày ban hành: <strong>{project.milestones?.recoveryDecision?.date ? formatDate(project.milestones.recoveryDecision.date) : 'Chưa rõ'}</strong></div>
                <div>Ghi chú: {project.milestones?.recoveryDecision?.notes || 'Đã giao quyết định thu hồi đất cho từng hộ'}</div>
              </div>
            </div>

            {/* Step 6 */}
            <div className={`p-4 rounded-xl border ${project.milestones?.paymentAndHandover?.isCompleted ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">6</span>
                <h3 className="text-sm font-bold text-slate-800">Chi trả tiền bồi thường & Bàn giao mặt bằng</h3>
                {project.milestones?.paymentAndHandover?.isCompleted ? (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    HOÀN THÀNH 100%
                  </span>
                ) : (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    ĐANG CHI TRẢ ({paymentRate}%)
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Tiến độ chi trả: <strong>{paidHouseholds.length} / {totalCount} hộ đã nhận ({householdPaidRate}%)</strong></div>
                <div>Tình hình bàn giao: <strong>{handedOverHouseholds.length} / {totalCount} hộ đã bàn giao</strong></div>
                <div>Ghi chú: {project.milestones?.paymentAndHandover?.notes || 'Đang tiếp tục đối thoại vận động các hộ còn vướng mắc'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Obstacle Tracker & Campaign History */}
      {activeTab === 'obstacles' && (
        <div className="bg-white rounded-b-2xl p-6 shadow-xs border border-slate-200 border-t-0 space-y-6 -mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Hồ sơ theo dõi Khó khăn, Vướng mắc & Nhật ký Vận động Đối thoại
              </h2>
              <p className="text-xs text-slate-500">
                Tổng hợp chi tiết các hộ chưa đồng thuận, đơn giá, tranh chấp thừa kế, yêu cầu TĐC và giải pháp xử lý
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold">
              {obstacleHouseholds.length} hộ cần tập trung tháo gỡ
            </span>
          </div>

          {obstacleHouseholds.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Không có khó khăn vướng mắc nào!</p>
              <p className="text-xs text-slate-500 mt-1">
                Tất cả các hộ dân trong dự án đều đồng thuận nhận tiền và bàn giao mặt bằng thuận lợi.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {obstacleHouseholds.map((h, i) => (
                <div
                  key={h.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          {h.ownerName}
                          <span className="text-xs font-semibold text-slate-500">
                            (Thửa {h.parcel || '-'}, Tờ {h.mapSheet || '-'})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {h.address || project.location} • SĐT: {h.phone || 'Chưa có'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {h.obstacleCategoryName || 'Khó khăn vướng mắc'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedHousehold(h);
                          setIsHouseholdModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-white rounded-lg border border-indigo-200 transition-colors"
                      >
                        Sửa nội dung
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-slate-500 font-medium">Tiền bồi thường được duyệt:</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {Number(h.compensationAmount || 0).toLocaleString('vi-VN')} VNĐ
                      </div>
                      <div className="text-[11px] text-rose-600 font-semibold mt-1">
                        Trạng thái: {h.paymentStatus === 'refused' ? 'Từ chối nhận tiền' : 'Chưa nhận tiền'}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500 font-medium">Số lần đã vận động, đối thoại:</div>
                      <div className="text-sm font-bold text-amber-800 mt-0.5">
                        {h.campaignCount || 1} lần đối thoại
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Bàn giao MB: {h.handoverStatus === 'handed_over' ? 'Đã bàn giao' : 'Chưa bàn giao'}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500 font-medium">Nhu cầu Tái định cư:</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {h.resettlementPlot || (h.resettlementStatus === 'eligible' ? 'Đủ điều kiện TĐC' : 'Không thuộc diện')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-2">
                    <div>
                      <strong className="text-amber-900 block mb-0.5">Nội dung nguyên nhân & kiến nghị của hộ dân:</strong>
                      <p className="text-slate-700 leading-relaxed">{h.obstacleDetail || 'Chưa nhập chi tiết nguyên nhân vướng mắc.'}</p>
                    </div>
                    {h.actionPlan && (
                      <div className="pt-1.5 border-t border-slate-100">
                        <strong className="text-blue-900 block mb-0.5">Kế hoạch & Phương án giải quyết tiếp theo:</strong>
                        <p className="text-slate-700 leading-relaxed">{h.actionPlan}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Project Overview & Master Data */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-b-2xl p-6 shadow-xs border border-slate-200 border-t-0 space-y-6 -mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                1. Thông tin Hồ sơ Pháp lý
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Mã hiệu dự án:</span>
                  <span className="font-bold text-slate-800">{project.code}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Tên công trình/dự án:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px]">{project.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Địa bàn thực hiện:</span>
                  <span className="font-medium text-slate-800">{project.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Chủ đầu tư:</span>
                  <span className="font-medium text-slate-800">{project.investor}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Quyết định phê duyệt:</span>
                  <span className="font-medium text-slate-800">{project.decisionNumber || 'Chưa có'} (ngày {project.decisionDate ? formatDate(project.decisionDate) : '-'})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Cán bộ địa chính phụ trách:</span>
                  <span className="font-bold text-blue-700">{project.managerName || 'Đoàn Văn Hoài Vũ'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Thời gian thực hiện:</span>
                  <span className="font-medium text-slate-800">{project.startDate ? formatDate(project.startDate) : '-'} đến {project.targetDate ? formatDate(project.targetDate) : '31/12/2026'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                2. Quy mô & Chỉ đạo thực hiện
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">Mô tả quy mô công trình:</span>
                  <p className="text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200">
                    {project.description || 'Chưa có mô tả quy mô.'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Ghi chú chỉ đạo & Tiến độ tổng thể:</span>
                  <p className="text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200">
                    {project.notes || 'Chưa có ghi chú đặc biệt.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Báo cáo Tiến độ (Tuần/Tháng/Quý/Tự chọn) */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-b-2xl p-6 shadow-xs border border-slate-200 border-t-0 space-y-4 -mt-6">
          <ProjectReportsView
            projects={[project]}
            onBackToProjects={() => setActiveTab('households')}
          />
        </div>
      )}

      {/* Household Modal */}
      {isHouseholdModalOpen && (
        <HouseholdModal
          isOpen={isHouseholdModalOpen}
          onClose={() => {
            setIsHouseholdModalOpen(false);
            setSelectedHousehold(null);
          }}
          onSave={handleSaveHousehold}
          household={selectedHousehold}
          projectId={project.id}
          defaultLocation={project.location}
          nextStt={households.length + 1}
        />
      )}

      {/* Batch Import Modal */}
      {isBatchImportOpen && (
        <HouseholdBatchImportModal
          isOpen={isBatchImportOpen}
          onClose={() => setIsBatchImportOpen(false)}
          onImport={handleBatchImport}
          projectName={project.name}
        />
      )}

      {/* Edit Project Modal */}
      {isEditProjectOpen && (
        <ProjectModal
          isOpen={isEditProjectOpen}
          onClose={() => setIsEditProjectOpen(false)}
          onSave={handleUpdateProject}
          project={project}
        />
      )}

      {/* Household Delete Confirmation Modal */}
      {householdToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xác nhận xóa hộ dân</h3>
                  <p className="text-xs text-slate-500">Gỡ hộ dân khỏi dự án GPMB này</p>
                </div>
              </div>
              <button
                onClick={() => setHouseholdToDelete(null)}
                disabled={isDeletingHousehold}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Họ và tên chủ hộ:</span>
                <span className="font-bold text-slate-900">{householdToDelete.ownerName}</span>
              </div>
              {householdToDelete.cccd && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">CCCD/CMND:</span>
                  <span className="font-mono text-slate-800">{householdToDelete.cccd}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Thửa đất / Tờ BĐ:</span>
                <span className="text-slate-800">
                  Thửa {householdToDelete.parcel || '-'} / Tờ {householdToDelete.mapSheet || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-1.5">
                <span className="text-slate-500">Kinh phí bồi thường:</span>
                <span className="font-bold text-indigo-700">
                  {Number(householdToDelete.compensationAmount || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-5 leading-relaxed">
              ⚠️ <strong>Lưu ý:</strong> Dữ liệu kiểm đếm, kinh phí bồi thường và trạng thái bàn giao của hộ dân này sẽ bị xóa khỏi danh sách dự án.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingHousehold}
                onClick={() => setHouseholdToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingHousehold}
                onClick={handleConfirmDeleteHousehold}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingHousehold ? (
                  <span>Đang xóa...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click GPMB Documents Generator Modal */}
      {docHousehold && (
        <GpmbDocumentsModal
          isOpen={Boolean(docHousehold)}
          onClose={() => setDocHousehold(null)}
          household={docHousehold}
          project={project}
        />
      )}
    </div>
  );
};
