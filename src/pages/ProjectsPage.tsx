import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Users,
  DollarSign,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Download,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  FileText,
  Landmark,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  BarChart3,
  X,
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
import { LandProject, ProjectStatus } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { localVault } from '../services/localVault';
import { apiService } from '../services/api';
const ProjectDetailView = lazy(() => import('../components/projects/ProjectDetailView').then((m) => ({ default: m.ProjectDetailView })));
const ProjectModal = lazy(() => import('../components/projects/ProjectModal').then((m) => ({ default: m.ProjectModal })));
const ProjectReportsView = lazy(() => import('../components/projects/ProjectReportsView').then((m) => ({ default: m.ProjectReportsView })));
import { formatDate } from '../utils/date';

export const ProjectsPage: React.FC = () => {
  const { projects = [], refreshData } = useRealtime();
  const { isAdmin, isLeader, canModifyRecord } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'list' | 'reports'>('list');
  const [selectedProject, setSelectedProject] = useState<LandProject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<LandProject | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuProjectId(null);
    if (activeMenuProjectId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuProjectId]);

  useEffect(() => {
    if (selectedProject) {
      const latest = projects.find((p) => p.id === selectedProject.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedProject)) {
        setSelectedProject(latest);
      }
    }
  }, [projects, selectedProject]);

  // Deletion modal state
  const [projectToDelete, setProjectToDelete] = useState<LandProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Analytics Chart Toggle & Filter
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [chartProjectStatusFilter, setChartProjectStatusFilter] = useState<string>('all');

  // Statistics calculation
  const stats = useMemo(() => {
    let totalProjects = projects.length;
    let inProgress = 0;
    let completed = 0;
    let totalHouseholds = 0;
    let totalPaidHouseholds = 0;
    let totalObstacleHouseholds = 0;
    let totalBudget = 0;
    let totalPaidAmount = 0;

    projects.forEach((p) => {
      if (p.status === 'completed') completed++;
      else if (p.status !== 'paused' && p.status !== 'halted' && (p.status as string) !== 'cancelled') inProgress++;

      const households = p.households || [];
      const pCount = households.length > 0 ? households.length : p.totalHouseholds || 0;
      totalHouseholds += pCount;

      const pPaid = households.filter((h) => h.paymentStatus === 'paid').length;
      totalPaidHouseholds += pPaid;

      const pObstacles = households.filter((h) => h.hasObstacle || h.paymentStatus === 'refused').length;
      totalObstacleHouseholds += pObstacles;

      const pBudget = households.reduce((sum, h) => sum + (h.compensationAmount || 0), 0) || p.totalBudget || 0;
      totalBudget += pBudget;

      const pPaidAmt = households.reduce((sum, h) => sum + (h.paidAmount || 0), 0);
      totalPaidAmount += pPaidAmt;
    });

    return {
      totalProjects,
      inProgress,
      completed,
      totalHouseholds,
      totalPaidHouseholds,
      totalObstacleHouseholds,
      totalBudget,
      totalPaidAmount,
      householdPaidPercent: totalHouseholds > 0 ? Math.round((totalPaidHouseholds / totalHouseholds) * 100) : 0,
      disbursementPercent: totalBudget > 0 ? Math.round((totalPaidAmount / totalBudget) * 100) : 0,
    };
  }, [projects]);

  // Project Chart Data calculations
  const projectChartData = useMemo(() => {
    const statusMeta: Record<string, { label: string; color: string }> = {
      planning: { label: 'Chuẩn bị chủ trương', color: '#64748b' },
      surveying: { label: 'Đang kiểm đếm', color: '#3b82f6' },
      publicizing: { label: 'Niêm yết phương án', color: '#f59e0b' },
      approving: { label: 'Đang duyệt phương án', color: '#8b5cf6' },
      paying: { label: 'Đang chi trả tiền', color: '#6366f1' },
      handing_over: { label: 'Bàn giao mặt bằng', color: '#06b6d4' },
      completed: { label: 'Đã hoàn thành', color: '#10b981' },
      paused: { label: 'Tạm dừng / Vướng mắc', color: '#ef4444' },
      halted: { label: 'Đình chỉ / Dừng', color: '#dc2626' },
      cancelled: { label: 'Tạm dừng / Hủy', color: '#ef4444' },
    };

    const statusCounts: Record<string, number> = {};
    projects.forEach((p) => {
      const st = p.status || 'planning';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const pieData = Object.entries(statusCounts)
      .map(([key, count]) => ({
        key,
        name: statusMeta[key]?.label || key,
        value: count,
        color: statusMeta[key]?.color || '#94a3b8',
      }))
      .filter((i) => i.value > 0);

    const householdBarData = [
      { name: 'Tổng số hộ', count: stats.totalHouseholds, fill: '#6366f1' },
      { name: 'Đã nhận tiền', count: stats.totalPaidHouseholds, fill: '#10b981' },
      { name: 'Có vướng mắc', count: stats.totalObstacleHouseholds, fill: '#ef4444' },
      { name: 'Chưa chi trả', count: Math.max(0, stats.totalHouseholds - stats.totalPaidHouseholds), fill: '#f59e0b' },
    ];

    const budgetBarData = [
      { name: 'Tổng dự toán', amount: Math.round(stats.totalBudget / 1000000), fill: '#6366f1' },
      { name: 'Đã chi trả', amount: Math.round(stats.totalPaidAmount / 1000000), fill: '#10b981' },
      { name: 'Chưa giải ngân', amount: Math.max(0, Math.round((stats.totalBudget - stats.totalPaidAmount) / 1000000)), fill: '#f59e0b' },
    ];

    return {
      pieData,
      householdBarData,
      budgetBarData,
    };
  }, [projects, stats]);

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (p.code || '').toLowerCase().includes(q);
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchLocation = (p.location || '').toLowerCase().includes(q);
        const matchInvestor = (p.investor || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLocation && !matchInvestor) return false;
      }

      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      if (chartProjectStatusFilter !== 'all' && p.status !== chartProjectStatusFilter) {
        return false;
      }

      return true;
    });
  }, [projects, searchQuery, statusFilter, chartProjectStatusFilter]);

  // Handlers
  const handleCreateProject = async (data: Partial<LandProject>) => {
    const created = await apiService.createProject(data);
    try {
      await localVault.upsertLocalProject(created);
    } catch (_) {}
    await refreshData();
  };

  const handleUpdateProject = async (data: Partial<LandProject>) => {
    if (!editingProject) return;
    if (!canModifyRecord(editingProject)) {
      alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ phụ trách dự án này mới có quyền chỉnh sửa.');
      return;
    }
    const updated = await apiService.updateProject(editingProject.id, data);
    try {
      await localVault.upsertLocalProject(updated);
    } catch (_) {}
    await refreshData();
  };

  const handleDeleteProject = (project: LandProject) => {
    if (!canModifyRecord(project)) {
      alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ phụ trách dự án này mới có quyền xóa.');
      return;
    }
    setDeleteError(null);
    setProjectToDelete(project);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiService.deleteProject(projectToDelete.id);
      try {
        await localVault.deleteLocalProject(projectToDelete.id, projectToDelete.code);
      } catch (_) {}
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
      }
      setToastNotification(`Đã xóa thành công dự án [${projectToDelete.code}] ${projectToDelete.name}`);
      setProjectToDelete(null);
      await refreshData();
      setTimeout(() => setToastNotification(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa dự án thất bại. Vui lòng kiểm tra lại kết nối hoặc phân quyền.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Delete Modal Helper
  const renderDeleteConfirmationModal = () => {
    if (!projectToDelete) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa dự án GPMB</h3>
                <p className="text-xs text-slate-500">Thao tác này sẽ xóa vĩnh viễn dữ liệu</p>
              </div>
            </div>
            <button
              onClick={() => {
                setProjectToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 mb-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mã dự án:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                {projectToDelete.code}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 shrink-0">Tên dự án:</span>
              <span className="font-bold text-slate-900 text-right">{projectToDelete.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Địa bàn / Địa điểm:</span>
              <span className="text-slate-700 font-medium">{projectToDelete.location}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chủ đầu tư:</span>
              <span className="text-slate-700 font-medium">{projectToDelete.investor}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
              <span className="text-slate-500">Số hộ dân liên quan:</span>
              <span className="font-bold text-indigo-700">
                {projectToDelete.households?.length || projectToDelete.totalHouseholds || 0} hộ
              </span>
            </div>
          </div>

          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 leading-relaxed">
            ⚠️ <strong>Cảnh báo:</strong> Toàn bộ dữ liệu kiểm đếm bồi thường, mốc pháp lý và danh sách hộ dân của dự án này sẽ bị xóa hoàn toàn khỏi hệ thống.
          </p>

          {deleteError && (
            <div className="text-xs text-rose-700 bg-rose-100 border border-rose-200 p-2.5 rounded-lg mb-4">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setProjectToDelete(null);
                setDeleteError(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDeleteProject}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <span>Đang xóa dự án...</span>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xác nhận xóa vĩnh viễn</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If a project is selected for deep dive view:
  if (selectedProject) {
    // get freshest copy of selected project
    const currentProject = projects.find((p) => p.id === selectedProject.id) || selectedProject;
    return (
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải chi tiết dự án...</div>}>
        <ProjectDetailView
          project={currentProject}
          onBack={() => setSelectedProject(null)}
          onRefresh={refreshData}
          onDeleteProject={(p) => handleDeleteProject(p)}
        />
        {renderDeleteConfirmationModal()}
      </Suspense>
    );
  }

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'planning':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">1. Chuẩn bị chủ trương</span>;
      case 'surveying':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">2. Đang kiểm đếm</span>;
      case 'publicizing':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">3. Đang niêm yết PA</span>;
      case 'approving':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">4. Đang duyệt PA</span>;
      case 'paying':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">5. Đang chi trả tiền</span>;
      case 'handing_over':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800">6. Bàn giao mặt bằng</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">✅ Đã hoàn thành GPMB</span>;
      case 'paused':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">⚠️ Tạm dừng / Vướng mắc</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">Đang triển khai</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="w-6 h-6 text-indigo-600" />
              Quản lý Dự án Bồi thường & Giải phóng Mặt bằng
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tiến độ mốc pháp lý, quyết định thu hồi, danh sách hộ dân, tình hình nhận tiền và tháo gỡ vướng mắc
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveMainTab('list')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === 'list'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Danh sách Dự án ({projects.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('reports')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === 'reports'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Báo cáo Tuần / Tháng / Quý</span>
            </button>
          </div>

          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              isChartVisible
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
            title="Bật/Tắt Biểu đồ phân tích dự án GPMB"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ phân tích'}</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm Dự án mới
          </button>
        </div>
      </div>

      {/* Main Tab Routing */}
      {activeMainTab === 'reports' ? (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải báo cáo dự án...</div>}>
          <ProjectReportsView
            projects={projects}
            onBackToProjects={() => setActiveMainTab('list')}
            onSelectProject={(p) => setSelectedProject(p)}
          />
        </Suspense>
      ) : (
        <>
          {/* KPI Stats Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng dự án */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dự án GPMB</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats.totalProjects}{' '}
            <span className="text-xs font-medium text-slate-500">dự án</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span className="text-indigo-600 font-semibold">{stats.inProgress} đang thực hiện</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{stats.completed} hoàn thành</span>
          </div>
        </div>

        {/* Card 2: Hộ dân & Nhận tiền */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hộ ảnh hưởng & Nhận tiền</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {stats.totalPaidHouseholds}{' '}
            <span className="text-xs font-medium text-slate-500">/ {stats.totalHouseholds} hộ</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Tỷ lệ nhận tiền: {stats.householdPaidPercent}%</span>
          </div>
        </div>

        {/* Card 3: Khó khăn vướng mắc */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hộ có khó khăn, vướng mắc</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">
            {stats.totalObstacleHouseholds}{' '}
            <span className="text-xs font-medium text-slate-500">hộ</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            Cần đối thoại vận động & giải quyết kiến nghị
          </div>
        </div>

        {/* Card 4: Giải ngân kinh phí */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Kinh phí chi trả bồi thường</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {(stats.totalPaidAmount / 1000000000).toFixed(2)}{' '}
            <span className="text-xs font-medium text-slate-500">tỷ VNĐ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Duyệt: {(stats.totalBudget / 1000000000).toFixed(2)} tỷ ({stats.disbursementPercent}%)
          </div>
        </div>
      </div>

      {/* Collapsible Executive Analytics Panel */}
      {isChartVisible && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  Phân tích Cơ cấu & Tiến độ Dự án GPMB
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {stats.totalProjects} Dự án
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Theo dõi giai đoạn pháp lý, tiến độ chi trả tiền các hộ dân và tỷ lệ giải ngân bồi thường
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chartProjectStatusFilter !== 'all' && (
                <button
                  onClick={() => setChartProjectStatusFilter('all')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Xem tất cả dự án"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc giai đoạn</span>
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
            {/* Left: Recharts Donut Pie Chart of Project Phases */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="w-full h-52 relative flex items-center justify-center">
                {stats.totalProjects === 0 ? (
                  <div className="text-xs text-slate-400">Chưa có dự án nào</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setChartProjectStatusFilter((prev) => (prev === entry.key ? 'all' : entry.key));
                          }
                        }}
                      >
                        {projectChartData.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={chartProjectStatusFilter === entry.key ? '#1e293b' : '#ffffff'}
                            strokeWidth={chartProjectStatusFilter === entry.key ? 3 : 1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any, name: any) => [`${value} dự án`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {stats.totalProjects}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    Dự án
                  </span>
                </div>
              </div>

              {/* Mini Legend Buttons */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                {projectChartData.pieData.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartProjectStatusFilter((prev) => (prev === item.key ? 'all' : item.key))}
                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      chartProjectStatusFilter === item.key
                        ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white'
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

            {/* Middle: Households Funnel (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Tiến độ vận động & Chi trả hộ dân
                </span>
                <span className="text-[10px] text-slate-400">Số hộ</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectChartData.householdBarData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${val} hộ`, 'Số lượng']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {projectChartData.householdBarData.map((entry, index) => (
                        <Cell key={`bar-hh-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Tỷ lệ chi trả: <b>{stats.householdPaidPercent}%</b> • Vướng mắc: <b>{stats.totalObstacleHouseholds} hộ</b>
              </div>
            </div>

            {/* Right: Budget Disbursement (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Tiến độ giải ngân kinh phí (Triệu VNĐ)
                </span>
                <span className="text-[10px] text-slate-400">Triệu đ</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectChartData.budgetBarData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={95}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${Number(val).toLocaleString()} triệu VNĐ`, 'Giá trị']} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {projectChartData.budgetBarData.map((entry, index) => (
                        <Cell key={`bar-bg-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Giải ngân: <b>{stats.disbursementPercent}%</b> ({(stats.totalPaidAmount / 1000000000).toFixed(2)} tỷ / {(stats.totalBudget / 1000000000).toFixed(2)} tỷ)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter & Layout Toggle Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã dự án, tên công trình, địa bàn, chủ đầu tư..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-700 outline-hidden"
          >
            <option value="all">Tất cả giai đoạn ({projects.length})</option>
            <option value="planning">1. Lập chủ trương / Chuẩn bị</option>
            <option value="surveying">2. Đang kiểm đếm hiện trạng</option>
            <option value="publicizing">3. Đang niêm yết công khai PA</option>
            <option value="approving">4. Đang thẩm định & duyệt PA</option>
            <option value="paying">5. Đang chi trả tiền bồi thường</option>
            <option value="handing_over">6. Đang bàn giao mặt bằng</option>
            <option value="completed">7. Đã hoàn thành GPMB</option>
            <option value="paused">8. Đang tạm dừng / Vướng mắc</option>
          </select>

          <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Xem dạng lưới Card"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Xem dạng bảng chi tiết"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Content Listing */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Chưa có dự án bồi thường, GPMB nào</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Bấm nút &quot;Thêm Dự án mới&quot; để thiết lập thông tin dự án, các mốc pháp lý và nhập danh sách hộ dân.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo dự án đầu tiên
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const households = p.households || [];
            const count = households.length > 0 ? households.length : p.totalHouseholds || 0;
            const paid = households.filter((h) => h.paymentStatus === 'paid').length;
            const obstacles = households.filter((h) => h.hasObstacle || h.paymentStatus === 'refused').length;
            const budget = households.reduce((sum, h) => sum + (h.compensationAmount || 0), 0) || p.totalBudget || 0;
            const paidAmt = households.reduce((sum, h) => sum + (h.paidAmount || 0), 0);
            const paidRate = count > 0 ? Math.round((paid / count) * 100) : 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Badge & Code */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 font-mono text-[11px] font-bold rounded-md bg-slate-100 text-slate-700">
                      {p.code}
                    </span>
                    {getStatusBadge(p.status)}
                  </div>

                  {/* Title */}
                  <div>
                    <h3
                      onClick={() => setSelectedProject(p)}
                      className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2"
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  </div>

                  {/* Key Metrics Mini Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-500 font-medium">Tổng số hộ</div>
                      <div className="text-sm font-bold text-slate-900">{count}</div>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-xl">
                      <div className="text-[10px] text-emerald-700 font-medium">Đã nhận tiền</div>
                      <div className="text-sm font-bold text-emerald-800">{paid} ({paidRate}%)</div>
                    </div>
                    <div className="p-2 bg-amber-50/60 rounded-xl">
                      <div className="text-[10px] text-amber-800 font-medium">Vướng mắc</div>
                      <div className="text-sm font-bold text-amber-900">{obstacles}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Tiến độ chi trả tiền:</span>
                      <span className="font-bold text-slate-800">
                        {(paidAmt / 1000000000).toFixed(2)} / {(budget / 1000000000).toFixed(2)} tỷ
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${budget > 0 ? Math.min(100, Math.round((paidAmt / budget) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Decision info */}
                  {p.decisionNumber && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>QĐ: {p.decisionNumber}</span>
                      {p.decisionDate && <span>({formatDate(p.decisionDate)})</span>}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2 relative">
                  <div className="flex items-center gap-1">
                    {canModifyRecord(p) ? (
                      <>
                        {/* Edit button */}
                        <button
                          onClick={() => setEditingProject(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa dự án"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 3-dot Secondary Menu */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuProjectId(activeMenuProjectId === p.id ? null : p.id);
                            }}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              activeMenuProjectId === p.id
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Thao tác khác"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuProjectId === p.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuProjectId(null);
                                  handleDeleteProject(p);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                Xóa dự án này
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none"
                        title="Dự án của cán bộ khác (Chỉ xem)"
                      >
                        Chỉ xem
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedProject(p)}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Quản lý hộ & Mốc</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Layout */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Mã & Tên dự án</th>
                  <th className="py-3.5 px-4">Địa bàn / Chủ đầu tư</th>
                  <th className="py-3.5 px-4">Giai đoạn</th>
                  <th className="py-3.5 px-4 text-center">Số hộ</th>
                  <th className="py-3.5 px-4 text-center">Đã nhận tiền</th>
                  <th className="py-3.5 px-4 text-center">Vướng mắc</th>
                  <th className="py-3.5 px-4 text-right">Kinh phí (VNĐ)</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const households = p.households || [];
                  const count = households.length > 0 ? households.length : p.totalHouseholds || 0;
                  const paid = households.filter((h) => h.paymentStatus === 'paid').length;
                  const obstacles = households.filter((h) => h.hasObstacle || h.paymentStatus === 'refused').length;
                  const budget = households.reduce((sum, h) => sum + (h.compensationAmount || 0), 0) || p.totalBudget || 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => setSelectedProject(p)}>
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {p.code} {p.decisionNumber ? `• QĐ: ${p.decisionNumber}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{p.location}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{p.investor}</div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">{count}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-700">{paid}</span>{' '}
                        <span className="text-[10px] text-slate-400">({count > 0 ? Math.round((paid / count) * 100) : 0}%)</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {obstacles > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            {obstacles} hộ
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {Number(budget).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedProject(p)}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Chi tiết
                          </button>
                          {canModifyRecord(p) ? (
                            <>
                              <button
                                onClick={() => setEditingProject(p)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* 3-dot Secondary Menu */}
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuProjectId(activeMenuProjectId === p.id ? null : p.id);
                                  }}
                                  className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                                    activeMenuProjectId === p.id
                                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                      : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                                  }`}
                                  title="Thao tác khác"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuProjectId === p.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuProjectId(null);
                                        handleDeleteProject(p);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      Xóa dự án này
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none">
                              Chỉ xem
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {renderDeleteConfirmationModal()}

      {/* Create Project Modal */}
      <Suspense fallback={null}>
        {isCreateModalOpen && (
          <ProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSave={handleCreateProject}
          />
        )}

        {/* Edit Project Modal */}
        {editingProject && (
          <ProjectModal
            isOpen={!!editingProject}
            onClose={() => setEditingProject(null)}
            onSave={handleUpdateProject}
            project={editingProject}
          />
        )}
      </Suspense>
    </div>
  );
};
