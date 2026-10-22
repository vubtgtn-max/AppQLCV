import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  FileText,
  Scale,
  Hammer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Edit,
  Trash2,
  MapPin,
  User,
  DollarSign,
  BarChart3,
  Layers,
  Building,
  Camera,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MoreVertical,
  Paperclip,
  Upload,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { LandViolationCase, ViolationStatus, ViolationType } from '../types';
import { apiService } from '../services/api';
import { localVault } from '../services/localVault';
import { ViolationFormModal } from '../components/violations/ViolationFormModal';
import { ViolationDetailModal } from '../components/violations/ViolationDetailModal';
import { ViolationProcessModal } from '../components/violations/ViolationProcessModal';
import { ViolationPrintModal } from '../components/violations/ViolationPrintModal';
import { ViolationReportsView } from '../components/violations/ViolationReportsView';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const ViolationsPage: React.FC = () => {
  const { violations, refreshData } = useRealtime();
  const { canModifyRecord } = useAuth();

  // Navigation sub-tabs
  const [subTab, setSubTab] = useState<'cases' | 'enforcements' | 'reports'>('cases');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [chartStatusFilter, setChartStatusFilter] = useState<'all' | 'resolved' | 'in_progress' | 'pending'>('all');
  const [isChartVisible, setIsChartVisible] = useState<boolean>(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [violationToEdit, setViolationToEdit] = useState<LandViolationCase | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<LandViolationCase | null>(null);
  const [activeMenuViolationId, setActiveMenuViolationId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuViolationId(null);
    if (activeMenuViolationId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuViolationId]);

  useEffect(() => {
    if (selectedViolation) {
      const latest = (violations || []).find((v) => v.id === selectedViolation.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedViolation)) {
        setSelectedViolation(latest);
      }
    }
  }, [violations, selectedViolation]);

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processViolation, setProcessViolation] = useState<LandViolationCase | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printViolation, setPrintViolation] = useState<LandViolationCase | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    violation: LandViolationCase | null;
  }>({
    isOpen: false,
    violation: null,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const list = violations || [];
    const totalCases = list.length;
    const inProgressCases = list.filter(
      (v) =>
        v.status === 'detected' ||
        v.status === 'minute_issued' ||
        v.status === 'sanction_decided' ||
        v.status === 'forwarded_to_district'
    ).length;
    const enforcementPending = list.filter((v) => v.status === 'enforcement_pending').length;
    const resolvedCases = list.filter((v) => v.status === 'resolved' || v.status === 'enforced').length;

    const totalFines = list.reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);
    const collectedFines = list
      .filter((v) => v.finePaymentStatus === 'paid')
      .reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);

    return {
      totalCases,
      inProgressCases,
      enforcementPending,
      resolvedCases,
      totalFines,
      collectedFines,
    };
  }, [violations]);

  // Unique locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    (violations || []).forEach((v) => {
      if (v.location) set.add(v.location.split(',')[0].trim());
    });
    return Array.from(set);
  }, [violations]);

  // 3 Process status groups for Recharts Pie Chart
  const pieChartData = useMemo(() => {
    const list = violations || [];
    let resolved = 0;
    let inProgress = 0;
    let pending = 0;

    let resolvedFine = 0;
    let inProgressFine = 0;
    let pendingFine = 0;

    list.forEach((v) => {
      const fine = Number(v.fineAmount) || 0;
      if (v.status === 'resolved' || v.status === 'enforced') {
        resolved++;
        resolvedFine += fine;
      } else if (v.status === 'detected') {
        pending++;
        pendingFine += fine;
      } else {
        inProgress++;
        inProgressFine += fine;
      }
    });

    const total = list.length;
    return [
      {
        name: 'Đã xử lý',
        key: 'resolved',
        value: resolved,
        totalFine: resolvedFine,
        percentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
        color: '#10b981', // Emerald
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        badgeColor: 'bg-emerald-600',
        description: 'Đã thi hành xong quyết định, nộp phạt Kho bạc & khôi phục nguyên trạng',
      },
      {
        name: 'Đang xử lý',
        key: 'in_progress',
        value: inProgress,
        totalFine: inProgressFine,
        percentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
        color: '#f59e0b', // Amber
        bgColor: 'bg-amber-50 dark:bg-amber-950/40',
        textColor: 'text-amber-700 dark:text-amber-400',
        borderColor: 'border-amber-200 dark:border-amber-800',
        badgeColor: 'bg-amber-600',
        description: 'Đã lập BB VPHC / Đã ban hành QĐ xử phạt / Đang đôn đốc hoặc chuẩn bị cưỡng chế',
      },
      {
        name: 'Chưa xử lý',
        key: 'pending',
        value: pending,
        totalFine: pendingFine,
        percentage: total > 0 ? Math.round((pending / total) * 100) : 0,
        color: '#ef4444', // Rose
        bgColor: 'bg-rose-50 dark:bg-rose-950/40',
        textColor: 'text-rose-700 dark:text-rose-400',
        borderColor: 'border-rose-200 dark:border-rose-800',
        badgeColor: 'bg-rose-600',
        description: 'Mới phát hiện vi phạm, đang kiểm tra hiện trường & xác minh đối tượng',
      },
    ];
  }, [violations]);

  // Filtered cases
  const filteredViolations = useMemo(() => {
    return (violations || []).filter((v) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        v.code?.toLowerCase().includes(q) ||
        v.title?.toLowerCase().includes(q) ||
        v.violatorName?.toLowerCase().includes(q) ||
        v.location?.toLowerCase().includes(q) ||
        v.minuteNumber?.toLowerCase().includes(q) ||
        v.sanctionDecisionNumber?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchType = typeFilter === 'all' || v.violationType === typeFilter;
      const matchSeverity = severityFilter === 'all' || v.severity === severityFilter;
      const matchLocation = locationFilter === 'all' || v.location.includes(locationFilter);

      let matchChart = true;
      if (chartStatusFilter === 'resolved') {
        matchChart = v.status === 'resolved' || v.status === 'enforced';
      } else if (chartStatusFilter === 'in_progress') {
        matchChart =
          v.status === 'minute_issued' ||
          v.status === 'sanction_decided' ||
          v.status === 'enforcement_pending' ||
          v.status === 'forwarded_to_district';
      } else if (chartStatusFilter === 'pending') {
        matchChart = v.status === 'detected';
      }

      return matchSearch && matchStatus && matchType && matchSeverity && matchLocation && matchChart;
    });
  }, [violations, searchTerm, statusFilter, typeFilter, severityFilter, locationFilter, chartStatusFilter]);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.violation) return;
    const target = confirmDelete.violation;
    if (!canModifyRecord(target)) {
      alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý hồ sơ vi phạm này mới có quyền xóa.');
      setConfirmDelete({ isOpen: false, violation: null });
      return;
    }
    try {
      await apiService.deleteViolation(target.id);
      try {
        await localVault.deleteLocalViolation(target.id, target.code);
      } catch (_) {}
      if (selectedViolation?.id === target.id) {
        setIsDetailModalOpen(false);
        setSelectedViolation(null);
      }
      refreshData();
    } catch (err: any) {
      console.error('Delete violation error:', err);
      alert('Không thể xóa hồ sơ vi phạm: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setConfirmDelete({ isOpen: false, violation: null });
    }
  };

  const getStatusBadge = (status: ViolationStatus) => {
    switch (status) {
      case 'detected':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            Mới phát hiện
          </span>
        );
      case 'minute_issued':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            Đã lập BB VPHC
          </span>
        );
      case 'sanction_decided':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
            Đã ra QĐ xử phạt
          </span>
        );
      case 'enforcement_pending':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Chờ cưỡng chế
          </span>
        );
      case 'enforced':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
            Đã cưỡng chế
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã chấp hành xong
          </span>
        );
      case 'forwarded_to_district':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            Chuyển huyện
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeName = (type: ViolationType) => {
    switch (type) {
      case 'illegal_construction':
        return 'Xây dựng trái phép';
      case 'encroachment':
        return 'Lấn chiếm đất công/HLAT';
      case 'unauthorized_land_use_change':
        return 'Tự ý chuyển mục đích đất';
      case 'land_destruction':
        return 'Hủy hoại/hạ thấp đất';
      case 'obstacle_creation':
        return 'Cản trở lối đi chung';
      default:
        return 'Vi phạm khác';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                TRẬT TỰ XÂY DỰNG & VI PHẠM ĐẤT ĐAI
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                Xử phạt VPHC & Cưỡng chế
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kiểm tra, lập biên bản VPHC, ban hành quyết định xử phạt, đôn đốc khắc phục hậu quả và cưỡng chế cấp xã
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isChartVisible
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-slate-700'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ phân tích'}</span>
          </button>

          <button
            onClick={() => {
              setViolationToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Lập hồ sơ vi phạm
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Tổng số vụ vi phạm</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
            {stats.totalCases} <span className="text-xs font-normal text-slate-400">vụ việc</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Đang xử lý: <b className="text-amber-600">{stats.inProgressCases} vụ</b>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Quá hạn / Chờ cưỡng chế</span>
            <Hammer className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
            {stats.enforcementPending} <span className="text-xs font-normal text-slate-400">vụ việc</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Cần ban hành QĐ cưỡng chế giải tỏa
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Tổng tiền phạt đã ra QĐ</span>
            <Scale className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
            {stats.totalFines.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-400">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Đã thu Kho bạc: <b className="text-emerald-600">{stats.collectedFines.toLocaleString('vi-VN')} đ</b>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Đã chấp hành xong</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.resolvedCases} <span className="text-xs font-normal text-slate-400">vụ</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Đã nộp phạt & khôi phục nguyên trạng
          </div>
        </div>
      </div>

      {/* Recharts Pie Chart Executive Overview Panel */}
      {isChartVisible && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/30 dark:from-rose-950/20 dark:via-slate-900 dark:to-amber-950/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
                Biểu đồ phân tích tình trạng xử lý vi phạm
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Tổng {stats.totalCases} vụ việc
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Phân bổ cơ cấu theo 3 nhóm: Đã xử lý xong • Đang giải quyết • Mới phát hiện (Chưa xử lý)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {chartStatusFilter !== 'all' && (
              <button
                onClick={() => setChartStatusFilter('all')}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                title="Hủy lọc biểu đồ"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Xem tất cả</span>
              </button>
            )}
            <button
              onClick={() => setIsChartVisible(!isChartVisible)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              {isChartVisible ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thu gọn</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mở rộng biểu đồ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isChartVisible && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left: Recharts Donut Pie Chart */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div className="w-full h-52 sm:h-56 relative flex items-center justify-center">
                {stats.totalCases === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Chưa có hồ sơ vi phạm trên địa bàn
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          cursor="pointer"
                          onClick={(entry: any) => {
                            const targetKey = entry?.payload?.key || entry?.key;
                            if (targetKey) {
                              setChartStatusFilter((prev) => (prev === targetKey ? 'all' : targetKey));
                            }
                          }}
                        >
                          {pieChartData.map((entry) => (
                            <Cell
                              key={`cell-${entry.key}`}
                              fill={entry.color}
                              stroke={chartStatusFilter === entry.key ? '#0f172a' : '#ffffff'}
                              strokeWidth={chartStatusFilter === entry.key ? 2.5 : 1.5}
                              className="transition-all duration-200 hover:opacity-85"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-slate-700 max-w-[240px]">
                                  <div className="flex items-center gap-1.5 font-bold mb-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.name}</span>
                                    <span className="ml-auto text-amber-300">
                                      {item.value} vụ ({item.percentage}%)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-300 leading-tight">
                                    {item.description}
                                  </div>
                                  {item.totalFine > 0 && (
                                    <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-emerald-400 font-medium">
                                      Tiền phạt: {item.totalFine.toLocaleString('vi-VN')} đ
                                    </div>
                                  )}
                                  <div className="mt-1 text-[9px] text-slate-400 italic">
                                    * Nhấp vào lát biểu đồ để lọc danh sách
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Donut Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Đã xử lý
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                        {pieChartData[0]?.percentage || 0}%
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {pieChartData[0]?.value || 0}/{stats.totalCases} vụ
                      </span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center italic mt-1">
                Gợi ý: Nhấp vào từng phần biểu đồ tròn để tự động lọc nhanh danh sách vụ việc
              </p>
            </div>

            {/* Right: 3 Status Progress Detail Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {pieChartData.map((item) => {
                const isSelected = chartStatusFilter === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      setChartStatusFilter((prev) => (prev === item.key ? 'all' : (item.key as any)));
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      item.bgColor
                    } ${
                      isSelected
                        ? 'ring-2 ring-offset-1 ring-slate-800 dark:ring-white border-transparent shadow-sm'
                        : `${item.borderColor} hover:shadow-xs`
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className={`text-xs font-bold ${item.textColor}`}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300">
                          {item.percentage}%
                        </span>
                      </div>

                      <div className="text-xl font-black text-slate-800 dark:text-white mb-1">
                        {item.value} <span className="text-xs font-medium text-slate-500">vụ</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>

                      <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-500">
                        {item.totalFine > 0 ? `${(item.totalFine / 1000000).toFixed(1)} tr đ` : 'Chưa có tiền phạt'}
                      </span>
                      <span className={`text-[10px] font-bold ${isSelected ? 'underline' : ''}`}>
                        {isSelected ? 'Đang lọc ✓' : 'Lọc mục này →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active chart filter banner */}
        {chartStatusFilter !== 'all' && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-400">Đang lọc theo biểu đồ:</span>
              <span
                className="font-bold px-2 py-0.5 rounded-md text-white text-[11px]"
                style={{
                  backgroundColor:
                    chartStatusFilter === 'resolved'
                      ? '#10b981'
                      : chartStatusFilter === 'in_progress'
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              >
                {chartStatusFilter === 'resolved'
                  ? 'Đã xử lý'
                  : chartStatusFilter === 'in_progress'
                  ? 'Đang xử lý'
                  : 'Chưa xử lý'}
              </span>
              <span className="text-slate-500">({filteredViolations.length} vụ việc hiển thị)</span>
            </div>
            <button
              onClick={() => setChartStatusFilter('all')}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Bỏ lọc (Xem tất cả)
            </button>
          </div>
        )}
      </div>
      )}

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setSubTab('cases')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'cases'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Danh sách vụ việc vi phạm ({violations?.length || 0})
        </button>
        <button
          onClick={() => setSubTab('enforcements')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'enforcements'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Hammer className="w-3.5 h-3.5" /> Hồ sơ cưỡng chế giải tỏa ({stats.enforcementPending})
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'reports'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-rose-600" /> Báo cáo định kỳ vi phạm & xử phạt (Tuần • Tháng • Quý • 6T • 9T • Năm)
        </button>
      </div>

      {subTab === 'cases' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã vụ, đối tượng vi phạm, vị trí, số BB, số QĐ xử phạt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả tiến trình</option>
                <option value="detected">Mới phát hiện</option>
                <option value="minute_issued">Đã lập BB VPHC</option>
                <option value="sanction_decided">Đã ra QĐ xử phạt</option>
                <option value="enforcement_pending">Chờ cưỡng chế</option>
                <option value="enforced">Đã cưỡng chế</option>
                <option value="resolved">Đã chấp hành xong</option>
                <option value="forwarded_to_district">Chuyển huyện</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả hành vi</option>
                <option value="illegal_construction">Xây dựng trái phép</option>
                <option value="encroachment">Lấn chiếm đất/HLAT</option>
                <option value="unauthorized_land_use_change">Chuyển mục đích trái phép</option>
                <option value="land_destruction">Hủy hoại/hạ thấp đất</option>
                <option value="obstacle_creation">Cản trở lối đi</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả địa bàn</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Mã Vụ</th>
                    <th className="px-3.5 py-2.5">Đối Tượng Vi Phạm</th>
                    <th className="px-3.5 py-2.5">Vị Trí & Diện Tích</th>
                    <th className="px-3.5 py-2.5">Hành Vi Vi Phạm</th>
                    <th className="px-3.5 py-2.5">Hồ Sơ BB / QĐ</th>
                    <th className="px-3.5 py-2.5 text-right">Tiền Phạt</th>
                    <th className="px-3.5 py-2.5">Tiến Trình Xử Lý</th>
                    <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredViolations.length > 0 ? (
                    filteredViolations.map((v, idx) => (
                      <tr
                        key={`${v.id || 'violation'}-${v.code || idx}-${idx}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-3.5 py-3 font-mono">
                          <div className="font-bold text-rose-600 dark:text-rose-400">{v.code}</div>
                          {((v.attachments?.length || 0) + (v.evidences?.length || 0)) > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedViolation(v);
                                setIsDetailModalOpen(true);
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold hover:bg-blue-100 cursor-pointer transition-colors"
                              title="Xem tệp scan / ảnh hiện trường đính kèm"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              {(v.attachments?.length || 0) + (v.evidences?.length || 0)} tệp
                            </button>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{v.violatorName}</span>
                          <span className="text-[11px] text-slate-400">{v.violatorPhone || v.violatorAddress}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block">{v.location}</span>
                          <span className="text-[11px] text-slate-400">
                            {v.violatedArea ? `DT: ${Number(v.violatedArea).toLocaleString('vi-VN')} m²` : ''} {v.parcel ? `(Thửa ${v.parcel})` : ''}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] block max-w-fit mb-0.5">
                            {getTypeName(v.violationType)}
                          </span>
                          <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]" title={v.violationDescription}>
                            {v.violationDescription}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-[11px]">
                          {v.sanctionDecisionNumber ? (
                            <span className="font-mono font-semibold text-purple-600 dark:text-purple-400 block">
                              {v.sanctionDecisionNumber}
                            </span>
                          ) : v.minuteNumber ? (
                            <span className="font-mono text-blue-600 dark:text-blue-400 block">
                              {v.minuteNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Đang lập BB</span>
                          )}
                          <span className="text-[10px] text-slate-400">{v.discoveryDate}</span>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="font-bold text-rose-600 dark:text-rose-400">
                            {v.fineAmount ? `${v.fineAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                          </div>
                          <span className={`text-[10px] ${v.finePaymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {v.finePaymentStatus === 'paid' ? 'Đã nộp KB' : 'Chưa nộp'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          {getStatusBadge(v.status)}
                        </td>
                        <td className="px-3.5 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedViolation(v);
                                setIsDetailModalOpen(true);
                              }}
                              title="Xem chi tiết & Tệp đính kèm"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedViolation(v);
                                setIsDetailModalOpen(true);
                              }}
                              title="Tải tệp lên / Ảnh hiện trường"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPrintViolation(v);
                                setIsPrintModalOpen(true);
                              }}
                              title="In biên bản / Quyết định"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {canModifyRecord(v) ? (
                              <>
                                <button
                                  onClick={() => {
                                    setViolationToEdit(v);
                                    setIsFormModalOpen(true);
                                  }}
                                  title="Sửa thông tin"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* 3-dot Secondary Menu */}
                                <div className="relative inline-block text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuViolationId(activeMenuViolationId === v.id ? null : v.id);
                                    }}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      activeMenuViolationId === v.id
                                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                                        : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                                    }`}
                                    title="Thao tác khác"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {activeMenuViolationId === v.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                    >
                                      <button
                                        onClick={() => {
                                          setActiveMenuViolationId(null);
                                          setProcessViolation(v);
                                          setIsProcessModalOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Scale className="w-3.5 h-3.5 text-rose-600" />
                                        Cập nhật tiến trình & QĐ xử phạt
                                      </button>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <button
                                        onClick={() => {
                                          setActiveMenuViolationId(null);
                                          setConfirmDelete({ isOpen: true, violation: v });
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        Xóa vụ việc vi phạm
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none"
                                title="Hồ sơ của cán bộ khác (Chỉ xem)"
                              >
                                Chỉ xem
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Không tìm thấy hồ sơ vi phạm nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'enforcements' && (
        <div className="space-y-3">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Hồ Sơ Cưỡng Chế Tháo Dỡ Công Trình Vi Phạm & Buộc Khôi Phục Hiện Trạng
                </h3>
                <p className="text-[11px] text-rose-700 dark:text-rose-400">
                  Các trường hợp đối tượng cố tình không tự giác chấp hành Quyết định xử phạt VPHC quá thời hạn luật định
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Mã Vụ</th>
                    <th className="px-3.5 py-2.5">Đối Tượng & Vị Trí</th>
                    <th className="px-3.5 py-2.5">Hành Vi Vi Phạm</th>
                    <th className="px-3.5 py-2.5">Biện Pháp Buộc Khắc Phục</th>
                    <th className="px-3.5 py-2.5">QĐ Cưỡng Chế & Ngày Dự Kiến</th>
                    <th className="px-3.5 py-2.5">Trạng Thái</th>
                    <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(violations || []).filter(
                    (v) => v.status === 'enforcement_pending' || v.status === 'enforced' || v.enforcementDecisionNumber
                  ).length > 0 ? (
                    (violations || [])
                      .filter(
                        (v) => v.status === 'enforcement_pending' || v.status === 'enforced' || v.enforcementDecisionNumber
                      )
                      .map((v, idx) => (
                        <tr
                          key={`${v.id || 'enf'}-${v.code || idx}-${idx}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-3.5 py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                            {v.code}
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="font-bold text-slate-800 dark:text-white block">{v.violatorName}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{v.location}</span>
                          </td>
                          <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 max-w-[220px]">
                            {v.violationDescription}
                          </td>
                          <td className="px-3.5 py-3 font-semibold text-rose-600 dark:text-rose-400 max-w-[220px]">
                            {v.remedialMeasure || '---'}
                          </td>
                          <td className="px-3.5 py-3">
                            {v.enforcementDecisionNumber ? (
                              <span className="font-mono font-semibold text-blue-600 block">
                                {v.enforcementDecisionNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic block">Chưa ban hành QĐ</span>
                            )}
                            {v.enforcementPlanDate && (
                              <span className="text-[11px] font-bold text-rose-600">
                                Dự kiến: {v.enforcementPlanDate}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3">{getStatusBadge(v.status)}</td>
                          <td className="px-3.5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedViolation(v);
                                  setIsDetailModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                Xem hồ sơ
                              </button>
                              {canModifyRecord(v) && (
                                <button
                                  onClick={() => {
                                    setProcessViolation(v);
                                    setIsProcessModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                                >
                                  Cập nhật cưỡng chế
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Chưa có hồ sơ cưỡng chế nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'reports' && (
        <ViolationReportsView
          violations={violations || []}
          onSelectViolation={(v) => {
            setSelectedViolation(v);
            setIsDetailModalOpen(true);
          }}
          onProcessViolation={(v) => {
            if (!canModifyRecord(v)) {
              alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý hồ sơ vi phạm này mới có quyền cập nhật.');
              return;
            }
            setProcessViolation(v);
            setIsProcessModalOpen(true);
          }}
          onPrintViolation={(v) => {
            setPrintViolation(v);
            setIsPrintModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <ViolationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        violationToEdit={violationToEdit}
        onSuccess={() => {
          setIsFormModalOpen(false);
          refreshData();
        }}
      />

      <ViolationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        violation={selectedViolation}
        onOpenEdit={(v) => {
          if (!canModifyRecord(v)) {
            alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý hồ sơ vi phạm này mới có quyền chỉnh sửa.');
            return;
          }
          setViolationToEdit(v);
          setIsFormModalOpen(true);
        }}
        onOpenProcess={(v) => {
          if (!canModifyRecord(v)) {
            alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý hồ sơ vi phạm này mới có quyền cập nhật tiến trình.');
            return;
          }
          setProcessViolation(v);
          setIsProcessModalOpen(true);
        }}
        onOpenPrint={(v) => {
          setPrintViolation(v);
          setIsPrintModalOpen(true);
        }}
        onReload={refreshData}
      />

      <ViolationProcessModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        violation={processViolation}
        onSuccess={() => {
          setIsProcessModalOpen(false);
          refreshData();
        }}
      />

      <ViolationPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        violation={printViolation}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Xóa Hồ Sơ Vi Phạm"
        message={`Bạn có chắc chắn muốn xóa hồ sơ vi phạm [${confirmDelete.violation?.code}] của đối tượng "${confirmDelete.violation?.violatorName}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa hồ sơ"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete({ isOpen: false, violation: null })}
      />
    </div>
  );
};
