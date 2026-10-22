import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskField, TaskPriority, TaskStatus } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getDaysRemaining, formatFileSize, isTaskOverdue } from '../utils/date';
import { exportToExcel, exportToCSV } from '../utils/export';
import { ExcelImportModal } from '../components/common/ExcelImportModal';
import { apiService } from '../services/api';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Calendar,
  User as UserIcon,
  Tag,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Eye,
  BellRing,
  Upload,
  Send,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronUp,
  RotateCcw,
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

interface TasksPageProps {
  initialFilter?: string;
  onOpenCreate: () => void;
  onOpenEdit: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onTriggerAlert?: (task: Task) => void;
  onOpenTelegramConfig?: () => void;
}

const TASK_FIELDS: TaskField[] = [
  'Đăng ký đất đai',
  'Cấp giấy lần đầu',
  'Chuyển mục đích',
  'Đăng ký biến động',
  'Tặng cho đất Nhà nước',
  'Thu hồi GCN',
  'Khoáng sản',
  'Môi trường',
  'Xử lý vi phạm hành chính',
  'Tranh chấp đất đai',
  'Bồi thường, hỗ trợ, GPMB',
  'Đo đạc và bản đồ',
  'Xây dựng CSDL đất đai',
  'Khác',
];

export const TasksPage: React.FC<TasksPageProps> = ({
  initialFilter,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
  onDeleteTask,
  onTriggerAlert,
  onOpenTelegramConfig,
}) => {
  const { tasks, users, refreshData } = useRealtime();
  const { user, isLeader, isAdmin, canEditTask, canDeleteTask } = useAuth();

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState(
    initialFilter && !['all', 'in_progress', 'completed', 'overdue', 'pending'].includes(initialFilter) && !TASK_FIELDS.includes(initialFilter as any)
      ? initialFilter
      : ''
  );
  const [selectedField, setSelectedField] = useState<string>(
    initialFilter && TASK_FIELDS.includes(initialFilter as any) ? initialFilter : 'all'
  );
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(
    ['in_progress', 'completed', 'overdue', 'pending'].includes(initialFilter || '')
      ? initialFilter!
      : 'all'
  );
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDateAsc' | 'dueDateDesc' | 'createdDesc'>('dueDateAsc');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuTaskId(null);
    if (activeMenuTaskId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuTaskId]);

  const handleQuickCompleteTask = async (task: Task) => {
    try {
      await apiService.updateTask(task.id, {
        status: 'completed',
        progress: 100,
        actualEndDate: new Date().toISOString(),
      });
      refreshData();
      setActiveMenuTaskId(null);
    } catch (err) {
      console.error('Failed to complete task', err);
    }
  };

  useEffect(() => {
    if (!initialFilter) return;
    if (['in_progress', 'completed', 'overdue', 'pending', 'all'].includes(initialFilter)) {
      setSelectedStatus(initialFilter);
    } else if (TASK_FIELDS.includes(initialFilter as any)) {
      setSelectedField(initialFilter);
    } else {
      setSearchQuery(initialFilter);
    }
  }, [initialFilter]);

  // Executive Analytics Chart Toggle & Filter
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [chartTaskStatusFilter, setChartTaskStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending' | 'overdue'>('all');

  // Dynamic available fields including any custom typed fields
  const allAvailableFields = useMemo(() => {
    const list = [...TASK_FIELDS];
    tasks.forEach((t) => {
      if (t.field && !list.includes(t.field as any)) {
        list.push(t.field);
      }
    });
    return list;
  }, [tasks]);

  // Scope tasks according to user role
  const accessibleTasks = useMemo(() => {
    if (isLeader || isAdmin) return tasks;
    return tasks.filter((t) => t.assigneeId === user?.id || t.createdBy === user?.id);
  }, [tasks, isLeader, isAdmin, user]);

  // Task Chart Data calculations
  const taskChartData = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;

    const fieldCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    accessibleTasks.forEach((t) => {
      if (t.status === 'completed') {
        completed++;
      } else if (isTaskOverdue(t)) {
        overdue++;
      } else if (t.status === 'in_progress') {
        inProgress++;
      } else {
        pending++;
      }

      const fld = t.field || 'Khác';
      fieldCounts[fld] = (fieldCounts[fld] || 0) + 1;

      const pri = t.priority || 'medium';
      if (priorityCounts[pri] !== undefined) {
        priorityCounts[pri]++;
      }
    });

    const total = accessibleTasks.length;
    const pieData = [
      {
        key: 'completed' as const,
        name: 'Đã hoàn thành',
        value: completed,
        color: '#10b981',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      {
        key: 'in_progress' as const,
        name: 'Đang thực hiện',
        value: inProgress,
        color: '#3b82f6',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        percentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
      },
      {
        key: 'pending' as const,
        name: 'Chưa thực hiện',
        value: pending,
        color: '#f59e0b',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        percentage: total > 0 ? Math.round((pending / total) * 100) : 0,
      },
      {
        key: 'overdue' as const,
        name: 'Quá hạn giải quyết',
        value: overdue,
        color: '#ef4444',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        percentage: total > 0 ? Math.round((overdue / total) * 100) : 0,
      },
    ].filter((i) => i.value > 0);

    const barFieldData = Object.entries(fieldCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const priorityNames: Record<string, string> = {
      urgent: 'Hỏa tốc',
      high: 'Ưu tiên cao',
      medium: 'Trung bình',
      low: 'Bình thường',
    };

    const barPriorityData = Object.entries(priorityCounts).map(([key, count]) => ({
      name: priorityNames[key] || key,
      count,
      fill: key === 'urgent' ? '#ef4444' : key === 'high' ? '#f97316' : key === 'medium' ? '#3b82f6' : '#94a3b8',
    }));

    return {
      total,
      pieData,
      barFieldData,
      barPriorityData,
    };
  }, [accessibleTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return accessibleTasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = task.code.toLowerCase().includes(q);
        const matchName = task.name.toLowerCase().includes(q);
        const matchAssignee = (task.assigneeName || '').toLowerCase().includes(q);
        const matchDirection = (task.direction || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchAssignee && !matchDirection) return false;
      }

      // Field
      if (selectedField !== 'all' && task.field !== selectedField) return false;

      // Priority
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;

      // Status
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'overdue') {
          if (!isTaskOverdue(task)) return false;
        } else if (task.status !== selectedStatus) {
          return false;
        }
      }

      // Assignee (applicable for leaders/admin)
      if (selectedAssignee !== 'all' && task.assigneeId !== selectedAssignee) return false;

      // Chart Click-to-filter
      if (chartTaskStatusFilter !== 'all') {
        if (chartTaskStatusFilter === 'overdue') {
          if (!isTaskOverdue(task)) return false;
        } else if (task.status !== chartTaskStatusFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'dueDateAsc') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'dueDateDesc') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [accessibleTasks, searchQuery, selectedField, selectedPriority, selectedStatus, selectedAssignee, sortBy, chartTaskStatusFilter]);

  const handleExportExcel = () => {
    const exportData = filteredTasks.map((t) => ({
      'Mã nhiệm vụ': t.code,
      'Tên công việc': t.name,
      'Lĩnh vực': t.field,
      'Độ ưu tiên': t.priority,
      'Cán bộ thực hiện': t.assigneeName || '',
      'Trạng thái': t.status,
      'Tiến độ (%)': t.progress,
      'Ngày bắt đầu': t.startDate,
      'Hạn chót': t.dueDate,
      'Chỉ đạo lãnh đạo': t.direction || '',
      'Kết quả xử lý': t.result || '',
    }));
    exportToExcel(exportData, `Danh_sach_cong_viec_dat_dai_${new Date().toISOString().split('T')[0]}`);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Hỏa tốc</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">Cao</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Trung bình</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-slate-600">Thấp</span>;
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã hoàn thành</span>;
      case 'overdue':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">Quá hạn</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Đang làm</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-slate-600 border border-gray-200">Chưa làm</span>;
    }
  };

  const kanbanColumns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'pending', label: 'Chưa làm', color: 'border-gray-300' },
    { id: 'in_progress', label: 'Đang làm', color: 'border-blue-400' },
    { id: 'completed', label: 'Đã hoàn thành', color: 'border-emerald-400' },
    { id: 'overdue', label: 'Quá hạn', color: 'border-rose-400' },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {isLeader || isAdmin ? 'Quản lý & Giám sát Nhiệm vụ Toàn đơn vị' : 'Nhiệm vụ Được phân công của tôi'}
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
              {filteredTasks.length} nhiệm vụ
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isLeader || isAdmin
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isLeader || isAdmin
                ? 'Quyền: Admin & Lãnh đạo (Giao / Sửa / Xóa)'
                : 'Quyền: Chuyên viên (Xem & Nộp kết quả)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLeader || isAdmin
              ? 'Theo dõi tiến độ toàn diện, phân công cán bộ, chỉnh sửa hoặc xóa nhiệm vụ và kiểm tra kết quả xử lý.'
              : 'Theo dõi tiến độ, nộp báo cáo kết quả nhiệm vụ được giao (Chỉ Admin và Lãnh đạo mới có quyền sửa hoặc xóa nhiệm vụ).'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dạng danh sách"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dạng bảng Kanban"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          {(isAdmin || isLeader) && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-xs transition-colors cursor-pointer"
              title="Nhập danh sách nhiệm vụ từ Excel"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Nhập Excel</span>
            </button>
          )}

          {onOpenTelegramConfig && (
            <button
              onClick={onOpenTelegramConfig}
              className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold flex items-center gap-1.5 border border-sky-200 shadow-xs transition-colors cursor-pointer"
              title="Cấu hình nhận nhắc việc qua Telegram Bot"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Nhắc việc Telegram</span>
            </button>
          )}

          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs transition-colors cursor-pointer ${
              isChartVisible
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
            }`}
            title="Bật/Tắt Biểu đồ phân tích tình trạng nhiệm vụ công việc"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ phân tích'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isLeader || isAdmin ? 'Giao việc mới' : 'Tạo việc cá nhân'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Executive Analytics Panel */}
      {isChartVisible && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  Phân tích Cơ cấu & Tiến độ Nhiệm vụ Công việc
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    Tổng {taskChartData.total} nhiệm vụ
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Phân loại theo hạn xử lý, phân bổ theo lĩnh vực chuyên môn và mức độ ưu tiên chỉ đạo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chartTaskStatusFilter !== 'all' && (
                <button
                  onClick={() => setChartTaskStatusFilter('all')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Xem tất cả nhiệm vụ"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc ({chartTaskStatusFilter})</span>
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
                {taskChartData.total === 0 ? (
                  <div className="text-xs text-slate-400">Chưa có nhiệm vụ nào</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setChartTaskStatusFilter((prev) => (prev === entry.key ? 'all' : entry.key));
                          }
                        }}
                      >
                        {taskChartData.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={chartTaskStatusFilter === entry.key ? '#1e293b' : '#ffffff'}
                            strokeWidth={chartTaskStatusFilter === entry.key ? 3 : 1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any, name: any) => [`${value} nhiệm vụ`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {taskChartData.total}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    Nhiệm vụ
                  </span>
                </div>
              </div>

              {/* Mini Legend Buttons */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                {taskChartData.pieData.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartTaskStatusFilter((prev) => (prev === item.key ? 'all' : item.key))}
                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      chartTaskStatusFilter === item.key
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-white'
                        : 'bg-white border-slate-200 hover:border-slate-300'
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

            {/* Middle: Bar Chart Tasks by Field */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  Nhiệm vụ theo Lĩnh vực
                </span>
                <span className="text-[10px] text-slate-400">Số việc</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskChartData.barFieldData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${val} nhiệm vụ`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Top các lĩnh vực phát sinh nhiều nhiệm vụ nhất
              </div>
            </div>

            {/* Right: Bar Chart Tasks by Priority */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Phân bổ theo Mức độ ưu tiên
                </span>
                <span className="text-[10px] text-slate-400">Số việc</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskChartData.barPriorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                    <RechartsTooltip formatter={(val: any) => [`${val} việc`, 'Số lượng']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {taskChartData.barPriorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Theo dõi việc Hỏa tốc & Ưu tiên cao để đôn đốc hoàn thành
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-xl border border-gray-200 shadow-xs text-xs">
        <button
          onClick={() => {
            setSelectedStatus('all');
            setSelectedAssignee('all');
            setSelectedPriority('all');
          }}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
            selectedStatus === 'all' && selectedAssignee === 'all' && selectedPriority === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
          }`}
        >
          Tất cả ({accessibleTasks.length})
        </button>

        <button
          onClick={() => {
            setSelectedAssignee(user?.id || 'all');
            setSelectedStatus('all');
            setSelectedPriority('all');
          }}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
            selectedAssignee === user?.id
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <UserIcon className="w-3 h-3" />
          <span>Việc của tôi ({accessibleTasks.filter((t) => t.assigneeId === user?.id).length})</span>
        </button>

        <button
          onClick={() => {
            setSelectedStatus('in_progress');
            setSelectedAssignee('all');
          }}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
            selectedStatus === 'in_progress'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Đang làm ({accessibleTasks.filter((t) => t.status === 'in_progress').length})</span>
        </button>

        <button
          onClick={() => {
            setSelectedStatus('overdue');
            setSelectedAssignee('all');
          }}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
            selectedStatus === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertCircle className="w-3 h-3" />
          <span>Quá hạn ({accessibleTasks.filter((t) => t.status === 'overdue').length})</span>
        </button>

        <button
          onClick={() => {
            setSelectedPriority('urgent');
            setSelectedStatus('all');
          }}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
            selectedPriority === 'urgent'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Hỏa tốc / Khẩn ({accessibleTasks.filter((t) => t.priority === 'urgent').length})</span>
        </button>

        <button
          onClick={() => {
            setSelectedStatus('completed');
            setSelectedAssignee('all');
          }}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
            selectedStatus === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Đã hoàn thành ({accessibleTasks.filter((t) => t.status === 'completed').length})</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã (CV-2026-...), tên nhiệm vụ, chỉ đạo..."
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          {/* Field Filter */}
          <div>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            >
              <option value="all">Tất cả lĩnh vực đất đai</option>
              {allAvailableFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chưa làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="overdue">Quá hạn</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            {isLeader || isAdmin ? (
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                <option value="all">Tất cả cán bộ ({users.length})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'leader' ? 'Lãnh đạo' : 'Chuyên viên'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-blue-50/80 border border-blue-200 rounded-lg px-2.5 py-1.5 text-blue-900 text-xs font-semibold flex items-center gap-1.5 truncate">
                <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Cán bộ: {user?.name} (Chuyên viên)</span>
              </div>
            )}
          </div>
        </div>

        {/* Second row: Priority & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Ưu tiên:</span>
            {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                  selectedPriority === p
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                }`}
              >
                {p === 'all'
                  ? 'Tất cả'
                  : p === 'urgent'
                  ? 'Hỏa tốc'
                  : p === 'high'
                  ? 'Cao'
                  : p === 'medium'
                  ? 'Trung bình'
                  : 'Thấp'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-md px-2 py-0.5 text-slate-700 text-[11px] outline-none"
            >
              <option value="dueDateAsc">Hạn chót: Gần nhất trước</option>
              <option value="dueDateDesc">Hạn chót: Xa nhất trước</option>
              <option value="createdDesc">Mới tạo gần đây</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Mode: Table */}
      {viewMode === 'table' ? (
        <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Mã</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Tên nhiệm vụ / Nội dung</th>
                  <th className="py-2.5 px-3">Lĩnh vực</th>
                  <th className="py-2.5 px-3">Ưu tiên</th>
                  <th className="py-2.5 px-3">Cán bộ</th>
                  <th className="py-2.5 px-3">Tiến độ</th>
                  <th className="py-2.5 px-3">Hạn chót</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Không tìm thấy công việc phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const rem = getDaysRemaining(task.dueDate);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenDetail(task)}
                        className="hover:bg-blue-50/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {task.code}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">
                              {task.name}
                            </p>
                            {task.direction && (
                              <p className="text-[11px] text-amber-700 line-clamp-1 italic">
                                Chỉ đạo: {task.direction}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{task.field}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{getPriorityBadge(task.priority)}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                          {task.assigneeName || 'Chưa giao'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="w-20 space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-bold text-slate-700">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-800">{formatDate(task.dueDate)}</p>
                            <p className={`text-[10px] ${rem.statusClass}`}>{rem.label}</p>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(task.status)}</td>
                        <td
                          className="py-2.5 px-3 text-right whitespace-nowrap relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenDetail(task)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEditTask(task) && (
                              <button
                                onClick={() => onOpenEdit(task)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 3-dot Secondary Menu */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  activeMenuTaskId === task.id
                                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs'
                                    : 'text-slate-500 border-transparent hover:border-slate-200 hover:bg-slate-100'
                                }`}
                                title="Thao tác khác"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuTaskId === task.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                >
                                  {task.status !== 'completed' && canEditTask(task) && (
                                    <button
                                      onClick={() => handleQuickCompleteTask(task)}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      Đánh dấu hoàn thành
                                    </button>
                                  )}
                                  {onTriggerAlert && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuTaskId(null);
                                        onTriggerAlert(task);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 transition-colors"
                                    >
                                      <BellRing className="w-3.5 h-3.5 text-amber-600" />
                                      Gửi cảnh báo / Nhắc việc
                                    </button>
                                  )}
                                  {canDeleteTask(task) && (
                                    <>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <button
                                        onClick={() => {
                                          setActiveMenuTaskId(null);
                                          onDeleteTask(task);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        Xóa nhiệm vụ
                                      </button>
                                    </>
                                  )}
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
      ) : (
        /* View Mode: Kanban */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kanbanColumns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex flex-col min-h-[480px]"
              >
                <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b ${col.color}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{col.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white border border-gray-200 text-slate-700 text-[10px] font-bold shadow-xs">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                  {columnTasks.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-slate-400 text-xs">
                      Không có nhiệm vụ
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const rem = getDaysRemaining(task.dueDate);
                      return (
                        <div
                          key={task.id}
                          onClick={() => onOpenDetail(task)}
                          className="p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-400 cursor-pointer transition-all shadow-xs space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-700 text-[11px]">{task.code}</span>
                            {getPriorityBadge(task.priority)}
                          </div>

                          <h4 className="font-semibold text-slate-800 text-xs leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                            {task.name}
                          </h4>

                          <div className="text-[10px] text-slate-500 flex items-center justify-between">
                            <span>{task.field}</span>
                            <span className="font-medium text-slate-700">{task.assigneeName}</span>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">Tiến độ</span>
                              <span className="font-bold text-slate-700">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-gray-100">
                            <span className={rem.statusClass}>{rem.label}</span>
                            {task.attachments?.length > 0 && (
                              <span className="flex items-center gap-1 text-slate-500 font-medium">
                                <Paperclip className="w-3 h-3" />
                                {task.attachments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Excel Batch Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultType="tasks"
        onSuccess={() => {
          refreshData();
        }}
      />
    </div>
  );
};
