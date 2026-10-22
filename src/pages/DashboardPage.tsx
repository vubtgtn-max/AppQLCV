import React, { useMemo } from 'react';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getDaysRemaining, isTaskOverdue, isDossierOverdue } from '../utils/date';
import { DossierStatusChart } from '../components/dashboard/DossierStatusChart';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Calendar,
  FileCheck,
  Plus,
  ArrowRight,
  Layers,
  Activity,
  Landmark,
  Wheat,
  ShieldAlert,
  Scale,
  FileText,
  Sparkles,
  BellRing,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string, filterParam?: string) => void;
  onOpenTaskModal: () => void;
  onOpenDossierModal: () => void;
  onOpenCalendarModal: () => void;
  onOpenDocModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenTaskModal,
  onOpenDossierModal,
  onOpenCalendarModal,
  onOpenDocModal,
}) => {
  const {
    tasks,
    dossiers,
    activityLogs,
    settings,
    projects = [],
    publicLands = [],
    violations = [],
    disputes = [],
  } = useRealtime();
  const { user, isLeader, isAdmin } = useAuth();

  // Filter tasks based on role if specialist
  const visibleTasks = isLeader
    ? tasks
    : tasks.filter((t) => t.assigneeId === user?.id || t.createdBy === user?.id);

  const totalTasks = visibleTasks.length;
  const inProgressTasks = visibleTasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = visibleTasks.filter((t) => t.status === 'completed').length;
  const overdueTasks = visibleTasks.filter((t) => isTaskOverdue(t)).length;
  const pendingTasks = visibleTasks.filter((t) => t.status === 'pending').length;

  // Deadlines in next 7 days & Today reference
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cleanDossiers = useMemo(() => dossiers.filter((d) => !d.id?.startsWith('dos_kep')), [dossiers]);

  const totalDossiers = cleanDossiers.length;
  const resolvedDossiers = cleanDossiers.filter((d) => d.status === 'resolved').length;
  const overdueDossiers = cleanDossiers.filter((d) => isDossierOverdue(d)).length;
  const supplementDossiers = cleanDossiers.filter(
    (d) =>
      d.status === 'supplement' ||
      d.status === 'paused' ||
      (d.supplementDate && !d.resumedDate && d.status !== 'resolved')
  ).length;
  const inProgressDossiers = Math.max(
    0,
    totalDossiers - resolvedDossiers - overdueDossiers - supplementDossiers
  );

  const onTimeDossierRate =
    totalDossiers > 0 ? Math.round(((totalDossiers - overdueDossiers) / totalDossiers) * 100) : 100;

  const upcoming7DaysTasks = visibleTasks.filter((t) => {
    if (t.status === 'completed') return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    if (isNaN(due.getTime())) return false;
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  const upcoming7DaysDossiers = cleanDossiers.filter((d) => {
    if (d.status === 'resolved' || d.status === 'Paused' || d.status === 'paused' || d.status === 'supplement') return false;
    if (!d.dueDate) return false;
    const due = new Date(d.dueDate);
    if (isNaN(due.getTime())) return false;
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  });

  // Count total result attachments
  let resultAttachmentsCount = 0;
  tasks.forEach((t) => {
    t.attachments?.forEach((a) => {
      if (a.isResult || t.status === 'completed') resultAttachmentsCount++;
    });
  });

  // Tasks by land field distribution
  const fieldCounts: Record<string, number> = {};
  visibleTasks.forEach((t) => {
    fieldCounts[t.field] = (fieldCounts[t.field] || 0) + 1;
  });
  const topFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Specialized modules metrics
  const totalHouseholds = projects.reduce(
    (sum, p) => sum + (p.households?.length || p.totalHouseholds || 0),
    0
  );
  const leasedPublicLands = publicLands.filter((p) => p.status === 'leased').length;
  const activeViolations = violations.filter((v) => v.status !== 'resolved').length;
  const activeDisputes = disputes.filter(
    (d) => d.status !== 'resolved_success' && d.status !== 'resolved_failure' && d.status !== 'withdrawn'
  ).length;

  const urgentTotalCount = overdueDossiers + overdueTasks + upcoming7DaysTasks.length + upcoming7DaysDossiers.length;

  const roleBadgeLabel =
    user?.role === 'admin'
      ? 'Quản trị viên (Admin)'
      : user?.role === 'leader'
      ? 'Lãnh đạo đơn vị'
      : 'Chuyên viên địa chính';

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Executive Command Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 shadow-sm border border-slate-800/80">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30 uppercase tracking-wide">
                {settings?.unitName || 'Phòng Kinh tế – UBND xã Lãnh Ngọc'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Đồng bộ trực tuyến
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                • Năm công tác 2026
              </span>
            </div>

            <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
              Trung tâm Điều hành Công việc & Quản lý Đất đai
            </h1>

            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Cán bộ: <strong className="text-white font-bold">{user?.name}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-blue-200 text-[11px] font-semibold">
                {roleBadgeLabel}
              </span>
            </p>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(isLeader || isAdmin) && (
              <button
                onClick={onOpenTaskModal}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Giao việc mới</span>
              </button>
            )}
            <button
              onClick={onOpenDossierModal}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Tiếp nhận hồ sơ</span>
            </button>
            <button
              onClick={onOpenCalendarModal}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>Lịch công tác</span>
            </button>
            <button
              onClick={onOpenDocModal}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Văn bản</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 4 Executive Pillar KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: Hồ sơ Đất đai (Một cửa) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-gray-200 dark:border-slate-800 border-t-4 border-t-blue-600 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                1. Hồ sơ Đất đai (Một cửa)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  onClick={() => onNavigate('dossiers', 'all')}
                  className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {totalDossiers}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                  {onTimeDossierRate}% đúng hạn
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('dossiers', 'all')}
              className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
              title="Mở Sổ theo dõi Hồ sơ địa chính"
            >
              <FolderArchive className="w-4 h-4" />
            </button>
          </div>

          {/* Mini breakdown grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
            <button
              onClick={() => onNavigate('dossiers', 'in_progress')}
              className="p-1.5 rounded-lg bg-blue-50/70 hover:bg-blue-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-blue-700">{inProgressDossiers}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Đang làm</p>
            </button>
            <button
              onClick={() => onNavigate('dossiers', 'supplement')}
              className="p-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-amber-700">{supplementDossiers}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Bổ sung</p>
            </button>
            <button
              onClick={() => onNavigate('dossiers', 'resolved')}
              className="p-1.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-emerald-700">{resolvedDossiers}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Hoàn thành</p>
            </button>
            <button
              onClick={() => onNavigate('dossiers', 'overdue')}
              className="p-1.5 rounded-lg bg-rose-50/70 hover:bg-rose-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-rose-600">{overdueDossiers}</p>
              <p className="text-[9px] font-semibold text-rose-600 truncate">Quá hạn</p>
            </button>
          </div>
        </div>

        {/* Card 2: Nhiệm vụ & Giao việc */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-gray-200 dark:border-slate-800 border-t-4 border-t-indigo-600 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                2. Nhiệm vụ & Chỉ đạo
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  onClick={() => onNavigate('tasks', 'all')}
                  className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  {totalTasks}
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                  {completionRate}% hoàn thành
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('tasks', 'all')}
              className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="Mở Quản lý Nhiệm vụ công việc"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
            <button
              onClick={() => onNavigate('tasks', 'pending')}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-slate-700">{pendingTasks}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Chưa làm</p>
            </button>
            <button
              onClick={() => onNavigate('tasks', 'in_progress')}
              className="p-1.5 rounded-lg bg-blue-50/70 hover:bg-blue-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-blue-700">{inProgressTasks}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Đang làm</p>
            </button>
            <button
              onClick={() => onNavigate('tasks', 'completed')}
              className="p-1.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-emerald-700">{completedTasks}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Đã xong</p>
            </button>
            <button
              onClick={() => onNavigate('tasks', 'overdue')}
              className="p-1.5 rounded-lg bg-rose-50/70 hover:bg-rose-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-rose-600">{overdueTasks}</p>
              <p className="text-[9px] font-semibold text-rose-600 truncate">Quá hạn</p>
            </button>
          </div>
        </div>

        {/* Card 3: Cảnh báo & Hạn chót cần chú ý */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-gray-200 dark:border-slate-800 border-t-4 border-t-amber-500 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                3. Cảnh báo & Sắp đến hạn
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  onClick={() => onNavigate('alerts', 'pending')}
                  className={`text-2xl sm:text-3xl font-black tracking-tight cursor-pointer transition-colors ${
                    overdueDossiers + overdueTasks > 0 ? 'text-rose-600' : 'text-amber-600'
                  }`}
                >
                  {urgentTotalCount}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">mục cần đôn đốc</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('alerts', 'pending')}
              className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Mở Trung tâm Nhắc việc & Cảnh báo"
            >
              <BellRing className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
            <button
              onClick={() => onNavigate('dossiers', 'overdue')}
              className="p-1.5 rounded-lg bg-rose-50/70 hover:bg-rose-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-rose-600">{overdueDossiers + overdueTasks}</p>
              <p className="text-[9px] font-semibold text-rose-600 truncate">Tổng quá hạn</p>
            </button>
            <button
              onClick={() => onNavigate('calendar')}
              className="p-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-amber-700">
                {upcoming7DaysTasks.length + upcoming7DaysDossiers.length}
              </p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Hạn 7 ngày</p>
            </button>
            <button
              onClick={() => onNavigate('tasks', 'completed')}
              className="p-1.5 rounded-lg bg-teal-50/70 hover:bg-teal-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-teal-700">{resultAttachmentsCount}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Minh chứng</p>
            </button>
          </div>
        </div>

        {/* Card 4: Chuyên đề Đất đai */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-gray-200 dark:border-slate-800 border-t-4 border-t-emerald-600 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                4. Chuyên đề Địa chính
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {projects.length + publicLands.length + violations.length + disputes.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">hồ sơ chuyên đề</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Quản lý Chuyên đề Đất đai"
            >
              <Landmark className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100 dark:border-slate-800 text-center">
            <button
              onClick={() => onNavigate('projects')}
              className="p-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-indigo-700">{projects.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">GPMB</p>
            </button>
            <button
              onClick={() => onNavigate('publicLand')}
              className="p-1.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-emerald-700">{publicLands.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Đất 5%</p>
            </button>
            <button
              onClick={() => onNavigate('violations')}
              className="p-1.5 rounded-lg bg-rose-50/70 hover:bg-rose-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-rose-700">{violations.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Vi phạm</p>
            </button>
            <button
              onClick={() => onNavigate('disputes')}
              className="p-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 transition-colors cursor-pointer"
            >
              <p className="text-xs font-extrabold text-amber-700">{disputes.length}</p>
              <p className="text-[9px] font-semibold text-slate-500 truncate">Tranh chấp</p>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Quick Access Strip for 4 Specialized Land Modules */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div
          onClick={() => onNavigate('projects')}
          className="group p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-indigo-400 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Dự án & GPMB</p>
              <p className="text-[10px] text-slate-500 truncate">
                {projects.length} dự án • {totalHouseholds} hộ dân
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('publicLand')}
          className="group p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-emerald-400 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Wheat className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Quỹ đất công 5%</p>
              <p className="text-[10px] text-slate-500 truncate">
                {publicLands.length} thửa • {leasedPublicLands} đang thuê
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('violations')}
          className="group p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-rose-400 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Vi phạm & Trật tự XD</p>
              <p className="text-[10px] text-slate-500 truncate">
                {violations.length} vụ việc • {activeViolations} đang xử lý
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('disputes')}
          className="group p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-amber-400 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Tranh chấp & Hòa giải</p>
              <p className="text-[10px] text-slate-500 truncate">
                {disputes.length} đơn thư • {activeDisputes} đang thụ lý
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
        </div>
      </div>

      {/* 4. Biểu đồ Tóm tắt Hồ sơ Đất đai theo Trạng thái & Cán bộ */}
      <DossierStatusChart
        dossiers={cleanDossiers}
        onNavigateToDossiers={(statusFilter) => onNavigate('dossiers', statusFilter)}
      />

      {/* 5. Main Analysis Section: 3 Actionable Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Column 1: Deadline & Cảnh báo khẩn cấp */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-tight">
                Nhiệm vụ & Hồ sơ Cần Ưu tiên
              </h3>
            </div>
            <button
              onClick={() => onNavigate('alerts', 'pending')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>

          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
            {upcoming7DaysTasks.length === 0 && overdueTasks === 0 && overdueDossiers === 0 && upcoming7DaysDossiers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <p>Không có hồ sơ hoặc nhiệm vụ nào quá hạn / sắp đến hạn.</p>
              </div>
            ) : (
              <>
                {visibleTasks
                  .filter((t) => isTaskOverdue(t) || upcoming7DaysTasks.some((u) => u.id === t.id))
                  .slice(0, 4)
                  .map((task) => {
                    const rem = getDaysRemaining(task.dueDate);
                    const isOver = isTaskOverdue(task);
                    return (
                      <div
                        key={task.id}
                        onClick={() => onNavigate('tasks', task.code)}
                        className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          isOver
                            ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                            : 'bg-gray-50/80 border-gray-200 hover:bg-blue-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-800 text-xs line-clamp-1">{task.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${rem.badgeClass}`}>
                            {rem.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>CB: {task.assigneeName || 'Chưa giao'}</span>
                          <span className="font-mono font-semibold text-blue-700">
                            [Việc] {task.code} • {task.progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {cleanDossiers
                  .filter((d) => isDossierOverdue(d) || upcoming7DaysDossiers.some((u) => u.id === d.id))
                  .slice(0, 4)
                  .map((dos) => {
                    const rem = getDaysRemaining(dos.dueDate);
                    const isOver = isDossierOverdue(dos);
                    return (
                      <div
                        key={dos.id}
                        onClick={() => onNavigate('dossiers', dos.code)}
                        className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          isOver
                            ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                            : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-800 text-xs line-clamp-1">
                            HS: {dos.owner} ({dos.procedure})
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${rem.badgeClass}`}>
                            {rem.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>Thụ lý: {dos.handlerName || 'Chưa phân công'}</span>
                          <span className="font-mono font-semibold text-indigo-700">{dos.code}</span>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>

        {/* Column 2: Công việc theo lĩnh vực đất đai */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-tight">
                Nhiệm vụ theo Lĩnh vực
              </h3>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Thống kê
            </button>
          </div>

          <div className="space-y-2">
            {topFields.length === 0 ? (
              <p className="text-slate-400 text-xs py-6 text-center">Chưa có dữ liệu phân loại lĩnh vực.</p>
            ) : (
              topFields.map(([fieldName, count]) => {
                const percentage = Math.round((count / (totalTasks || 1)) * 100);
                return (
                  <div
                    key={fieldName}
                    onClick={() => onNavigate('tasks', fieldName)}
                    className="space-y-1 p-1.5 rounded-lg hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2">{fieldName}</span>
                      <span className="text-slate-800 dark:text-white font-bold shrink-0">
                        {count} <span className="text-[10px] text-slate-400 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Hoạt động gần đây (Audit stream) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-tight">
                Nhật ký Tác nghiệp Gần đây
              </h3>
            </div>
            <button
              onClick={() => onNavigate('activityLogs')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Chi tiết
            </button>
          </div>

          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 text-xs">
            {activityLogs.slice(0, 7).map((log) => (
              <div key={log.id} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">
                    <strong className="text-slate-900 dark:text-white font-semibold">{log.userName}</strong>: {log.description}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
