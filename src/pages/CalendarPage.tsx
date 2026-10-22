import React, { useState, useMemo } from 'react';
import { CalendarEvent, CalendarEventType } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getDaysRemaining } from '../utils/date';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  User as UserIcon,
  AlertTriangle,
  FileText,
  Edit3,
  Trash2,
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

interface CalendarPageProps {
  onOpenCreate: () => void;
  onOpenEdit: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onOpenCreate,
  onOpenEdit,
  onDeleteEvent,
}) => {
  const { calendarEvents, tasks } = useRealtime();
  const { user, isLeader, isAdmin, canModifyRecord } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [isChartVisible, setIsChartVisible] = useState(false);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month calculation
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    // Adjust for Monday start: 0(Sun) -> 6, 1(Mon) -> 0
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [year, month, firstDayIndex, totalDaysInMonth]);

  // Merge calendar events & task deadlines into unified base list
  const rawAllEvents = useMemo(() => {
    const list: {
      id: string;
      date: string;
      time?: string;
      title: string;
      type: CalendarEventType | 'task_deadline';
      assigneeName?: string;
      progress: number;
      rawEvent?: CalendarEvent;
      rawTask?: any;
    }[] = [];

    calendarEvents.forEach((ev) => {
      list.push({
        id: ev.id,
        date: ev.date,
        time: ev.time,
        title: ev.name,
        type: ev.type,
        assigneeName: ev.assigneeName,
        progress: ev.progress,
        rawEvent: ev,
      });
    });

    tasks.forEach((t) => {
      list.push({
        id: `t_${t.id}`,
        date: t.dueDate,
        time: '17:00',
        title: `[Hạn] ${t.name} (${t.code})`,
        type: 'task_deadline',
        assigneeName: t.assigneeName,
        progress: t.progress,
        rawTask: t,
      });
    });

    return list;
  }, [calendarEvents, tasks]);

  // Events filtered by selectedType only (for calendar grid cells)
  const gridEvents = useMemo(() => {
    return rawAllEvents.filter((item) => {
      if (selectedType !== 'all') {
        if (selectedType === 'task' && item.type !== 'task' && item.type !== 'task_deadline') return false;
        if (selectedType !== 'task' && item.type !== selectedType) return false;
      }
      return true;
    });
  }, [rawAllEvents, selectedType]);

  // Events filtered by selectedType AND selectedDateFilter (for event inspector list)
  const allEvents = useMemo(() => {
    return gridEvents.filter((item) => {
      if (selectedDateFilter && item.date !== selectedDateFilter) return false;
      return true;
    });
  }, [gridEvents, selectedDateFilter]);

  // Calendar Chart Data calculations for current month view (unfiltered by selectedType/selectedDateFilter so chart slices remain interactive)
  const calendarChartData = useMemo(() => {
    let meetingCount = 0;
    let taskDeadlineCount = 0;
    let reportCount = 0;
    let otherCount = 0;

    const curMonthPrefix = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const monthEvents = rawAllEvents.filter((e) => e.date && e.date.startsWith(curMonthPrefix));

    monthEvents.forEach((ev) => {
      if (ev.type === 'meeting') meetingCount++;
      else if (ev.type === 'task' || ev.type === 'task_deadline') taskDeadlineCount++;
      else if (ev.type === 'report') reportCount++;
      else otherCount++;
    });

    const total = monthEvents.length;
    const pieData = [
      {
        key: 'meeting',
        name: 'Lịch họp giao ban',
        value: meetingCount,
        color: '#3b82f6',
        percentage: total > 0 ? Math.round((meetingCount / total) * 100) : 0,
      },
      {
        key: 'task',
        name: 'Hạn chót công việc',
        value: taskDeadlineCount,
        color: '#f59e0b',
        percentage: total > 0 ? Math.round((taskDeadlineCount / total) * 100) : 0,
      },
      {
        key: 'report',
        name: 'Báo cáo định kỳ',
        value: reportCount,
        color: '#10b981',
        percentage: total > 0 ? Math.round((reportCount / total) * 100) : 0,
      },
    ].filter((i) => i.value > 0);

    const weekCounts: Record<string, number> = {
      'Tuần 1 (1-7)': 0,
      'Tuần 2 (8-14)': 0,
      'Tuần 3 (15-21)': 0,
      'Tuần 4 (22-28)': 0,
      'Tuần 5 (29-31)': 0,
    };

    monthEvents.forEach((ev) => {
      const day = parseInt(ev.date.split('-')[2], 10);
      if (day <= 7) weekCounts['Tuần 1 (1-7)']++;
      else if (day <= 14) weekCounts['Tuần 2 (8-14)']++;
      else if (day <= 21) weekCounts['Tuần 3 (15-21)']++;
      else if (day <= 28) weekCounts['Tuần 4 (22-28)']++;
      else weekCounts['Tuần 5 (29-31)']++;
    });

    const barWeekData = Object.entries(weekCounts).map(([name, count]) => ({
      name,
      count,
    }));

    return {
      total,
      pieData,
      barWeekData,
    };
  }, [rawAllEvents, year, month]);

  const monthName = `Tháng ${month + 1}, ${year}`;
  const nowLocal = new Date();
  const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Lịch Công tác & Cảnh báo Deadline</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
              {allEvents.length} sự kiện
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi lịch họp giao ban, lịch thực địa, hạn chót báo cáo và tiến độ hoàn thành.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs transition-colors cursor-pointer ${
              isChartVisible
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
            }`}
            title="Bật/Tắt Biểu đồ phân tích lịch công tác"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ phân tích'}</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm lịch / Deadline</span>
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
                  Phân tích Lịch Công tác & Phân bổ Tải công việc ({monthName})
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    {calendarChartData.total} sự kiện trong tháng
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cơ cấu sự kiện theo thể loại và mật độ công việc phân bổ theo từng tuần
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedType !== 'all' && (
                <button
                  onClick={() => setSelectedType('all')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Xem tất cả sự kiện"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc ({selectedType})</span>
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
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="w-full h-52 relative flex items-center justify-center">
                {calendarChartData.total === 0 ? (
                  <div className="text-xs text-slate-400">Không có sự kiện nào trong tháng này</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={calendarChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setSelectedType((prev) => (prev === entry.key ? 'all' : entry.key));
                          }
                        }}
                      >
                        {calendarChartData.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={selectedType === entry.key ? '#1e293b' : '#ffffff'}
                            strokeWidth={selectedType === entry.key ? 3 : 1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any, name: any) => [`${value} sự kiện`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {calendarChartData.total}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    Sự kiện
                  </span>
                </div>
              </div>

              {/* Mini Legend Buttons */}
              <div className="w-full grid grid-cols-3 gap-1.5 mt-2">
                {calendarChartData.pieData.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedType((prev) => (prev === item.key ? 'all' : (item.key as any)))}
                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedType === item.key
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

            {/* Right: Bar Chart Events by Week */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Mật độ sự kiện theo Tuần trong tháng
                </span>
                <span className="text-[10px] text-slate-400">Số sự kiện & Deadline</span>
              </div>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calendarChartData.barWeekData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                    <RechartsTooltip formatter={(val: any) => [`${val} sự kiện`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Phân bổ lịch công tác đều khắp các tuần, tránh dồn ứ áp lực công việc vào cuối tháng
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Controls & Filter */}
      <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Month Navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-900 text-sm px-2">{monthName}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-2 py-1 rounded-md bg-gray-100 text-slate-700 hover:bg-gray-200 font-semibold text-[11px] ml-1"
          >
            Hôm nay
          </button>
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-1">
          {(['all', 'meeting', 'task', 'report'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setSelectedType(t);
                setSelectedDateFilter(null);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                selectedType === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all'
                ? 'Tất cả'
                : t === 'meeting'
                ? 'Lịch họp'
                : t === 'task'
                ? 'Công việc'
                : 'Báo cáo'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Calendar */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden text-xs">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center font-bold text-slate-600 py-2.5 text-[11px]">
          <div>Thứ 2</div>
          <div>Thứ 3</div>
          <div>Thứ 4</div>
          <div>Thứ 5</div>
          <div>Thứ 6</div>
          <div className="text-amber-700">Thứ 7</div>
          <div className="text-rose-700">Chủ nhật</div>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 bg-gray-50">
          {calendarDays.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected = selectedDateFilter === cell.dateStr;
            const dayEvents = gridEvents.filter((e) => e.date === cell.dateStr);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDateFilter(isSelected ? null : cell.dateStr)}
                className={`min-h-[95px] p-2 transition-colors cursor-pointer flex flex-col justify-between ${
                  !cell.isCurrentMonth ? 'opacity-40 bg-gray-100/60' : 'bg-white hover:bg-blue-50/40'
                } ${isToday ? 'bg-blue-50/50 ring-1 ring-blue-500 inset-0' : ''} ${
                  isSelected ? 'bg-blue-100/50 ring-2 ring-blue-600' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gray-100 border border-gray-200 text-slate-700">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Day events pills */}
                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${
                        ev.type === 'meeting'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : ev.type === 'report'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                      title={ev.title}
                    >
                      {ev.time ? `${ev.time} ` : ''}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-slate-500 block font-medium">
                      +{dayEvents.length - 2} sự kiện khác
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day / Filtered Event Inspector */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              {selectedDateFilter ? `Chi tiết sự kiện ngày ${formatDate(selectedDateFilter)}` : 'Tất cả sự kiện & Deadline trong tháng'}
            </h3>
          </div>
          {selectedDateFilter && (
            <button
              onClick={() => setSelectedDateFilter(null)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Xem toàn bộ tháng
            </button>
          )}
        </div>

        <div className="space-y-2">
          {allEvents.length === 0 ? (
            <p className="text-slate-400 text-xs py-6 text-center">Không có sự kiện hoặc deadline nào.</p>
          ) : (
            allEvents.map((item) => {
              const rem = getDaysRemaining(item.date);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'meeting'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : item.type === 'report'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {item.type === 'meeting'
                          ? 'Lịch họp'
                          : item.type === 'report'
                          ? 'Báo cáo'
                          : 'Công việc'}
                      </span>
                      <span className="font-semibold text-slate-800 text-xs">{item.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border font-bold ${rem.badgeClass}`}>
                        {rem.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px] pt-0.5">
                      <span>Ngày: {formatDate(item.date)} {item.time ? `• ${item.time}` : ''}</span>
                      {item.assigneeName && <span>Phụ trách: {item.assigneeName}</span>}
                      {item.rawEvent?.location && <span>Địa điểm: {item.rawEvent.location}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Tiến độ</p>
                      <p className="font-bold text-blue-600">{item.progress}%</p>
                    </div>

                    {item.rawEvent && (
                      <div className="flex items-center gap-1">
                        {canModifyRecord(item.rawEvent) ? (
                          <>
                            <button
                              onClick={() => onOpenEdit(item.rawEvent!)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-gray-200 cursor-pointer"
                              title="Sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteEvent(item.rawEvent!)}
                              className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Xóa lịch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none">
                            Chỉ xem
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
