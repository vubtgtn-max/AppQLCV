import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  ChevronRight,
  User,
  MapPin,
  Trash2,
  Edit,
  ArrowUpDown,
  BarChart3,
  List,
  PieChart as PieChartIcon,
  ChevronUp,
  RotateCcw,
  MoreVertical,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { DisputeCase, DisputeType, DisputeStatus } from '../types';
import { apiService } from '../services/api';
import { DisputeDetailModal } from '../components/disputes/DisputeDetailModal';
import { DisputeFormModal } from '../components/disputes/DisputeFormModal';
import { PrintDisputeDocModal } from '../components/disputes/PrintDisputeDocModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DisputeReportsView } from '../components/disputes/DisputeReportsView';
import { formatDate } from '../utils/date';
import { localVault } from '../services/localVault';

export const DisputesPage: React.FC = () => {
  const { disputes, refreshData } = useRealtime();
  const { canModifyRecord } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Analytics Chart Toggle & Filter
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [chartDisputeStatusFilter, setChartDisputeStatusFilter] = useState<string>('all');

  // Main Page Tabs: 'cases' (danh sách vụ việc) | 'reports' (báo cáo định kỳ tuần/tháng/quý/6T/9T/năm)
  const [pageTab, setPageTab] = useState<'cases' | 'reports'>('cases');

  // Modal states
  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [disputeToEdit, setDisputeToEdit] = useState<DisputeCase | null>(null);
  const [activeMenuDisputeId, setActiveMenuDisputeId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuDisputeId(null);
    if (activeMenuDisputeId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuDisputeId]);

  useEffect(() => {
    if (selectedDispute) {
      const latest = (disputes || []).find((d) => d.id === selectedDispute.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedDispute)) {
        setSelectedDispute(latest);
      }
    }
  }, [disputes, selectedDispute]);

  // Print modal state
  const [disputeToPrint, setDisputeToPrint] = useState<DisputeCase | null>(null);
  const [printDocType, setPrintDocType] = useState<
    'verification_minute' | 'examination_report' | 'invitation' | 'mediation_minute' | 'field_evidence'
  >('examination_report');

  // Delete modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    dispute: DisputeCase | null;
  }>({
    isOpen: false,
    dispute: null,
  });

  // Calculate KPIs
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const stats = useMemo(() => {
    const list = disputes || [];
    const total = list.length;
    const verifying = list.filter((d) => d.status === 'received' || d.status === 'verifying').length;
    const verified = list.filter((d) => d.status === 'verified').length;
    const reported = list.filter((d) => d.status === 'reported' || d.status === 'scheduled').length;
    const resolvedSuccess = list.filter((d) => d.status === 'resolved_success').length;
    const resolvedFailure = list.filter((d) => d.status === 'resolved_failure').length;

    const overdueCount = list.filter((d) => {
      if (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn') return false;
      if (!d.deadlineDate) return false;
      const due = new Date(d.deadlineDate);
      if (isNaN(due.getTime())) return false;
      due.setHours(0, 0, 0, 0);
      return due.getTime() < today.getTime();
    }).length;

    const upcomingCount = list.filter((d) => {
      if (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn') return false;
      if (!d.deadlineDate) return false;
      const due = new Date(d.deadlineDate);
      if (isNaN(due.getTime())) return false;
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    const totalFinished = resolvedSuccess + resolvedFailure;
    const successRate = totalFinished > 0 ? Math.round((resolvedSuccess / totalFinished) * 100) : 100;

    return {
      total,
      verifying,
      verified,
      reported,
      resolvedSuccess,
      resolvedFailure,
      overdueCount,
      upcomingCount,
      successRate,
    };
  }, [disputes, today]);

  // Disputes Chart Data calculations
  const disputeChartData = useMemo(() => {
    const list = disputes || [];
    let resolvedSuccess = 0;
    let resolvedFailure = 0;
    let inProgress = 0;
    let scheduled = 0;

    const typeCounts: Record<string, number> = {};
    const villageCounts: Record<string, number> = {};

    const typeNames: Record<string, string> = {
      boundary: 'Ranh giới thửa đất',
      inheritance: 'Thừa kế QSD đất',
      pathway: 'Lối đi chung / Ngõ đi',
      overlapping: 'Chồng lấn ranh GCN',
      transfer: 'Hợp đồng chuyển nhượng',
      encroachment: 'Lấn chiếm đất đai',
      other: 'Tranh chấp khác',
    };

    list.forEach((d) => {
      if (d.status === 'resolved_success') resolvedSuccess++;
      else if (d.status === 'resolved_failure') resolvedFailure++;
      else if (d.status === 'scheduled' || d.status === 'reported') scheduled++;
      else if (d.status !== 'withdrawn') inProgress++;

      const tKey = d.disputeType || 'other';
      const tName = typeNames[tKey] || tKey;
      typeCounts[tName] = (typeCounts[tName] || 0) + 1;

      const loc = d.location ? d.location.split(',')[0].trim() : 'Chưa phân thôn';
      villageCounts[loc] = (villageCounts[loc] || 0) + 1;
    });

    const pieData = [
      {
        key: 'resolved_success',
        name: 'Hòa giải thành',
        value: resolvedSuccess,
        color: '#10b981',
      },
      {
        key: 'resolved_failure',
        name: 'Hòa giải không thành',
        value: resolvedFailure,
        color: '#ef4444',
      },
      {
        key: 'scheduled',
        name: 'Sẵn sàng mở phiên hòa giải',
        value: scheduled,
        color: '#f59e0b',
      },
      {
        key: 'in_progress',
        name: 'Đang xác minh thực địa',
        value: inProgress,
        color: '#3b82f6',
      },
    ].filter((i) => i.value > 0);

    const barTypeData = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const barVillageData = Object.entries(villageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: list.length,
      pieData,
      barTypeData,
      barVillageData,
    };
  }, [disputes]);

  // Unique locations for filter
  const locations = useMemo(() => {
    const set = new Set<string>();
    (disputes || []).forEach((d) => {
      if (d.location) set.add(d.location);
    });
    return Array.from(set);
  }, [disputes]);

  // Filtered List
  const filteredDisputes = useMemo(() => {
    return (disputes || []).filter((d) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(query);
        const matchCode = d.code.toLowerCase().includes(query);
        const matchA = d.partyA.name.toLowerCase().includes(query);
        const matchB = d.partyB.name.toLowerCase().includes(query);
        const matchParcel = d.parcel.toLowerCase().includes(query);
        const matchSheet = d.mapSheet.toLowerCase().includes(query);
        const matchLoc = d.location.toLowerCase().includes(query);
        if (!matchTitle && !matchCode && !matchA && !matchB && !matchParcel && !matchSheet && !matchLoc) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn') return false;
        } else if (d.status !== statusFilter) {
          return false;
        }
      }

      // Chart status filter
      if (chartDisputeStatusFilter !== 'all') {
        if (chartDisputeStatusFilter === 'in_progress') {
          if (d.status !== 'received' && d.status !== 'verifying' && d.status !== 'verified') return false;
        } else if (chartDisputeStatusFilter === 'scheduled') {
          if (d.status !== 'scheduled' && d.status !== 'reported') return false;
        } else if (d.status !== chartDisputeStatusFilter) {
          return false;
        }
      }

      // Type
      if (typeFilter !== 'all' && d.disputeType !== typeFilter) {
        return false;
      }

      // Location
      if (locationFilter !== 'all' && d.location !== locationFilter) {
        return false;
      }

      // Urgency / Deadline
      if (urgencyFilter !== 'all') {
        if (!d.deadlineDate) return false;
        const due = new Date(d.deadlineDate);
        if (isNaN(due.getTime())) return false;
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (urgencyFilter === 'overdue') {
          if (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn') return false;
          if (diffDays >= 0) return false;
        } else if (urgencyFilter === 'upcoming_7') {
          if (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn') return false;
          if (diffDays < 0 || diffDays > 7) return false;
        }
      }

      return true;
    });
  }, [disputes, searchTerm, statusFilter, typeFilter, locationFilter, urgencyFilter, chartDisputeStatusFilter, today]);

  // Handle Delete
  const handleDeleteDispute = async () => {
    if (!deleteConfirm.dispute) return;
    const target = deleteConfirm.dispute;
    if (!canModifyRecord(target)) {
      alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý vụ việc này mới có quyền xóa.');
      setDeleteConfirm({ isOpen: false, dispute: null });
      return;
    }
    try {
      await apiService.deleteDispute(target.id);
      try {
        await localVault.deleteLocalDispute(target.id, target.code);
      } catch (_) {}
      await refreshData();
      setDeleteConfirm({ isOpen: false, dispute: null });
      if (selectedDispute?.id === target.id) {
        setIsDetailModalOpen(false);
        setSelectedDispute(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa vụ tranh chấp');
    }
  };

  // Helper status labels
  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case 'received':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-slate-700 border border-gray-200">1. Tiếp nhận đơn</span>;
      case 'verifying':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">2. Đang xác minh</span>;
      case 'verified':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">3. Đã có Biên bản xác minh</span>;
      case 'reported':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">4. Đã có Báo cáo thẩm tra</span>;
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">5. Đã mời hòa giải</span>;
      case 'resolved_success':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">✓ Hòa giải THÀNH</span>;
      case 'resolved_failure':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">✗ Hòa giải KHÔNG THÀNH</span>;
      case 'withdrawn':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-slate-500 border border-gray-200">Đình chỉ / Rút đơn</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: DisputeType) => {
    switch (type) {
      case 'boundary':
        return 'Ranh giới / Mốc giới';
      case 'encroachment':
        return 'Lấn, chiếm đất đai';
      case 'pathway':
        return 'Ngõ đi chung, thoát nước';
      case 'overlapping':
        return 'Chồng lấn ranh GCN';
      case 'inheritance':
        return 'Thừa kế QSDĐ';
      case 'transfer':
        return 'Chuyển nhượng viết tay';
      default:
        return 'Tranh chấp khác';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Page Title - White Background */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tranh chấp & Hòa giải đất đai
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  Luật Đất đai 2024
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thụ lý, lập Biên bản xác minh hiện trạng, tự động kết xuất Báo cáo thẩm tra và tổ chức phiên hòa giải cấp xã
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs transition-all cursor-pointer ${
              isChartVisible
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title="Bật/Tắt Biểu đồ phân tích tranh chấp"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ phân tích'}</span>
          </button>

          <button
            onClick={() => {
              setDisputeToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Thụ lý vụ tranh chấp mới</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
        <button
          onClick={() => setPageTab('cases')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pageTab === 'cases'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200/60'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Danh sách vụ việc & Thụ lý</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              pageTab === 'cases' ? 'bg-blue-50 text-blue-700' : 'bg-gray-200 text-slate-600'
            }`}
          >
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setPageTab('reports')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pageTab === 'reports'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200/60'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600" />
          <span>Báo cáo kết quả xử lý đơn định kỳ</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold hidden sm:inline-block">
            Tuần • Tháng • Quý • 6T • 9T • Năm
          </span>
        </button>
      </div>

      {pageTab === 'reports' ? (
        <DisputeReportsView
          disputes={disputes || []}
          onSelectDispute={(d) => {
            setSelectedDispute(d);
            setIsDetailModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* KPI Stats Grid - Clean White Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng vụ thụ lý</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Đang giải quyết: <span className="text-amber-600 font-bold">{stats.total - (stats.resolvedSuccess + stats.resolvedFailure)}</span>
          </p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã có BB xác minh</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 mt-2">{stats.verified}</p>
          <p className="text-[11px] text-slate-500 mt-1">Đã đo đạc thực địa tứ cận</p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã lập Báo cáo thẩm tra</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-purple-600 mt-2">{stats.reported}</p>
          <p className="text-[11px] text-slate-500 mt-1">Sẵn sàng mở phiên hòa giải</p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hòa giải thành</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{stats.resolvedSuccess}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Tỷ lệ thành công: <span className="font-bold text-emerald-700">{stats.successRate}%</span>
          </p>
        </div>

        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'overdue' ? 'all' : 'overdue')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            stats.overdueCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-50'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cảnh báo hạn (30 ngày)</span>
            <div className={`p-1.5 rounded-lg ${stats.overdueCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-gray-100 text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-extrabold mt-2 ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {stats.overdueCount > 0 ? `${stats.overdueCount} vụ quá hạn` : 'Đúng tiến độ'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Sắp đến hạn (&le; 7 ngày): <span className="text-amber-600 font-bold">{stats.upcomingCount} vụ</span>
          </p>
        </div>
      </div>

      {/* Collapsible Executive Analytics Panel */}
      {isChartVisible && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  Phân tích Cơ cấu & Kết quả Hòa giải Đất đai
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Tổng {stats.total} Vụ việc
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tỷ lệ hòa giải thành, phân loại nguyên nhân tranh chấp và các địa bàn phát sinh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chartDisputeStatusFilter !== 'all' && (
                <button
                  onClick={() => setChartDisputeStatusFilter('all')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Xem tất cả vụ việc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc trạng thái</span>
                </button>
              )}
              <button
                onClick={() => setIsChartVisible(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Recharts Donut Pie Chart */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="w-full h-52 relative flex items-center justify-center">
                {disputeChartData.total === 0 ? (
                  <div className="text-xs text-slate-400">Chưa có vụ việc nào</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={disputeChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setChartDisputeStatusFilter((prev) => (prev === entry.key ? 'all' : entry.key));
                          }
                        }}
                      >
                        {disputeChartData.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={chartDisputeStatusFilter === entry.key ? '#b45309' : '#ffffff'}
                            strokeWidth={chartDisputeStatusFilter === entry.key ? 3 : 1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any, name: any) => [`${value} vụ việc`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {disputeChartData.total}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    Vụ việc
                  </span>
                </div>
              </div>

              {/* Mini Legend Buttons */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                {disputeChartData.pieData.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartDisputeStatusFilter((prev) => (prev === item.key ? 'all' : item.key))}
                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      chartDisputeStatusFilter === item.key
                        ? 'border-amber-500 ring-2 ring-amber-200 bg-white'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 ml-1">{item.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Middle: Dispute Types Breakdown (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  Nguyên nhân & Bản chất tranh chấp
                </span>
                <span className="text-[10px] text-slate-400">Số vụ</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={disputeChartData.barTypeData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      tickFormatter={(val) => (val.length > 15 ? val.slice(0, 15) + '...' : val)}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${val} vụ`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Tỷ lệ thành công: <b>{stats.successRate}%</b> (Hòa giải thành: <b>{stats.resolvedSuccess} vụ</b>)
              </div>
            </div>

            {/* Right: Village Distribution (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Địa bàn phát sinh tranh chấp
                </span>
                <span className="text-[10px] text-slate-400">Số vụ</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={disputeChartData.barVillageData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={95}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      tickFormatter={(val) => (val.length > 12 ? val.slice(0, 12) + '...' : val)}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${val} vụ`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Theo dõi điểm nóng để phối hợp Tổ hòa giải cơ sở hòa giải sớm từ đầu
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar - Clean White Background */}
      <div className="p-3.5 sm:p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên Bên A, Bên B, số thửa, tờ bản đồ, địa bàn, mã vụ việc..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 sm:bg-white border border-gray-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer shrink-0"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang giải quyết</option>
              <option value="received">Mới tiếp nhận</option>
              <option value="verifying">Đang xác minh thực địa</option>
              <option value="verified">Đã có Biên bản xác minh</option>
              <option value="reported">Đã lập Báo cáo thẩm tra</option>
              <option value="scheduled">Đã mời hòa giải</option>
              <option value="resolved_success">Hòa giải thành</option>
              <option value="resolved_failure">Hòa giải không thành</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer shrink-0"
            >
              <option value="all">Tất cả dạng tranh chấp</option>
              <option value="boundary">Ranh giới, mốc giới</option>
              <option value="encroachment">Lấn, chiếm đất đai</option>
              <option value="pathway">Ngõ đi, lối đi chung</option>
              <option value="overlapping">Chồng lấn ranh GCN</option>
              <option value="inheritance">Thừa kế</option>
              <option value="transfer">Chuyển nhượng viết tay</option>
            </select>

            {/* Location Filter */}
            {locations.length > 0 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer shrink-0"
              >
                <option value="all">Tất cả thôn/địa bàn</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            )}

            {/* Deadline Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer shrink-0"
            >
              <option value="all">Hạn xử lý (30 ngày)</option>
              <option value="overdue">Quá hạn giải quyết</option>
              <option value="upcoming_7">Sắp đến hạn (&le; 7 ngày)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Disputes List - Clean White Cards */}
      <div className="space-y-3.5">
        {filteredDisputes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 shadow-xs">
            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy hồ sơ tranh chấp đất đai nào</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Không có hồ sơ phù hợp với bộ lọc hiện tại hoặc chưa có vụ việc nào được ghi nhận.
            </p>
            <button
              onClick={() => {
                setDisputeToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tiếp nhận vụ việc mới</span>
            </button>
          </div>
        ) : (
          filteredDisputes.map((dispute) => {
            const due = dispute.deadlineDate ? new Date(dispute.deadlineDate) : null;
            const isValidDue = due && !isNaN(due.getTime());
            let diffDays = 0;
            if (isValidDue && due) {
              due.setHours(0, 0, 0, 0);
              diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
            const isFinished = dispute.status === 'resolved_success' || dispute.status === 'resolved_failure';

            return (
              <div
                key={dispute.id}
                className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md rounded-xl p-4 sm:p-5 transition-all shadow-xs space-y-3.5"
              >
                {/* Top Row: Code, Status, Type, Deadline */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {dispute.code}
                    </span>
                    {getStatusBadge(dispute.status)}
                    <span className="text-xs px-2.5 py-0.5 rounded bg-gray-100 text-slate-700 border border-gray-200">
                      {getTypeLabel(dispute.disputeType)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      Tiếp nhận: <span className="text-slate-700 font-medium">{formatDate(dispute.receivedDate)}</span>
                    </span>
                    {!isFinished && isValidDue && (
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-semibold ${
                          diffDays < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : diffDays <= 7
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-slate-600 border border-gray-200'
                        }`}
                      >
                        {diffDays < 0 ? `Quá hạn ${Math.abs(diffDays)} ngày` : `Còn ${diffDays} ngày (Hạn: ${formatDate(dispute.deadlineDate)})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dispute Title & Key Details */}
                <div
                  onClick={() => {
                    setSelectedDispute(dispute);
                    setIsDetailModalOpen(true);
                  }}
                  className="cursor-pointer group"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {dispute.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-4 flex-wrap">
                    <span>
                      <strong className="text-slate-700">Thửa đất số:</strong> {dispute.parcel || '...'} -{' '}
                      <strong className="text-slate-700">Tờ bản đồ:</strong> {dispute.mapSheet || '...'}
                    </span>
                    <span>
                      <strong className="text-slate-700">Địa chỉ:</strong> {dispute.location}
                    </span>
                    <span>
                      <strong className="text-amber-800">Diện tích tranh chấp:</strong>{' '}
                      <span className="font-bold text-amber-700">{dispute.disputedArea} m²</span> (Thửa: {dispute.area} m²)
                    </span>
                  </p>
                </div>

                {/* Parties Quick View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 text-xs">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-blue-700 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>Bên A (Yêu cầu): {dispute.partyA.name}</span>
                    </p>
                    <p className="text-slate-700 italic truncate" title={dispute.partyA.claim}>
                      &ldquo;{dispute.partyA.claim}&rdquo;
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      <span>Bên B (Bị khiếu nại): {dispute.partyB.name}</span>
                    </p>
                    <p className="text-slate-700 italic truncate" title={dispute.partyB.claim}>
                      &ldquo;{dispute.partyB.claim}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Workflow Progress Steps Indicator */}
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 flex-wrap">
                  <span className="font-semibold text-slate-700">Quy trình:</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      dispute.status !== 'received' ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold' : 'bg-gray-100 text-slate-600'
                    }`}
                  >
                    1. Tiếp nhận
                  </span>
                  <span>&rarr;</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      dispute.verificationMinute
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                        : 'bg-gray-100 text-slate-400'
                    }`}
                  >
                    2. Biên bản xác minh
                  </span>
                  <span>&rarr;</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      dispute.examinationReport
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                        : 'bg-gray-100 text-slate-400'
                    }`}
                  >
                    3. Báo cáo thẩm tra
                  </span>
                  <span>&rarr;</span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      dispute.status === 'resolved_success'
                        ? 'bg-emerald-600 text-white font-bold'
                        : dispute.status === 'resolved_failure'
                        ? 'bg-rose-600 text-white font-bold'
                        : dispute.mediationRecord?.meetingDate
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                        : 'bg-gray-100 text-slate-400'
                    }`}
                  >
                    4. Hòa giải
                  </span>
                </div>

                {/* Actions Bottom Bar */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">{dispute.handlerName}</span>
                    </span>
                    {dispute.assignedLeaderName && (
                      <span className="hidden sm:inline">
                        • Chỉ đạo: <strong className="text-slate-700">{dispute.assignedLeaderName}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick Button: In / Print */}
                    <button
                      onClick={() => {
                        setDisputeToPrint(dispute);
                        setPrintDocType(dispute.examinationReport ? 'examination_report' : 'verification_minute');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                      title="In / Xuất văn bản"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">In văn bản</span>
                    </button>

                    {canModifyRecord(dispute) ? (
                      <>
                        {/* Quick Button: Edit */}
                        <button
                          onClick={() => {
                            setDisputeToEdit(dispute);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* 3-dot Secondary Menu */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuDisputeId(activeMenuDisputeId === dispute.id ? null : dispute.id);
                            }}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              activeMenuDisputeId === dispute.id
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Thao tác khác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuDisputeId === dispute.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuDisputeId(null);
                                  setDisputeToPrint(dispute);
                                  setPrintDocType('verification_minute');
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-500" />
                                In biên bản xác minh hiện trạng
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuDisputeId(null);
                                  setDisputeToPrint(dispute);
                                  setPrintDocType('examination_report');
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-purple-500" />
                                In báo cáo thẩm tra nguồn gốc
                              </button>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                              <button
                                onClick={() => {
                                  setActiveMenuDisputeId(null);
                                  setDeleteConfirm({ isOpen: true, dispute });
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                Xóa vụ việc tranh chấp
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span
                        className="px-2 py-1 rounded-md bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none"
                        title="Vụ việc của cán bộ khác (Chỉ xem)"
                      >
                        Chỉ xem
                      </span>
                    )}

                    {/* Main CTA: View Full Dossier */}
                    <button
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <span>Xem hồ sơ & Thẩm tra</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* Modals */}
      {selectedDispute && (
        <DisputeDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onOpenEdit={(d) => {
            if (!canModifyRecord(d)) {
              alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý vụ việc này mới có quyền chỉnh sửa.');
              return;
            }
            setIsDetailModalOpen(false);
            setDisputeToEdit(d);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {isFormModalOpen && (
        <DisputeFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setDisputeToEdit(null);
          }}
          disputeToEdit={disputeToEdit}
          onSuccess={(saved) => {
            setSelectedDispute(saved);
            setIsDetailModalOpen(true);
          }}
        />
      )}

      {disputeToPrint && (
        <PrintDisputeDocModal
          isOpen={true}
          onClose={() => setDisputeToPrint(null)}
          dispute={disputeToPrint}
          docType={printDocType}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, dispute: null })}
        onConfirm={handleDeleteDispute}
        title="Xóa vụ việc tranh chấp đất đai"
        message={`Bạn có chắc chắn muốn xóa hồ sơ tranh chấp [${deleteConfirm.dispute?.code}] "${deleteConfirm.dispute?.title}"? Toàn bộ dữ liệu Biên bản xác minh và Báo cáo thẩm tra kèm theo sẽ bị xóa.`}
      />
    </div>
  );
};
